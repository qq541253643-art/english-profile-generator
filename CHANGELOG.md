# Changelog

所有值得记录的变更都会写入此文件。本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 和 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

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

[Unreleased]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.1.1...HEAD
[1.1.1]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/qq541253643-art/english-profile-generator/releases/tag/v1.0.0
