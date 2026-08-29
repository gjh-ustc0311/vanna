const messages = document.querySelector("#messages");
const status = document.querySelector("#status");
const form = document.querySelector("#chat-form");
const input = document.querySelector("#message");
const sendButton = document.querySelector("#send");

const randomId = (prefix) => {
  const value = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}_${value.replaceAll("-", "")}`;
};

const conversationId = randomId("conv");
const supportsStreaming = typeof ReadableStream !== "undefined" && typeof TextDecoder !== "undefined";

function appendBubble(text, role = "assistant") {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${role}`;
  bubble.textContent = String(text ?? "");
  messages.append(bubble);
  bubble.scrollIntoView({ behavior: "smooth", block: "end" });
}

function appendTable(data) {
  const section = document.createElement("section");
  section.className = "result";

  if (data.title) {
    const title = document.createElement("h2");
    title.textContent = data.title;
    section.append(title);
  }
  if (data.description) {
    const description = document.createElement("p");
    description.textContent = data.description;
    section.append(description);
  }

  const viewport = document.createElement("div");
  viewport.className = "table-viewport";
  const table = document.createElement("table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const columns = Array.isArray(data.columns) ? data.columns : [];
  for (const column of columns) {
    const cell = document.createElement("th");
    cell.textContent = String(column);
    headRow.append(cell);
  }
  head.append(headRow);
  table.append(head);

  const body = document.createElement("tbody");
  const rows = Array.isArray(data.data) ? data.data.slice(0, 100) : [];
  for (const row of rows) {
    const tableRow = document.createElement("tr");
    for (const column of columns) {
      const cell = document.createElement("td");
      const value = row?.[column];
      cell.textContent = value === null || value === undefined ? "NULL" : String(value);
      tableRow.append(cell);
    }
    body.append(tableRow);
  }
  table.append(body);
  viewport.append(table);
  section.append(viewport);
  messages.append(section);
  section.scrollIntoView({ behavior: "smooth", block: "end" });
}

function renderChunk(chunk) {
  if (chunk?.type === "error") {
    const code = chunk.data?.code ?? "xpd_error";
    const message = chunk.data?.message ?? "请求失败。";
    throw new Error(`${code}: ${message}`);
  }
  const rich = chunk?.rich;
  if (!rich || typeof rich !== "object") return;
  const data = rich.data ?? {};

  switch (rich.type) {
    case "text":
      appendBubble(data.content ?? "");
      break;
    case "dataframe":
      appendTable(data);
      break;
    case "status_bar_update":
      status.textContent = data.detail ? `${data.message} · ${data.detail}` : data.message;
      status.dataset.state = data.status ?? "idle";
      break;
    case "chat_input_update":
      if (typeof data.placeholder === "string") input.placeholder = data.placeholder;
      if (typeof data.disabled === "boolean") {
        input.disabled = data.disabled;
        sendButton.disabled = data.disabled;
      }
      break;
    default:
      break;
  }
}

async function parseError(response) {
  try {
    const payload = await response.json();
    return payload?.data?.message ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

async function sendSse(payload) {
  const response = await fetch("/api/vanna/v2/chat_sse", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response));
  if (!response.body) throw new Error("流式响应不可用。");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const consumeFrames = () => {
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const line = frame.split("\n").find((item) => item.startsWith("data:"));
      if (!line) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      renderChunk(JSON.parse(data));
    }
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      buffer += decoder.decode();
      if (buffer) buffer += "\n\n";
      consumeFrames();
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    consumeFrames();
  }
}

async function sendPoll(payload) {
  const response = await fetch("/api/vanna/v2/chat_poll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const result = await response.json();
  for (const chunk of result.chunks ?? []) renderChunk(chunk);
}

async function dispatch(message) {
  const payload = {
    message,
    conversation_id: conversationId,
    request_id: randomId("req"),
  };
  input.disabled = true;
  sendButton.disabled = true;
  status.textContent = "正在连接…";
  status.dataset.state = "working";
  try {
    // Transport is selected before dispatch. A submitted SSE request is never
    // replayed through Poll, so a dropped stream cannot duplicate a DB query.
    if (supportsStreaming) await sendSse(payload);
    else await sendPoll(payload);
  } catch (error) {
    appendBubble(error instanceof Error ? error.message : "请求失败。", "error");
    status.textContent = "请求失败";
    status.dataset.state = "error";
  } finally {
    input.disabled = false;
    sendButton.disabled = false;
    input.focus();
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = input.value.trim();
  if (!message) return;
  appendBubble(message, "user");
  input.value = "";
  await dispatch(message);
});

dispatch("");
