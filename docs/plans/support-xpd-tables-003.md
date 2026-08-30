# Vanna 3.0 支持面精简实施计划

## 1. 实施原则

- 删除能力与所有公开入口、依赖、测试、CI 和文档引用在同一变更中完成。
- 保留 XPD 专用实现，不用通用 SQL Runner 重写其安全链路。
- 不把 Integration 裁剪扩大成 Component/SSE/前端协议重构。
- 构建和安装验收使用临时目录，不依赖仓库已有 `dist` 或过度安装的虚拟环境。

## 2. 工作分解

### A. 源码与公开接口

- 删除 examples、legacy、24 个非白名单 Integration、`src/evals` 和资料目录。
- 清理 `vanna`、`vanna.integrations`、`vanna.tools`、`vanna.servers` 聚合导出。
- 删除 Plotly 生成器和 `VisualizeDataTool`，移除默认工作流中的内置可视化检测
  和安装建议，保留 ChartComponent 协议。

完成标准：基础包与 6 个保留 Integration 可导入，删除路径不可导入。

### B. CLI 与版本

- 将 CLI 改为要求 `--xpd-config` 的单一 XPD 装配路径。
- 保留回环校验、启动预检、Server 配置和 XPD 日志开关。
- 将包、运行时和 OpenAPI 版本统一为 3.0.0。

完成标准：CLI help 和错误码符合新契约，XPD 启动测试通过。

### C. 依赖与测试矩阵

- 重建 optional extras 和 `all`，移除删除模块、Legacy-only 和未使用依赖。
- 将 `httpx` 移入测试/开发面，按保留 Integration 重建 tox envlist。
- 清理已删除模块的整文件测试、聚合测试类、pytest marker 和 CI secret。
- 增加源码支持矩阵和 wheel/sdist metadata 验证。

完成标准：依赖可解析，`all` 只聚合 6 个保留 Integration 的依赖。

### D. 文档与交付

- 新增 003 PRD、实施计划、架构文档。
- 重写 README 与 CONTRIBUTING，更新 FastAPI/SSE 文档。
- 删除失效迁移文档和图片；给 001/002 增加 003 取代提示。

完成标准：活动文档只宣传 3.0 支持面，历史文档明确标记时序。

## 3. 验证命令

```bash
tox -e py311-unit,py311-xpd
tox -e py311-agent-memory-sanity
tox -e py311-agent-memory-sanity
tox -e py311-mysql-sanity,py311-sqlite-sanity
tox -e ruff,mypy
```

```bash
cd frontends/webcomponent
npx tsc --noEmit
npx vite build
```

```bash
python -m build --outdir /tmp/vanna-build
python scripts/verify_distribution.py /tmp/vanna-build
```

## 4. 交付检查

- XPD 配置、Schema、SQL Guard、Runner、SSE、日志和历史存储无行为回归。
- CLI 没有不可运行的示例或 Demo 分支。
- 发行物只有白名单 Integration 和受支持 extra。
- 工作树不包含意外构建产物，也不触碰用户未跟踪的 raw 草稿或本地数据。
