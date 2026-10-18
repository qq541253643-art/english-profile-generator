# 英文账号资料生成器

English Profile Generator 是一个在 Windows 本地运行的中文网页工具，用于社交账号资料草稿、原型演示和界面测试。它生成的是虚构资料，不是真实身份。

## 一条命令安装（Windows 10/11）

打开 Windows PowerShell，粘贴下面这一条命令并回车：

```powershell
irm https://raw.githubusercontent.com/qq541253643-art/english-profile-generator/v1.1.4/install.ps1 | iex
```

安装器无需管理员权限，会自动完成以下操作：

- 下载经过 SHA-256 校验的最新正式版 Windows 应用包。
- 在 `%LOCALAPPDATA%\EnglishProfileGenerator` 安装独立便携运行组件，不修改系统 Node.js 环境。
- 在当前用户桌面创建“英文账号资料生成器”快捷方式。
- 安装完成后立即用默认浏览器打开本地面板。

以后双击桌面快捷方式即可使用。快捷方式会先检查 GitHub 最新正式 Release：发现新版本时自动更新后再打开；断网或检查失败时直接使用本地版本，不影响已有资料。更新状态保存在安装目录的 `update-status.txt`。

重复执行同一条安装命令可以修复安装或重新创建快捷方式。浏览器 IndexedDB 中的历史资料不会因为应用更新而被删除。

## 手机访问

- 公网服务器版会在面板中显示二维码，手机可在任意网络扫码打开。
- Windows 本地版检测到局域网地址时也会显示二维码，但要求手机与电脑处于同一局域网。
- 手机与电脑浏览器的历史资料分别保存在各自设备的 IndexedDB，不会上传或自动同步。
- 服务器版与 Windows 本地版使用同一 GitHub Release 版本，分别自动检查更新。

## 源码方式启动

如果需要参与开发，安装 Node.js 22 LTS 或更高版本后，在项目目录执行：


```bash
npm install
npm run start
```

Windows 用户也可以下载源码后双击 `start.bat`；这种方式用于开发，不会创建桌面快捷方式。

## Ubuntu 服务器部署

仓库提供 `deploy/server/install.sh`，用于 Ubuntu 24.04 服务器。它会安装经过 SHA-256 校验的 Node.js 22、Nginx 与 Certbot，配置 systemd 服务、HTTPS 和每 15 分钟一次的 GitHub Release 自动更新检查。

```bash
sudo bash deploy/server/install.sh profile.example.com
```

服务器只保存程序文件，不接收或同步浏览器 IndexedDB 中的资料与密码。更新脚本会先安装依赖、运行自动测试和生产构建，全部通过后才切换当前版本并重启服务。

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
- Windows 一条命令安装、桌面快捷方式、默认浏览器启动和 Release 自动更新。
- 公网服务器与本地双通道运行，面板显示手机访问二维码。

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
npm run version:patch   # 1.1.4 -> 1.1.5
npm run version:minor   # 1.1.4 -> 1.2.0
npm run version:major   # 1.1.4 -> 2.0.0
git push --follow-tags
```

`npm version` 会同步更新 `package.json` / `package-lock.json`、生成 Git 提交和 `vX.Y.Z` 标签。发布前请同步更新 `install.ps1` 中的版本号和 `CHANGELOG.md`。推送标签后，GitHub Actions 会构建 Windows 应用包、生成 SHA-256 校验文件并上传到对应 Release。

## 许可证

项目代码使用 [MIT License](./LICENSE)。远程 API 数据与照片不因本仓库许可证而获得任何额外授权。
