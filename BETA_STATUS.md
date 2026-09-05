# Leo Tree 1.0.0-beta.1

代码完成，ECS 服务和可信 HTTPS 已部署；公网 443 入口待放行后完成最终外网验收。当前不能把它标记为已经向公众可用。

源代码提交：cc8ba79。RC1 冻结点：v1.0.0-rc.1 / 65da948。

## 交付的产品变化

- 创建树先填卡片，可退出；名称空白取「未命名」，简介空白保留空字符串。模板创建沿用同一卡片。
- 新浏览器三屏极短引导，最后直接新建、选模板或导入；已有知识不会被引导覆盖。
- 首棵树成功保存后提示一次本地保存与完整备份。设置显示完整 ZIP 最近成功生成并开始下载的时间；JSON、救援导出、失败下载不计入。浏览器无法确认操作系统最终是否保存文件，界面已明确提醒检查下载。
- 首页网页版与本地版位置、独立下载页、Windows .exe 即将开放。
- 设置和下载页直接展示四项核心数据契约；完整九项说明继续保留。
- 默认错误文案使用普通中文；技术代码仅放在用户主动展开的排查详情中。
- 反馈入口已保留。用户答复「后续再说」，因此未虚构群地址或提交成功；可复制提纲，暂不发送。

## 回归结果

| 范围 | 结果 | 证据 |
| --- | --- | --- |
| 产品测试 | 61 PASS / 0 FAIL / 0 SKIP | release-evidence/beta-tests-release.txt |
| 平台测试 | 236 PASS / 0 FAIL / 4 明确 SKIP | 同上；缺少的生成文档检查沿用 RC1 范围 |
| 类型检查、lint、构建、独立运行依赖检查 | PASS；lint 保留原有 13 个 Fast Refresh 警告 | beta-typecheck-release.txt、beta-lint-release.txt、beta-build-release.txt、production-artifact-audit.json |
| 首分钟体验、创建、备份时间、错误文案 | 5 / 5 PASS，390 / 430 / 1280px | beta-browser-2026-09-05T15-09-37-821Z.json |
| 生产服务、账号、真实浏览器和服务重启 | 6 / 6 PASS | rc-production-2026-09-05T15-09-16-725Z.json |
| 上述生产服务数据安全子集 | 10 / 10 PASS | lt0-browser-2026-09-05T15-09-38-008Z.json |
| 上述生产服务学习流程子集 | 5 / 5 PASS | lt1-browser-2026-09-05T15-10-19-479Z.json |
| ECS 可信证书、续期演练、服务守护 | PASS | beta-cert-renew-dry-run.txt、beta-server-verification.txt |
| ECS 实际 Linux 服务，经 SSH 隧道 | 数据 10/10、学习 5/5、新体验 5/5 PASS | beta-ecs-tunnel-data.txt、beta-ecs-tunnel-learning.txt、beta-ecs-tunnel-first-minute.txt |
| ECS 运行文件完整性、真实服务重启 | 410 个文件全部 SHA256 相同；重启后 HTTPS 正常 | beta-remote-integrity-and-restart.txt、beta-runtime-manifest.json |

ECS 隧道验证 origin 为 http://localhost:8085，它证明实际服务器构建的行为，不证明公网 443 可达。公网直接访问首轮 0/5，全部在建立连接时超时，见 beta-browser-2026-09-05T15-08-32-166Z.json。服务内通过正常证书验证的 HTTPS 返回 200，安全组放行后仍必须补做直接外网验收。

所有路径均相对于 release-evidence（首行完整路径除外）。生产服务 6 项包含两个子集的汇总，不能将它们相加虚报为互相独立的用例数。

Beta 本次复验更新的通用截图和下载样本收在 release-evidence/public-beta/，索引为 ARTIFACT_INDEX.json；RC1 同名原文件已按标签内容恢复，避免旧报告的证据被新版截图替换。

本轮失败记录继续保留：初次引导返回位置已修复；恢复副本按钮文案变更后的旧选择器已更新；结构菜单焦点测试等待 Radix 关闭完成后再判断，仍检查真实焦点回到原按钮，未改数据实现。公网首次检查的超时记录不属于通过证据。

## 冻结与卫生

Tree–Section–Node 模型、进度算法、备份格式、导入冲突、附件 ownership、storage commit 和历史语义未修改。既有 src/lib/knowledge-tree 的 34 个文件按 SHA-256 与 RC1 逐一对照，全部相同，见 release-evidence/beta-frozen-core.json，可运行 node scripts/verify-frozen.mjs 复核；新增 first-minute.test.ts 仅是测试。APP_VERSION 正常更新到 beta.1，完整 ZIP 的格式版本未改变。

已归档 1,653 个可再生成文件，共 92,780,227 字节，见 docs/HYGIENE_REPORT.md；原上传、RC1 包和失败证据保留。

手机说明：本轮独立结果是桌面 Chrome 的触屏、视口、文字输入与键盘占用视口模拟；用户报告的真机、原生 IME、Safari 结果单列，不冒充代理自行完成。

本机 http://localhost:8080 已切到 Beta 构建，同一浏览器原有本机知识仍使用原地址。原 RC1 运行包保留，没有覆盖其文件。
