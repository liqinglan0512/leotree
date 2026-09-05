# 历史记录：Leo Tree v1.0 RC1 — V1_RC_READY

以下是 RC1 发布时的记录。**当前 Public Beta 状态以 [BETA_STATUS.md](BETA_STATUS.md) 为准**，部署维护见 [docs/ECS_DEPLOYMENT.md](docs/ECS_DEPLOYMENT.md)。原 RC1 交付包不作覆盖。

LT-0: PASS. LT-1: PASS. LT-2: PASS. RC acceptance: 15/15 PASS.

58 product PASS; 236 applicable platform PASS; 0 FAIL. Four unavailable generated-document checks explicitly SKIP; product skips 0. Typecheck and lint exit 0, lint 13 Fast Refresh warnings.

Clean install/build: release-evidence/RC_CLEAN_CHECK.json, commit 916cdf2. Independently extracted production runtime: rc-production-2026-09-05T13-44-34-935Z.json 6/6, including data 10/10 (lt0-browser-2026-09-05T13-44-58-082Z.json), learning 5/5 (lt1-browser-2026-09-05T13-45-33-429Z.json), real account transitions and actual browser/server restart. Later changes are test/documentation only; runtime source matches the clean build.

Mobile scope: real desktop Chrome 390/430px touch/input and keyboard-occupied viewport simulation, as explicitly accepted by the user. No physical phone/native IME/iOS Safari claim. Failed runs remain preserved.

Full A–L report: V1_RC1_RELEASE_REPORT.md. All fifteen checks: release-evidence/RC_ACCEPTANCE.md. User guide: USER_GUIDE.md. Delivery folder: C:\Users\lijiahao\Desktop\LeoTree-v1.0-RC1-release. Runtime ZIP was verified and extracted there; local app is available at http://localhost:8080. No public deployment.
