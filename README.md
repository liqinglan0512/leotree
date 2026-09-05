# Leo Tree 1.0 Public Beta

Leo Tree 是保存和整理个人知识树的本机应用。围绕「查找 → 记录 → 实践 → 回顾 → 返回节点 → 修整结构」工作，保留纸墨视觉、我的 / 社区 / 设置导航和 SNN 模板。

本包是 **1.0.0-beta.1**。当前验证和部署进度见 [BETA_STATUS.md](BETA_STATUS.md)，服务器运维见 [ECS_DEPLOYMENT.md](docs/ECS_DEPLOYMENT.md)。RC1 报告和原交付包是历史证据，继续保留。原 review README 保存在 [docs/archive/REVIEW_SNAPSHOT_README.md](docs/archive/REVIEW_SNAPSHOT_README.md)。

## 启动

已验证环境：Windows、Node.js 24.16.0、npm 锁定安装、Chrome 152。在本目录打开 PowerShell：

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run test:build
npm.cmd start
```

访问 **http://localhost:8080**，选择「立即使用网页版」或完成三屏简短引导。开发模式是 `npm.cmd run dev`。启动前确认端口未被其他程序使用。知识按浏览器资料和网站 origin 保存；更换端口、localhost / 127.0.0.1 或浏览器都会进入不同空间。切换地址前先下载完整备份。以后从本机地址转到公网地址或域名，也需要用完整 ZIP 手动迁移。

便携运行包解压后只需 Node.js 24，在包根目录执行 `node --env-file-if-exists=.env.local start.mjs`，不需要安装源代码依赖。默认监听本机 127.0.0.1:8080。

## 账号可选

默认只提供本机空间，不显示未配置的账号表单。需要本机邮箱密码身份登录时，先停止服务，在源码根目录执行：

```powershell
npm.cmd run setup:account
npm.cmd start
```

脚本仅在 `.env.local` 不存在时创建配置，生成随机稳定密钥，将账号数据库保存到 `.local/account-db`；已有配置不会被覆盖。便携包执行 `node setup-local-account.mjs`。保护这些本机文件，不要提交或公开分享。账号配置不需要重新构建，需要重启服务；仅在配置与数据库探测通过后才显示表单。

账号仅代表登录身份。**登录不会自动把本机知识同步到云端；同一浏览器空间不按账号隔离。** 没有邮箱所有权验证、找回密码、短信验证或公开 OAuth 入口；邮箱密码身份不能证明邮箱已验证，也不能找回知识。退出、切换账号和服务重启不修改本机知识。

## 数据与恢复

[USER_GUIDE.md](USER_GUIDE.md) 和设置页提供相同的九项说明。JSON 只导出知识结构与元数据；携带附件必须用 **完整备份 ZIP**，包含 SHA-256 清单、工作区、实际附件及保留的旧园子资源，不含账号数据库、登录凭据和浏览器偏好。

读取异常进入恢复页，保留源数据。先下载原文或救援包，再预览、确认候选副本。保存失败保留内存草稿；关闭页面前完成重试或救援导出。导入默认创建独立新树，覆盖或合并必须查看冲突并确认。详见 [数据安全协议](docs/DATA_SAFETY_PROTOCOL.md)。

## 复验

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:build
npm.cmd run test:browser:production
```

`npm test` 依次执行产品和适用平台测试，自动纳入 `tree.test.ts`。精简包缺少的四项生成文档检查显式跳过，见 [平台测试范围](release-evidence/PLATFORM_TEST_SCOPE.md)。浏览器脚本使用已安装的 Chrome，启动独立生产服务（端口 8082、8083），使用合成数据、独立浏览器资料和临时账号数据库；不会连接个人账号。结果写入 `release-evidence/`，运行资料与凭据在已忽略的 `runtime/`、`profiles/` 中。

已有服务的单独检查是 `npm.cmd run test:browser:data` 和 `npm.cmd run test:browser:learning`，默认目标 http://localhost:8080；`RC_URL` 可指定本机测试实例。`RC_TEST_PORT_BASE` 可改验收端口，`RC_SERVER_ROOT` 可指向独立解压的运行包根目录。

390/430px 独立验收使用真实桌面 Chrome 的移动视口、触屏和输入，键盘占用通过缩小视口模拟。用户另外报告 RC1 已完成 Android/Chrome 真机、原生输入法和 Safari 实测；这属于用户提供的验收信息，不计作本轮自动化实测。公网验证情况单独记录在 BETA_STATUS.md。

首页和下载页已保留双版本入口；Windows .exe 显示「即将开放」。反馈目的地按用户要求暂缓提供，当前入口可复制反馈提纲，不会发送内容；获得真实 HTTPS 反馈地址后设置 `VITE_FEEDBACK_URL` 并重新构建发布。
