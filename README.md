# 英文账号资料生成器

English Profile Generator 是一个在 Windows 本地运行的中文网页工具，用于社交账号资料草稿、原型演示和界面测试。它生成的是虚构资料，不是真实身份。

## 一键启动（Windows 10/11）

1. 安装 [Node.js 22 LTS 或更高版本](https://nodejs.org/)。
2. 下载或克隆本项目。
3. 双击 `start.bat`。
4. 首次启动会自动执行 `npm install`，随后打开 Chrome/Edge 默认浏览器。

命令行方式：

```bash
npm install
npm run start
```

## 已实现功能

- 数量 1 / 10 / 100 / 300，性别随机 / 男 / 女，虚构年龄 18–45。
- 真实姓名、生活昵称、兴趣主题和混合用户名模板。
- 用户名长度、句点、下划线规则可配置；只做格式验证，不做平台占用检查。
- 本地英文 Bio 模板和对应中文翻译。
- 使用 `crypto.getRandomValues` 生成默认 20 位强密码；不使用 `Math.random`。
- 卡片 / 表格查看，搜索、筛选、批量选择、删除、去重和单条重生成。
- IndexedDB 保存非敏感历史。密码不保存，恢复历史时为当前会话重新生成。
- CSV / Excel 导出；只有手动启用后才导出明文密码列。
- 单张头像下载和 ZIP 打包，与表格序号、文件名一一对应。
- 上传本地已授权头像；未确认授权提示时禁用头像下载。
- API 超时、网络错误、字段缺失、年龄筛选重试上限和重复头像 URL 处理。
- 断网时用首字母占位图补齐，并在每条资料上明确标注“本地模拟”。

## 数据与合规说明

项目只请求 [Random User API 1.4 官方接口](https://randomuser.me/documentation)中的 `gender,name,dob,picture,nat` 字段：

```text
https://randomuser.me/api/1.4/?nat=us&results=1&inc=gender,name,dob,picture,nat
```

- `nat=us` 只影响 API 资料的国籍选择，官方文档明确说明照片不受国籍参数影响。本项目不宣称照片是美国真人。
- 远程头像只是演示占位，使用许可由素材提供方决定。正式使用前请替换为自己已获授权或具有可商用许可的素材。
- 不抓取社交平台用户照片，不生成政府 ID、电话或冒名验证资料。
- 不提供批量注册、风控规避或自动化平台操作。

## 技术栈

- Vite 8 + React 19 + TypeScript 7
- Tailwind CSS 4（设计令牌与布局样式保留在本地 CSS）
- IndexedDB (`idb`)
- `write-excel-file` 与 JSZip，均在导出时懒加载
- Lucide React 图标
- Vitest + Testing Library

## 开发与测试

```bash
npm run dev       # 开发服务器
npm test          # 运行自动测试
npm run build     # TypeScript 检查 + 生产构建
npm run preview   # 预览生产构建
```

测试覆盖 API 解析、年龄范围、用户名字符合法性与唯一性、Bio 多样性、强密码复杂度、Excel/CSV 导出和头像文件名映射。

## 版本管理

项目遵循 [Semantic Versioning 2.0.0](https://semver.org/lang/zh-CN/)，并在 [CHANGELOG.md](./CHANGELOG.md) 记录变更。

```bash
npm run version:patch   # 1.0.0 -> 1.0.1
npm run version:minor   # 1.0.0 -> 1.1.0
npm run version:major   # 1.0.0 -> 2.0.0
git push --follow-tags
```

`npm version` 会同步更新 `package.json` / `package-lock.json`、生成 Git 提交和 `vX.Y.Z` 标签。发布前请先更新 `CHANGELOG.md`。

## 许可证

项目代码使用 [MIT License](./LICENSE)。远程 API 数据与照片不因本仓库许可证而获得任何额外授权。
