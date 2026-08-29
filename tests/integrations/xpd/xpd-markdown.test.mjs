import assert from "node:assert/strict";
import test from "node:test";

import {
  parseInline,
  parseMarkdown,
  renderMarkdown,
  sanitizeLink,
} from "../../../src/vanna/integrations/xpd/static/xpd-markdown.mjs";

class FakeNode {
  constructor(type, name = null, value = null) {
    this.type = type;
    this.name = name;
    this.value = value;
    this.children = [];
    this.attributes = {};
  }

  append(...children) {
    this.children.push(...children);
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
}

class FakeDocument {
  createDocumentFragment() {
    return new FakeNode("fragment");
  }

  createElement(name) {
    return new FakeNode("element", name);
  }

  createTextNode(value) {
    return new FakeNode("text", null, String(value));
  }
}

function findElements(node, name) {
  const matches = node.type === "element" && node.name === name ? [node] : [];
  return matches.concat(node.children.flatMap((child) => findElements(child, name)));
}

function textContent(node) {
  if (node.type === "text") return node.value;
  if (node.type === "element" && node.name === "br") return "\n";
  return node.children.map(textContent).join("");
}

test("parses the supported block and inline subset", () => {
  const source = [
    "# 查询结论",
    "",
    "段落包含 **加粗 _嵌套斜体_**、`行内代码`。",
    "",
    "3. 第三项",
    "4. 第四项",
    "",
    "> 引用 **内容**",
    "",
    "```sql",
    "SELECT '<script>';",
    "```",
  ].join("\r\n");

  const nodes = parseMarkdown(source);

  assert.deepEqual(nodes.map((node) => node.type), [
    "heading",
    "paragraph",
    "list",
    "blockquote",
    "code_block",
  ]);
  assert.equal(nodes[0].level, 1);
  assert.equal(nodes[1].children[1].type, "strong");
  assert.equal(nodes[1].children[1].children[1].type, "emphasis");
  assert.equal(nodes[2].ordered, true);
  assert.equal(nodes[2].start, 3);
  assert.equal(nodes[4].language, "sql");
  assert.equal(nodes[4].value, "SELECT '<script>'; ".trim());
});

test("keeps unsupported and malformed markdown literal", () => {
  const source = [
    "<img src=x onerror=alert(1)>",
    "![image](https://example.com/a.png)",
    "- [ ] task",
    "| a | b |",
    "| - | - |",
    "~~strike~~ and **unclosed",
  ].join("\n");

  const rendered = renderMarkdown(new FakeDocument(), source, "https://local.test/");

  assert.equal(textContent(rendered), source);
  assert.equal(findElements(rendered, "img").length, 0);
  assert.equal(findElements(rendered, "table").length, 0);
  assert.equal(findElements(rendered, "del").length, 0);
});

test("renders only fixed DOM elements and preserves code as text", () => {
  const source = "## 标题\n\n- **项目**\n- `code`\n\n```html\n<script>alert(1)</script>\n```";
  const rendered = renderMarkdown(new FakeDocument(), source, "https://local.test/");

  assert.equal(findElements(rendered, "h2").length, 1);
  assert.equal(findElements(rendered, "ul").length, 1);
  assert.equal(findElements(rendered, "li").length, 2);
  assert.equal(findElements(rendered, "strong").length, 1);
  assert.equal(findElements(rendered, "pre").length, 1);
  assert.equal(findElements(rendered, "script").length, 0);
  assert.match(textContent(rendered), /<script>alert\(1\)<\/script>/);
});

test("allows safe links and degrades unsafe links to their source", () => {
  const source = [
    "[relative](/report)",
    "[external](https://example.com/path?q=1)",
    "[script](javascript:alert(1))",
    "[data](data:text/html,bad)",
    "[mail](mailto:user@example.com)",
    "[credentials](https://user:pass@example.com/private)",
  ].join("\n");
  const rendered = renderMarkdown(
    new FakeDocument(),
    source,
    "https://local.test/chat",
  );
  const anchors = findElements(rendered, "a");

  assert.equal(anchors.length, 2);
  assert.deepEqual(anchors.map((anchor) => anchor.attributes.href), [
    "https://local.test/report",
    "https://example.com/path?q=1",
  ]);
  for (const anchor of anchors) {
    assert.equal(anchor.attributes.target, "_blank");
    assert.equal(anchor.attributes.rel, "noopener noreferrer");
  }
  assert.match(textContent(rendered), /\[script\]\(javascript:alert\(1\)\)/);
  assert.match(textContent(rendered), /\[credentials\]\(https:\/\/user:pass@example.com\/private\)/);
});

test("normalizes safe URLs and rejects controls or non-http protocols", () => {
  assert.equal(
    sanitizeLink("../result", "https://local.test/chat/thread"),
    "https://local.test/result",
  );
  assert.equal(sanitizeLink("http://example.com", "https://local.test/"), "http://example.com/");
  assert.equal(sanitizeLink("java\nscript:alert(1)", "https://local.test/"), null);
  assert.equal(sanitizeLink("file:///tmp/secret", "https://local.test/"), null);
  assert.equal(sanitizeLink("https://u:p@example.com", "https://local.test/"), null);
});

test("supports escapes, hard line breaks, and literal unclosed delimiters", () => {
  assert.deepEqual(parseInline("\\*literal*\n`code` **open"), [
    { type: "text", value: "*literal*" },
    { type: "break" },
    { type: "code", value: "code" },
    { type: "text", value: " **open" },
  ]);
});
