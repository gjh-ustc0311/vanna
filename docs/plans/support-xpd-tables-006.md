# 实施计划：XPD Header、身份与 Trace 硬切

## 1. 交付原则

006 在 005 的 File/XLSX 实现上增量开发。Header、Python 服务、WebComponent、API 文档和
测试必须一次发布；不保留 Body/Cookie 兼容分支。

## 2. 阶段 A：HTTP 契约

- 增加集中 Header 常量、格式校验、重复值检测、安全诊断关联和 Trace 回退。
- 用严格 HTTP Body DTO 接收 `message/conversation_id/metadata`，再构造保留 Request ID 的
  内部 ChatRequest。
- SSE/Poll 在建流或调用 Handler 前校验 Content-Type、Request、Trace 和 User。
- 成功与建流前错误回显 Request/Trace Header；SSE/Poll envelope 不增加 Trace 字段。
- OpenAPI 声明 Request/User 必填、Trace 可选，Body 不再发布 `request_id`。

完成标准：非法输入不会触发 Handler，合法 Header Request ID 与所有现有 envelope 一致。

## 3. 阶段 B：身份、历史和文件

- 用 Header resolver 替换 Cookie resolver，User ID 使用完整范围的规范 uint64 十进制
  字符串且只授予 `xpd` 组。
- 删除登录路由和邮箱 Cookie 页面；本地页面改由 WebComponent 管理浏览器本地用户 ID。
- 为 FileSystemConversationStore 增加 owner-scoped 布局选项，XPD Factory 强制启用。
- 本地文件路由严格校验唯一 `X-User-Id`，继续保持 owner 404、过期 410 和安全响应头。
- 相对 File URL 改为 Header Fetch + Blob 保存；绝对 OSS URL 保持无 Header 外链。

完成标准：同 conversation ID 的两个用户互不影响，owner 能下载本地文件，其他用户不能。

## 4. 阶段 C：WebComponent 与日志

- TypeScript Body 类型删除 `request_id`，新增独立 request/trace/user Header 参数。
- 每轮生成一次 Request；每个 SSE/Poll HTTP 尝试生成独立 Trace；响应 Header 与 payload
  Request 不一致时 fail closed。
- 禁止 customHeaders 大小写变体覆盖五个协议 Header。
- 本地用户 ID 使用字符串和 BigInt 安全生成/校验；切换用户时清空消息并重建 conversation。
- XPD 日志扩展到 SSE/Poll 两种 transport 并增加 Trace，继续执行结构化 File URL 脱敏。
- CORS 允许三个请求 Header并暴露两个响应 Header。

完成标准：starter、普通请求和 Poll fallback 均携带正确 Header，外部 OSS 不接收身份 Header。

## 5. 阶段 D：文档、构建与验证

- 新增 006 PRD、Plan、Arch，同步 README 与 API 契约；为旧身份说明增加被取代标记。
- 增加 Header 数值/格式/重复、415/422、OpenAPI、CORS、传播和执行前失败测试。
- 增加 owner-scoped 历史、本地 File 下载、前端保留 Header、关联校验和 fallback 生命周期测试。
- 重建 WebComponent 并同步 Python bundle，运行 Python、前端、静态分析和发行物验证。

建议验证命令：

```bash
tox -e py311-unit,py311-xpd,ruff,mypy
cd frontends/webcomponent && npm test && npm run build
python -m build --outdir /tmp/vanna-build
python scripts/verify_distribution.py /tmp/vanna-build
```

## 6. 发布与回滚

- 发布前通知调用方删除 Body `request_id` 并配置三个 Header。
- 现有 Cookie owner 历史不迁移；旧文件继续由七天清理任务处理。
- 回滚必须整体回滚 Python 与 WebComponent，不能混用新 Header 客户端和旧 Body 服务端。
