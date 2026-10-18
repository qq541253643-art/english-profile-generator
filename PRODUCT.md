# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

用户已委托技术选型：Windows 10/11 本地运行，优先 Vite + React + TypeScript + Tailwind CSS，无后端。

## Users

需要为社交账号资料草稿、原型演示和界面测试准备批量虚构英文资料的中文用户。

## Product Purpose

一次或批量生成完整的虚构美国社交账号资料，包括头像占位、英文姓名、用户名、虚构年龄与性别、中英文 Bio 和强密码，并支持历史、搜索、筛选和导出。成功标准是 Windows 用户可以双击启动，在本地浏览器完成主要流程。

## Positioning

本地优先、无付费 API、合规边界清晰；用户名、Bio 和密码由本地算法生成，远程 API 仅用于可明确标注来源的姓名、年龄、性别与照片占位。

## Operating Context

在 Windows Chrome 或 Edge 中使用。用户设置数量、性别、年龄、用户名风格和数字规则，生成后审阅卡片或表格，复制、单条重生成、删除、去重或导出 CSV/Excel/头像 ZIP。

## Capabilities and Constraints

- 数据源为 Random User API 1.4，只请求 `gender,name,dob,picture,nat`；断网时可切换至明确标注的本地模拟数据。
- 生成数量为 1、10、100、300；性别为随机、男、女；虚构年龄 18–45，带重试上限。
- 密码必须由 Web Crypto 生成，默认 20 位并覆盖四类字符；生成后随对应资料固定保存，以保证跨设备显示一致。
- Windows 本地历史和密码保存到 IndexedDB；服务器内部共享资料和密码保存 3 天。明文密码只有用户明确启用后才可导出，并需要风险提示。
- 头像只是远程 API 照片占位或用户明确上传的已授权素材，不宣称国籍匹配，不自动抓取社交平台照片。
- 不提供批量注册、风控规避、占用检查、冒名验证、政府证件或电话资料。
- 不要求云服务器、域名、付费 API 或 Docker。

## Brand Commitments

产品名为“英文账号资料生成器（English Profile Generator）”。界面使用简洁现代中文，明确区分“远程 API”和“本地模拟”状态，不制造占用或授权假象。

## Evidence on Hand

用户提供了 Random User API 官方文档与精确请求参数。没有付费服务、自有头像资产或商业授权声明，不得虚构。

## Product Principles

1. 合规语言可见，不把占位资料包装为真实身份。
2. 本地可用优先，网络失败不阻断草稿与界面测试。
3. 密码按敏感数据处理，仅按资料保留周期持久化，默认不导出且不应复用于真实账号。
4. 批量操作有进度、可恢复错误和明确结果反馈。
5. 生成资料必须在列表、表格和导出文件之间可稳定对应。

## Accessibility & Inclusion

优先键盘操作、可见焦点、语义标签、高对比文字、不仅依赖颜色表达状态，并适配 375px 宽移动端。
