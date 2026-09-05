# ECS 部署与维护

目标：https://8.130.33.10/ 。版本：1.0.0-beta.1，运行源代码 cc8ba79。

服务器内 HTTPS 返回 200、服务已启动。当前外网 TCP 443 超时，待阿里云安全组入方向放行 TCP 443 / 0.0.0.0/0 后复验。ECS root 登录密码不能管理阿里云账号的安全组；本轮未取得阿里云控制台登录会话。没有关闭 TLS 校验或降低知识提交保护来绕过问题。

## 布局

- 系统：Ubuntu 22.04.5，Node 24.16.0（官方 SHA256 核对后安装）。
- 应用：/opt/leotree/releases/beta1-20260905；current 符号链接指向此目录。
- Node：/opt/leotree/node-v24.16.0-linux-x64/bin/node。
- 用户：leotree；systemd 服务 leotree，只监听 127.0.0.1:3008；开机启动、失败重启。
- 服务配置：/etc/systemd/system/leotree.service；环境文件 /etc/leotree.env，root-only，随机服务密钥不写入代码或交付包。
- 运行数据：/var/lib/leotree。公开邮箱注册关闭；知识和附件仍只在用户浏览器里。
- Nginx：/etc/nginx/sites-available/leotree，已启用；80 保留 ACME 验证，其余转 HTTPS；443 终止 TLS 后转发本机应用。
- 原 Nginx 站点备份：/opt/leotree/backups/nginx-sites-20260905。既有其他站点和 Docker 应用保留；原有重复 server_name _ 警告不属于此次新增故障。
- 部署源配置在仓库 deploy/。应用压缩包 SHA256：8d784da09a60f7bf894ad9eb2be3fd5f1cf549fe1ab40d9c1d3bfa2f2f0ac4a4（13,321,577 字节），服务器解包前校验通过。
- 运行目录 DEPLOYMENT.json 记录源代码版本和全部 410 个文件的 SHA256；实际服务器逐文件复核 PASS，重启后可信 HTTPS 与 capability 检查 PASS，见 release-evidence/beta-remote-integrity-and-restart.txt。

## IP 证书续期

已签发 Let's Encrypt IP SAN 证书，路径 /etc/letsencrypt/live/8.130.33.10/。当前有效期至 2026-09-12 06:03:06 UTC。使用 Certbot 5.8.0 和 shortlived 配置。

IP 证书有效期短，需要自动续期；具体机制依据 [Let's Encrypt 官方 Certbot 指南](https://letsencrypt.org/2026/03/11/shorter-certs-certbot)。本实例 leotree-cert-renew.timer 每六小时运行并有最多五分钟随机延迟；Persistent=true。续期成功执行 systemctl reload nginx。已通过 renew --dry-run --run-deploy-hooks，并执行真实定时服务一次，Result=success、ExecMainStatus=0。真实运行时未到续期时间不会强制换证。

维护检查（服务器 root）：

```sh
systemctl status leotree leotree-cert-renew.timer --no-pager
systemctl list-timers leotree-cert-renew.timer --no-pager
journalctl -u leotree -u leotree-cert-renew.service --since today --no-pager
nginx -t
```

服务器原有代理环境指向不可用地址，Certbot unit 单独清空代理变量。未更改其他应用的代理配置。需长期保留 80 的 ACME 路径开放；证书演练首次签发曾遇外网次级校验超时，重试签发及后续续期演练成功。

## 更新和回退

每次将新构建 .output 打为独立归档，上传到 releases，先核对 SHA256，再解包到一个新的版本目录。不要覆盖旧目录。上传 deploy/ 后执行 `bash /opt/leotree/deploy/activate.sh 新版本目录名`。验证服务、HTTPS 和浏览器功能，最后记录 current 的目标和源代码提交。

更新前 current 目标写入 /opt/leotree/backups/previous-release.txt。要回退到一个确实存在且通过过验证的旧目录：

```sh
old_release=/opt/leotree/releases/已验证的旧版本目录
test -f "$old_release/server/index.mjs"
ln -s "$old_release" /opt/leotree/current.rollback
mv -Tf /opt/leotree/current.rollback /opt/leotree/current
systemctl restart leotree
curl --noproxy '*' --fail http://127.0.0.1:3008/api/auth/capabilities
```

这是首次 ECS 上线，目前没有前一版线上运行目录，不能虚称已演练线上历史版本回滚。需要整体撤下本次部署时，先停止 leotree，再从备份还原原 Nginx 站点并运行 nginx -t 后 reload；保留版本包和运行数据，勿删除浏览器知识。原 RC1 源码和运行包另存于桌面，可用于重新构建验证。

## 用户数据迁移

localhost、公网 IP、未来域名是不同浏览器来源。到旧地址下载完整 ZIP，再到新地址恢复；不会自动上传或同步。完整 ZIP 不含账号数据库或浏览器偏好，因此首次提示与上次备份时间也不跨地址迁移。

反馈链接后续由用户提供；Windows .exe 当前不发布。服务器运行包供维护使用，不是面向用户的 Windows 安装包。
