const SPECIAL_INLINE = new Set(["\\", "`", "*", "_", "[", "!", "\n"]);
const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:"]);
const LANGUAGE_PATTERN = /^[A-Za-z0-9_+-]{1,32}$/;

function appendText(nodes, value) {
  if (!value) return;
  const previous = nodes[nodes.length - 1];
  if (previous?.type === "text") previous.value += value;
  else nodes.push({ type: "text", value });
}

function findUnescaped(source, needle, start) {
  let index = start;
  while (index < source.length) {
    index = source.indexOf(needle, index);
    if (index === -1) return -1;
    let slashes = 0;
    for (let cursor = index - 1; cursor >= 0 && source[cursor] === "\\"; cursor -= 1) {
      slashes += 1;
    }
    if (slashes % 2 === 0) return index;
    index += needle.length;
  }
  return -1;
}

function codeDelimiterLength(source, start) {
  let end = start;
  while (source[end] === "`") end += 1;
  return end - start;
}

function parseCodeSpan(source, start) {
  const length = codeDelimiterLength(source, start);
  const delimiter = "`".repeat(length);
  const end = source.indexOf(delimiter, start + length);
  if (end === -1) return null;
  let value = source.slice(start + length, end).replaceAll("\n", " ");
  if (value.startsWith(" ") && value.endsWith(" ") && value.trim()) {
    value = value.slice(1, -1);
  }
  return { node: { type: "code", value }, end: end + length };
}

function parseLinkToken(source, start, image = false) {
  const labelStart = start + (image ? 2 : 1);
  const labelEnd = findUnescaped(source, "]", labelStart);
  if (labelEnd === -1 || source[labelEnd + 1] !== "(") return null;
  const destinationEnd = findUnescaped(source, ")", labelEnd + 2);
  if (destinationEnd === -1) return null;
  const raw = source.slice(start, destinationEnd + 1);
  const destination = source.slice(labelEnd + 2, destinationEnd).trim();
  if (!destination || /\s/.test(destination)) return { raw, end: destinationEnd + 1 };
  return {
    raw,
    end: destinationEnd + 1,
    label: source.slice(labelStart, labelEnd),
    destination,
  };
}

export function parseInline(source) {
  const nodes = [];
  let index = 0;

  while (index < source.length) {
    const character = source[index];

    if (character === "\\" && index + 1 < source.length) {
      appendText(nodes, source[index + 1]);
      index += 2;
      continue;
    }
    if (character === "\n") {
      nodes.push({ type: "break" });
      index += 1;
      continue;
    }
    if (character === "`") {
      const parsed = parseCodeSpan(source, index);
      if (parsed) {
        nodes.push(parsed.node);
        index = parsed.end;
        continue;
      }
    }
    if (source.startsWith("![", index)) {
      const image = parseLinkToken(source, index, true);
      if (image) {
        appendText(nodes, image.raw);
        index = image.end;
        continue;
      }
    }
    if (character === "[") {
      const link = parseLinkToken(source, index);
      if (link?.destination) {
        nodes.push({
          type: "link",
          destination: link.destination,
          raw: link.raw,
          children: parseInline(link.label),
        });
        index = link.end;
        continue;
      }
      if (link) {
        appendText(nodes, link.raw);
        index = link.end;
        continue;
      }
    }

    const delimiter = source.startsWith("**", index)
      ? "**"
      : source.startsWith("__", index)
        ? "__"
        : character === "*" || character === "_"
          ? character
          : null;
    if (delimiter) {
      const end = findUnescaped(source, delimiter, index + delimiter.length);
      const content = end === -1 ? "" : source.slice(index + delimiter.length, end);
      if (end > index + delimiter.length && !content.includes("\n")) {
        nodes.push({
          type: delimiter.length === 2 ? "strong" : "emphasis",
          children: parseInline(content),
        });
        index = end + delimiter.length;
        continue;
      }
    }

    let end = index + 1;
    while (end < source.length && !SPECIAL_INLINE.has(source[end])) end += 1;
    appendText(nodes, source.slice(index, end));
    index = end;
  }

  return nodes;
}

function fenceMatch(line) {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
  if (!match) return null;
  const info = match[2].trim().split(/\s+/, 1)[0] ?? "";
  return {
    character: match[1][0],
    length: match[1].length,
    language: LANGUAGE_PATTERN.test(info) ? info : null,
  };
}

function isClosingFence(line, fence) {
  const leading = line.match(/^ */)?.[0].length ?? 0;
  if (leading > 3) return false;
  const content = line.slice(leading);
  let length = 0;
  while (content[length] === fence.character) length += 1;
  return length >= fence.length && content.slice(length).trim() === "";
}

function headingMatch(line) {
  const match = line.match(/^ {0,3}(#{1,6})[ \t]+(.+)$/);
  if (!match) return null;
  const content = match[2].replace(/[ \t]+#+[ \t]*$/, "");
  return content ? { level: match[1].length, content } : null;
}

function quoteMatch(line) {
  const match = line.match(/^ {0,3}> ?(.*)$/);
  return match ? match[1] : null;
}

function listMatch(line) {
  const unordered = line.match(/^ {0,3}[-+*][ \t]+(.+)$/);
  if (unordered) {
    if (/^\[[ xX]\][ \t]+/.test(unordered[1])) return null;
    return { ordered: false, start: 1, content: unordered[1] };
  }
  const ordered = line.match(/^ {0,3}(\d+)[.)][ \t]+(.+)$/);
  if (!ordered) return null;
  if (/^\[[ xX]\][ \t]+/.test(ordered[2])) return null;
  return { ordered: true, start: Number(ordered[1]), content: ordered[2] };
}

function isBlockStart(line) {
  return Boolean(
    fenceMatch(line) || headingMatch(line) || quoteMatch(line) !== null || listMatch(line),
  );
}

function parseBlocksFromLines(lines) {
  const nodes = [];
  let index = 0;

  while (index < lines.length) {
    if (!lines[index].trim()) {
      index += 1;
      continue;
    }

    const fence = fenceMatch(lines[index]);
    if (fence) {
      const content = [];
      index += 1;
      while (index < lines.length && !isClosingFence(lines[index], fence)) {
        content.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      nodes.push({
        type: "code_block",
        value: content.join("\n"),
        language: fence.language,
      });
      continue;
    }

    const heading = headingMatch(lines[index]);
    if (heading) {
      nodes.push({
        type: "heading",
        level: heading.level,
        children: parseInline(heading.content),
      });
      index += 1;
      continue;
    }

    if (quoteMatch(lines[index]) !== null) {
      const quotedLines = [];
      while (index < lines.length) {
        const quoted = quoteMatch(lines[index]);
        if (quoted === null) break;
        quotedLines.push(quoted);
        index += 1;
      }
      nodes.push({ type: "blockquote", children: parseBlocksFromLines(quotedLines) });
      continue;
    }

    const firstItem = listMatch(lines[index]);
    if (firstItem) {
      const items = [];
      const ordered = firstItem.ordered;
      const start = firstItem.start;
      while (index < lines.length) {
        const item = listMatch(lines[index]);
        if (!item || item.ordered !== ordered) break;
        items.push(parseInline(item.content));
        index += 1;
      }
      nodes.push({ type: "list", ordered, start, items });
      continue;
    }

    const paragraphLines = [lines[index]];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    nodes.push({ type: "paragraph", children: parseInline(paragraphLines.join("\n")) });
  }

  return nodes;
}

export function parseMarkdown(source) {
  return parseBlocksFromLines(String(source ?? "").replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n"));
}

export function sanitizeLink(destination, baseUrl) {
  const value = String(destination ?? "").trim();
  if (!value || /[\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const url = new URL(value, baseUrl);
    if (!SAFE_LINK_PROTOCOLS.has(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

function appendInline(documentRef, parent, nodes, baseUrl) {
  for (const node of nodes) {
    if (node.type === "text") {
      parent.append(documentRef.createTextNode(node.value));
    } else if (node.type === "break") {
      parent.append(documentRef.createElement("br"));
    } else if (node.type === "code") {
      const code = documentRef.createElement("code");
      code.append(documentRef.createTextNode(node.value));
      parent.append(code);
    } else if (node.type === "strong" || node.type === "emphasis") {
      const element = documentRef.createElement(node.type === "strong" ? "strong" : "em");
      appendInline(documentRef, element, node.children, baseUrl);
      parent.append(element);
    } else if (node.type === "link") {
      const href = sanitizeLink(node.destination, baseUrl);
      if (!href) {
        parent.append(documentRef.createTextNode(node.raw));
        continue;
      }
      const anchor = documentRef.createElement("a");
      anchor.setAttribute("href", href);
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
      appendInline(documentRef, anchor, node.children, baseUrl);
      parent.append(anchor);
    }
  }
}

function appendBlocks(documentRef, parent, nodes, baseUrl) {
  for (const node of nodes) {
    if (node.type === "heading") {
      const heading = documentRef.createElement(`h${node.level}`);
      appendInline(documentRef, heading, node.children, baseUrl);
      parent.append(heading);
    } else if (node.type === "paragraph") {
      const paragraph = documentRef.createElement("p");
      appendInline(documentRef, paragraph, node.children, baseUrl);
      parent.append(paragraph);
    } else if (node.type === "code_block") {
      const pre = documentRef.createElement("pre");
      const code = documentRef.createElement("code");
      if (node.language) code.setAttribute("data-language", node.language);
      code.append(documentRef.createTextNode(node.value));
      pre.append(code);
      parent.append(pre);
    } else if (node.type === "blockquote") {
      const quote = documentRef.createElement("blockquote");
      appendBlocks(documentRef, quote, node.children, baseUrl);
      parent.append(quote);
    } else if (node.type === "list") {
      const list = documentRef.createElement(node.ordered ? "ol" : "ul");
      if (node.ordered && node.start !== 1) list.setAttribute("start", String(node.start));
      for (const item of node.items) {
        const listItem = documentRef.createElement("li");
        appendInline(documentRef, listItem, item, baseUrl);
        list.append(listItem);
      }
      parent.append(list);
    }
  }
}

export function renderMarkdown(documentRef, source, baseUrl) {
  const fragment = documentRef.createDocumentFragment();
  appendBlocks(documentRef, fragment, parseMarkdown(source), baseUrl);
  return fragment;
}
