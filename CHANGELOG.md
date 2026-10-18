# Changelog

所有值得记录的变更都会写入此文件。本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 和 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [1.1.5] - 2026-10-18

### Fixed

- 本地服务在加固的 systemd 沙箱中无法枚举网卡时安全降级，避免服务器版反复重启。
- 服务器安装器会等待健康检查成功再申请 HTTPS 证书，并在失败时输出服务诊断信息。

## [1.1.4] - 2026-10-18

### Fixed

- 服务器更新器改用 GitHub 官方 `codeload.github.com` 源码分发节点，解决部分腾讯云网络访问 GitHub 归档地址超时的问题。

## [1.1.3] - 2026-10-18

### Added

- 顶部标题旁显示当前版本号，避免批量资料较多时必须滚动到页尾确认版本。
- 新增手机访问二维码：公网版编码当前 HTTPS 地址，本地版显示同一局域网地址。
- 新增 Ubuntu 服务器一键部署脚本，配置 Nginx、HTTPS、systemd 服务和每 15 分钟一次的 Release 自动更新。
- Windows 本地服务支持受限的局域网访问，并继续保留桌面快捷方式与自动更新。

### Fixed

- 修复 Random User 头像能预览但因图片响应缺少 CORS 许可而无法单独下载或打包 ZIP 的问题。
- 新增仅允许 `randomuser.me/api/portraits/` 的本地头像代理，并限制协议、域名、路径、响应类型、超时和最大文件大小。

## [1.1.2] - 2026-10-18

### Fixed

- 修复简体中文 Windows 的 PowerShell 5.1 将无 BOM UTF-8 启动器按系统 ANSI 编码读取，导致桌面快捷方式无法启动的问题。
- 自动更新下载的安装脚本在执行前统一转换为带 BOM 的 UTF-8。

## [1.1.1] - 2026-10-18

### Fixed

- 修复 Windows PowerShell 5.1 将 Release 校验文件读取为字节数组时，一键安装在 SHA-256 校验阶段中止的问题。

## [1.1.0] - 2026-10-18

### Added

- 新增 Windows PowerShell 一条命令安装。
- 自动安装独立便携 Node.js 运行组件，并创建桌面快捷方式。
- 双击快捷方式时检查最新正式 Release，在线自动更新后再用默认浏览器打开面板。
- 新增轻量本地静态服务、随机端口、健康检查和重复启动复用。
- Release 自动生成预构建 Windows 应用包及 SHA-256 校验文件。

### Changed

- GitHub Actions 增加 Windows PowerShell 语法检查，并升级官方 Actions 版本。

## [1.0.0] - 2026-10-18

### Added

- 完成 React + TypeScript 本地资料生成工作台。
- 接入 Random User API 1.4，包含超时、错误和本地模拟回退。
- 实现本地用户名、中英文 Bio 与 Web Crypto 强密码生成。
- 实现 IndexedDB 历史、批量操作、CSV/Excel 导出和头像 ZIP。
- 加入头像授权提示、本地授权头像上传和合规边界。
- 添加 Windows `start.bat`、自动测试与 GitHub Actions CI。

[Unreleased]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.1.5...HEAD
[1.1.5]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/qq541253643-art/english-profile-generator/releases/tag/v1.0.0
