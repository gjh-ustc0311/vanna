# Vanna 支持 XPD 三表查询 PRD

## 1. 背景

本需求让 Vanna 直接读取 `xpd-report-agent/configs/app-local.yaml` 中的大模型和 MySQL 连接配置，提供一个可本地运行的 Web/API 数据问答助手。配置仍由 `xpd-report-agent` 管理，Vanna 不复制、不改写、不自动发现该文件。

本期目标是建立一条可运行且边界清晰的只读查询链路，而不是迁移 `xpd-report-agent` 的完整报表能力。

## 2. 用户与场景

- 用户：在开发机上分析 XPD 直播商品数据的本地可信用户；演示登录中的 `admin@example.com` 额外获得 `admin` 组，`user@example.com` 仅获得 `xpd` 组。
- 入口：Vanna FastAPI/Flask 本地 Web/API 服务，默认仅监听 `127.0.0.1`。
- 典型问题：按日或场次统计支付、退款、曝光、点击指标，以及在商品场次表和场次结束时间表之间进行获批关联。

## 3. 范围

仅允许以下三张物理表：

| 表 | 业务粒度 |
| --- | --- |
| `tb_live_goods_daily_stats` | `item_id + stat_date` |
| `tb_live_goods_session_stats` | `item_id + live_session_id` |
| `tb_live_session_endtime_stats` | `live_session_id` |

系统从 `INFORMATION_SCHEMA` 读取三表的字段、主键、索引、物理外键和注释，并补充一条经过字段存在性验证的逻辑关系：

`tb_live_goods_session_stats.live_session_id = tb_live_session_endtime_stats.live_session_id`

支持的版本化指标口径如下。只有当所需字段在候选表中真实存在时，该指标才会进入模型可见的 Schema 证据。

| 指标 | 口径 |
| --- | --- |
| 支付金额 | `SUM(pay_amt)` |
| 支付商品件数 | `SUM(pay_itm_qty)` |
| 支付订单数 | `SUM(pay_ord_cnt)` |
| 支付买家数 | `SUM(pay_byr_cnt)` |
| 退款金额 | `SUM(refund_amt)` |
| 确认收货金额 | `SUM(confirm_amt)` |
| 退款率 | `SUM(refund_amt) / NULLIF(SUM(pay_amt), 0)` |
| 点击率 | `SUM(item_click_uv) / NULLIF(SUM(item_exposure_uv), 0)` |
| 浏览 PV | `SUM(item_exposure_pv)` |
| 浏览 UV | `SUM(item_exposure_uv)` |

## 4. 功能需求

1. 启动参数必须显式提供 `--xpd-config PATH`；不得通过环境变量或目录扫描推断配置。
2. 配置仅接受 `schema_version: 4`、`profile: local` 及精确的 `model`、`database` 子块。其他顶层块被丢弃，不进入 Vanna 运行时。
3. 配置加载拒绝重复键、YAML anchor/alias/merge、未解析占位符、非 HTTPS 或携带 URL 凭据的模型地址；密钥使用敏感类型保存。
4. 启动服务器前必须完成三表预检；缺表、视图替代表或元数据不可用时，启动失败。
5. 每个用户回合必须先调用无参数 `search_xpd_schema`，得到当次完整 Schema 证据；同回合未搜索时，`run_xpd_sql` 必须拒绝执行。
6. SQL 只允许单条 MySQL `SELECT` 或带 CTE 的 `SELECT`，只能访问获批表和获批关系。
7. 查询在只读事务中执行，使用 MySQL 服务端执行超时；连接建立阶段可按配置重试，查询一旦开始不得重放。
8. UI 最多内联显示 100 行，探测第 101 行以标记截断；模型最多接收前 20 行。结果不可导出，不产生 CSV、Excel 或其他文件。
9. 对配置、Schema、SQL 拒绝、超时、数据库不可用返回稳定、脱敏的错误，不输出密码、原始数据库异常、完整结果或 SQL 日志。

## 5. 非功能需求

- 数据库基线：MySQL 8.0。
- 部署边界：单进程、单个本地操作者、两个演示角色、回环地址、本地开发用途；该 Cookie 选择器不是生产认证。
- 依赖隔离：通过 `vanna[xpd]` 安装 `openai`、`PyMySQL` 和 `sqlglot`。
- 配置文件权限宽于 `0600` 时给出警告，但不替用户修改文件或阻断启动。

## 6. 明确不做

- 生产认证、授权、行级权限、多租户或公网部署。
- 多副本共享会话、持久化历史或审计平台。
- CSV/XLSX/OSS 导出和任何文件落盘。
- `EXPLAIN` 扫描量策略、32 天日期限制、自动日期分段、中文别名强制。
- 动态纳入 `xpd-report-agent` 的全部表或复刻其完整 SQL Guard。
- 修改、复制或补全 `xpd-report-agent` 的真实配置。

## 7. 验收标准

- 合法外部 profile 可以被显式加载，未知顶层配置不会保留，敏感字段不会出现在对象表示或错误中。
- 三表都是 `BASE TABLE` 时预检成功；任一表缺失或元数据不可读时服务不启动。
- 合法单表聚合、CTE 和获批场次关联可执行；写 SQL、多语句、跨库、未知表/字段、歧义字段、通配符、危险函数和未验证 JOIN 被拒绝。
- 连接失败只在查询开始前重试；超时查询仅执行一次。
- 101 条及以上结果只显示前 100 条并标记截断，模型只接收前 20 条，导出关闭，运行目录无结果文件。
- `--xpd-config` 与 `--example` 互斥，XPD 模式拒绝非回环监听地址。

## 8. 运行前提

真实联调要求本机能够连接 profile 指向的 MySQL，且模型兼容 OpenAI Chat Completions API。当前设计和自动化测试使用合成元数据与模拟数据库验证安全链路；真实数据库不可达时，启动预检按预期失败，不能视为服务已完成线上联调。
