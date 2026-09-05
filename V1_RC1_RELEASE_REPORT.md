# Leo Tree v1.0 RC1 — Release closure report

验收日期：2026-09-05。工作仓库：`C:\Users\lijiahao\Desktop\LeoTree-v1.0`。版本：`1.0.0-rc.1`。分支：`codex/leo-tree-v1-rc1`。

## A. Executive verdict

**LT-0 = PASS；LT-1 = PASS；LT-2 = PASS。15 项 RC 验收全部 PASS。**

本轮已把审计发现转成实现与永久回归，并生成、解压、实际运行独立 RC1 包。未执行公网部署，也未把 RC1 宣称为已经上线的正式版。Gate 按 LT-0 → LT-1 → LT-2 的依赖推进，前置失败没有被后续功能豁免。

原审计 ZIP 保留不变：SHA-256 `9f04604a61d180c3b4c26d6ac8c2fbb5cd741ee9318023311b45429867e182cf`，173 个源文件。所有工作在独立目录完成，LeoAIStudio-build 未作为实现仓库。品牌、树模型、状态/优先级、模板边界、纸墨视觉和三项导航保留。

## B. F01–F15 disposition

| Finding | 状态 | 修复与永久证据 |
|---|---|---|
| F01 stale workspace overwrite | PASS | UI 改为语义命令；显式 treeId、字段前置条件、revision、Web Locks、最新状态重放。UI 状态不写知识。service.test.ts 与真实多标签页、上传+笔记+切树用例。 |
| F02 import semantics | PASS | 默认独立新树；恢复/合并分开，校验→冲突→预览→明确确认；过期预览拒绝。import-backup.test.ts 与浏览器未确认/确认导入。 |
| F03 conservative recovery | PASS | 失败分类、原文保留、只读迁移、候选验证、明确激活；不回退覆盖坏 v3。recovery.test.ts 与实际原文下载/恢复。 |
| F04 domain invariants | PASS | 统一 workspace/tree 校验，唯一 ID、父图无环、所有引用、元数据及顺序检查；普通 patch 不改结构/状态。invariants.test.ts、tree.test.ts。 |
| F05 reset semantics | PASS | 只重置当前学习状态与计时；保留笔记、复盘、实践、附件、结构和历史。invariants.test.ts、service.test.ts。 |
| F06 independent files | PASS | 新树、新附件 ID、实际复制字节；GC 检查有效引用；取消封面不落盘。files.test.ts、service.test.ts、浏览器复制/删除。 |
| F07 real backup | PASS | 完整 ZIP 含 manifest、工作区、实际文件及保留的园子资源；逐项哈希/计数校验后恢复。import-backup.test.ts 与空浏览器资料恢复。 |
| F08 storage failure | PASS | SAVE_FAILED / DEGRADED / RECOVERY_REQUIRED 可见；草稿和待写字节保留，重试/救援；输入合并提交。IDB abort、quota、序列化与救援 ZIP 测试。 |
| F09 authentication truth | PASS | 仅实际配置且数据库可用时显示邮箱密码；去掉假手机号、未接入入口、默认假身份；真实注册/退出/拒绝错密码/换账号/重启测试。 |
| F10 search and return loop | PASS | 搜索清除覆盖层后进入详情，完整路径、可见筛选、准确空态、新节点可达；节点→实践→回顾→节点全链路。learning-loop.test.ts 与三种屏宽浏览器循环。 |
| F11 test topology | PASS | 默认发现所有领域测试，含 tree.test.ts；产品/平台分开；缺失生成文档四项显式跳过，其余平台问题修正测试夹具后通过。 |
| F12 historical semantics | PASS | 不可变历史事实与当前诊断分开；稳定首次掌握和证据来源；历史不足显示 UNKNOWN。42 次状态变更、改名、重置、删除后的历史测试。 |
| F13 sibling order | PASS | 删除、新增、移动、换父节点后正规化 0..n-1；组合回归和真实目录末尾移动/新增。 |
| F14 public/community scope | PASS | 社区 Preview，仅返回我的园子；隐藏发布/留言/创建/封面，保留未来代码；旧 SNN 普通入口改为无脚本跳转，原件有归档哈希。 |
| F15 mobile/modal usability | PASS | 标题阅读态、有限缩进、44px 主要触点、视口内结构菜单；原生对话框 Escape、关闭、焦点进入/约束/返回；两种移动屏宽、最大字号、横屏与键盘占位。 |

领域测试位于 `src/lib/knowledge-tree/`。浏览器脚本：`scripts/rc-data-browser.mjs`、`rc-learning-browser.mjs`、`rc-production.mjs`。各 Gate 的逐项证据见 `release-evidence/LT0_ACCEPTANCE.md`、`LT1_ACCEPTANCE.md`、`LT2_ACCEPTANCE.md`。

## C. Data safety

每次领域写入在锁内读取最新版本；不同字段可安全重放，同字段冲突保留草稿并报告，异步回调绑定原目标树/节点。结构与文本不再被搜索、切页或旧快照覆盖。

知识使用本机 localStorage 的 `leo-tree-workspace-v1` envelope（format 1 / domain schema 3），文件在 IndexedDB `leo-tree-files-v1`。写入先完成新文件事务，再原子激活领域记录。读取异常不许可覆盖源数据。备份恢复先验证版本、引用、数量和哈希，再确认激活。

完整性测试用 1 树 / 1 节点 / 1 复盘 / 1 实践 / 2 附件核对完整树对象与每个 Blob 的 SHA-256；另有旧园子/封面往返测试。最终浏览器实际下载的备份含 **2 树、2 分区、1 节点、1 附件**，空资料恢复后笔记和真实字节一致；该浏览器样例不冒充已包含复盘/实践，后两项由上述完整性回归覆盖。

最后良好副本会保留其引用的字节一个恢复检查点；GC 只删除不再被 active、恢复副本、旧园子和待写草稿引用的文件，引用源读不出时暂缓回收。

## D. Domain invariants

节点身份固定为 `(treeId, nodeId)`；同树内唯一，跨树允许相同 nodeId。树 map key、当前树、分区、父节点、无自环/循环、同分区父子关系、日志/相关/前置节点引用及附件元数据统一验证。结构命令维护历史与顺序，导入/合并后的最终图再次验证。重置不会删除知识内容。

## E. Core learning loop

390px、430px 和 1280px 均实际完成：搜索深层节点 → 读标题 → 记录笔记/状态 → 创建自动关联实践 → 填写证据 → 返回节点 → 保存周回顾 → 从回顾返回节点 → 调整结构 → 重载验证。历史事实不会被今天的改名、重置或删除重写；当前滞留/P0 有明确的当前诊断标签。旧数据证据不足不输出确定的零。

## F. Mobile validation

| 场景 | 结果与范围 |
|---|---|
| 390 × 844 | PASS，完整循环，真实 Chrome 触屏事件与输入 |
| 430 × 932 | PASS，完整循环，真实 Chrome 触屏事件与输入 |
| 1280 × 900 | PASS，桌面完整循环 |
| 深层/长文本/长列表 | PASS，20 层、100 子节点、175 字符中文与连续英文长标题 |
| 最大字号/横屏 | PASS，产品 1.28 字号，844 × 390 与 932 × 430 |
| 键盘占位 | PASS，将可用视口高度缩至 400px，输入与草稿保留，符合用户明确接受的模拟范围 |
| 对话框与底部菜单 | PASS，焦点、Escape、关闭、返回焦点、取消不写入、菜单不越界与实际排序 |

证据：`lt1-browser-2026-09-05T13-45-33-429Z.json`，5 场景 PASS，0 FAIL，0 未捕获页面错误。截图在 `release-evidence/screenshots/`。已视觉检查代表性长标题、目录、键盘占位、横屏、设置说明和社区页面。**没有实体手机、原生软键盘/IME 或 iOS Safari 的验证声明。**

## G. Public contract

设置页与 [USER_GUIDE.md](USER_GUIDE.md) 用九个答案说明数据、账号、JSON、ZIP、复制、附件、进度、重置与社区。

账号仅用于身份：同一浏览器空间不按账号隔离，登录不上传、不转移、不自动同步知识。默认无账号配置时开放本机空间；可选邮箱密码只在稳定密钥、持久数据库、有效 origin 及实际 DB 探测通过后可用。退出/换账号/重启的工作区字符串及附件字节一致。

JSON 是结构与元数据导出；ZIP 才包含实际附件。进度是 `(done + 0.4 × doing) / all` 的自报加权节点进度，含父节点、每节点同权，与优先级无关。新增节点降低百分比不表示学习退步。社区是 Preview，未公开本地模拟社交行为。

## H. Test results

干净工作树：`C:\Users\lijiahao\Desktop\LeoTree-RC1-cleancheck-20260905-064056`。Node **24.16.0**、Chrome **152.0.7977.77**；npm 版本和锁文件哈希见 [RC_CLEAN_CHECK.json](release-evidence/RC_CLEAN_CHECK.json)。

| 实际命令 | 结果 |
|---|---|
| `npm.cmd ci` | PASS，原先无 node_modules / 私有配置；安装 422、审计 423 个包，报告 0 漏洞 |
| `npm.cmd run typecheck` | PASS，exit 0 |
| `npm.cmd run lint` | PASS，0 error、13 Fast Refresh warning |
| `npm.cmd test` | PASS，58 产品测试 + 236 适用平台测试；0 FAIL；4 项生成文档检查 SKIP |
| `npm.cmd run build` | PASS，干净 production Node build |
| `npm.cmd run test:build` | PASS，依赖都在包内，PGLite WASM/data 文件存在且有效 |
| `$env:RC_SERVER_ROOT='C:\Users\lijiahao\Desktop\LeoTree-v1.0-RC1-release\LeoTree-runtime'; npm.cmd run test:browser:production` | PASS，独立解压包 6/6 顶层检查，包含 data 10/10 和 learning 5/5 |
| `node --env-file-if-exists=.env.local start.mjs` | PASS，交付包入口实际启动；首页 HTTP 200、未配置认证不显示表单 |

四项 SKIP 仅涉及精简 bundle 中不存在的 AGENTS/OG 生成文档；无产品测试跳过。完整原因见 [PLATFORM_TEST_SCOPE.md](release-evidence/PLATFORM_TEST_SCOPE.md)。安装给出既有 Recharts 2 / ESLint 9 维护状态提示；本轮未为此迁移技术栈。

此前失败均保留：数据/学习阶段的实际缺陷及修复记录；首次生产包漏数据库资源；一次显式 external 但未收集 package；独立包验收脚本过早访问尚未提交的节点。最后一项改为等待已落盘附件并精确断言标题/笔记，未修改产品代码。修复后完整生产验收重新通过。

## I. Build results

干净构建基准：`916cdf2`。之后仅补验收脚本等待条件与证据/文档，**产品运行代码与构建基准一致**。Nitro 使用 node-server，完整收集 PGLite 包，避免依赖源码目录中的 node_modules。初次「编译成功但运行失败」没有被当作发布通过。

运行包：`LeoTree-v1.0-RC1-runtime.zip`，**411 文件，压缩 13,485,144 bytes，展开 33,571,172 bytes**。SHA-256：

`8d9f2ddd98184aae76e0bfb45642af4c5ba908706e4f54710c1f306246004237`

已执行 ZIP CRC、逐文件 manifest SHA-256、路径边界校验，并从独立解压目录运行全部生产验收。最终账号/本地数据复验证据：`rc-production-2026-09-05T13-44-34-935Z.json`。最终 15 项矩阵见 [RC_ACCEPTANCE.md](release-evidence/RC_ACCEPTANCE.md)。

源码/证据 ZIP、可恢复 Git 历史 bundle、完整提交表与最终交付哈希位于 `C:\Users\lijiahao\Desktop\LeoTree-v1.0-RC1-release`。包中不包含个人 .env、账号数据库、浏览器资料或 node_modules 开发依赖。

## J. Git commits

实现与验收提交如下。完整列表（含报告封存提交）由交付目录的 `GIT_COMMITS.txt` 和 history bundle 提供。

```text
a0ce687 chore(source): preserve Astra review bundle baseline
c32aa94 docs(release): map audit findings to gated RC1 acceptance
111e92f fix(domain): validate tree invariants and preserve content on reset
ba59730 fix(recovery): preserve source data and validate migration candidates
e5e594a fix(data): serialize commands across tabs and retain failed drafts
22a1c6e fix(files): preserve independent bytes and cancel cover drafts safely
80118d2 feat(backup): validate import previews and restore hashed ZIP backups
049f70b fix(data-ui): route all knowledge edits through validated commands and recovery
efd84de test(data): verify LT-0 in Chrome and retain failure evidence
ca311f0 fix(learning): retain historical facts and stable first completion evidence
b6aee1e test(tooling): separate product checks from generated platform fixtures
3370d16 fix(learning-ui): close practice and review loop across mobile viewports
1392fa5 fix(public): require durable accounts and narrow the RC1 product contract
916cdf2 docs(release): record production gates and publish the RC1 usage contract
41f1ed3 test(release): verify clean extracted runtime and restart persistence
```

每阶段提交都有对应范围的绿色检查；初始失败记录保留，未用大型整体替换 commit 隐藏实现。未推送、未部署。

## K. Remaining known limitations

- 本机数据仍会受到清除网站数据、临时浏览结束或设备故障影响；完整备份必须由用户定期下载。更换 origin 或浏览器资料需要备份迁移。
- 当前只实测 Windows + 桌面 Chrome。移动视口/键盘占位模拟不证明实体设备、原生 IME 或 Safari；缺少 Web Locks 的浏览器进入 DEGRADED，不能保证安全写入。
- 账号没有邮箱所有权验证、密码找回、短信/OAuth，也没有知识云同步和账号间知识隔离。持久账号数据库与密钥需另行保管，知识 ZIP 不包含它们。
- 历史旧数据不能补造过去从未保存的事实；UNKNOWN 保留。附件限 PNG / Markdown / PDF / DOCX，单个 10MB。
- 没有离线可用、Vercel/公网部署或其他数据库托管环境的验收声明。社区仍暂未开放。
- 13 个 Fast Refresh warning 和四个缺失生成文档 SKIP 均已列明；没有将它们冒充运行功能验收。

## L. Final verdict

V1_RC_READY
