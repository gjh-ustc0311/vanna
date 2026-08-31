# 返回中增加文件类型

1、xpd 的数据处理
- limit 从 100 改成 20000
- dataframe 最多返回top 30条
- 进入模型分析的条数限制在100条以内
- 在查询记录多于100条时，需要返回file类型（将link类型改成file类型）

2、file 的存储
- 本地：datas/files，必须开启，过期时间为一周
- oss：/Users/gjh/workspace/xpd/xpd-report-agent/configs/app-local.yaml，可以设计是否开启

3、file 名
- 由你来设计

4、前端展现
- 由你设计，如在 dataframe 后展现？

## 文档目录
- prd 文档：完善的prd 写到 ./docs/prds 目录
- plan 文档：设计文档 写到 ./docs/plans 目录
- 架构 / 代码 文档：./docs/archs 目录
