# 实施计划：Chat SSE 15 秒空闲心跳

## 1. SSE 调度

- 在 FastAPI HTTP adapter 内增加私有 heartbeat interleaver，不修改 ChatHandler、Agent
  事件或公共模型。
- 始终保持一个 pending `iterator.__anext__()` task；用 Python 3.9 兼容的
  `asyncio.wait` 等待 15 秒。timeout 只产出 heartbeat，不取消上游读取。
- 上游事件到达后沿用现有序列化和日志分支，并重新开始空闲计时。
- 在 `finally` 中取消、await pending task 并关闭上游 iterator；取消异常原样传播。
- 保留 no-cache、no-transform、keep-alive 与 `X-Accel-Buffering: no` 响应头。

## 2. XPD 模型链路

- 将公共 OpenAI Chat Completions adapter 的内部客户端替换为 `AsyncOpenAI`，XPD
  子类保持现有 payload 策略。
- 非流式 create 使用 `await`，流式 create 使用 `await` + `async for`；完成或取消时
  关闭底层 stream。
- 保持构造参数、OpenAI-compatible base URL、timeout、重试、usage、文本和 Tool Call
  聚合行为不变。

## 3. 浏览器与文档

- WebComponent 继续忽略没有 `data:` 的 comment；生成器结束、解析失败或调用方提前
  break 时主动 cancel reader，再释放 reader lock。
- 重建 WebComponent 并同步 Python 内置 bundle。
- 新增 007 PRD/Plan/Arch，更新 SSE API 示例、应用事件措辞、fallback 和部署约束。
- 架构文档提供 Nginx/Ingress 配置片段，但不在本仓创建实际部署 manifest。

## 4. 测试与发布

- 私有 interleaver 使用短间隔测试重复 heartbeat、业务优先、计时重置、异常和取消；
  测试不得真实等待 15 秒。
- 路由测试只验证最终 wire、响应头和日志排除，时序由 async helper 测试承担。
- Fake AsyncOpenAI 验证模型等待不阻塞 heartbeat，Tool Call 拼装和流关闭不回归。
- 前端测试 comment 跨 chunk、heartbeat-only EOF fallback 和 reader cancel。
- 运行 XPD/Python 测试、Ruff、前端测试与构建、发行物验证。
- 发布顺序为：确认外层 Ingress/LB idle timeout 与禁缓冲、部署应用与内置客户端、
  经 staging 慢流 smoke test 验证至少 120 秒。
