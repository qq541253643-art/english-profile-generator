# 阿里云香港共存部署验收：2026-11-07

## 目标

将英文账号资料生成器部署到阿里云香港 ECS `47.239.2.66`，使用独立子域名 `profile.kaige92.com`，保持现有 `panel.kaige92.com` 和 Docker Caddy 容器继续运行。

## 部署前事实

- ECS 地域为 `cn-hongkong-c`，实例类型 `ecs.u1-c1m2.large`，2 vCPU / 4GB。
- 根分区 79GB，剩余约 40GB；部署前 1 分钟负载约 `0.15 / 0.07 / 0.07`。
- 现有 Caddy、Next.js、Postgres、Redis 等服务通过 Docker Compose 运行，Caddy 占用 80/443。
- `panel.kaige92.com` 是现有面板域名；`profile.kaige92.com` 最初没有 DNS 记录。

## 实施

- 使用阿里云 DNS API 创建 `profile.kaige92.com -> 47.239.2.66` 的 A 记录，TTL 600 秒；没有改动现有 A 记录。
- 资料服务安装为独立 `english-profile-generator.service`，监听 6820，不安装 Nginx。
- systemd 限制为 `MemoryMax=512M`、`CPUQuota=100%`、`TasksMax=128`。
- Caddy 只新增独立子域站点块，并将上游 Host 固定为 `127.0.0.1`。
- Caddy 的单文件 bind mount 会保留旧 inode，因此运行时配置复制到 Caddy 可写卷后热加载；主机 Caddyfile 同步保留新站点块。
- 部署前配置备份位于 `/var/backups/english-profile-generator/Caddyfile.20261107-123001` 和 `Caddyfile.20261107-124009`。
- UFW 仅允许 `172.18.0.0/16` 访问 6820，公网继续拒绝该端口。

## 验收结果

- `https://profile.kaige92.com/__health` 返回 200，版本 `1.4.0`，共享保存 3 天、唯一性窗口 30 天。
- TLS 1.3 证书 `CN=profile.kaige92.com` 验证通过，HTTP 自动跳转 HTTPS。
- 头像端点返回 512×512 JPEG，600 张头像目录可读取。
- `https://panel.kaige92.com` 部署前后均返回 200，现有容器没有因部署重启。
- 从另一台公网服务器访问 `47.239.2.66:6820` 超时，公网端口未暴露。
- 自动更新 timer 为 active，手动执行更新器返回 `Already current: v1.4.0`。
- Edge 真实浏览器以 375×667 视口加载页面：显示 v1.4.0、生成按钮可用、无错误提示、页面宽度 375、无横向溢出。
- 共享列表和 30 天唯一性账本均为 0 条，没有留下测试资料或占用头像。
- 安装过程运行 15 个测试文件、41 项测试，全部通过；生产构建和 Safari 15 兼容检查通过。
- 部署后资料目录约 817MB，服务器根分区仍有约 39GB 可用；服务实际内存约 15MB。
- 共存部署提交为 `6617bc9`，GitHub CI run `42341855013` 通过。

## 运维入口

- 应用目录：`/opt/english-profile-generator`
- 服务：`systemctl status english-profile-generator`
- 更新 timer：`systemctl status english-profile-generator-update.timer`
- Caddyfile：`/opt/static-isp-proxy-manager/infrastructure/caddy/Caddyfile`
- 共存安装器：`deploy/server/install-existing-caddy.sh`
- DNS 工具：`deploy/server/set-dns-a.py`
