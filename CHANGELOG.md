# Changelog

所有值得记录的变更都会写入此文件。本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 和 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [1.4.0] - 2026-10-25

### Added

- 新增 600 张项目自有的 512 × 512 虚构合成人像图库，包含 420 张女性头像和 180 张男性头像；全部发布图均经过单脸检测、内容哈希和 SFace 相似度复扫。
- 新增版本化头像清单与本地头像服务，服务器版和 Windows 本地版使用同一套静态资源，不再依赖第三方头像源生成新资料。

### Changed

- 生成资料时按性别和虚构年龄从本地图库匹配头像，并继续使用服务器 30 天全局去重账本避免头像重复。
- 头像以原生 512px JPEG 提供，生成时即可使用，预览和下载不再等待客户端超分辨率处理。
- 页面继续明确标注人物为虚构 AI 合成人像，不宣称人物是真实美国人。

## [1.3.0] - 2026-10-20

### Added

- 新增“账号方向”设置，提供新闻解说、生活分享和新闻与生活混合三种选择。
- 新闻签名词库覆盖实时新闻、美国国家新闻、国际新闻、政治政策、经济社会、重大事件与每日热点，共 1152 组中英文对应组合。

### Changed

- “新闻解说”成为默认账号方向；新生成的 Bio 改为简短的新闻背景、事实影响和多角度解读表达，不再默认使用文艺生活句式。

## [1.2.9] - 2026-10-18

### Fixed

- 高清头像源在批量并发时偶发瞬时断连，服务器现在自动重试一次，不再要求用户手动重试。

## [1.2.8] - 2026-10-18

### Changed

- 合成人像改用与最终输出一致的原生 512px 源图，减少首次下载体积和 AVIF 转码耗时，同时保持 512 × 512 PNG 清晰度。
- 桌面批量头像准备并发数从 2 提高到 4，并更新头像兼容地址版本，避免浏览器继续使用旧的 1024px 缓存。

## [1.2.7] - 2026-10-18

### Fixed

- 多台设备同时生成导致服务器发现30天去重冲突时，页面现在自动刷新占用表并换一套姓名、头像和 Bio 继续生成，用户无需手动点击重试。
- 自动换新最多执行5轮；只有未使用组合确实不足或发生其他错误时才停止，避免无限循环。

## [1.2.6] - 2026-10-18

### Added

- 服务器新增独立的 30 天全局去重账本，显示姓名、用户名、头像以及中英文 Bio 在所有访客之间不重复；资料提前删除或在 3 天后过期也不会提前释放占用。
- 浏览器生成前会读取服务器去重范围并排除已用姓名、头像和 Bio，服务器保存时再次原子校验，避免多设备同时生成造成冲突。
- Bio 词库扩展为 1152 组自然中英文组合，可覆盖每月约 500 条资料的无重复需求。

### Changed

- 公开资料和密码仍只保存 3 天；30 天账本仅保存去重键与使用时间，不保存密码，并在到期后自动清理。

## [1.2.5] - 2026-10-18

### Fixed

- 服务器内部共享列表现在保存首次生成的密码，手机、电脑和其他设备查看同一条资料时保持一致，并随资料在 3 天后自动删除。
- Windows 本地历史同步保存生成时的密码，重新打开或恢复历史后不再随机更换；旧历史和旧服务器记录会一次性补齐固定强密码。
- 页面明确提示共享密码的可见范围和保留周期，提醒不得复用真实账号密码。

## [1.2.4] - 2026-10-18

### Added

- 每条资料的编号后显示精确到分钟的生成时间，统一按北京时间格式化为“2026年10月18日 14:57”；卡片和表格视图保持一致。
- 对损坏的旧历史时间安全显示“时间未知”，并增加北京时间跨日测试。

## [1.2.3] - 2026-10-18

### Fixed

- 合成人像请求加入 JPEG 兼容格式版本标记，绕过旧版 Safari 先前缓存的 AVIF 响应，升级后无需手动清理 iPhone 缓存。

## [1.2.2] - 2026-10-18

### Fixed

- 修复 iPhone 7 / iOS 15 无法解码合成人像源 AVIF、点击生成后整批失败的问题；本地启动服务和公网服务器现统一先把 1024px AVIF 转为高质量 JPEG，再交给浏览器生成 512 × 512 PNG。
- 头像格式转换使用跨平台 WebAssembly，Windows 安装包内置运行组件；仅在内存保留最近 24 张转换结果，不新增无限增长的磁盘缓存。
- Vite 开发环境与正式版本使用同一兼容头像链路，并新增 AVIF→JPEG 自动测试。

## [1.2.1] - 2026-10-18

### Fixed

- 将生产构建的 JavaScript 与 CSS 兼容目标锁定为 Safari 15，避免媒体查询被压缩成 iPhone 7 不支持的范围语法，修复手机扫码后仍显示桌面布局的问题。
- 发布构建新增 CSS 兼容性校验，若再次出现旧版 Safari 无法解析的媒体查询范围语法将直接阻止发布。

## [1.2.0] - 2026-10-18

### Added

- 服务器版新增所有访客共同可见的公共资料列表；非敏感资料保存 3 天，密码永不上传，创建者可提前删除自己的资料。
- 公共列表每 30 秒及窗口重新聚焦时同步，服务器每小时清理过期记录，并设置 5000 条与约 50 MB 双重上限。
- 服务器版单次生成限制为 1 或 10 条，手机仍固定 1 条；Windows 本地版继续保留 100/300 批量选项。

### Fixed

- Windows 桌面快捷方式改用 `wscript.exe` 无窗口包装器启动，消除双击后短暂闪出的 PowerShell 窗口。
- 快捷方式使用安装时生成的独立“EP”应用图标，并主动刷新 Windows 图标缓存，不再显示系统图片占位图标。

## [1.1.11] - 2026-10-18

### Fixed

- 修复 iPhone 通过明文公网 IP 访问时缺少 `crypto.randomUUID()`，导致服务器版无法生成资料的问题；兼容路径仍使用 Web Crypto 安全随机数，不使用 `Math.random`。

## [1.1.10] - 2026-10-18

### Added

- 新增 sigils-people 原生 1024px AI 合成人像源，按性别和年龄匹配，支持 300 条不重复头像。
- 合成人像使用 CC BY 4.0，批量 ZIP 自动附带 `CREDITS.txt`，图片画面不添加可见水印。
- Random User 请求改为先走同源服务器代理，降低中国大陆网络直连超时概率。

### Changed

- 头像处理前移到资料生成过程；只有 512 × 512 PNG 准备完成后才显示资料卡，点开大图时不再等待。
- 移除服务器 TensorFlow 运行依赖和头像放大缓存，避免更新时下载约 400 MB 依赖影响网站稳定性。
- 旧版 Random User 历史头像仍可查看，但新生成资料不再使用 128px 原图。

## [1.1.9] - 2026-10-18

### Fixed

- 从旧版服务器更新时，在检查“已是最新版”之前安装头像增强缓存的 systemd 配置，确保 iPhone 使用服务器 AI 增强。

## [1.1.8] - 2026-10-18

### Added

- 公网版在服务器端使用 ESRGAN Slim x4 按需增强 Random User 真人风格照片并缓存，iPhone 只需下载已完成的图片。
- Windows 本地版仍使用随应用分发的 ESRGAN Slim x4 模型；服务器不可用或不支持 WebGL 时会自动回退。
- 增强头像统一输出为 512 × 512 PNG，避免追求过大尺寸带来的伪细节；服务器缓存严格限制在 Random User 的 200 个男女照片编号内。

### Changed

- 新生成资料恢复使用真人风格照片，不再生成卡通头像；头像上传功能仍保持删除。
- 页面明确区分“AI 增强”和“原生高清”，避免把 128 × 128 接口原图误称为原生高清。

## [1.1.7] - 2026-10-18

### Added

- 新生成资料直接使用 1024 × 1024 本地合成 SVG 高清头像，不对应真人且无需手动上传。
- 浏览器历史自动保留最近 90 天、最多 500 条并限制在约 50 MB；Windows 日志、临时安装目录和服务器发布缓存均加入清理上限。

### Changed

- 删除头像上传功能；旧版 Random User 小尺寸照片只在既有历史中继续标为演示占位。
- 服务器只保留当前版本和一个回退版本，更新器增加互斥锁与自更新。
- Windows 自动更新改用编码命令执行，并避免安装完成时重复启动。

## [1.1.6] - 2026-10-18

### Added

- 手机端头像支持点击放大，并明确提示长按图片后保存到相册或下载目录。

### Changed

- 手机端固定为单条生成，隐藏批量数量、表格视图、去重、手动保存和批量导出；桌面端批量功能保持不变。

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

[Unreleased]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.2.9...v1.3.0
[1.2.9]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.2.8...v1.2.9
[1.2.8]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.2.7...v1.2.8
[1.2.7]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.2.6...v1.2.7
[1.2.6]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.2.5...v1.2.6
[1.2.5]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.2.4...v1.2.5
[1.2.4]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.1.11...v1.2.0
[1.1.11]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.1.10...v1.1.11
[1.1.10]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.1.9...v1.1.10
[1.1.9]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.1.8...v1.1.9
[1.1.8]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.1.7...v1.1.8
[1.1.7]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.1.6...v1.1.7
[1.1.6]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.1.5...v1.1.6
[1.1.5]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/qq541253643-art/english-profile-generator/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/qq541253643-art/english-profile-generator/releases/tag/v1.0.0
