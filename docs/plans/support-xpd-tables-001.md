# Vanna 支持 XPD 三表实施计划

## 1. 实施原则

- 新能力放在独立 `vanna.integrations.xpd` 适配层，避免改变通用 OpenAI、MySQL Runner 和 `RunSqlTool` 的既有行为。
- Schema 证据先于 SQL，SQL Guard 先于数据库，查询结果先截断再进入 UI/LLM。
- 外部 profile 只读且显式引用；运行时不持久化配置、Schema、会话或结果。

## 2. 工作分解

### 阶段 A：配置和契约

- 新增严格 YAML loader 和 `XpdProfileSettings`。
- 定义三表白名单、业务粒度、版本号和十项指标口径。
- 加入配置权限警告与稳定配置错误。

完成标准：合成合法 profile 可加载；危险 YAML、占位符和不安全 URL 被拒绝；多余顶层块不保留。

### 阶段 B：Schema 预检

- 通过 `INFORMATION_SCHEMA.TABLES/COLUMNS/STATISTICS/KEY_COLUMN_USAGE` 读取证据。
- 强制三表均存在且都是 `BASE TABLE`。
- 清理注释中的控制字符和双向文本控制字符，并限制为 500 字符。
- 只发布字段真实存在的指标和关系。

完成标准：生成完整、可序列化的 `xpd-core-v1` 证据；缺表、空字段元数据或连接错误均脱敏失败。

### 阶段 C：SQL Guard 与 Runner

- 使用 `sqlglot` 的 MySQL 方言解析单条 `SELECT/CTE`。
- 校验表、库、字段作用域、歧义、通配符、危险函数、禁止语句和 JOIN 关系。
- 使用只读事务、`MAX_EXECUTION_TIME` 和外层 `LIMIT 101` 执行。
- 仅连接阶段重试，查询开始后不重放；规范化日期、Decimal 和二进制值。

完成标准：合法单表、CTE 和逻辑 JOIN 通过；拒绝面测试通过；查询最多返回 100 行并正确标记截断。

### 阶段 D：工具、Agent 与 CLI

- 注册 `search_xpd_schema` 和 `run_xpd_sql` 两个 `xpd` 组工具。
- 通过 `ToolContext.metadata` 建立同一用户回合的 Schema 搜索凭证。
- 使用 XPD 专用 OpenAI-compatible payload：`temperature=0`、`parallel_tool_calls=false`。
- 使用服务端 `/login`、`/logout` 和本地演示 Cookie 解析器，登录不依赖浏览器脚本：`admin@example.com` 属于 `xpd + admin`，`user@example.com` 属于 `xpd`；会话和 AgentMemory 均只保存在内存。
- 新增 `--xpd-config PATH`，限制 XPD 模式只监听回环地址，并在建服前完成预检。

完成标准：工厂只注册两项 XPD 工具；CLI 模式互斥和回环限制生效；启动前预检失败不会创建服务器。

### 阶段 E：验证和交付

- 新增 XPD 独立 tox 环境和单元测试目录。
- 更新 PRD、实施计划和架构文档。
- 执行 XPD 测试、格式/静态检查和全仓库回归；如全仓库依赖解析被既有 optional-extra 冲突阻塞，单独记录，不在本需求扩大修复范围。
- 在 MySQL 可达时执行一次真实启动和只读查询 smoke test。

## 3. 文件清单

| 文件/目录 | 用途 |
| --- | --- |
| `src/vanna/integrations/xpd/config.py` | 严格 profile 加载 |
| `src/vanna/integrations/xpd/contract.py` | 三表和指标契约 |
| `src/vanna/integrations/xpd/schema.py` | Schema 预检与证据 |
| `src/vanna/integrations/xpd/sql_guard.py` | XPD SQL 安全策略 |
| `src/vanna/integrations/xpd/runner.py` | 只读、限时、限行执行 |
| `src/vanna/integrations/xpd/tools.py` | Schema/SQL 两项工具 |
| `src/vanna/integrations/xpd/llm.py` | XPD 模型 payload 策略 |
| `src/vanna/integrations/xpd/factory.py` | Agent 装配与启动预检 |
| `src/vanna/servers/cli/server_runner.py` | `--xpd-config` 入口和本地绑定 |
| `tests/integrations/xpd/` | 安全和装配回归 |

## 4. 运行与验证

安装：

```bash
python -m pip install -e '.[xpd,servers]'
```

显式启动：

```bash
vanna --xpd-config /absolute/path/to/xpd-report-agent/configs/app-local.yaml
```

可选指定回环地址和端口：

```bash
vanna --xpd-config /absolute/path/to/xpd-report-agent/configs/app-local.yaml \
  --host 127.0.0.1 --port 8000
```

自动化验证：

```bash
tox -e py311-xpd
```

## 5. 真实联调检查表

- profile 路径由操作者显式提供，文件未被复制或修改。
- 启动输出确认三表预检完成，访问地址是回环地址。
- `search_xpd_schema` 返回三个表，指标按当前真实字段裁剪。
- 单表聚合和获批逻辑 JOIN 各执行一次，确认结果不超过 100 行、不可导出。
- 故意提交未知表、`SELECT *` 和写语句，确认返回稳定拒绝错误。
- 故意触发超时或短暂连接失败，确认数据库异常和密钥未进入 UI/日志。
