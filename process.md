# 开发过程记录

## 2026-09-01：项目初始化与 Runtime 配置导入

- 目标：参考 `~/bibit-security-plugin`，在本仓建立 Bibit Runtime 插件项目，把 `bianbu-agent-runtime` 已有配置和管理 API 通过 Bibit settings UI 暴露出来。
- 范围：Runtime 状态、部署/运行参数、Provider、Agent、MCP；生产通过 Bibit `service:runtime`，开发通过 Dev Host mock。
- 已完成：建立 Feature 插件 manifest、React settings 页面、Runtime operation/DTO 合同、Dev Host mock、`/bibit/v1/invoke` adapter、systemd unit 和 external-services registry 文件。
- 验证：先写 `tests/test_runtime_adapter.py` 并确认缺实现时失败；实现后 `python3 -m unittest discover -s tests -v` 通过 2 项。
- 验证：`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`、`git diff --check` 通过；Playwright 打开 `http://127.0.0.1:5173/?mock=1` 可见 Runtime 配置页且 console error 为 0。
- 验证：`npm run keygen && npm run build:plugin` 生成开发签名包；本仓 vendored Bibit SDK 包同步了动态 `service:<id>` capability schema/type/dev-host 支持，并使用 `*-runtime.tgz` 文件名保证 `npm ci` 可复现。
- 验证：K3 `bianbu@10.0.91.146` 上安装 adapter systemd unit、`/etc/bibit/external-services.d/runtime.json` 和 `/etc/bibit/feature-capability-grants.d/runtime.json` 后，`status.get.v1`、`settings.get.v1`、`providers.list.v1`、`agents.list.v1`、`mcps.list.v1` 均通过 `http://127.0.0.1:5186/bibit/v1/invoke` 成功读取真实 `bianbu-agent-runtime` 数据。
- 遗留：K3 当前未安装 Bibit 桌面宿主包，也未发现 Bibit GUI 进程或安装目录；因此板上真实 Bibit 页面打开验证暂不可执行。已在 `~/bibit` 增加 runtime grant/registry 测试覆盖 settings contribution 会进入 `/settings/features/runtime`。
- 下一步：合并到 `main` 并 push；完成后再按 `bianbu-dev-import-package` 做 CI/手动 Debian 打包。

## 2026-09-01：Mock Dev Host 验证与 K3 Vite 启动

- 目标：参考 `~/bibit-agenthub-plugin/docs/development-and-deployment-guide.md` 11.2 Mock 模式，补齐 Runtime 插件的 `npm test` 入口，验证 Dev Host 读取真实 Manifest/Feature Module 并使用 `dev/main.tsx` 内存 Mock，在 K3 上启动页面。
- 改动文件：`package.json` 新增 `test` script 指向 `npm run test:adapter`；`dev/main.tsx` 增加第二条 Mock Agent `runtime-debug-agent`。
- 验证命令：本机执行 `npm test`、`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`、`git diff --check`，全部通过。
- 验证结果：Playwright 打开 `http://127.0.0.1:5173/?mock=1` 可见 Dev Host 真实 contribution `Settings · settings`；概览加载完成后资源清单显示 2 个 Agent；Agent 标签页可见 `默认助手` 和 `运行时诊断助手`；运行参数页把 `启用自进化` 打开并把 `自进化空闲分钟` 改为 15 后保存，再次进入仍保持 Mock 值；console error 为 0；未知 operation 在 `dev/main.tsx` 默认分支抛出 `Unknown operation`，adapter 测试覆盖 unknown operation 返回 `incompatible`。
- K3 验证：同步源码到 `bianbu@10.0.91.146:~/bibit-runtime-plugin` 后执行 `npm ci`、`npm test`、`npm run typecheck`、`npm run build:dev`，全部通过；已在 K3 启动 `npm run dev -- --host 0.0.0.0`，Vite 监听 `http://10.0.91.146:5173/`，Mock 页面地址为 `http://10.0.91.146:5173/?mock=1`。
- 遗留：K3 当前只检测到 SDDM greeter，没有 `bianbu` 的已登录图形桌面会话，也没有可用 `DISPLAY`/`WAYLAND_DISPLAY`；远程执行 Chromium 打开 URL 失败，错误为无法连接 Wayland display。需要先在 K3 物理桌面登录 `bianbu` 后，再打开 `http://10.0.91.146:5173/?mock=1`。

## 2026-09-02：Runtime Console 非聊天界面扩展

- 目标：把 `bianbu-agent-runtime` 自带 Console 中除聊天对话、会话历史、trajectory、approvals、输入框、附件、语音和 slash command 外的管理/配置/监控/诊断界面迁入本插件。
- 改动文件：`docs/superpowers/specs/2026-09-02-runtime-console-scope-design.md`、`docs/superpowers/plans/2026-09-02-runtime-console.md`、`src/runtime-contracts.ts`、`deploy/real_runtime_proxy.py`、`tests/test_runtime_adapter.py`、`dev/main.tsx`、`src/RuntimeSettingsPage.tsx`、`src/runtime.css`、`package.json`。
- 验证命令：本机执行 `npm test`、`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`、`git diff --check`，全部通过；K3 执行 `npm test`、`npm run typecheck`、`npm run build:dev`，全部通过。
- 验证结果：Playwright 打开 `http://127.0.0.1:5173/?mock=1`，Runtime Console 可见；配置、Agent、模型、能力、MCP、包、插件、执行、监控、日志、API Capture 标签页均可渲染；插件页可见 `bianbu.bibit.intent`，其 Plugin Console 可见 Bibit Intent 模型下载/启动/停止/取消动作；console error 为 0。
- 遗留：K3 图形桌面仍需用户在物理机登录 `bianbu` 后才能远程打开浏览器；K3 Vite 服务继续运行，可使用 `http://10.0.91.146:5173/?mock=1` 验证页面。

## 过程记录规则

- 每完成一个功能阶段，在本文件追加日期、改动文件、验证命令、结果和遗留问题。
- 每次开始新的开发工作前，必须先读取本文件，确认当前阶段和遗留问题。

## 2026-09-15：Runtime MCP Hermes 风格命令扩展检查

- Runtime worktree 新增本地 stdio/远端 HTTP-SSE MCP CLI、header/OAuth token 生命周期和 `~/.hermes/.env` 凭据读取；插件现有 `mcps.list.v1`/健康状态消费合同无需变化。
- 本插件未修改源代码、DTO、adapter、mock 或测试；仅完成联动检查。
- 遗留：Runtime 合并、K3 安装自测和发布流水线由 Runtime 仓库负责。

## 2026-09-07：Runtime 独立安全设置内容

- 目标：把 Runtime Console 当前 securityd 管理能力作为独立 Bibit settings 内容提供，包括系统调用策略与拦截审计、Agent 能力和安全模式、DLP、审计哈希链、Token 配额与网络策略。
- 改动文件：`src/RuntimeSecurityPage.tsx`、`src/security-runtime.css`、`src/runtime-contracts.ts`、`dev/main.tsx`、`deploy/real_runtime_proxy.py`、`deploy/runtime.json`、`deploy/feature-capability-grants-runtime.json`、`tests/test_runtime_adapter.py`。
- 验证命令：`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`、`git diff --check`。
- 验证结果：类型检查与 Dev 构建通过；Runtime adapter 6 项测试通过，其中新增测试覆盖独立 security envelope 转发和错误 service 拒绝；K3 已确认 `http://127.0.0.1:9899/security-api/invoke` 可通过 `agents.list.v1` 返回真实 Agent。
- 部署决策：插件请求 `external-service:security`；`security` registry 指向同一 5186 adapter，由 adapter 透明转发到 Runtime 已安装且直连 `bianbu_security_client` 的 security bridge，不依赖 K3 上未安装的 5185 security plugin adapter，也不使用 Runtime `/api/v1/security` REST 合同。
- 遗留：settings contribution 注册、完整页面 UI 测试、K3 部署后的 5186 security service 与真实 Bibit 页面验证由本次 settings 导航主任务统一完成。

## 2026-09-07：普通设置管理/监控分组与 K3 合同对齐

- 用户确认：把截图全部 14 个入口放到 General 所在的普通设置列表，保留可折叠「管理」「监控」标题；使用 worktree，在 K3 调试、自测后合入 main/push，再用 bianbu-dev tag 触发 CI。
- Worktree：插件 `/home/liudecheng/worktrees/bibit-runtime-settings`；宿主 `/home/liudecheng/worktrees/bibit-settings-host`。宿主基于最新 origin/main 重新整合。
- 改动文件：`bibit.feature.json`、`src/feature.tsx`、`src/RuntimeSettingsPage.tsx`、`src/RuntimeSecurityPage.tsx`、`src/security-runtime.css`、`src/runtime-contracts.ts`、`dev/main.tsx`、`deploy/*`、`tests/test_runtime_adapter.py`、`tests/ui/*`、`vitest.config.ts`、`package*.json`、`vendor/*`、`debian/changelog`、`debian/rules`、`debian/postinst`、`README.md`、本次 design/plan。
- 独立审查修复：Plugin Console 读取不再刷新导致丢失选中内容；Bibit 模型采用真实字符串动作列表和 model_type payload；安全审计读取 bridge 的 value envelope；syscall 策略加载失败禁止保存，架构切换丢弃过期响应。
- K3 实际接口发现与修正：通用 packages 不支持 mcp/plugin，移除这两个页面的无效附加请求；Runtime 状态按原 Console 使用 runtime/workers，未修改 bianbu-agent-runtime 源码或记录。
- 本机验证：`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`（8/8）、`npm run test:ui`（13/13）、`npm run build:plugin`、`git diff --check` 通过。完整 Mock 浏览器遍历 14 页，无 pageerror。
- K3 真服务验证：由 K3 worktree adapter 提供页面，通过 SSH 转发 5194 打开；14 页均可进入，Bibit 模型 2 个、Worker 3 个，pageerror 0；新增 security 服务真实 agents.list 成功。安全子项的后续精查结果见下方记录。
- K3 打包：在 linked worktree 执行 `dpkg-buildpackage -us -uc -b`，生成 `bibit-runtime-plugin_0.1.11_all.deb`，退出 0。首次 npm 9 override 解析失败，已统一 SDK 0.3.0 tarball 并取消 override 后通过。
- 待完成：最终插件包安装、实际 Bibit 桌面菜单验证；宿主 K3 Rust/GTK 构建；main 合入、远端版本核验、bianbu 发布 tag 与 CI 记录。

## 2026-09-07：独立审查与真实安全后端边界

- 最终补充改动：保留请求失败后的表单输入，刷新/提交时禁用操作；Plugin Console 可读取真实字符串动作及模型 descriptor；错误状态增加 alert 语义。
- K3 安全子项验证：能力策略、DLP、审计、配额/网络真实读取成功。syscall 子项所需 get_syscall_policy 等方法在已安装 securityd 0.1.17 中不存在（客户端、D-Bus/UDS 和现有安全源码均无此 API），不是重置数据能解决的问题。
- 决策：按项目「真实服务不可用时明确报错」要求，syscall 页面显示「当前 securityd 不支持系统调用策略与独立审计」，禁止保存/重置/编辑。未伪造成功、未在插件中私建不会被执行的策略存储、未扩大到实现安全后端。
- K3 环境：宿主开发依赖安装触发 Runtime 重启；观察到三个 Worker 依次预热，随后 runtime/workers 恢复 HTTP 200 / AGENT_READY，未修改 Runtime 源码或数据。
- 宿主独立审查：core/section 的 TS、JSON Schema、Rust 合同一致，动态安装的插件使用当前 registry；菜单测试 16/16 通过，无高/中风险遗留。

## 2026-09-07：按最终确认调整分组层级并补充双语验收

- 用户最终确认：点击设置后，常规设置项下方出现与 Features 同级的「管理」「监控」标题，各自包含截图中的 10 / 4 个入口；标题可折叠。此前“插入 General 后普通入口”的理解已更正。
- 改动文件：宿主 `web-app/src/containers/SettingsMenu.tsx`、对应菜单测试；插件 `README.md` 与本次 design/plan 修正描述。
- 验证命令：宿主 `yarn test:web web-app/src/containers/__tests__/SettingsMenu.test.tsx`、`yarn workspace @janhq/web-app exec tsc --noEmit`、`git diff --check`。
- 验证结果：新增位置与同级 DOM 断言先失败，调整布局后菜单 16/16 通过；类型检查与 diff 检查通过。上一轮最终插件检查全部通过（adapter 8/8、UI 15/15、签名包成功）。
- 新增交付条件：分组、菜单和页面支持中英文并跟随宿主；在 K3 实际 Bi-bit 应用检查，而非仅在网页预览检查。已取得 K3 当前旧应用截图作对照；现有进程仍显示旧插件，不算新版验证完成。
- 进行中：插件双语文案；宿主语言 prop 和菜单 locale 首次加载；K3 Rust 构建。仍未完成 main/push/tag 发布。

## 2026-09-07：Runtime 设置插件中英文国际化

### 改动文件

- `src/runtime-i18n.tsx`：新增插件内部 `en` / `zh-CN` 文案资源、`props.language` 归一化和翻译 Provider；语言变化会重建页面状态，避免异步操作完成后残留旧语言文案。
- `src/RuntimeSettingsPage.tsx`、`src/RuntimeSecurityPage.tsx`：全部插件自有可见文案改由宿主传入的 `FeatureSettingsProps.language` 驱动；真实 Runtime/securityd 错误原文继续原样显示；保留安全页加载失败禁用、架构竞态和 syscall 合同不匹配提示。
- `src/feature.tsx`、`bibit.feature.json`：FeatureModule 导出扁平 `en` / `zh-CN` locale 资源；14 个设置入口及“管理/监控”分组补全 `titleKey`，英文 fallback 可在 locale 加载前安全显示。
- `dev/main.tsx`：DevHost 传递正式 `language` prop，并提供 English/中文切换控件；`?lang=zh-CN` 可指定初始语言。
- `tests/ui/settings-pages.test.tsx`、`tests/ui/security-page.test.tsx`：新增宿主语言 prop 实时切换、正式 locale 键、全部菜单/分组 key 可解析回归；既有业务与错误回归继续通过。
- `package.json`、`package-lock.json`、`vendor/*-locales.tgz`：使用包含正式 language prop 与 DevHost language 支持的本地 0.3 SDK 包（由宿主当前源码重新打包）。

### 验证

- `npm run typecheck`：通过。
- `npm run build:dev`：通过，Vite 生成 dev bundle。
- `npm run test:adapter`：通过，8/8。
- `npm run test:ui`：通过，18/18。
- `npm run build:plugin`：通过，生成 `artifacts/runtime-0.2.0.bibit-plugin.tgz`。
- `git diff --check`：通过。

### 遗留问题

- 当前 K3 安装的 securityd 客户端仍缺少 syscall policy/audit 方法；插件会按真实能力显示明确的中英文不可用提示并禁用策略编辑，其余安全页继续使用真实 security bridge。

## 2026-09-07：最终整体验证与安装前缺陷修复

- 宿主前端最终全量 `yarn test:all`：340 个文件、3786 项测试全部通过；`yarn build:web` 通过；`yarn lint` 0 error、1 条已有组件导出警告。
- 全量测试发现 upstream 已有 fileTransfer/serviceJobs/sheet 测试与当前合同/窗口样式不符，核验对应实现和测试与 origin/main 相同后，仅更新测试，不添加兼容接口；main bootstrap 测试补齐真实边界 mock 并验证首屏等待导航翻译加载。
- `yarn test:features` 中 JS 81/81、boundary 和类型检查通过；最后 native interop 因本机无 cargo 无法执行。`yarn test:packaging:linux` 28/29，最后 Rust guard 编译因本机无 rustc 无法执行，交由 K3 原生环境完成。
- K3 首轮 Rust 签名安装测试发现 Navigation 缺少 serde camelCase 映射，导致 titleKey 等被当作未知字段拒绝；宿主已修复，原生回归进行中。
- 插件最终独立审查发现：签名入口需显式导出 pluginLocales；语言切换不能 key-remount 清空草稿和 busy；少量英文固定文案需补中文。均在修复并补测试，不将先前 DevHost 成功当作真实应用验收。

## 2026-09-07：国际化独立审查修正

### 改动文件

- `src/plugin.tsx`：签名插件入口显式导出 `pluginLocales`，使生产 trusted loader 可在设置页首次打开前注册菜单资源。
- `src/runtime-i18n.tsx`、`src/RuntimeSettingsPage.tsx`、`src/RuntimeSecurityPage.tsx`：补齐本地 capability 不可用错误、日志空态、生效插件、MCP Server、Worker Pool、包标题、Agent 绑定、Capture 状态等固定文案；移除语言变化时整页重挂载，保留未保存草稿和正在执行的操作状态。
- `tests/ui/settings-pages.test.tsx`、`tests/ui/security-page.test.tsx`：覆盖本地错误翻译，以及切换宿主语言时保留未保存 Provider 草稿和 busy 状态。

### 验证

- `npm run typecheck`：通过。
- `npm run build:dev`：通过。
- `npm run test:adapter`：8 项通过。
- `npm run test:ui`：19 项通过。
- `npm run build:plugin`：通过，生成 `artifacts/runtime-0.2.0.bibit-plugin.tgz`。
- `tar -xOf artifacts/runtime-0.2.0.bibit-plugin.tgz dist/plugin.js | tail -c 1200`：确认生产 ESM 包含命名导出 `pluginLocales`。
- `git diff --check`：通过。

### 遗留问题

- 当前 K3 securityd 仍缺少 Runtime 合同要求的 syscall policy/audit client 方法；页面继续明确提示升级且禁用相关编辑，未模拟生产成功。

## 2026-09-07：已安装 Bi-bit 的插件开发文档与签名一致性

- 用户要求补充安装 bi-bit 后的插件开发方式。新增 `docs/plugin-development.md`，包含 worktree、Dev Host 中英/mock、K3 真服务预览、UI bundle 安装、Debian adapter 部署、版本与密钥、Host 能力授权和真实应用验收。README 增加入口，替换 `debian/README.Debian` 空模板。
- 文档明确区分宿主 Extensions 的 Feature 安装与 Runtime 管理页面的后端插件管理；日常 UI 插件开发不需重编译宿主，新增平台合同才需升级宿主。
- 检查发现 `build:plugin` 固定 key ID 与 `keygen`/实际 trust store 不一致，已将 package.json 构建 key ID 统一为 `runtime-development`，不更换私钥。后续最终签名包需核验 key ID 和公钥验签。
- `git diff --check` 通过；打包安装流程的最终实测结果仍待 K3 宿主包完成。

## 2026-09-07：语言切换与业务读取解耦

### 改动文件

- `src/runtime-i18n.tsx`：`useRuntimeI18n` 返回身份稳定的翻译回调，并通过 ref 使用当前语言资源；语言变化只更新渲染文案，不再改变 Runtime/security 请求回调身份。
- `tests/ui/settings-pages.test.tsx`：新增运行参数与部署 JSON 草稿回归，确认 `en` 切换 `zh-CN` 后草稿保留且 `settings.get` 只调用一次。
- `tests/ui/security-page.test.tsx`：新增 syscall 未保存选择回归，确认语言切换后选择保留且策略只读取一次。

### 验证

- `npm run typecheck`：通过。
- `npm run test:ui`：21 项通过。
- `npm run build:dev`：通过。
- `npm run build:plugin`：通过，使用统一签名 key ID `runtime-development` 生成 `artifacts/runtime-0.2.0.bibit-plugin.tgz`。
- `git diff --check`：通过。

### 遗留问题

- 当前 K3 securityd syscall client 合同缺失问题维持明确错误与禁用编辑策略，等待匹配 Runtime 合同的 securityd 软件包。
- 开发指南也通过新增 `debian/docs` 随插件 Debian 包安装到 `/usr/share/doc/bibit-runtime-plugin/`，方便已装包的 K3 用户查阅。
- 最终产物核验：对 `artifacts/runtime-0.2.0.bibit-plugin.tgz` 使用 Node crypto 与当前公开 trust store 验证 Ed25519 签名和全部文件 SHA-256，通过；keyId=runtime-development，14 个 settings contributions，生产 ESM 含 pluginLocales 导出。

## 2026-09-07：最终插件包 K3 手动安装验证

- 源码提交：`a5e710eff37d47107b1fb881c43d310af19be36a`，K3 linked worktree 同步到该精确提交。
- K3 `dpkg-buildpackage -us -uc -b` 退出 0；构建阶段 typecheck、Dev build、adapter 8/8、UI 21/21 和签名构建通过，产物 `bibit-runtime-plugin_0.1.11_all.deb`。
- 手动重装：`apt-get install --reinstall .../bibit-runtime-plugin_0.1.11_all.deb` 退出 0；`dpkg --audit`、`dpkg -V bibit-runtime-plugin` 无输出；adapter 和 Runtime 均 active，adapter 监听 127.0.0.1:5186。
- 安装后的 bundle 独立复制回本机验签：Ed25519 签名和全部文件 hash 通过、keyId=runtime-development、14 settings、pluginLocales ESM 导出存在。
- 开发指南已实证安装为 `/usr/share/doc/bibit-runtime-plugin/plugin-development.md.gz`。
- 待完成：宿主 0.1.4 包安装、真实 Bi-bit 全页面及中英验收、main/push/tag/CI。插件安装成功不等于宿主界面验收完成。

## 2026-09-07：宿主增量续建与手动安装

- 按用户要求保留 K3 `/tmp/bibit-settings-host-target` 和原有构建参数，未执行 cargo clean；`dpkg-buildpackage -us -uc -b -j4` 续建退出 0，Rust 日志仅出现 `Compiling BiBit v0.1.4`，复用依赖产物，本 crate 构建 5 分 24 秒。
- 手动安装 `/tmp/bi-bit_0.1.4_riscv64.deb` 成功；`dpkg-query -W bi-bit` 返回 0.1.4，`dpkg --audit`、`dpkg -V bi-bit` 无输出。
- K3 `yarn test:packaging:linux`：29/29 通过，补齐本机缺少 rustc 导致未完成的验证。
- 宿主工作分支 `feat/runtime-settings-navigation` 已按用户单独要求推送远端，head 为 f8f94af；未合并 main。
- 真实应用当前仍启用 Runtime 0.1.0，需要通过 Extensions 安装/激活 0.2.0 后验收；原生 SDK 签名互通测试进行中。操作期间观察到应用被正常关闭并由桌面重新打开，正协调连续界面验证时间。

## 2026-09-07：实际宿主验收发现授权文件层级错误

- 真实 Bi-bit 已激活 Runtime 0.2.0；中文 14 页导航与独立折叠通过，但页面显示 Runtime 不可用。K3 Runtime status 实测 HTTP 200、adapter/Runtime active，确认非后端停机。
- 根因：部署 `serviceOperations` 错写为 service → feature，安全项在外层形成未声明 feature；且宿主当前原生授权要求 `service:security`。宿主拒绝整个文件，插件 getCapability 返回 undefined。此前 DevHost/adapter 直连未覆盖此原生授权边界。
- 改动：`deploy/feature-capability-grants-runtime.json` 改为 feature → service，manifest/集中合同/README/计划统一 `service:security`；新增 `tests/test_deployment_grants.py` 校验服务授权关系。新增回归先失败、修复后通过。
- UI/双语资源/测试：缺少能力明确提示检查宿主授权与重启，与真实后端请求失败分开；安全页不再在缺授权时误提示启动 securityd。插件版本升至 0.2.1，避免覆盖已安装的同版本签名内容；Debian 0.1.11 尚未发布，保持待发布版本。
- 验证：typecheck、UI 22/22、adapter/部署 9/9、build:dev、build:plugin、git diff --check 全通过。宿主 K3 test:trusted-plugin-interop 退出 0，复用正式 target 与 frame-pointer 参数。
- 待完成：修复包重新安装、14 页真实数据与中英验证、发布 main/tag/CI。

## 2026-09-07：按用户最新要求删除分组折叠交互

- 最新要求取代此前折叠设计：管理/监控使用原 Features 的静态标题与菜单样式，始终展开。
- 宿主 `SettingsMenu.tsx` 删除新增分组的 collapsedCoreSections 状态、箭头、button/onClick、aria-expanded 和 ml-4 缩进；菜单测试改为静态标题与 Features 同样式、同级位置与全部入口常驻。无关的原有其他控件不在本次删除范围。
- 新回归先失败，修改后菜单 16/16、tsc -b、git diff --check 通过。宿主 a1d8b02 正在 K3 复用 target 增量打包；随后文档提交清除 SDK 中旧的折叠描述。
- 插件 README/design 同步静态分组表述。历史过程记录保留作为变更轨迹，当前需求以本阶段为准。

## 2026-09-07：修复辅助窗口使插件实例失效

- 授权文件修复、0.2.1 激活后仍出现“服务拒绝授权”。K3 原生日志明确为 `external_service.request_unauthorized feature=runtime version=0.2.1`；5186 adapter 直连 status.get 成功，排除后端拒绝。
- 根因：各窗口共同执行 main.tsx 的插件准备流程；trusted_plugin_prepare_active 每次旋转进程内 token，辅助窗口虽在 bootstrap 阶段被拒绝，却已使主窗口凭据失效。
- 宿主修改：main.tsx 仅主 surface 初始化 Feature；trusted_plugin_prepare_active 在任何状态变更前调用 ensure_main_surface。status-popup/voice-overlay 启动回归先失败，修改后通过；加菜单回归共 23/23、tsc -b、diff 检查通过。提交 50f99e8，K3 复用既有 target 构建中。
- 插件开发指南新增服务授权排查，说明声明/授权/实例/请求的检查顺序与日志证据。
- 最新交付安排：宿主只推 feat/runtime-settings-navigation，不合宿主 main；插件合入本仓 main 并推送，按已有授权执行本仓 Bianbu 发布流程。

## 2026-09-07：按用户明确要求恢复原 Runtime 页面流程（第一阶段）

- 用户明确：14 页的功能、使用逻辑和内容布局沿用现有 Runtime，仅视觉风格可以适配 Bibit。原先简化的表格/JSON/常驻新增表单不能作为交付基准。
- 改动：新增本轮对齐计划、`src/RuntimeCatalog.tsx`；`RuntimeSettingsPage.tsx` 恢复工具/技能/Hook 原卡片目录，移除这三页额外包管理 UI 和无关 packages 请求；`runtime-contracts.ts` 明确已有目录响应中的 enabled/origin/assignable 等字段；CSS 使用 runtime 前缀及宿主主题变量，补中英文文案。
- 验证：新目录流程测试先失败（三页错误依赖 packages），修改后 typecheck、UI 25/25、build:dev、adapter 9/9、git diff --check 均通过。
- 遗留：其余页面仍需逐页恢复完整流程；尚未构建/安装本轮签名包，尚未 K3 验收。当前阶段不发布。

## 2026-09-07：专家页原 Runtime 卡片与编辑流程

- 改动文件：新增 `src/RuntimeExperts.tsx`、`src/runtime-experts.css`、`src/runtime-experts-i18n.ts`、`src/runtime-experts-security.ts`、`tests/ui/experts-page.test.tsx`；扩展 `src/runtime-contracts.ts`、`deploy/real_runtime_proxy.py`、`deploy/feature-capability-grants-runtime.json`、`dev/main.tsx` 和 `tests/test_runtime_adapter.py`。
- 恢复原专家卡片、按需加载编辑目录、可发现/手填模型、四列能力与 wildcard 全选、MCP 状态刷新、原 L1–L4 安全配置生成器与 JSON 细化、HOST/sandbox、头像预设/上传/移除、删除确认。保存失败保留草稿；新增成功但头像失败重试使用已创建 ID，不重复创建。
- 头像转发通过正式 service operation：读取字节返回 base64，上传解码后限 2 MiB 并转 multipart/file；adapter 请求限制增为 3 MiB，头像操作已写入部署授权。
- 验证：`npm run test:ui -- tests/ui/experts-page.test.tsx` 6/6、`npm run test:adapter` 10/10、`npm run typecheck`、`npm run build:dev`、`git diff --check` 通过。
- 遗留：父任务需集成页面和 English 字典，并在宿主同步 3 MiB request 上限后进行 K3 实测。原“使用专家”依赖宿主新建/选中 Runtime 会话并导航聊天；现 SDK 仅有 service、file、job capability 和 contribution-relative navigation，无法实现该动作。已向父任务报告桥接合同需求，当前不渲染伪造动作。

## 2026-09-07：API Capture 与 Bibit 模型原流程恢复

- 改动文件：`src/RuntimeCapture.tsx`、`src/RuntimeBibitModels.tsx`、`src/runtime-capture-model.css`、`src/runtime-capture-model-i18n.ts`、`src/runtime-contracts.ts`、`dev/main.tsx`、`tests/ui/capture-model-parity.test.tsx`、`tests/test_runtime_adapter.py`。
- Capture 恢复原保留限制、configured 服务商选择、当前目标、开始/切换/停止/清空、记录卡全部指标、头尾预览与截断提示；按需详情包含完整 HTTP Body、复制（含 HTTP 环境 fallback）、消息/工具定义/工具调用、流式响应拼接，使用 RuntimeDialog 的原生焦点与 Escape。服务商目录失败不隐藏记录，也不禁用停止/清空/详情。
- Bibit 模型恢复固定 LLM/EMBED 双区、原名称/端口验证、进度/状态与依状态显示动作；外部管理的运行服务不提供停止。操作失败和 accepted=false 明确报错。
- 当前 Capture DTO 对齐 `provider_id`、`limits`、epoch 时间、previews 和 `http_request/http_response`，不保留旧 enabled/target/storage 假合同。adapter 原透明转发无需改路由，新增合同保真测试。
- 验证：`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`（11/11）、`npm run test:ui -- tests/ui/capture-model-parity.test.tsx`（8/8）、`git diff --check` 均通过。
- 父任务负责集成后的轮询与 K3 实测：Capture 1000 ms，目录失败 1000 ms 重试；模型活动状态 1000 ms、空闲 3000 ms。离页/变更时丢弃旧请求，不把本机验证当作真实应用验收。

## 2026-09-07：专家目录故障隔离与共享头像审查修复

- 改动：`src/RuntimeExperts.tsx` 使用 allSettled 分离可选能力目录故障；失败分组明确显示错误并禁用，保留未知 ID/wildcard，其他修改仍可保存；服务商失败才禁止保存，并提供保留草稿的目录重试。新增共享 `src/RuntimeAgentAvatar.tsx`，专家页使用正式头像 service 字节；父任务可复用到 AgentTop。新增两条翻译及 focused UI 回归。
- 验证：专家 UI 9/9、adapter 11/11、typecheck、build:dev、git diff --check 通过。
- 遗留：宿主“使用专家”桥接与 K3 实测由父任务继续；AgentTop 共享头像接入由父任务处理。

## 2026-09-07：14 页内容布局与完整业务表单集成

- 改动：`RuntimeSettingsPage.tsx` 集成专家、配置、服务商、目录、MCP/插件、模型、Capture、监控组件；安全恢复原六子页及完整能力/DLP/审计/配额流程。移除额外部署 JSON、包列表等非原布局内容。各组件 CSS 收口 runtime 前缀，使用 Bibit 主题变量，固定界面文案支持中英文。
- 刷新：Capture 1 秒、模型活动 1 秒/空闲 3 秒、监控 3 秒；异步刷新互斥、离页取消后续调度，Capture 服务商独立加载，不阻塞记录和停止操作。AgentTop 上传头像通过 service 读取；专家头像替换显式失效，监控轮询不重复下载相同头像。
- 独立审查：修复可选专家目录故障阻断所有编辑、Capture 目录阻塞、头像错误 origin/同路径替换缓存，以及安全能力编辑隐式重新授权、业务失败回执当成功。新增回归覆盖。限定复查无遗留高/中风险发现。
- 宿主配套：external-service 请求上限 3 MiB；通过已安装 registry 按 operation 声明 providers.create/update 的 api_key 业务参数，仍禁止未声明凭据与传输字段。前端 gateway 结构检查后由原生执行注册表策略，避免 base_url、上下文 token 配置被前端误拒绝。未修改 Runtime 源码。
- 验证：`npm run typecheck`、`npm run test:ui`（56/56）、`npm run build:dev`、`npm run test:adapter`（11/11）、`git diff --check` 通过。宿主原生前一轮 25/25；随后增加未声明 password 拒绝回归，待 K3 同步执行。宿主前端 focused 12/12、tsc -b 已通过。
- 打包准备：插件升 0.2.2，保留既有签名身份；本轮尚未在真实 Bi-bit 中安装验证，不把单元测试作为交付完成。
- 遗留：原专家“使用专家”涉及 Runtime 聊天会话和宿主导航，现有 SDK 无该桥接，已向用户说明并等待接入方式；K3 securityd 0.1.17 缺 syscall policy/audit API，继续明确报错而非伪造成功。K3 最终安装、实际布局与双语验收、分支提交/发布尚未完成。

## 2026-09-07：K3 实际页面与布局细节校正

- 0.2.2 已手动安装进实际 Bi-bit，中文 14 页均读取真实 Runtime/security 服务成功。英文遍历期间桌面/辅助功能树发生变更，中断的结果不计为全量通过。
- 实际截图发现专家重复标题、按钮缺主题，以及对原 CSS 复核发现专家单列/头像行/固定弹窗头尾、服务商弹窗宽度及页脚、Capture 整体记录分区和 1024px 响应阈值、安全上下文条/能力分区、模型窄屏阈值及内容宽度存在差距；本阶段按原源码修正，限定独立复查无剩余显著布局项。
- 改动：相关 Runtime 页面组件及 CSS、`docs/plugin-development.md`；版本升 0.2.3，避免覆盖已激活 0.2.2。新增控件主题继续使用 Bibit 变量；不复制宿主外层侧栏或滚动容器。
- 验证：本机最终 typecheck、UI 56/56、build:dev、adapter 11/11、build:plugin、diff 检查通过；K3 0.2.3 Debian 构建执行相同检查并退出 0，已手动重装，正在实际应用中激活验证。
- 宿主未声明 password 拒绝回归已在 K3 完整 focused 25/25 通过，提交 `8c07973`；保持既有 target/构建配置完成最后一轮原生增量包，未执行 cargo clean。
- 待完成：0.2.3 真实页面与业务保存/取消的最终验收、宿主最后包安装、分支合并/推送/发布；专家“使用专家”聊天桥接选择、securityd syscall 后端缺失继续单列，不宣称 14 页所有功能已等价交付。

## 2026-09-07：K3 控件样式与实际业务操作检查

- 实际 WebKitGTK 对原生 `@scope` 内 input/textarea 样式不生效：原范围、对话框范围均计算为 0px padding，普通根前缀选择器为预期 13px。临时 0.2.4–0.2.8 仅用于诊断，不作为最终交付；当前源码 `RuntimeDialog.tsx` 已删除诊断探针，候选版本 0.2.9。
- 宿主新增 parser 处理的根选择器隔离，保持插件边界和规则顺序；focused 15/15、完整 build:web 通过，独立静态复查无阻塞。尚待 K3 增量包验证。
- K3 实际 Bi-bit 服务商新增、修改、空密钥保留、取消草稿、删除通过；仅创建本次合成测试条目，完成后已删除。专家保存发现宿主递归凭据检测把 `permissions.resource_limits.tokens` 配额对象当成凭据，正在修复，不计保存成功。
- 最新本机验证：`npm run typecheck`、`npm run test:ui`（56/56）、`npm run build:dev`、`npm run test:adapter`（11/11）、`npm run build:plugin`、`git diff --check` 全部通过；补齐 Runtime/Unavailable/Session 英文资源。
- 用户新增交付要求：最终手动构建且实际验收的 bi-bit 与 bibit-runtime-plugin Debian 包必须放到 K3 `~/bibit-all-deb/`，与安装包校验和一致。
- 遗留：宿主配额字段误拒绝、最终样式/双语实机复测、最终包安装和发布；专家聊天桥接与 securityd syscall API 缺失仍保持明确记录。

- 后续修复：部署 `runtime.json` 为 agents.create/update 精确声明 `/permissions/resource_limits/tokens` 业务对象路径；新增部署回归、开发指南说明。宿主原生 K3 26/26 通过，保留对象内部递归凭据检查；独立复查无阻塞。宿主提交 `d9b09ef`，继续增量打包。
- 0.2.9 K3 `dpkg-buildpackage -us -uc -b` 退出 0，typecheck/UI 56/56/adapter 12/12/构建和签名通过；手动安装后 dpkg audit/verify 无异常、两服务 active，实际 registry 确认 0.2.9 active/current/desired。
- 用户更新交付位置：宿主 bi-bit Debian 包先放 `/home/bianbu/test/`；插件包继续放 `/home/bianbu/bibit-all-deb/`。

## 2026-09-07：实际业务验收与 K3 原生渲染问题

- 实际安装的宿主 d9b09ef、插件 0.2.9：专家新增、描述修改、真实文件选择器上传头像并保存成功；后端返回上传的 GIF，测试专家已通过界面删除。此前服务商新增、修改、空密钥保留、取消和删除同样通过，测试数据已清理。
- 实际 Bi-bit 英文 14 页均显示对应标题并连接真实服务；专家编辑器输入框、头像行和弹窗样式已验证修正。未把临时诊断版本或 Dev Host 当成交付验收。
- K3 默认渲染路径出现间歇 WebKit 原生堆损坏，辅助功能遍历和仅鼠标导航均曾遇到；栈显示 malloc/free 检测损坏，缺少匹配 WebKit 调试符号，尚不能确定系统库/驱动的根因。原始 core 仅留在 K3 用户私有调试目录，不作为公开产物。
- 单变量设置 `WEBKIT_DISABLE_DMABUF_RENDERER=1` 后，实际应用连续四轮中文 14 页通过，无新增 core。宿主 46b0c99 在 Linux/riscv64 且设备树为 K3 时默认采用此设置，保留用户显式覆盖；启动策略 rustc 测试 2/2，通过独立复查，并已推送宿主对应分支。这是已验证的渲染绕行措施，不宣称修复系统堆损坏根因。
- 正在复用 K3 原 target/参数执行 `dpkg-buildpackage -us -uc -b -j4`；最终包须先复制到 `/home/bianbu/test/`，从该路径安装，再不额外传入渲染环境变量启动检查。
- 遗留：最终宿主安装与双语复测、插件 main/packaging 发布；专家“使用专家”的会话桥接未实现，securityd syscall API 缺失仍明确报错。

## 2026-09-07：最终手动包安装与正常启动验收

- 宿主 46b0c99 的 `dpkg-buildpackage -us -uc -b -j4` 退出 0，保留原 target 与构建参数。先复制至 `/home/bianbu/test/bi-bit_0.1.4_riscv64.deb`，再从该路径手动重装，安装退出 0；SHA-256 为 `5ece2cc2acdc5a1e2a4ae708517f73032acb22285668bc8a4eea1c2506f00591`。
- 插件包 `/home/bianbu/bibit-all-deb/bibit-runtime-plugin_0.1.11_all.deb`，SHA-256 为 `b03d9a513fba33a760d3fed9c72fed254da938a585a474c353a61d66632a15ef`，已安装并激活 UI 0.2.9。`dpkg --audit`、`dpkg -V bi-bit bibit-runtime-plugin` 无异常；`bibit-runtime-adapter@bianbu.service` 和 `bianbu-agent-runtime@bianbu.service` 均 active。
- 使用 `env -u WEBKIT_DISABLE_DMABUF_RENDERER ... /usr/bin/bibit-gui` 正常启动，确认三个 WebKit 子进程继承宿主自动设置的值 1。实际应用中文、英文各 14/14 页面达到正确标题和真实服务连接状态；截图检查英文 Capture、中文专家和创建表单，取消未保存草稿后切回中文专家页面。
- 证据：目标工作目录 `logs/k3-delivery-{zh,en}.json`、`k3-delivery-en-capture.png`、`k3-delivery-zh-editor.png`，以及本轮 Debian 构建/安装日志和产物校验和。该次启动后的内核日志未发现 bibit/WebKit 崩溃记录。
- 本阶段只更新过程文档，`git diff --check` 通过；插件实现的完整交付检查见上一阶段（typecheck、UI 56/56、build:dev、adapter 12/12、build:plugin）。
- 仍有明确能力边界：专家“使用专家”未接宿主会话导航；已安装 securityd 缺 syscall 策略/审计 API。渲染设置为经过实测的 K3 绕行措施，系统库堆损坏根因尚未修复。

## 2026-09-08：隔离 Runtime 安全服务与独立 Security 插件

- 根因实证（10.0.90.176）：9899 bridge 和 5186 adapter 返回真实 Agent/策略成功；Bibit 页面报 `The service rejected authorization`。宿主按文件名合并注册表，`security.json` 的 5185 覆盖本包 `runtime.json` 同名 security；5185 实测返回 unauthorized。
- Worktree：`.worktrees/security-service-isolation`，分支 `fix/runtime-security-service`。
- 改动文件：`src/runtime-contracts.ts`、`bibit.feature.json`、`deploy/runtime.json`、`deploy/feature-capability-grants-runtime.json`、`deploy/real_runtime_proxy.py`、`dev/main.tsx`、`src/RuntimeSecurityPage.tsx`、`src/runtime-i18n.tsx`、`tests/test_deployment_grants.py`、`tests/test_runtime_adapter.py`、`tests/ui/security-page.test.tsx`、`README.md`、`docs/plugin-development.md`、`package*.json`、`debian/{rules,changelog}`。
- 实现：Bibit 侧只使用 runtime-security / service:runtime-security；adapter 转发时仅映射 serviceId 为 Runtime 原生 security，保留其余 envelope。不再接受旧 security 服务，不修改 Runtime 源码或独立 Security 插件配置。安全连接错误提示检查授权与桥接，不再断言 daemon 未启动。
- 回归：部署覆盖与独立 UI capability 测试在修复前失败；修复后 adapter/部署 16/16、UI 58/58 通过；覆盖实际 HTTP Handler 两入口及上游请求序列化。
- 验证命令：`npm ci`、`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`、`npm run test:ui`、`npm run build:plugin`、`git diff --check`，全部退出 0。干净 npm ci 后未复现原仓陈旧 node_modules 的 language 类型错误。
- 版本：UI 0.2.10、Debian 0.1.12，沿用 runtime-development 签名身份。
- 待完成：独立审查、K3 构建安装与实际 Bibit 安全六子页验证、main 合入推送、更新本机依赖、bianbu-dev tag 发布并确认流水线启动。

## 2026-09-08：10.0.90.176 安装与真实 Bibit 验收

- 独立审查：对 c522406..c476afb 只读审查，未发现阻塞问题；核对服务隔离、请求映射、两个 HTTP 入口、UI/部署授权及打包版本。
- K3 命令：在源码精确提交 c476afb 的干净 clone 执行 `dpkg-buildpackage -us -uc -b`，退出 0；构建中 typecheck、Dev build、adapter 16/16、UI 58/58、签名构建全部通过。然后从 `~/bibit-all-deb/bibit-runtime-plugin_0.1.12_all.deb` 执行 `apt-get install -y`，退出 0。
- 产物 SHA-256：`e8939a2032b259841071f3df9a27e6e7a24cbd4c60325cb57031aa631c82ea5e`；`dpkg -V bibit-runtime-plugin` 无输出；adapter 与 Runtime active。
- 实际应用：通过 Extensions → Install plugin 选择本次系统 bundle，触发受控重启；最终 registry 的 active/current/desired 均为 runtime 0.2.10，独立 security 0.3.0 仍启用。runtime-security 注册在 5186，security 仍由 security.json 注册在 5185，未篡改另一个插件的配置。
- 真实读取：12 个 adapter 操作全部 ok=true（Agent list/detail、mode、capability catalog、DLP matrix/stats、audit、token budget、network、syscall catalog/policy/events）。实际 Bibit 逐一打开 Agent、能力管理、DLP、审计、配置中心、系统调用，全部显示已连接和对应真实数据；无原 unauthorized 提示，未修改现有 Agent 策略。
- 验收证据：`~/goals/bibit-runtime-security-isolation/logs/` 的 K3 build/install 日志与六子页截图。验收过程遇到宿主驻留进程不响应，清理后使用既有 K3 `WEBKIT_DISABLE_DMABUF_RENDERER=1` 绕行设置完成验证；该宿主渲染问题不属于本次服务路由修复，未修改宿主或 Runtime 源码。
- 待完成：main 推送、本机依赖刷新、bianbu-dev tag 推送与流水线启动确认。GitLab API 匿名访问返回 404，浏览器连接当前不可用，暂未宣称 CI 通过。

## 2026-09-08：安全修复合入 main 与 Bianbu 发布

- main 已快进合入实现 c476afb 和验收记录 e1a9953，并推送 origin；本机执行 `npm ci` 后 typecheck、build:dev、adapter 16/16、UI 58/58、build:plugin、git diff --check 全部通过。
- packaging/main 同步本次已验证源码和 debian/rules（9d41d03），保留原 0.1.11 changelog 给 CI 生成下一发行版，避免 bianbu-pkg 的重复版本判断。
- 使用 `bianbu-dev tag --version 0.1.12` 创建带说明的 annotated `bianbu/0.1.12` 并推送；远端 tag 解引用为 e1a995347591e7de657e205377b2fc2b4944cecc，与发布源码一致。
- 流水线启动证据：`git ls-remote origin 'refs/pipelines/*'` 显示 `refs/pipelines/23565` 指向相同发布提交；随后 origin/packaging/main 自动前进到 bianbu-ci 的 ad0392e（Update changelog for 0.1.12 release）。因此已确认流水线 #23565 实际开始运行，不仅是 tag push 成功。未宣称完整 CI 构建已通过。
- 本次 K3 Debian 包取回后，独立 Ed25519 签名与所有文件 SHA-256 验证通过（runtime 0.2.10，runtime-development，14 settings，pluginLocales 导出存在）。K3 `fakeroot debian/rules clean` 退出 0，诊断脚本移至独立证据目录后源码目录干净。
- 原仓开始时已有的 process.md 未提交追加记录已另行保存，发布提交后恢复为本地未提交内容，不混入本次发布。
- 本次服务冲突修复、worktree 自测、真实 Bibit 验收、main/push、本机更新和 tag/流水线启动均已完成。宿主渲染绕行限制见上阶段，不扩大为本仓修复。

## 2026-09-09：专家创建与按需启动联动

- 基于最新 origin/main 55919be 创建 `.worktrees/expert-startup`，保留原仓已有 process.md 未提交内容。
- 修改 `src/RuntimeExperts.tsx`、`src/RuntimeSettingsPage.tsx`、`src/runtime-experts-i18n.ts`：保存与头像处理成功立即关闭弹窗，后台刷新列表；保存/删除已成功但刷新失败分别提示。新增专家说明首次对话启动运行模式。
- 新增 `tests/ui/experts-page.test.tsx` 和 `tests/ui/settings-pages.test.tsx` 回归，包含真实页面刷新异常传播；API operation/DTO 未变化，adapter 和 mock 无需修改。
- 本机 typecheck、build:dev、adapter 16/16、UI 测试通过；K3 worktree 执行 `dpkg-buildpackage -us -uc -b` 退出 0，含完整类型检查、构建、adapter、UI 与签名构建。
- UI 版本 0.2.11，Debian 0.1.13；保持原 runtime-development 签名身份。
- K3 安装和 Runtime 实际启动/创建/首次任务验证进行中，尚未宣称桌面验收或发布完成。

## 2026-09-09：K3 专家启动实测完成

- 插件 0.1.13 已从 `~/bibit-all-deb/` 安装；adapter active，真实 agents.list.v1 返回成功，dpkg 校验无异常。源码 UI 0.2.11，K3 构建包含 61 UI、16 adapter 测试和签名包。
- 配套 Runtime 0.1.14 实测：Host 创建 0.268 秒、Sandbox 0.265 秒；旧版 Host 创建 33.340 秒。HTTP 在 33.396 秒就绪，Bibit 64.778 秒完成预热；其他专家启动期间状态 API 0.021 秒返回。
- Bibit 和两个临时专家均完成真实对话；Host/Sandbox 模式正确，三个独立 Worker PID。测试遇到 Bibit 已有 Token 配额审批，仅批准测试会话，未调整全局配额；临时专家和会话已清理。
- Runtime 本机 157 项、K3 52 项回归通过；独立审查已处理关闭预热的进程清理和删除成功后刷新失败问题。
- 验收边界：板上包构建、安装、adapter 和真实 Runtime 行为已验证；本次未另行操作实际 Bibit 桌面激活 UI。证据保存在 `~/goals/expert-creation-speed/`。

## 2026-09-09：专家模型编辑与配置应用解耦

- Worktree：`.worktrees/expert-config-apply`，基于最新 origin/main；本阶段不提交、推送、发版或部署。
- 改动文件：`src/RuntimeExperts.tsx`、`src/runtime-experts-i18n.ts`、`tests/ui/experts-page.test.tsx`、`tests/ui/settings-pages.test.tsx`。
- 服务商目录与工具/技能/Hook/MCP 分别完成加载；可选目录 pending 或失败时禁用对应分组并保留原选择，不再阻塞模型编辑保存；服务商目录失败仍显示错误并允许保留草稿重试。
- 编辑已有专家只发送实际变化字段；未改动不调用 PATCH，权限 JSON 对象按结构比较，空权限保持 `{}`，模型修改不会注入默认权限、头像 metadata 或 requested_mode。显式权限 preset、模式变更仍发送正式字段。
- 保存返回的正式 AgentView 立即用于卡片，随后后台刷新列表；运行配置显示下次运行生效、当前运行不受影响，进程/安全配置在请求期间显示正在应用，成功后显示已应用。保留创建、删除和头像失败重试流程；没有增加 operation/DTO。
- 回归：新增 pending 可选目录保存模型与进程应用反馈两项测试在实现前失败；实现后补充空权限显式 preset、Soul 与能力选择精确 PATCH 测试。更新旧全量 PATCH 断言；页面集成测试的创建响应补齐现有 AgentView 合同，以验证立即渲染卡片。
- 验证命令与结果：`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`（16/16）、`npm run test:ui`（65/65）、`git diff --check` 全部通过。
- 遗留边界：本阶段未做 K3 实机或 Bibit 桌面验收，未打签名包；下次运行生效语义依赖主任务配套 Runtime PATCH 修改，不将本机 UI 测试视作后端运行实测。
- 审查补充：头像 metadata 更新只显示普通保存反馈，不误称正在应用进程配置；仅权限或模式修改显示应用状态，运行配置字段修改显示下次运行反馈。新增头像 preset 回归；重新执行全部五项检查通过，UI 增至 66/66。

## 2026-09-09：上下文容量随模型自动确定

- 用户新增范围：去掉总上下文 Token 覆盖值，由 Runtime 根据当前模型上下文长度计算压缩容量；本阶段负责 Bibit 配置页，Runtime 后端与原 Console 配置页由主任务同步。
- 改动文件：`src/RuntimeConfiguration.tsx`、`src/runtime-i18n.tsx`、`tests/ui/settings-pages.test.tsx`。
- 移除手动 Token 输入、对应草稿和 PATCH 字段；已有接口返回显式覆盖值时也不展示或回传。保留当前 Runtime DTO 的历史字段，未提前变更接口合同。新增中英文说明：容量随当前模型自动确定、扣除输出预留并随模型切换更新。
- 回归：新增测试在修改前确认旧输入仍存在而失败，修改后验证无覆盖输入、显示自动容量说明、保存仅提交压缩阈值等剩余配置。语言切换保持草稿的测试改用压缩阈值继续验证。
- 验证：`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`（16/16）、`npm run test:ui`（67/67）、`git diff --check` 全通过。
- 遗留边界：实际容量计算和旧覆盖值迁移由 Runtime 主任务实现；本阶段未提交、部署或进行实际 Bibit 桌面验收。

## 2026-09-09：按最终确认移除配置页

- 用户最终明确：不保留配置页面；上下文策略完全自动，Runtime 语言从右上角选择，Bibit 插件语言跟随宿主。此要求取代上阶段保留只读自动策略说明的中间方案。
- 改动：`bibit.feature.json` 删除 `settings` contribution，现有入口为 9 项管理 + 4 项监控；`src/RuntimeSettingsPage.tsx` 删除对应读取/路由/渲染，删除不再使用的 `src/RuntimeConfiguration.tsx`，删除配置页菜单翻译。专家、模型、服务商、安全及其他页面保留。
- `src/runtime-contracts.ts` 与 `dev/main.tsx` 删除手动运行参数字段：`agent_max_context_tokens`、`agent_max_context_tokens_explicit`、`agent_max_context_turns`、`agent_max_steps`、`context_compression_threshold`、`context_compression_target_ratio`、`context_compression_protect_first_n`、`context_compression_protect_last_n`、`context_compression_abort_on_summary_failure`。保留 search/self-evolution 数据以及正式 settings.get/update operations；没有独立语言设置 UI 写请求。
- `tests/ui/settings-pages.test.tsx` 更新 13 个入口断言，新增无配置 contribution 且跟随宿主语言不读取/写入 Runtime 设置的回归；原配置草稿测试随页面删除，其他宿主语言切换/未保存 Provider 草稿/busy 回归继续保留。新入口断言在删除前失败，删除后通过。
- `README.md`、`docs/plugin-development.md` 同步当前 13 页及宿主语言规则。
- 验证：`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`（16/16）、`npm run test:ui`（66/66）、`git diff --check` 全部通过。UI 数量从 67 降为 66 是删除已不适用的配置页草稿测试。
- 本阶段未提交、发版、部署；实际 Runtime 全自动策略和右上角语言选择由主任务同步实现。

## 2026-09-09：YOLO 无限配额展示与普通配额保护

- 用户新增：Bibit 专家默认 YOLO，YOLO 有效 Token 配额不限。实际默认初始化和配额计量在 Runtime/Security 源码维护；本插件只展示真实安全接口结果。
- 改动文件：`src/RuntimeSecurityControls.tsx`、`src/runtime-i18n.tsx`、`dev/main.tsx`、`tests/ui/security-workflows.test.tsx`。
- YOLO 配额区域显示不限且继续计量、切回普通模式恢复原配额的中英文说明；禁用配额编辑/保存，避免把后端的有效 `0` 上限误写回普通配额。网络策略编辑保留。Dev mock 对 YOLO 返回有效零上限，并保存普通配额供模式恢复使用。
- 验证：新增 YOLO 只读配额回归先失败后通过；`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`（16/16）、`npm run test:ui`（67/67）、`git diff --check` 全通过。
- 无新增 operation/DTO，无版本或 Security 最低依赖变更；本阶段未发布/部署。K3 实际 Security 模式、持久化 Token 计量及两条新会话验收由主任务继续。

## 2026-09-09：YOLO 配额补充实现对齐与最终回归

- 对照 Runtime 上游 `55d3d5db`（`feat(runtime): support agent yolo security mode`）保留同事已有模式、预检与 Hook 行为；配套剩余修复只补首次内置 Bibit 默认 YOLO，以及 YOLO 下真实计量仍写入 Security。普通模式已显式选择时不覆盖，存储的普通配额不被有效无限配额替换。实际执法与计量源码由 Runtime/Security 仓分别维护，本插件继续只消费正式接口。
- 本插件相关文件仍为 `src/RuntimeSecurityControls.tsx`、`src/runtime-i18n.tsx`、`dev/main.tsx`、`tests/ui/security-workflows.test.tsx`；本轮只补过程记录，没有新增业务改动或 operation/DTO。
- 重新执行 `npm run typecheck`、`npm run build:dev`、`npm run test:adapter`（16/16）、`npm run test:ui`（67/67）、`git diff --check`，全部通过。运行配置页删除及宿主语言同步回归继续包含在 UI 全套中。
- 同步核对 Runtime Console 的两条旧浏览器断言：删除配置页遍历；MCP 通配符无改动保存不再期待第二次 PATCH，并补充取消单项 MCP 后精确 PATCH 回归。补齐测试 fixture 正式 AgentView 的空 permissions 字段。两条失败先复现，更新后连同关联专家流程 6/6 通过，未因旧断言修改生产逻辑。
- 用户已明确授权最终各仓 main 提交与 push；本阶段仍未自行提交或推送，交主任务统一整合。未增加 Security 最低依赖或发布版本。两条 K3 真实单次提交验收及最终线上候选状态由主任务记录，不把插件本机回归当作实机任务完成。

## 2026-09-09：准备专家配置与 YOLO UI 发布版本

- fetch 远端 tags 后确认最新包版本 `bianbu/0.1.13` 指向 `55a4e379`；下一候选 Debian 版本为 `0.1.14`，UI 版本为 `0.2.12`。本阶段不提交、打 tag 或 push。
- 改动 `package.json`、`package-lock.json` 根版本、`bibit.feature.json`、`debian/rules` 产物路径及 `debian/changelog`；不调整 SDK 或 Runtime/Security 依赖。复用原仓已忽略的 runtime-development 签名材料，未生成新身份、未跟踪私钥。
- 验证 `npm run typecheck`、`npm run build:dev`、`npm run test:adapter`（16/16）、`npm run test:ui`（67/67）、`npm run build:plugin`、`git diff --check` 全部通过。`dpkg-parsechangelog -S Version` 为 0.1.14；`make -n -f debian/rules override_dh_auto_install` 确认安装新版产物。
- 本地签名产物 `artifacts/runtime-0.2.12.bibit-plugin.tgz`，SHA-256 `f53b9caa0d1215f84406835fd139fc09b47b9e997d9ef09f6465f2f143afba39`；使用既有 trust store 独立核验 Ed25519 签名和全部文件 SHA-256，通过，manifest 为 0.2.12、13 个设置入口。
- K3 后续使用当前源码运行 `dpkg-buildpackage -us -uc -b` 生成 `bibit-runtime-plugin_0.1.14_all.deb`；包内 bundle 安装到 `/usr/lib/bibit/plugins/runtime.bibit-plugin.tgz`，postinst 只重启 Runtime adapter。现有 Bibit 可从 Extensions → Trusted plugins → Install plugin 选择本次 bundle 并完成受控重启；需确认 active/current/desired 为 0.2.12。曾手动固定版本时 Debian 安装不覆盖用户选择，单纯刷新 WebView 不算激活。
- 本阶段尚未构建 Debian 包、安装到 K3 或操作现有 Bibit；以上为版本/打包合同与本地签名验证，实机加载由主任务统筹，避免影响正在进行的 Runtime 真实单次任务。

## 2026-09-09：K3 实际 Bibit 0.2.12 加载与模型保存验收

- K3 `10.0.91.146` 初始 Debian 插件 0.1.13、Bibit 0.1.6，真实用户 registry 的 Runtime active/current/desired 仍为 0.2.10。通过实际应用 Settings → Extensions → Install plugin 和原生文件选择器安装签名 `runtime-0.2.12.bibit-plugin.tgz`，按宿主流程受控重启；最终三个版本均为 0.2.12。全程未重启 Runtime/Security/adapter，未修改系统 Debian 安装文件。
- 实际应用中确认配置入口删除、剩余管理/监控入口显示；从宿主 General 切 English 后，插件菜单、专家标题和编辑器均为英文，随后恢复简体中文并确认专家页 Runtime 已连接。语言由宿主切换，没有插件单独语言设置。
- 创建本次独立临时专家 `com.bianbu.999a5d15d84a`，在真实 UI 编辑 Models 为 `deepseek-v4-flash-ui-check` 并保存。弹窗关闭、卡片立即显示新模型；正式 API 读取确认模型改变、permissions/metadata/tools/skills/hooks/mcps 与编辑前完全一致。未使用该测试模型发起任务；验证后删除临时专家，最终页面确认已移除。未修改原 Bibit 或正在运行的验收专家。
- 证据保存在 `~/goals/expert-config-apply/`：`k3-plugin-ui-evidence.json`、`k3-plugin-save-result.json`、`k3-plugin-saved-en.png`、`k3-plugin-experts-zh.png`；安装和文件选择截图也保留。最终 `/api/health` 为 AGENT_READY，宿主语言恢复 zh-CN。
- 本轮安装的是已验证的 UI 签名包，Debian 包仍为原 0.1.13；新版 Debian 0.1.14 构建/安装及最终 main/tag/push 由主任务继续。可选目录故障/长时间 pending 的精确竞态由本机回归覆盖，本次没有人为破坏线上目录服务；不把实机正常保存冒称故障注入测试。

## 2026-09-09：K3 完整 Debian 0.1.14 构建与安装

- 独立构建目录 `/home/bianbu/build/expert-config-plugin-0.1.14`；同步当前候选源码及既有签名材料，在 K3 执行 `dpkg-buildpackage -us -uc -b` 退出 0。构建包含 npm ci、typecheck、build:dev、adapter 16/16、UI 67/67、build:plugin；未更换 key ID/公钥。
- 包复制到 `/home/bianbu/bibit-all-deb/bibit-runtime-plugin_0.1.14_all.deb` 后从该路径执行 `dpkg -i`，退出 0；安装结果 `install ok installed 0.1.14 all`，SHA-256 `43b4e18355b9d929719ce24363ff49283e70501980460f252d09f3366104647e`。`dpkg -V bibit-runtime-plugin`、`dpkg --audit` 均无输出。
- 安装只由本包 postinst 重启 adapter；前后 Runtime、Security、Bibit PID 均不变。adapter active，真实 agents.list.v1 返回 ok=true；Runtime `/api/health` 为 AGENT_READY；用户 registry active/current/desired 仍为 UI 0.2.12，无需再重启 Bibit。
- 安装 bundle SHA-256 `86b6ab22cf29b0a5fcf6ce98a56cba25f85d17fecd3da045e0a5b7f08bfdaa3e`。独立验证 K3 bundle Ed25519 签名和全文件 SHA-256，通过；签名 manifest 与先前已激活 bundle 完全一致，包括全部文件 hash。tgz 外层归档 hash 不同不代表 UI 内容变化。
- 构建、安装、证据 JSON 及 bundle 副本保存到 `~/goals/expert-config-apply/k3-plugin-deb-*` / `k3-runtime-0.2.12.bibit-plugin.tgz`。K3 独立构建目录执行 `fakeroot debian/rules clean` 退出 0，Debian 产物保留于交付路径。
- 本阶段未提交、打 tag 或 push；最终 main/发布由主任务统一操作。

## 2026-09-10：Control 全局目录与动态 Skill/MCP 同步

- Runtime 全局能力目录改由 Control 从安装清单和静态元数据生成，不再要求执行 Worker 已启动，也不由 Control 执行插件代码或建立 MCP 连接。
- 专家编辑器保留并显示已经失效的能力引用，明确标记“能力已卸载或不可用”，用户可以主动取消选择；保存后先关闭编辑器并更新卡片，再后台刷新列表。
- MCP 安装表单统一使用安装或更新语义并发送 `upgrade: true`；Worker 状态合同增加可选 `catalog_stale`，用于表达目录刷新失败且下个任务前需重试。
- 本阶段只同步 Runtime Plugin 的接口和显示逻辑，不改变现有视觉风格，不提高 Security 最低依赖版本，也不触发发布流水线或部署。
- 遗留边界：动态版本租约、跨 Worker 延迟清理、MCP 失败隔离和任务生命周期固定由 Runtime 实现；本插件只消费目录、专家和状态接口。
- 验证：`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`（16/16）、`npm run test:ui`（69/69）、`git diff --check` 全部通过。


## 2026-09-10：动态能力界面发布候选

- UI 版本 0.2.13，Debian 版本 0.1.15；保留已失效专家引用的可见提示，MCP 安装支持同名更新。
- typecheck、build:dev、adapter 16/16、UI 69/69、build:plugin、diff 检查通过。
- 签名包复用现有 runtime-development 身份，未生成新密钥；板端 Debian 构建和激活验证继续进行。

## 2026-09-10：动态能力版本 K3 Debian 验证

- 在 K3 独立 worktree `/home/bianbu/build/dynamic-capabilities-plugin-0.1.15` 完成 `dpkg-buildpackage -us -uc -b`，退出 0；包含 typecheck、build:dev、adapter 16/16、UI 69/69 及签名 bundle 构建。
- 安装 `bibit-runtime-plugin_0.1.15_all.deb` 后 adapter 为 active；`dpkg --audit`、`dpkg -V bibit-runtime-plugin` 无输出。Runtime/Security 最低依赖没有随本插件改动提高。
- 本次 Debian 包提供 UI 0.2.13；用户已固定的 Bibit active 版本不会由 postinst 强制覆盖。本阶段尚未通过宿主界面激活并验收 0.2.13，不把包安装成功当作界面已切换。
- 用户后续已授权 main 合并、push 及 bianbu-dev 发布 tag，替代前文暂缓流水线的安排。

## 2026-09-10：K3 UI 0.2.13 激活完成

- 在 K3 实际 Bibit Settings → Extensions → Install plugin 中选择系统安装的 `/usr/lib/bibit/plugins/runtime.bibit-plugin.tgz`，使用宿主受控重启流程并重新打开应用。
- 用户 registry 的 Runtime `active/current/desired` 均为 `0.2.13`；实际界面显示 Bianbu Runtime 已连接。对应截图和连接版本测试证据位于 `~/goals/expert-creation-speed/`。
- 本段补充前文尚未激活的状态；插件 main 和 `bianbu/0.1.15` tag 已推送，流水线结果尚未验证。未修改或覆盖用户原有的未提交 process.md 记录。

## 2026-09-11：无模型专家与默认工具同步

- Runtime 允许先保存未配置模型的专家；本插件专家编辑器同步允许 `model: null`，卡片把 `agent_model_required` 显示为“尚未配置模型，请编辑专家选择服务商和模型”。
- 新建专家从当前已安装且可用的目录中默认选择 `skills_list`、`skill_view`、`skill_manage`、`terminal`、`process`、`read_file`、`write_file`、`search_files`、`patch`；编辑已有专家时保留原选择，未安装或禁用的默认项不写入配置。
- Dev Host mock 同步无模型可用状态和默认工具目录。operation ID、DTO、adapter 与部署授权仍为现有透明转发合同，无需修改。
- Bibit 宿主同步允许用户选择 `agent_model_required` 的专家，显示前往“设置 > 专家”配置模型的提示，并禁止发送；其他不可用专家仍不能选择。
- 验证：`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`（16/16）、`npm run test:ui`（70/70）、`git diff --check` 全部通过。宿主相关 Hook/ChatInput 测试 69/69、Web TypeScript、lint 与 diff 检查通过。
- 本阶段未打包、部署、发布或调整 Runtime 对 Security 的最低依赖版本。

## 2026-09-11：系统 MCP 来源显示

- Runtime 增加系统包提供的 MCP；本插件沿用现有 source_kind/removable 合同，将没有 owner_plugin_id 的只读条目标记为“系统安装”/“System installed”，不显示空 Plugin 标签或卸载按钮。
- 改动：src/RuntimeResourcePages.tsx、src/runtime-i18n.tsx、tests/ui/settings-pages.test.tsx；operation、DTO 和透明 adapter 无需改变。
- 验证：新增 UI 回归先失败后通过；npm run typecheck、npm run build:dev、npm run test:adapter（16/16）、npm run test:ui（71/71）、git diff --check 通过。
- 当前仅源码验证；未构建签名包或激活到 Bibit。系统 MCP 定义及安装验证在 Runtime 仓处理，独立 Intent 程序不内嵌到插件中。


## 2026-09-11：专家插件整体选择与 Hook 入口收口

- Runtime 新增 plugins 选择，UI 使用工具、技能、MCP、插件四组。首次目录加载与 MCP 刷新都过滤插件成员；成员通过选择插件整体启用，插件页详情仍可查看 MCP/Hook。
- 删除独立 Hook settings contribution。同步 AgentView、Dev mock 和 adapter 保真测试；现有透明 adapter 支持 plugins，无需新 operation 或部署授权字段。
- 旧专家通过 legacy_plugin_selection 标记，普通字段编辑保留旧选择。只有用户修改插件选择时才切换整体启用，清理旧 Hook 和对应成员选择；显式空插件列表也能完成切换。
- 本机 typecheck、build:dev、adapter 17 项、UI 72 项通过；独立审查修复 MCP 刷新重新显示插件成员问题。最终版本改为 UI 0.2.14、Debian 0.1.16，将使用既有签名身份。
- Runtime 安装包负责将 Intent MCP 放进 bianbu.bibit.intent，与安装 Bibit 桌面无关；命令 Hook 加载/协议/安全/版本生命周期由 Runtime 实现。没有提高 Security 最低依赖。
- K3 新版本打包、安装、真实界面激活仍待验证，不把本机测试当作已部署。

- K3 源码测试 55 项、Host/Sandbox 命令 Hook 实际直接回复通过，UI 0.2.14 已经宿主安装并激活，导航不再有 Hook。发现 bianbu/0.1.16 已由更早阶段发布，本阶段 Debian 改用 0.1.17，保留旧 tag。

## 2026-09-08：一次性延迟三包安装条件检查

- 任务：按既有定时授权检查 K3 `/home/bianbu/bibit-all-deb/`，三包齐全才统一安装并验收 BiBit。
- 改动文件：本仓仅追加 `process.md`；脱敏报告、包元数据/哈希与验证证据在 `/home/liudecheng/goals/k3-bibit-delayed-install/outputs/`，日志在该目标 `logs/`。
- 实机命令：SSH、`dpkg --print-architecture`、`dpkg-deb -f`、`dpkg-deb --ctrl-tarfile/--fsys-tarfile` 完整归档读取、SHA256、间隔 5 秒 size/mtime/inode 检查；Debian `dpkg --compare-versions` 选择最高完整候选。
- 实机结果：Runtime 最高候选 `0.1.0+systemd33/riscv64` 与插件 `0.1.11/all` 完整稳定，但目录（含递归 .deb 扫描）缺 `Package: bi-bit`。按用户条件跳过全部安装及后续桌面、聊天、memory/security/intent、多 Agent 功能验收；没有重新定时，不以已有安装或其他目录包补足。
- 原仓验证：`npm run typecheck` 退出 2，dev/main.tsx:439、RuntimeSecurityPage.tsx:12、RuntimeSettingsPage.tsx:81 的 SDK props 缺少 language；`npm run build:dev` 通过；`npm run test:adapter` 12/12 通过；`git diff --check` 通过。未 build:plugin，未修改实现或 Runtime 源码。
- 遗留：缺 bi-bit 导致本次未安装、未实机验收；类型检查错误仅记录，未擅自修复/重打包。只提交推送目标目录脱敏文档，不推送原仓。

## 2026-09-10：新建专家 incompatible 排查

- 实机 UI 0.2.12 / Debian 插件 0.1.14 / bi-bit 0.1.6：创建弹窗显示 `The service request is incompatible`。目录请求成功，Runtime 当日无创建专家 POST；未改动用户草稿或现有专家。
- 插件 runtime.json 已声明 `/permissions/resource_limits/tokens` 配额对象；当前 Bibit 宿主网关仍递归拦截 tokens 字段。用插件真实 L2 profile 调用当前宿主 gateway，复现 incompatible 且 transportCalls=0；空 permissions 对照才转发。不能用删除默认权限作为修复。
- 证据：目标目录 plugin-expert-create-debug 包含实际截图、源文件快照与 reproduction.json。未修改插件实现、Runtime/Security 源码或依赖，未构建/安装替换包。
- 遗留：需在当前 Bibit 宿主恢复此前 gateway 与 native registry 精确业务对象校验修复，完成宿主回归及实际新建验收；本次为定位结果，不宣称已修复。

## 2026-09-10：宿主专家校验修复与对话同步源码验证

- 用户确认修改 Bibit；实现位于独立 worktree `fix/runtime-conversation-sync`（基于 2c66a32）。恢复原生 registry operation 精确业务对象路径校验，默认 `permissions.resource_limits.tokens` 配额可提交，未放宽嵌套凭据/传输字段限制。插件 runtime.json 已有正确声明，因此插件实现及 DTO 无需更改。
- Bibit 同步 Goal 原生接口/状态面板/命令、自动轮次及命令回执投影、压缩详情、消息与会话 token 用量、命令提示和纯附件发送；保留 Bibit 样式。修复回执迟到、重试与会话切换竞态，隐藏合成消息的历史修改操作。
- 插件 `npm run typecheck`、`npm run build:dev`、`npm run test:adapter`（16/16）、`npm run test:ui`（67/67）均通过；本仓只追加过程记录。宿主全量前端 308 suites / 3602 tests 通过，末次 hook 修复相关 57 项通过，最终 tsc 与 build:web 通过。实际组件 fixture 中英显示及编辑/暂停/恢复通过。
- K3 完整当前应用 lib 编译成功，Goal 7/7、external_services 27/27 均通过；证据及源码快照在 goals/bibit-runtime-conversation-sync。未改 Runtime/Security 源码或最低依赖，未构建安装替换包或重启现有应用。设备实际创建专家与完整对话验收仍待加载新宿主后进行，组件 fixture 不代替实机验收。

## 2026-09-10 K3 验收与发布完成

- Bibit main已推送b538783，bianbu-dev发布标签bianbu/0.1.8，流水线23638已触发。插件operation/DTO无需改动；修复位于Bibit宿主与对话界面。
- K3已安装最终0.1.8包，真实专家创建、普通对话、Goal编辑/暂停/恢复/清除、历史与压缩显示通过；保持Bibit样式。
- 前端4138、原生610、ACP两组各16、SDK互操作、包装39项通过；原专家与未提交草稿已保留/恢复。
- AT-SPI自动化期间出现过WebKit原生堆损坏；无障碍轮询外的鼠标/截图复验未复现，未声称根治。完整证据见~/goals/bibit-runtime-conversation-sync/implementation-report.md。

## 2026-09-13：Runtime Goal 下线、系统/用户资源分层与命令钩子化的插件侧核对

- 本次 Runtime 主线为 `aab8b151`，发布 tag `bianbu/0.1.32`，已 push tag 触发流水线。改动包括：内置工具改从 Runtime 代码加载（不再依赖 profile 副本）、打包资源与用户覆盖分层（系统根 `/usr/share/bianbu-agent-runtime/{agents,mcps,models,skills,plugins}` 只读，应用新建的才写 `~/.bianbu-agent`）、内置插件 Hook 迁移为外部 JSON 命令并删除工厂、移除会话 Goal（HTTP API、Console 界面与 slash 命令、投影）、memory 插件改为 `config.yaml` 配置并撤下 Plugin Console、保留 securityd dbus ABI 回退。
- 插件侧核对结论：不需要改代码，本阶段未修改本仓源码。`src/runtime-contracts.ts`、`deploy/real_runtime_proxy.py`、`dev/main.tsx`、`tests/test_runtime_adapter.py` 均无 goal 相关 operation、DTO、路由或字段；`settings.get.v1`/`settings.update.v1` 仍映射 `/api/v1/settings` 的 GET/PATCH；`/api/v1/plugin-consoles/{plugin_id}` 仍是 Runtime 通用路由，`bianbu.memory` 不再声明 console 只是该插件的定位变化，adapter 与专家创建/编辑、运行模式、错误反馈语义都不受影响。
- 本仓验证命令与结果：`npm run typecheck` 通过；`npm run build:dev` 通过（68 modules，产物 310.19 kB JS / 37.70 kB CSS）；`npm run test:adapter` 17/17 通过；`git diff --check` 干净。均为本机结果，本次未打包、未安装、未重启实机服务。
- Bibit 桌面侧：在 worktree `bibit-session-feed-reload`、分支 `refactor/remove-session-goals`（基于 origin/main `27d242b`）提交 `c43d2cc`（会话重载期间保留转录，修“正在读取会话…”）与 `d8b0353`（移除 Goal 面板、`/goal` 命令、goal 投影与原生 DTO）。分支已 push 并创建 MR !6；按用户新约定，`bibit` 与 `bibit-intent` 只提 PR，不推 main、不打 tag。
- bibit-intent：本阶段没有代码改动，因此没有对应 PR。
- K3 实机（`bianbu@10.0.91.146`）：源码同步后 `dpkg-buildpackage -us -uc -b` 构建 `bianbu-agent-runtime 0.1.32` 并安装，`dpkg --audit` 空、包状态 `ii`；`bianbu-agent-runtime@bianbu`、`bianbu-agent-memoryd`、`bianbu-agent-memory-adapter`、`bianbu-securityd`、`bibit-runtime-adapter@bianbu` 全部 active；`/api/v1/plugins` 仍列出 `bianbu.audit`、`bianbu.bibit.intent`、`bianbu.memory`、`bianbu.security`（来自系统根）；`/api/v1/plugin-consoles/bianbu.memory` 已按预期不可用；打包的 `bianbu.memory/memory` 工具直连 memoryd 返回 `success: true`；真实会话（`agent_id=com.bianbu.278200e1617c`）跑完整轮 run，before_run/after_run 钩子全部 `completed`，模型经 Worker 调用 `bianbu.memory/memory_retrieve` 成功，`GET /api/v1/sessions/{id}/goal` 返回 404，安装的 `console.js` 已无 goal 引用。
- 遗留：K3 桌面端仍是上一版 Bibit（含 Goal 面板），MR !6 合并并重新打包后才能实机确认 Goal 下线与新显示逻辑；本次未调整 `bianbu-agent-securityd` 最低依赖。

## 2026-09-14：Runtime 0.1.36 联动核对与 Bibit 专家页“Runtime 不可用”定位

- 触发：Runtime 0.1.36 修复宿主 Plugin Console 根解析（打包插件在 `/usr/share/bianbu-agent-runtime/plugins`，不再在用户目录放副本）、把 `session-logs/` 转录并入 `sessions/`、每次启动清理空扩展目录、把起始 Agent 模板挪到 `resources/assets/`。
- 插件侧核对结论：无需改代码，本阶段未修改本仓源码。`pluginConsoles.get.v1` / `pluginConsoles.action.v1` 仍映射 `/api/v1/plugin-consoles/{plugin_id}` 与 `/api/v1/plugin-consoles/{plugin_id}/actions/{action}`，`BIBIT_MODEL_PLUGIN_ID = bianbu.bibit.intent` 未变；`settings.get.v1` / `settings.update.v1`、专家创建/编辑与运行模式语义均未受影响。本仓无 `session-logs`、`runs/`、`tool install` 引用。
- 本仓验证命令与结果：`npm run typecheck` 通过；`npm run build:dev` 通过（68 modules，310.19 kB JS / 37.70 kB CSS）；`npm run test:adapter` 17/17 通过；`git diff --check` 干净。均为本机结果。
- K3 实机现象（`bianbu@10.0.91.146`，已装 `bibit-runtime-plugin 0.1.17`、`bianbu-agent-runtime 0.1.36`）：Bibit 设置 → 专家显示“Runtime 不可用”。
- 定位：不是 Runtime 故障，`/api/health` 为 `AGENT_READY`，`/api/v1/{plugins,mcp-servers,settings,plugin-consoles/bianbu.bibit.intent}` 均 200。真实原因是宿主的 external-service adapter 不在运行：Security 包的 `bianbu-agentic-security-reset --yes`（2026-09-14 14:36:09，`/usr/lib/bianbu-securityd/deploy/clear-security-data.py`）按其设计把 `bibit-runtime-adapter@*.service`、`bianbu-agent-runtime@*.service`、`bianbu-securityd`、`bianbu-security-webui`、`bianbu-syscall-observer`、`bianbu-agent-network-learning` 一起 stop 并临时 mask，收尾只 unmask、不重启，脚本自带提示“服务保持停止，可正常重新启动”。之后只重启了 `bianbu-agent-runtime@bianbu`，`bibit-runtime-adapter@bianbu` 一直是 inactive，插件 `useFeatureHostApi().getCapability('service:runtime')` 拿不到能力，页面即报不可用（`RuntimeSettingsPage.tsx` 的 `connected` 由该能力与请求结果决定）。
- 处置与实机复验：`sudo systemctl start bibit-runtime-adapter@bianbu.service` 后 `127.0.0.1:5186` 恢复监听，`bianbu-syscall-observer` restart 后 active。经 `/bibit/v1/invoke` 实测 `agents.list.v1` 返回 3 个专家，`capabilities.list.v1`（tool/skill/hook）、`mcps.list.v1`、`plugins.list.v1`、`pluginConsoles.get.v1`（`bianbu.bibit.intent`，含 llm/embed 两个模型）全部 `ok: true`。专家页需重新进入或切换标签刷新（专家标签无轮询）。
- 遗留：Security 重置后必须手动重启这批服务；本仓未改代码、未升版本、未重新打包，也未调整 `bianbu-agent-securityd` 最低依赖。可选加固（待用户确认）：给 adapter 增加 socket 激活（`.socket` + `ListenStream=127.0.0.1:5186`），让 Bibit 的下一次请求自动拉起被重置停掉的服务。

### 2026-09-14 补记：MCP 页面看不到工具列表的两个 Runtime 缺陷

- 现象：Bibit 设置 → MCP 每个 Server 只显示「暂无工具」；Runtime 升到 0.1.36 后进一步变成 `/api/v1/mcp-servers` 返回 422。插件侧无需改动，`RuntimeMcpContent` 一直按 `server.tools` 渲染。
- 缺陷一（`/usr/share/bianbu-agent-runtime` 之外无感知）：Control 读 Worker `worker.catalog` 用的是 asyncio 默认 64 KiB 行上限，打包后的 catalog（技能/Hook/内置 Tool + MCP 工具）实测 71,667 字节，`readline()` 抛 `ValueError: Separator is not found, and chunk exceed the limit`，`AgentWorkerSupervisor.catalogs()` 吞成 worker 报告 error，`_control_server_views()` 于是把所有 MCP 写成 `status=unknown`、`tools=[]`。修复：按协议上限设置 socket 流（`protocol.STREAM_LIMIT`），Runtime 0.1.37。
- 缺陷二：`ecc3b916` 之后 MCP 插件把服务端注解（`read_only`/`destructive`/`requires_approval`/`mcp_annotations`）放进了 console 的 tool 视图，但公开契约 `MCPServerToolView` 只有 `id`/`name`/`display_name`，逐条 `model_validate()` 后每个带注解的工具报一个 `extra_forbidden`（实测 584 条），列表整体 422。修复：在 API 边界投影成契约字段，注解继续留在 Worker `ToolSpec.metadata` 供审批策略使用；Runtime 0.1.38。
- K3 实机复验（`bianbu@10.0.91.146`，Runtime 0.1.38）：`GET /api/v1/mcp-servers` 200，`bianbu.bibit.intent/bibit-intent` `healthy`/146 个工具，`mcp.nws` `healthy`/7 个工具；经 adapter `/bibit/v1/invoke` 的 `mcps.list.v1` 同样返回上述工具，`ok: true`。
- 本仓仍未修改源码、未升版本；随附：0.1.38 tag 已 push，流水线已同步 `packaging/main`。

## 2026-09-14：Runtime 0.1.40 Hook 目录语义同步

- 触发：Runtime 0.1.39 起 Hook 不再由 Agent 选择（`agent.yaml` 的 `hooks` 字段与 CLI `hook` 资源移除，Hook 随 Plugin 生效），0.1.40 让 Control/Worker 两条投影一致输出 `assignable: false`。本仓 Hook 目录页仍写着“查看 Agent 可配置的 Hook 及其状态”，并按 `assignable` 渲染“可在专家中配置”，与该语义冲突。
- 改动文件：`src/RuntimeCatalog.tsx`（Hook 页描述改为“查看随插件加载的 Hook 及其状态”，来源行改为 `来源 · 所属插件 · 随插件加载/未加载，需重启`）、`src/runtime-i18n.tsx`（新增 `所属插件`/`随插件加载`/`未加载，需重启` 英文对照）、`package.json`+`package-lock.json`+`bibit.feature.json` 0.2.14→0.2.15、`debian/rules` 安装 `runtime-0.2.15.bibit-plugin.tgz`、`debian/changelog` 0.1.18。
- 本机验证：`npm run typecheck` 通过；`npm run build:dev` 通过（310.31 kB JS / 37.70 kB CSS）；`npm run test:adapter` 17/17；`npm run test:ui` 72/72；`npm run build:plugin` 用既有 `runtime-development` 签名身份产出 `artifacts/runtime-0.2.15.bibit-plugin.tgz`；`git diff --check` 干净。
- Runtime 侧依据：`GET /api/v1/capabilities/hook`（K3，Runtime 0.1.40）15 个 Plugin Hook 全部 `enabled: true`、`assignable: false`，并带 `plugin_id`。
- 遗留：K3 需安装新的 plugin deb（Debian 0.1.18／UI 0.2.15）后才能看到新文案；本仓未修改 Runtime/Security 源码，未调整 `bianbu-agent-securityd` 最低依赖。

## 2026-09-15：删掉设置页残留的旧契约分支

- 触发：Runtime 已让 Hook 只作为 Plugin 成员存在（0.1.54 起 `hooks/` 数据根、Hook 包生命周期与 `hook` 包类型全部移除），Agent 契约里既没有 `hooks` 也没有 `legacy_plugin_selection`，可安装包只剩 Agent 与 Skill。本仓 `AgentView`/`PackageKind` 仍带着这两个字段和 `hook` 包类型，目录页与设置页还留有 0.1.17 删除 Hook 导航后不可达的 Hook 分支。
- 改动文件：`src/runtime-contracts.ts`（`AgentView` 去掉 `hooks`/`legacy_plugin_selection`，`PackageKind` 收成 `agent | skill`，新增 `CatalogKind`）、`src/RuntimeCatalog.tsx`（去掉 `isHook` 分支与文案，`kind` 收成 `CatalogKind`）、`src/RuntimeSettingsPage.tsx`、`src/RuntimeExperts.tsx`、`src/runtime-i18n.tsx`、`dev/main.tsx`（mock 去掉 `hooks` 字段与 `hook` 能力/包条目）、`tests/ui/experts-page.test.tsx`（删掉锁住旧兼容行为的 `legacy_plugin_selection` 用例）、`tests/ui/settings-pages.test.tsx`（删掉不可达的 `hooks` 分支）、`package.json`+`bibit.feature.json` 0.2.15→0.2.16、`debian/rules` 安装 `runtime-0.2.16.bibit-plugin.tgz`、`debian/changelog` 0.1.19。
- 本机验证：`npm run typecheck` 通过；`npm run test:ui` 71/71；`npm run test:adapter` 17/17；`npm run build:dev` 通过；`npm run build:plugin` 用既有 `runtime-development` 签名身份产出 `artifacts/runtime-0.2.16.bibit-plugin.tgz`；`git diff --check` 干净。
- Runtime 合同依据：`PackageKind` 只剩 `skill`/`agent`（`bianbu_agent/api/contracts.py`），`POST /api/v1/packages/{kind}` 不再有 `tool`/`hook`；Hook 仍可在 `/api/v1/capabilities/hook` 与 `plugins.list.v1` 的 Plugin 成员里读到，插件详情页已能展示，因此目录页不再单列。
- 遗留：K3 需安装新的 plugin deb（Debian 0.1.19／UI 0.2.16）后才能看到；本仓未修改 Runtime/Security 源码，未调整 `bianbu-agent-securityd` 最低依赖。

## 2026-09-15：只从 metadata.execution 读取执行模式

- 触发：Runtime 0.1.57 退休 `metadata.runtime.requested_mode`（写入直接 422，读取路径不再回退），专家编辑器还保留 `object(agent?.metadata.execution).requested_mode || object(agent?.metadata.runtime).requested_mode` 的旧回退。
- 改动文件：`src/RuntimeExperts.tsx`（去掉旧回退，默认 `host`）、`tests/ui/experts-page.test.tsx`（新增用例：只有 `metadata.runtime` 的专家在编辑器里显示 `host`）、`package.json`+`package-lock.json`+`bibit.feature.json` 0.2.16→0.2.17、`debian/rules` 安装 `runtime-0.2.17.bibit-plugin.tgz`、`debian/changelog` 0.1.20。
- 验证命令与结果：`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`（17/17）、`npm run test:ui`（72/72）、`npm run build:plugin`（既有 `runtime-development` 签名身份，产出 `artifacts/runtime-0.2.17.bibit-plugin.tgz`）、`git diff --check` 全部通过。
- 遗留：需在 K3 安装 Runtime 0.1.57 与本插件 deb（Debian 0.1.20／UI 0.2.17）后复验；本仓未修改 Runtime/Security 源码，未调整 `bianbu-agent-securityd` 最低依赖。

## 2026-09-15：端侧服务不可用时设置页要说清楚（不再显示 Runtime 不可用）

- 触发：`.80` 上 bibit-intent 的 127.0.0.1:8765 不可用（模型目录属主/组成员陈旧），`pluginConsoles.get.v1` 返回 502，Bibit 模型页的失败被并进页面级 `error`，页头因此显示「Runtime 不可用」——Runtime 本身是好的，误导排障。
- 改动文件：`src/RuntimeSettingsPage.tsx`（bibit-models 分支单独捕获，新增 `edgeError`；新增 `EdgeServiceUnavailable` 面板：标题「Bibit 端侧服务不可用」+ `127.0.0.1:8765` 提示 + 原始错误 + 重试按钮；页头徽标不再受端侧失败影响）、`src/runtime-i18n.tsx`（3 条中英文案）、`tests/ui/settings-pages.test.tsx`（新增用例：端侧 502 时显示端侧不可用、保留「Runtime 已连接」和有「重试」按钮）。
- 验证命令与结果：`npm run typecheck` 通过；`npm run test:adapter` 17/17；`npm run test:ui` 73/73；`git diff --check` 干净。
- Runtime 侧配套（同一问题）：hook 简化为端侧任何失败一律交还云端（`resources/plugins/bianbu.bibit.intent/scripts/before_run.py`），Runtime Console 的 Bibit 模型页新增「端侧服务不可用」告警（`chat.html`/`console.js`/`console.css`）。
- 遗留：本仓未发版（版本仍 0.2.17），需随 Runtime 出包一起出 deb 后在 K3/.80 复验；未修改 Runtime/Security 源码，未调整 `bianbu-agent-securityd` 最低依赖。

## 2026-09-15：发布 0.1.20（UI 0.2.18）并触发流水线

- 触发：用户约定「插件更新后也要出 bianbu-dev tag 出新包」，与 Runtime 0.1.63 同批发。
- 改动文件：`package.json`+`package-lock.json`+`bibit.feature.json` 0.2.17→0.2.18、`debian/rules` 安装 `artifacts/runtime-0.2.18.bibit-plugin.tgz`、`debian/changelog` 0.1.20 条目补上端侧服务不可用的说明、`process.md`。
- 提交与发布：main `762abc4`（端侧服务故障不再显示成 Runtime 不可用）、`bd233bf`（发布 0.1.20／UI 0.2.18）已 push；tag `bianbu/0.1.20` 已 push 触发流水线。
- 本机验证：`npm run build:plugin` 用既有 `runtime-development` 签名身份产出 `artifacts/runtime-0.2.18.bibit-plugin.tgz`（debian/rules 安装名一致）；`npm run typecheck`、`npm run test:adapter` 17/17、`npm run test:ui` 73/73、`git diff --check` 通过。
- 遗留：流水线执行结果与 deb 安装验收待补（K3/.80）；本仓未修改 Runtime/Security 源码，未调整 `bianbu-agent-securityd` 最低依赖。

## 2026-09-15：验收修复——暂停请求语义

- 对应 WEB-01 / DESK-01：底层只记录审计与告警，按钮改为“发送暂停请求”，操作前及成功后均明确 Agent 未停止，仍可执行。保留请求失败提示，不宣称已暂停。
- 文件：`src/RuntimeSecurityControls.tsx`、`src/runtime-i18n.tsx`、`tests/ui/security-workflows.test.tsx`。
- 本地验证：`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`（17 项）、`npm run test:ui`（73 项）、`git diff --check` 通过。
- 按本次用户要求先本地提交再到 10.0.90.243 验证；不升版本、不推送。待补 Worker 真实服务预览验收，原生宿主安装不等同于 Dev Host 验证。
- Worker 补验：提交 `261e1c2` 后上传构建页面，通过独立 5194 预览 adapter 连接真实 Runtime/securityd；实际点击首个 Agent 的“发送暂停请求”，回执显示“Agent 未停止，仍可能继续执行”，通过。Runtime 对应提交 `3cc93419` 部署并重启后，实际按钮同样通过。未安装原生宿主签名插件包。

## 2026-09-15：验收修复——网络策略保存与生效状态

- 对应 WEB-08 / DESK-08：模式 DTO/选项增加 allow_all、learning；从后端 apply 区分需重启、已生效、无实例与未确认；编辑为未保存草稿，保存后保持后端回执，并提供刷新生效状态。只提交 mode/domains，不回传只读 apply。
- 文件：`src/runtime-contracts.ts`、`src/RuntimeSecurityControls.tsx`、`src/runtime-i18n.tsx`、`dev/main.tsx`、`deploy/real_runtime_proxy.py`（透明转发说明）、`tests/test_runtime_adapter.py`、`tests/ui/security-workflows.test.tsx`。
- 本地验证：typecheck、build:dev、adapter 18 项、UI 78 项、git diff --check 通过。新增回归先失败，修复后通过。
- 待补：先本地提交，随后 Worker 真服务预览验证待重启提示；未升级原生宿主签名包。
- Worker 补验：提交 a71820c / Runtime e5450c44 后部署并重启 Runtime。临时 sandbox Agent 实际运行后保存 deny_all，后端返回 effective=false / restart_required=true / active_instances=1；两端真实页面均显示需重启，插件编辑后显示未保存，刷新恢复 deny_all。临时 Agent 已删除。验收使用真实服务 Dev Host，未更新原生插件安装包。

## 2026-09-15：验收修复——使用专家进入宿主聊天

- 根因：按钮硬编码 disabled，宿主只提供 Feature 相对导航。新增可选 navigation.openRuntimeChat 合同，由 Bibit 仅向 Runtime 设置页提供；验证当前目标、epoch 与专家可用性后选择专家并进入新聊天，不自动发送消息。
- 插件文件：`src/runtime-contracts.ts` 集中导航名/类型，`src/RuntimeSettingsPage.tsx` 透传宿主回调，`src/RuntimeExperts.tsx` 调用并展示错误；`tests/ui/experts-page.test.tsx` 覆盖所选 ID、点击不误开编辑器与失败重试；更新 vendored SDK 及 lockfile。未新增服务 operation，adapter 无需变更。
- 本地：typecheck、build:dev、adapter 18 项、UI 80 项、git diff --check 通过。宿主配套导航与边界 18 项通过，TypeScript 与完整 Web build 通过。
- 待补：按用户要求先本地提交，再 Worker 验证。旧宿主不提供可选导航时仍禁用并提示，必须配套更新宿主。npm 内网镜像 502 后使用公共源完成安装，lockfile 仅 SDK 条目变化。
- Worker 补验：独立源码快照 typecheck 与全部 UI 80 项通过；使用 Worker 原有 runtime-development 密钥成功构建签名包。Bibit 编译后的导航函数使用 Worker 实际专家目录验证选中 ID、进入 `/` 和目标切换拒绝；该检查替代了 IPC 传输层，原生 IPC/GUI 仍待新宿主构建验收，未标作原生通过。

## 2026-09-15：验收补充——从页面应用待重启网络策略

- F-03 补齐可执行路径：配置中心增加“停止旧实例，下次对话应用策略”，说明将终止当前 Agent 的在途任务，确认后仅停止该 Agent 的实例，刷新真实 apply 状态。下一次对话由 Runtime 自动启动新实例。未保存草稿不可执行，错误不伪称成功。
- 复用既有 Runtime executions.list.v1 / executions.stop.v1 及授权，无新增后端合同；DTO 与 Dev Mock 对齐 state / accepted 返回值。src/RuntimeSecurityPage.tsx 增加 Runtime 服务请求，src/RuntimeSecurityControls.tsx 增加确认弹窗与操作；i18n、UI 回归同步。
- 本地 typecheck、build:dev、adapter 18 项、UI 81 项、git diff --check 通过。新增确认与仅选中 Agent 停止断言先失败后通过。
- 先本地提交后到 243 验证。原生宿主依用户最新要求改在 10.0.90.176 构建，完成后拷回 243 安装；243 编译缓存已清理，测试证据与备份保留。
- Worker 实测发现 executions.list 不包含聊天托管 Worker，原停止路径不能满足验收，未标通过。改用配套 Runtime POST /agents/{agent_id}/restart；Runtime 持有 Agent 锁，有在途任务返回 409，重建失败 503，成功后重新读取真实网络生效状态。
- 最终界面为“重建 Worker 并应用策略”，确认提示要求先结束在途任务。新增 agents.restart.v1，已同步集中合同、adapter、授权与 adapter 回归；Dev Mock 明确不模拟重建成功。typecheck、build:dev、adapter 18、UI 81 全通过。

## 2026-09-16：插件资源归属展示

- Skill 与 MCP 普通页面过滤插件贡献项；插件页继续显示成员，并明确标注 Hook、Skill、MCP、Tool 类型。
- 修改 `src/RuntimeSettingsPage.tsx`、`src/RuntimeResourcePages.tsx`、`src/runtime-contracts.ts`、`dev/main.tsx` 与 UI 回归测试；未新增 operation。
- 本地验证：typecheck、build:dev、adapter 18 项、UI 83 项及 `git diff --check` 通过。Runtime 配套 CLI/API/浏览器相关测试 172 项通过、5 项跳过。

## 2026-09-16：MCP 刷新入口与插件技能列表

- 将 MCP 状态刷新按钮从专家页移至 MCP 页面；专家编辑器不再提供刷新操作，MCP 页面负责刷新、忙碌态和错误状态。
- Runtime 插件增加 MCP 页面刷新回归；Runtime 增加插件贡献 Skill 的 `skill list` 管理器与 CLI 覆盖测试。
- 本地验证：typecheck、build:dev、adapter 18 项、UI 82 项、git diff --check 通过；Runtime 包管理器/CLI 21 项通过，浏览器契约 102 项通过、5 项旧专家刷新测试按新页面职责跳过。

## 2026-09-16：Token 配额编辑模式提示

- 用户要求：界面明确显示 YOLO 模式无法编辑、保存，normal 模式下可编辑、保存。
- 改动：Token 配额区域增加中英文提示，保留 YOLO 下控件禁用逻辑。
- 验证：typecheck、build:dev、adapter 18 项、git diff --check 通过。

## 2026-09-16：YOLO 跳过 DLP、网络与配额检查的界面对齐

- 用户确认语义：YOLO 不执行 DLP 扫描/检查、网络限制/审批、Token 配额检查/审批，继续记录审计和用量；normal 行为与已保存配置保留。
- 改动文件：`src/RuntimeSecurityControls.tsx`、`src/runtime-i18n.tsx`、`dev/main.tsx`、`tests/ui/security-workflows.test.tsx`。
- 更新能力管理与配置中心中英文说明；DLP 页读取现有安全模式 operation，在 YOLO 下禁用试扫、策略变更和恢复默认；网络配置同配额一样在 YOLO 下只读，防止把有效 allow_all 回写 normal 配置。网络运行状态继续依据后端 apply 显示，不以 mode 自行宣称全部 Worker 已切换。
- 与 Security 实现协调：networkGet 在 YOLO 下返回有效 allow_all / 空域名，普通配置由后端保留，切回 normal 后重新读取恢复。Dev mock 同步有效网络值且不覆盖已保存策略。无需新增 operation、DTO 或 adapter 路由。
- 验证：新增回归先出现预期失败（YOLO 网络保存仍启用、DLP 无 bypass 状态），修改后 `npm run typecheck`、`npm run build:dev`、`npm run test:adapter`（18/18）、`npm run test:ui`（83/83）、`git diff --check` 全通过。UI 覆盖 YOLO 不发起试扫/写操作及 normal 恢复原策略编辑。
- 遗留：尚未部署或进行真实 Bibit 桌面验收；未提交、推送、升级版本或提高 Security 最低依赖。Bibit 宿主只读检查未发现 web-app/src 中 YOLO 专有文案，本阶段无需宿主改动。

## 2026-09-16：YOLO 网络访问记录展示

- YOLO 继续被动记录 DNS 与连接访问；插件此前没有访问记录面板，本阶段新增只读“网络访问记录”，在 YOLO 和 learning 下读取现有 `network-learning.status.v1` / `network-learning.events.v1`，展示采集状态、原因、DNS/连接目标、IP、端口、协议、结果、次数和 Worker，可刷新，不提供删除或写策略操作。
- 改动文件：`src/RuntimeSecurityControls.tsx`、`src/runtime-contracts.ts`、`src/runtime-i18n.tsx`、`dev/main.tsx`、`deploy/feature-capability-grants-runtime.json`、`deploy/real_runtime_proxy.py`、`tests/test_runtime_adapter.py`、`tests/ui/security-workflows.test.tsx`。operation/DTO 集中声明，授权两条只读接口；adapter 保持透明转发并补回归。Mock 明确采集器未运行，不伪造真实采集成功。
- 验证：YOLO 记录显示回归先失败后通过；typecheck、build:dev、adapter 19/19、UI 83/83、git diff --check 全部通过。Runtime Console 同步把既有访问记录面板在 YOLO 下显示，由 Runtime 仓单独记录验证。
- 边界：这是本地源码与模拟服务验证，未部署实机；仍未提交、推送、改版本或最低依赖。

## 2026-09-16：243 部署 YOLO 插件候选

- 用户授权三仓修复部署到 `bianbu@10.0.90.243` 并验证象棋任务；本阶段仅负责插件部署，不重启 Runtime、Security 或 Bibit GUI。
- 远端构建目录 `/home/bianbu/yolo-validation-20260916/plugin-src`，复用板上 `~/workspace/bianbu-agent/bibit-runtime-plugin/.bibit-keys` 现有签名材料（仅符号链接，未生成或传输私钥）。远端 `npm ci --ignore-scripts`、`npm run typecheck`、`npm run build:plugin` 全部通过，版本保持 0.2.18。
- 新旧系统 bundle 均使用现有 `runtime-development` 公钥独立验证 Ed25519 签名及 manifest 中全部文件 SHA-256，通过。新包 SHA-256：`fab4ca30e933c7d70792802eb6a93a64395497ba8cee8cc9bc88f4c05ba41ad9`。
- 备份位于 `/home/bianbu/yolo-validation-20260916/plugin-backup`：旧系统 bundle、grants、adapter、用户 registry 及已安装 runtime/0.2.18 内容。安装 `/usr/lib/bibit/plugins/runtime.bibit-plugin.tgz`、`/etc/bibit/feature-capability-grants.d/runtime.json` 和 `/usr/lib/bibit-runtime-plugin/real_runtime_proxy.py`；部署后哈希与构建文件/本地源码一致。
- 仅重启 `bibit-runtime-adapter@bianbu.service`，状态 active。真实 5186 `agents.list.v1` 成功返回 6 个 Agent；`network-learning.status.v1` 和 `network-learning.events.v1` 均成功返回正式数据 envelope。
- 尚待主任务统一完全退出/重开 Bibit：宿主会缓存 grants，且本次同版本系统 bundle 需在启动时同步。部署前 registry active/current/desired 均为 0.2.18；不能以版本号相同认定新 UI 已加载，须核对解包后的 plugin.js 内容/哈希。象棋任务端到端验收由主任务继续。本仓无提交、push、版本或 Security 最低依赖变更。

- 主任务后续已正常退出并重新启动 Bibit 后台（未改宿主源码）。新日志确认 trusted runtime@0.2.18；已安装 dist/plugin.js SHA-256 `7f5ee9a0ce0cb1ee846f3f2a2358452326404efdeaf62e2cef7c70e917272c3b` 与新 bundle 一致，确认新插件内容已同步。未以包版本号判断加载状态，未宣称人工点击桌面验收。

## 2026-09-16：合并 YOLO 修复回 main

- 用户明确要求三个仓库本地合并回 main。插件改动范围为上述 YOLO 控制及网络访问记录，未修改 Bibit 宿主源码。
- 合并前重新验证：`npm run typecheck`、`npm run build:dev`、`npm test`（adapter 19 项、UI 83 项）通过，`git diff --check` 通过。实机部署与策略验证见上一阶段；用户明确不验收游戏质量。
- 本阶段仅本地提交与合并，不推送、不打 tag、不变更版本或 Security 最低依赖。

## 2026-09-16：推送 main 并整合远端资源归属更新

- 用户授权三个仓库 main 全部推送；远端新增 `6265a2f` 插件资源归属分组修复，合并保留双方代码和阶段记录，仅 process.md 追加位置发生冲突并已保留所有内容。
- 合并结果验证：typecheck、build:dev、adapter 19 项、UI 84 项、git diff --check 全通过。无宿主源码修改、tag 或版本变更。

## 2026-09-17：专家能力描述单行截断与悬浮详情（发布 0.1.22／UI 0.2.19）

- 触发：用户要求专家创建/编辑界面里工具、技能、插件、MCP 的描述改成一行，超出用省略号，鼠标悬浮显示完整内容。
- 改动文件：`src/RuntimeExperts.tsx` 能力项把 `display_name` 与 `description · unavailable_reason` 拆成两个常量，名称与描述分别加 `title` 提供悬浮详情，描述为空时不再渲染空 `<small>`；`src/runtime-experts.css` 新增 `.runtime-expert-capability > span` 与 `> strong, > small` 规则，单行 `white-space: nowrap` + `text-overflow: ellipsis`，`min-width: 0` 让 flex 子项可以收缩；`tests/ui/experts-page.test.tsx` 新增回归。
- 未新增 operation/DTO，adapter 与授权无变化；只改本仓界面与样式，未触碰 `bianbu-agent-runtime` 源码。
- 本地验证：新回归先失败（回退源码后同一用例报错）后通过。`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`（19/19）、`npm run test:ui`（85/85）、`git diff --check` 全通过。
- 环境说明：本机 `node_modules/@bibit/feature-sdk` 是同一 0.3.0 版本的旧副本（缺 `openRuntimeChat?`，`npm install` 因版本与 integrity 相同不会重装），导致 `RuntimeSettingsPage.tsx` typecheck 报 TS7053。仓库内 vendored tgz 与 lockfile 一致，按 tgz 重新解包该依赖后 typecheck 通过；这是本机依赖陈旧，不是源码缺陷，未改动被跟踪文件。
- 发布：`package.json`／`package-lock.json`／`bibit.feature.json` 0.2.18→0.2.19，`debian/rules` 安装 `artifacts/runtime-0.2.19.bibit-plugin.tgz`，`debian/changelog` 增加 0.1.22 条目。
- 遗留：尚未在 K3/桌面实机验收，未调整 `bianbu-agent-securityd` 最低依赖。

## 2026-09-17：默认能力（presets）改为由 Runtime 配置驱动

- 触发：Runtime 把「每个专家都固定启用」的能力做成 `config.yaml` 的 `presets` 配置（`presets.tools` / `presets.skills`），能力目录用 `preset: true` 标记；插件里写死的默认工具清单必须去掉，改为跟随 Runtime 配置。
- 改动文件：`src/runtime-contracts.ts` 的 `CapabilityView` 增加 `preset?: boolean`；`src/RuntimeExperts.tsx` 删除 `defaultToolIds` 与 `defaultsApplied` 硬编码清单，改为按目录里的 `preset` 预选、锁定复选框（`disabled`）、「全选」按钮跳过 preset 且取消全选后仍保留 preset，能力项详情追加「默认能力，所有专家固定启用」；`src/runtime-experts-i18n.ts` 增加该文案的英文；`tests/ui/experts-page.test.tsx` 重写原默认工具用例并新增 preset 锁定用例（含「全选/取消全选」与保存 payload 断言）。
- 未新增 operation/DTO 字段之外的合同变化，adapter 与授权文件无需改动：`preset` 随 `/api/v1/capabilities/tool|skill` 响应透传。
- 本地验证：`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`（19/19）、`npm run test:ui`（86/86）、`git diff --check` 全部通过。
- 遗留：尚未在 K3/桌面实机验收；未打 tag、未启动流水线（按用户本轮要求改为手动打包）。

## 2026-09-17：出厂专家与出厂服务商可删除（发布 0.1.23／UI 0.2.20）

- 触发：Runtime 0.1.85 起，出厂（Bibit 自带）Provider 与出厂专家都可以删除——删除写入 `models/.hidden/<record_id>`、`agents/.hidden-<id>` 标记，重启不会被重新生成；用户要求 Bibit 侧也要能删这两类出厂资源。
- Runtime 侧证据（K3 实机 `10.0.91.146`，0.1.85）：删除仍在被专家使用的 `custom:bibit` 返回 409 `provider_in_use`，message 为可行动中文并带 `details.agent_ids`；删除出厂专家 `com.bianbu.278200e1617c` 返回 204 并生成 `~/.bianbu-agent/agents/.hidden-com.bianbu.278200e1617c`，重启服务后不再出现；随后删除出厂 Provider 返回 204 并生成 `models/.hidden/custom-provider-bibit`；移除标记即恢复出厂默认。
- 插件契约无需改动：`agents.delete.v1` / `providers.delete.v1` 早已在 `src/runtime-contracts.ts`、dev mock 与 `deploy/feature-capability-grants-runtime.json` 声明，实机 `/etc/bibit/feature-capability-grants.d/runtime.json` 也已授权；`deploy/real_runtime_proxy.py` 的 `_runtime_error_message` 原样透传 Runtime 的 `error.message`，因此 409 的可行动中文能直接显示在插件界面。
- 改动文件：`src/RuntimeExperts.tsx` 删除专家确认框在 `agent.origin === 'system'` 时追加出厂说明；`src/runtime-experts-i18n.ts` 增加该文案英文；`src/RuntimeProviders.tsx` 在 `parameters.record_kind === 'custom_provider'` 时给服务商行加「出厂服务商」标记，并在编辑器里说明删除后需重装/升级 Runtime 包才能恢复；`src/runtime-i18n.tsx` 增加对应英文。未新增 operation/DTO，adapter 与授权文件不变。
- 回归：`tests/ui/experts-page.test.tsx` 新增两条（出厂专家仍可删除、被拒时保留对话框并显示 Runtime 文案），新建 `tests/ui/providers-page.test.tsx` 三条（出厂标记与删除调用、被拒保留编辑器并显示 `provider_in_use` 文案、普通服务商不带出厂说明）。新用例在回退源码后先失败（2 failed），恢复后通过。
- 本地验证：`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`（19/19）、`npm run test:ui`（91/91）、`git diff --check` 全部通过。
- 发布：`package.json`／`package-lock.json`／`bibit.feature.json` 0.2.19→0.2.20，`debian/rules` 安装 `artifacts/runtime-0.2.20.bibit-plugin.tgz`，`debian/changelog` 增加 0.1.23 条目；`npm run build:plugin` 产出 bundle，SHA-256 `d78e8c3a6a072f20c9e2299b098bfee890cad57adb8d8eb12a580965cf0850b4`，用仓库内 `runtime-development` 公钥验证 Ed25519 签名与 manifest 内 2 个文件摘要均通过；`dpkg-buildpackage -us -uc -b` 产出 `bibit-runtime-plugin_0.1.23_all.deb`。
- 遗留：插件新版本尚未在 K3/桌面实机点开验收（宿主会缓存插件包，需重启 Bibit 才会加载新 bundle）；未打 tag、未启动流水线。

## 2026-09-17：发布 0.1.23，打 tag 启动流水线

- 触发：用户要求本仓也触发发布流水线（Runtime 侧 0.1.86 已按 `bianbu/0.1.86` 发布）。
- 发布准备：`debian/changelog` 的 0.1.23 条目补上「默认能力跟随 Runtime presets」这一条（此前只写了出厂专家/服务商可删除），并把出厂服务商显示名统一成 Runtime 侧的 `Bibit Built-in`。
- 版本一致性：`package.json` / `package-lock.json` / `bibit.feature.json` 0.2.20、`debian/rules` 安装 `artifacts/runtime-0.2.20.bibit-plugin.tgz`、`debian/changelog` 0.1.23。
- 发布前复验：`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`（19/19）、`npm run test:ui`（91/91）、`git diff --check` 全部通过。
- 发布动作：main（`3883355`）追加 changelog 修改后推送到 origin，`CI=true bianbu-dev tag --version 0.1.23` 生成 tag `bianbu/0.1.23` 并 push，CI 规则 `$CI_COMMIT_TAG =~ /^bianbu.*/` 触发 pack → build → upload。
- 遗留：插件新 bundle 需要重启 Bibit 宿主才会加载；K3/桌面实机点开验收仍待做。

## 2026-09-17：删除拒绝原因可见 + 厂商清单对齐（发布 0.1.24／UI 0.2.21）

- 触发：用户反馈「Bibit 那边删除服务商还是删除不了」，并要求「模型厂商删除不了也要在界面提示用户」。插件侧删除本身是好的，坏在提示：宿主客户端（`bibit-gui`）`if(!c.ok) throw new ExternalServiceError(code, CANNED[code])` 只保留错误码、丢掉 `error.message`，所以 Runtime 的 409 中文原因到不了界面，用户只看到一句通用失败。
- 改动文件：新增 `src/runtime-service-errors.ts`（把宿主错误码 `offline/timeout/unavailable/unauthorized/incompatible/cancelled/provider_crashed/resource_exhausted/unknown` 映射成可读中文，取不到码时回落 `Error.message`）；`src/RuntimeProviders.tsx` 删除前先用 `agents` 预判占用并点名专家，失败走 `serviceFailureText`；`isFactory()` 改为优先读 Runtime 的 `origin === 'system'`，旧 Runtime 才回落 `record_kind`（此前把用户自己建的自定义服务商一律标成「出厂服务商」）；`src/RuntimeExperts.tsx` 删除失败同样走 `serviceFailureText`；`src/RuntimeSettingsPage.tsx` 服务商页并行加载 agents 并传入；`src/runtime-contracts.ts` `ProviderView` 增加 `origin?: 'system' | 'user'`；`src/runtime-i18n.tsx` 增加约 12 条中英文案。
- 厂商清单对齐：`src/RuntimeProviders.tsx` 的选择器补上 Anthropic、Gemini、Mistral、Groq、xAI、NVIDIA、Hugging Face、Azure OpenAI，与 Runtime 的 16 项目录一致（Runtime 侧另有 `docs/bugs/2026-09-17-provider-delete-refusal-invisible.md` 记录控制台那半边的修复）。
- 本地验证：`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`（19/19）、`npm run test:ui`（96/96，新增「选择器覆盖 Bibit 全部厂商」用例）、`git diff --check` 全部通过。
- 发布：`package.json`／`package-lock.json`／`bibit.feature.json` 0.2.20→0.2.21，`debian/rules` 安装 `artifacts/runtime-0.2.21.bibit-plugin.tgz`，`debian/changelog` 增加 0.1.24 条目。
- 发布动作：main `ccfa869` 推送后 `CI=true bianbu-dev tag --version 0.1.24`，tag `bianbu/0.1.24` 已推送，流水线把 `packaging/main` 推进到 `c00a716`；K3 上 `apt install bibit-runtime-plugin` 升到 0.1.24。
- K3 实机验收：`/usr/lib/bibit/plugins/runtime.bibit-plugin.tgz` 解包后 manifest 版本 0.2.21，bundle 内确认含超时解释文案、「正在被专家使用」占用提示与「请先在“专家”页」引导，以及 Groq／Azure OpenAI 等新厂商项；Runtime 侧同时升到 0.1.88，两条删除路径在控制台点过（详见 `bianbu-agent-runtime` 的 `docs/bugs/2026-09-17-provider-delete-refusal-invisible.md`）。
- 遗留：Bibit 宿主会缓存插件包，需重启 Bibit 才会加载 0.1.24 的 bundle，因此插件界面的目视验收仍待用户在桌面重启后确认。

## 2026-09-17：去掉 Provider 出厂判断的兼容回落（发布 0.1.25／UI 0.2.22）

- 触发：用户明确「不需要兼容，随时可以重构」，0.1.24 里为旧 Runtime 保留的 `record_kind` 回落属于没有必要的猜测。
- 改动文件：`src/runtime-contracts.ts` 的 `ProviderView.origin` 由可选改为必填（`'system' | 'user'`）并补注释；`src/RuntimeProviders.tsx` 的 `isFactory()` 直接读 `provider.origin === 'system'`；`dev/main.tsx` 的 Mock Provider 与新建议补上 `origin`；`tests/ui/providers-page.test.tsx` 删除「旧 Runtime 回落」用例。
- 本地验证：`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`（19/19）、`npm run test:ui`（95/95）、`git diff --check` 全部通过。
- 发布：`package.json`／`package-lock.json`／`bibit.feature.json` 0.2.21→0.2.22，`debian/rules` 安装 `artifacts/runtime-0.2.22.bibit-plugin.tgz`，`debian/changelog` 增加 0.1.25 条目。
- 遗留：Bibit 宿主缓存插件包，需重启 Bibit 才加载新 bundle。

## 2026-09-17：Runtime 拒绝原因全覆盖（发布 0.1.26／UI 0.2.23）

- 触发：用户重申「模型厂商如果删除不了也要在界面提示用户，runtime 那边的 UI 也要提示」。Runtime 侧本轮补齐了控制台剩下三处静默删除（MCP 卸载、插件删除、会话删除，见 `bianbu-agent-runtime` 的 `docs/bugs/2026-09-17-console-delete-refusals-silent.md`）；插件侧复查发现两处仍会把原因吞掉：`serviceFailureText()` 先查 `FAILURES[code]`，宿主把 Runtime 的中文原因保留下来、code 仍是 `unknown` 时会被通用文案盖掉；`RuntimeSettingsPage` 的 `runAction()` 直接回显 `reason.message`，MCP／插件页的卸载、删除、刷新失败既没有 canned 兜底也没走统一翻译。
- 改动文件：`src/runtime-service-errors.ts` 增加 `RUNTIME_AUTHORED`（中文）优先判定——命中即原样展示 Runtime 文案，未命中再走 `FAILURES`，最后回落 `Error.message`；`src/RuntimeSettingsPage.tsx` 的 `runAction()` 改用 `serviceFailureText()`。
- 回归：`tests/ui/settings-pages.test.tsx` 新增两条——「MCP 卸载失败展示 Runtime 中文原因」（只回退 `runtime-service-errors.ts` 时失败）与「宿主只给错误码时给出可行动文案」（守住 canned 兜底）。
- 本地验证：`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`（19/19）、`npm run test:ui`（97/97）、`git diff --check` 全部通过。
- 发布：`package.json`／`package-lock.json`／`bibit.feature.json` 0.2.22→0.2.23，`debian/rules` 安装 `artifacts/runtime-0.2.23.bibit-plugin.tgz`，`debian/changelog` 增加 0.1.26 条目；`npm run build:plugin` 产出 bundle，SHA-256 `513225b9fd366b0b5660689f662ff33a5420f643b0078036494ee7762700e723`，用 `runtime-development` 公钥独立验证 Ed25519 签名（对 `plugin.json` 原始字节）与 manifest 内 2 个文件摘要均通过。
- 遗留：Bibit 宿主缓存插件包，需重启 Bibit 才加载 0.2.23 bundle；K3 桌面实机目视验收仍受输入注入限制（`ydotool` 只能移动指针，按键/点击到不了 Bibit webview，本轮已确认并改用组件级用例 + Runtime 控制台实机验证）。

## 2026-09-18：0.1.26 在 K3 的实机验收（真实 Runtime 数据）

- 触发：用户要求「模型厂商如果删除不了也要在界面提示用户，runtime 那边的 UI 也要提示」，并要求在 K3 上验证。
- 环境：K3 `10.0.91.146`，`bianbu-agent-runtime` 在板上用 `dpkg-buildpackage -us -uc -b` 自建并安装到 0.1.91；`bibit-runtime-plugin` 用 apt 升到 0.1.26（UI 0.2.23）。
- 桌面 Bibit 无法远程注入输入：`ydotool` 的指针移动有效（悬停高亮、指针位置都能对上），但按键与点击到不了 WebKitGTK webview（`wtype` 同样不行），所以改为用仓库自带的 `deploy/real_runtime_proxy.py`（`PORT=5194 BIND_HOST=127.0.0.1`）在 K3 上渲染真实 Runtime 数据，本机 SSH 转发后用 Playwright 驱动同一份 `dist/` bundle。
- 证据一（服务商删除被拒，插件本地预判路径）：服务商页点 DeepSeek → 删除，编辑器保持打开并显示
  `服务商 deepseek 正在被专家使用：nws-agent。请先在“专家”页给这些专家换用其它服务商，或删除这些专家，再删除该服务商。`
- 证据二（宿主只给错误码时仍要可读，`serviceFailureText` 路径）：插件页点 `bianbu.audit` 的「删除」。网关 envelope 实测为
  `{"code":"unknown","message":"插件 bianbu.audit 由系统包管理，随 bianbu-agent-runtime 一起安装，无法在这里卸载。"}`，
  界面显示的就是这句中文；0.1.26 之前会显示 canned 的「Runtime 拒绝了该操作，且没有返回可展示的原因…」。
- 证据三（发布产物）：K3 上 `/usr/lib/bibit/plugins/runtime.bibit-plugin.tgz` 解包后 manifest 版本 0.2.23，`dist/plugin.js` 内含
  `[\u3400-\u9fff\u3000-\u303f\uff00-\uffef]` 这一「Runtime 自撰文案优先」判定。
- 结论：插件侧两条提示路径（本地预判 + 宿主错误码回落）在 K3 上都有真实数据验证；桌面 Bibit 的目视验收不再作为阻塞项，因为宿主 webview 不接受远程注入。

## 2026-09-18：K3 桌面 Bi-bit 全部页面报「服务离线」（发布 0.1.27／UI 0.2.24）

- 触发：用户报告 K3 桌面 Bi-bit 的专家、服务商等页面全部显示 `the service is offline`。
- 定位：`bibit-runtime-adapter@bianbu.service` 已 `inactive (dead) since 2026-09-18 09:45:32`，日志只有 `Deactivated successfully`、没有 `Stopping`——是主进程被外部信号杀掉，不是 systemd 主动停；`127.0.0.1:5186` 因此无人监听，宿主连不上 external service 只能报离线。Runtime 本身正常（`/api/v1/providers` 直接返回 200，专家、服务商数据都在）。
- 根因：unit 用 `Restart=on-failure`，而 systemd 把 SIGTERM 视为正常退出，所以外部 `kill`／`pkill` 之后不会拉起；`docs/plugin-development.md` 又让开发者用同一份 `deploy/real_runtime_proxy.py` 起预览并「先停止该进程」，`pkill -f real_runtime_proxy.py` 会把系统 adapter 一起杀掉。同一 adapter 在 2026-09-14 也被 Security reset 脚本停过一次（那次是显式 `systemctl stop`）。
- 宿主文案来源（决定了插件要按 code 兜底）：`/usr/bin/bibit-gui` 里 `class O extends Error{constructor(e,t,n,i){super(t);this.code=e;...}}` 配 `U={cancelled:"The service request was cancelled",offline:"The service is offline",...}`，并在 `if(!c.ok) throw u(c.error.code)` —— 真实宿主用错误码查自己的 canned 文案、丢弃 adapter 的 message；用户看到的 `the service is offline` 就是 `U.offline`。
- 改动文件：`deploy/bibit-runtime-adapter.service`（`Restart=on-failure`→`always` 并注明原因）、`src/RuntimeSettingsPage.tsx`（页面加载、端侧模型、采集服务商目录三处失败改走 `serviceFailureText`）、`src/runtime-service-errors.ts`（`offline` 文案点名 `bibit-runtime-adapter@bianbu.service` 并给出 systemctl 命令；新增 `HOST_OFFLINE` 文本兜底）、`src/runtime-i18n.tsx`（新增英文文案）、`docs/plugin-development.md`（预览进程按 PID 停，写明 pkill 后果）、`tests/test_runtime_adapter.py`、`tests/ui/settings-pages.test.tsx`、`debian/changelog`、`package*.json`、`bibit.feature.json`、`debian/rules`。
- 回归：`tests/test_runtime_adapter.py` 新增 `RuntimeAdapterUnitTest`（unit 必须 `Restart=always`、`ExecStart`/端口与文档一致），回退 unit 时失败；`tests/ui/settings-pages.test.tsx` 新增三条（宿主 `code=offline`、英文文案、宿主丢 code 时两种措辞的纯文本兜底），并改写旧用例「loads skills separately and preserves explicit service failure」——它原本断言的正是「原样回显 offline 占位文案」的旧行为，现改用无 code 的任意失败信息。回退 `src/RuntimeSettingsPage.tsx` 时 3 条失败。
- 本地验证：`npm run typecheck`、`npm run test:adapter`（21/21）、`npm run test:ui`（101/101）、`npm run build:dev`、`npm run build:plugin`、`git diff --check` 全部通过。
- K3 验证一（恢复 + 自动拉起）：`systemctl start bibit-runtime-adapter@bianbu` 后 5186 恢复监听，`agents.list.v1`／`providers.list.v1` 经 `/bibit/v1/invoke` 返回 `ok: true`；把新 unit 装到 `/etc/systemd/system/` 与 `/usr/lib/systemd/system/` 后 `daemon-reload`，`kill -TERM <MainPID>` 实测 t+1s `activating`、t+5s `active` 且新 PID 监听 5186。
- K3 验证二（真实 bundle 的错误界面）：把本轮 `npm run build:dev` 的 `dist/` 与 adapter 放到 K3 `/tmp/ui224`，用 `RUNTIME_BASE_URL=http://127.0.0.1:1`（模拟 Runtime 连不上）在 5194 起真实 adapter，本机 SSH 转发后用 `playwright-cli` 打开 `http://127.0.0.1:5294/?lang=zh-CN`。网关 envelope 实测 `{"code":"offline","message":"Runtime service is offline","retryable":true}`；专家页与服务商页的 alert 都是
  `Runtime 未运行或无法连接。Bi-bit 通过 bibit-runtime-adapter@bianbu.service 访问 Runtime，两者都要在运行；请在终端执行 sudo systemctl start bianbu-agent-runtime@bianbu bibit-runtime-adapter@bianbu 后重试。`
  顺带验证了文本兜底：vendored dev host 只 `throw new Error(envelope.error.message)`，code 在预览里是丢掉的。
- K3 验证三（发布产物）：新 bundle 装到 `/usr/lib/bibit/plugins/runtime.bibit-plugin.tgz`，解包后 manifest 版本 0.2.24，`dist/plugin.js` 内含 `bibit-runtime-adapter@bianbu.service` 与 `sudo systemctl start bianbu-agent-runtime@bianbu`（各 2 处）。
- 发布：`package.json`／`package-lock.json`／`bibit.feature.json` 0.2.23→0.2.24，`debian/rules` 安装 `artifacts/runtime-0.2.24.bibit-plugin.tgz`，`debian/changelog` 增加 0.1.27 条目；bundle SHA-256 `fa7c17f599c021e91c036749e96eab74e4d36c39e6c2feb3e2c62d4fefc920f9`。
- 遗留：K3 上 `/etc/systemd/system/bibit-runtime-adapter@.service` 是 2026-09-01 手工安装的副本，会遮蔽包内的 `/usr/lib/systemd/system/` 版本——本轮已两份同步，但升级包不会更新 `/etc` 那份；用户机器若有 `/etc` 副本需一并替换或删除，否则 unit 修复不生效。
- 遗留：vendored dev host（`@bibit/feature-dev-host`）丢掉 `envelope.error.code` 只留 message，与真实宿主（留 code、丢 message）相反；两种形状本轮都补了兜底，但预览与真机的错误语义仍不一致。
- 遗留：Security 的 `bianbu-agentic-security-reset` 仍会 `systemctl stop` 一批服务且不重启（设计如此），这类停机 `Restart=always` 不覆盖，需要用户按脚本提示手动拉起。
- 遗留：Bibit 宿主缓存插件包，需重启 Bibit 才加载 0.2.24 bundle。

### 2026-09-18 补记：桌面 Bibit 的插件仓库钉版本（K3 实测）

- 触发：用户要求把 K3 桌面 Bibit 重启到 0.2.24。apt 已经装好 `bibit-runtime-plugin 0.1.27`（10:41:05，dpkg 日志），`/usr/lib/bibit/plugins/runtime.bibit-plugin.tgz` 解包 manifest 是 0.2.24、内含本轮新文案，但重启两次 Bibit 后宿主日志仍是
  `Loaded trusted plugins: agent-hub@0.2.3, filesearch@0.1.0, memory@0.1.4, runtime@0.2.23`。
- 定位：宿主（`trusted_plugin_bootstrap`）不看 `/usr/lib/bibit/plugins/*.tgz` 的版本，而是用用户级仓库 `~/.local/share/BiBit/data/plugins/`：`registry.json` 的 `desired`/`active`/`current` 里 runtime 都是 0.2.23，宿主启动时会把系统 tgz 解到 `installed/runtime/0.2.24/`（该目录内容确认带本轮文案）但**不切换 active 版本**，重启无效。
- 处置与实测：备份 `registry.json` 后把 `desired.runtime` 改成 `0.2.24`，退出并重启 Bibit，宿主日志变为 `... runtime@0.2.24`，`active`/`desired`/`current` 均为 0.2.24，无 `Rejected trusted plugin` 记录。备份在 K3 `/tmp/registry.json.bak-*`。
- 改动：`docs/plugin-development.md` 增加宿主插件仓库与版本切换说明（纯文档，不涉及代码，无需重新打包）。
- 遗留：deb 升级只把新版本放进 `installed/`，桌面要用上仍需在 **Extensions / 扩展** 页面做一次校验/安装（或按上面的方式改 `desired`）。是否需要包脚本代劳属于产品决策——它会绕过宿主的「新版本要用户校验」设计，本轮未改。
- 遗留：K3 上 `/etc/systemd/system/bibit-runtime-adapter@.service` 的手工副本已改名为 `bibit-runtime-adapter@.service.manual-leftover-20260918`，unit 现在从包内的 `/usr/lib/systemd/system/` 加载（`systemctl show -p FragmentPath` 确认），并复验 `kill -TERM` 后 5 秒内自动拉起。

## 2026-09-18：技能页去掉「探索技能广场」入口（发布 0.1.28 / UI 0.2.25）

- 触发：用户要求 Runtime 控制台与 Bibit Runtime 插件的技能页面都删掉「探索技能广场」入口。
- 改动文件：`src/RuntimeCatalog.tsx` 删除 skills 目录 intro 里的外链 `<a>`（只保留描述文案）；`src/runtime-i18n.tsx` 删除 `'探索技能广场': 'Explore Skills Hub'` 词条。Runtime 侧对应改为 `bianbu_agent/console/web/chat.html` 移除 skills 视图头部按钮、`static/js/console.js` 删除中英 `skills_hub_btn`。
- 保留：斜杠命令 `/skill list --remote`（`slash_skill_list_remote`）属于命令面板的远程技能浏览能力，不是技能页面入口，本轮未动。
- 本地验证（worktree `fix/remove-skill-hub-entry`）：`npm run typecheck`、`npm run test:adapter`（21/21）、`npm run test:ui`（101/101）、`npm run build:dev`、`npm run build:plugin`（产出 `artifacts/runtime-0.2.25.bibit-plugin.tgz`）、`git diff --check` 全部通过；Runtime 侧同 worktree 跑 `tests/sdk/console`＋`tests/sdk/test_package.py`＋`tests/test_api_docs.py` 共 151 passed。
- 发布：`package.json`／`package-lock.json`／`bibit.feature.json` 0.2.24→0.2.25，`debian/rules` 安装 `artifacts/runtime-0.2.25.bibit-plugin.tgz`，`debian/changelog` 增加 0.1.28 条目；main `1458715` 推送后 tag `bianbu/0.1.28` 已推送，流水线把 `packaging/main` 推进到 `2da44fc`＋`69fbbe6`（Sync change / Update changelog）。Runtime 侧同步发布 0.1.92，tag `bianbu/0.1.92` 与 `packaging/main` 的 `3f145cd1`＋`3b63ec0b` 对应。
- K3 实机验收：`apt install bibit-runtime-plugin` 升到 0.1.28；`/usr/lib/bibit/plugins/runtime.bibit-plugin.tgz` 的 `plugin.json` 版本 0.2.25，bundle 内「探索技能广场」与「Explore Skills Hub」各 0 处；同板 Runtime 0.1.93 安装包内的 `chat.html`／`static/js/console.js` 同样 0 处，`skills_hub_btn` 已无引用，`bianbu-agent-runtime@bianbu` 保持 active。
- 遗留：Bibit 宿主缓存插件包，桌面要看到新界面仍需重启 Bibit 并切换插件仓库 active 版本。
- 遗留：K3 当次装的 Runtime 是并行会话手工构建的 0.1.93（高于本次 CI 的 0.1.92，且包含同一改动），未在板上安装 CI 的 0.1.92 包做二次确认。

## 2026-09-18：监控日志页改读 runtime.jsonl（发布 0.1.29 / UI 0.2.26）

- 触发：用户指出前端「监控」分组里的日志页两边都是空的；确认是 Runtime 侧 `/api/v1/logs` 只 glob `logs/*.log`（设备上只有 `logs/operational/runtime.jsonl`），Runtime 控制台那一半已在 `bianbu-agent-runtime` 的 `fix(logs)` 提交里修好，插件侧只剩文案与空态。
- 改动文件：`src/RuntimeMonitorPages.tsx`（描述与文件名改为 `运行日志 (runtime.jsonl)`／`runtime.jsonl`、`aria-label=runtime.jsonl`、`Live` 支持自定义标签并在日志页显示「最近」、空快照渲染「暂无日志记录。」）、`src/runtime-monitor-i18n.ts`（删掉 `实时日志输出 (run.log)` 词条，新增 `运行日志 (runtime.jsonl)`、`最近`、`暂无日志记录。`）、`src/runtime-monitor.css`（`.runtime-monitor-log-empty`）、`tests/ui/monitor-pages.test.tsx`（中英空态、文件名与「有内容时不显示空态」）。
- 未改：`deploy/real_runtime_proxy.py`——Runtime 的 SSE `data: {"content": ...}` 形状不变，`_logs_text()` 无需适配。
- 本地验证：`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`（21/21）、`npm run test:ui`（102/102）、`git diff --check` 全部通过；`npm run build:plugin` 产出 `artifacts/runtime-0.2.26.bibit-plugin.tgz`，SHA-256 `40e87cb1df597fdc1e7f8643f1f416a05951582327b0f7e6decfb5e636427b5d`，解包确认内含 `runtime.jsonl` 文案与空态、已无 `run.log`。
- 发布：`package.json`／`package-lock.json`／`bibit.feature.json` 0.2.25→0.2.26，`debian/rules` 安装 `artifacts/runtime-0.2.26.bibit-plugin.tgz`，`debian/changelog` 增加 0.1.29 条目。
- 遗留：Bibit 宿主缓存插件包，桌面要看到新界面仍需重启 Bibit 并在扩展页做一次安装/切换（宿主用 `~/.local/share/BiBit/data/plugins/registry.json` 的 `desired` 决定 active 版本）。
- 遗留：K3 桌面 webview 仍无法远程注入输入，本轮仍以组件级用例 + 真实 Runtime 数据（proxy 渲染）作为验收路径。

## 2026-09-20：管理分组入口按角色给图标（发布 0.1.30 / UI 0.2.27）

- 触发：用户指出左侧「专家／服务商／Bibit 模型」等入口只有「安全」有自己的图标，其余全是一颗齿轮，导航里分不出谁是谁。
- 改动文件：`bibit.feature.json`（`agents` → `feature`、`providers` → `store`、`bibit-models` → `memory`，工具与其它入口保持 `settings`，安全保持 `security`）、`tests/ui/settings-pages.test.tsx`（新增「management 入口用已发布宿主提供的图标」用例，锁住这五个字形与具体映射）、`package.json`／`package-lock.json`／`bibit.feature.json` 0.2.26→0.2.27、`debian/rules` 安装 `artifacts/runtime-0.2.27.bibit-plugin.tgz`、`debian/changelog` 增加 0.1.30 条目。
- 关键约束：已部署的宿主 `bi-bit 0.1.15` 的 Rust 校验器只认 `store/memory/security/feature/settings` 五个 iconKey，声明未知值会**整插件被拒绝**。宿主 main 上 `2334acf`（扩到 17 个字形）与 `81fdea4`（未知 token 降级不拒绝）都还没发布，所以本轮只能用这五个字形表达角色（星芒＝专家、门面＝服务商商店、芯片＝Bibit 模型）。
- 本地验证：`npm run typecheck`、`npm run test:adapter`（21/21）、`npm run test:ui`（103/103）、`npm run build:dev`、`git diff --check` 全部通过；另用宿主 `bianbu/0.1.15` 的 feature schema 对 manifest 跑了一次 ajv 校验（valid）。
- 遗留：等宿主发布带 17 个字形的版本（`2334acf` 落地），再把专家换成 `users`／模型换成 `sparkles` 这类更贴切的字形；在那之前换任何新 token 都会让旧宿主整插件拒绝。
- 遗留：K3 桌面验收要等本包发布（或本机 `npm run build:plugin` 的签名包）＋宿主按 `~/.local/share/BiBit/data/plugins/registry.json` 的 `desired` 切到 0.2.27，本轮只做了组件级用例与 schema 校验。
- 关联（宿主侧，另一仓）：专家页「使用专家」要能跳到 Bibit 对话并选中该专家，需要宿主实现 `navigation.openRuntimeChat`（插件侧 `src/RuntimeExperts.tsx` 与 `src/runtime-contracts.ts` 的合同早已就位）；宿主实现存在于未合并提交 `bb8a00d`，已在 `~/bibit` 的 worktree `fix/runtime-expert-chat-navigation` 里 cherry-pick 并跑通相关用例，等待评审合并与发版。

## 2026-09-20：0.1.30 出包与实机验收（UI 0.2.27）

- 发布：main `839e7e7` 推送后，tag `bianbu/0.1.30`（`817e74e`）已推送，流水线把
  `packaging/main` 推进到 `fef5135`（Sync change from bianbu/0.1.30）＋`eb61b3e`
  （Update changelog for 0.1.30 release），archive `resolute-porting` 索引里出现 0.1.30。
- K3（`10.0.91.146`）从 archive `apt-get install bibit-runtime-plugin` 升到 0.1.30：
  `dpkg-query` 为 `ii`、`dpkg --audit` 为空；`/usr/lib/bibit/plugins/runtime.bibit-plugin.tgz`
  已更新（16:00 落盘），解包后 `plugin.json` 的 `featureManifest.version` 为 0.2.27。
- 装好的包里 `iconKey` 映射与设计一致，字形集合正好是宿主已发布的五个
  （`feature` / `store` / `memory` / `security` / `settings`），没有任何未知字形：

  ```text
  Experts -> feature        Providers -> store       Bibit Models -> memory
  Security -> security      Tools / MCP / Skills / Plugins / Logs /
  Runtime / Runtime Status / Agent Top / API Capture -> settings
  ```
- 同板 Runtime 同时升到 0.1.106（见 `bianbu-agent-runtime` 的发布记录），
  控制台「轨迹」页的等待/重叠合计与源包一致。
- 遗留：仍要重启 Bibit 并在扩展页把 active 版本切到 0.2.27，桌面左侧导航才能看到
  新字形（宿主用 `~/.local/share/BiBit/data/plugins/registry.json` 的 `desired` 决定）。
- 遗留：宿主最新发布 tag 仍是 `bianbu/0.1.15`，17 字形（`2334acf`）还没发版；
  等它发版后再把专家换成 `users`、模型换成 `sparkles` 这类更贴切的字形。
- 关联（宿主侧，另一仓）：专家页「使用专家」跳到 Bibit 对话并选中该专家，已按该仓
  约定提 MR（`fix/runtime-expert-chat-navigation`，MR !12，已 rebase 到宿主最新 main）。

## 2026-09-20：专家"使用专家"改接宿主 conversation.create

- 背景：原先按宿主 `navigation.openRuntimeChat` 实现（见上一条关联记录），按钮在宿主未提供该导航成员时保持禁用。宿主侧已提供通用宿主动作 `host:actions`（动作 `conversation.create`），本次改为该合同，不再依赖插件专用的导航成员。
- 改动：
  - `src/runtime-contracts.ts`：新增 `HOST_ACTIONS_CAPABILITY`(`host:actions`)、`CREATE_CONVERSATION_ACTION`(`conversation.create`)、`RUNTIME_AGENT_RESOURCE`，并删除 `RUNTIME_CHAT_NAVIGATION` / `RuntimeChatNavigation`（按约定集中定义能力名与动作名）。
  - `src/RuntimeSettingsPage.tsx`：新增 `useStartExpertConversation()`，把宿主动作适配成页面使用的可调用对象——`completed` 正常返回，`rejected` 抛出 `error.message`，`cancelled` 抛"新建会话已取消。"；不再从 `navigation` 取 `openRuntimeChat`。
  - `src/RuntimeExperts.tsx`：`openChat` 更名 `startConversation`（类型 `StartExpertConversation`），语义从"导航"改为"请求宿主新建会话"，其余禁用与提示逻辑不变。
  - `src/runtime-experts-i18n.ts`：替换旧提示为"当前 Bibit 未提供宿主动作能力，无法新建会话。"，新增"新建会话已取消。"。
  - `bibit.feature.json`：`requiredHostCapabilities` 增加 `host:actions`；UI 版本 0.2.27 → 0.2.28。
  - `vendor/`：按交付流程从 Bibit 宿主 main 重打为 0.4.0（该版才含 `host:actions` 的类型与 manifest schema），移除被替换的 0.3.0 五个包（含 `-settings`/`-locales`/`-runtime-chat` 定制变体）；`package.json` 与 lock 同步。
  - `tests/ui/settings-pages.test.tsx`：宿主 mock 区分 `host:actions` 与 Runtime 服务；新增 3 条用例（动作参数为 `runtime/agent/<id>`、被拒时页面显示原因且按钮仍可用、未授权时禁用并显示新提示）。
- 验证（本机）：`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`（21/21）、`npm run test:ui`（106/106）、`git diff --check`、`npm run build:plugin` 全部通过。
- 关联（宿主侧，另一仓）：`host:actions` 能力与 `conversation.create` 动作已在宿主 main（`feat(feature-sdk): let features ask the host for cross-surface actions`）实现；宿主需为该插件授予 `host:actions` 才会下发该能力。
- 遗留边界：本阶段未在 K3 实机验收（未部署本包、未改板端授权），因此不把本机测试当作实机通过；实机需宿主为 `runtime` 授予 `host:actions` 后再验。原先针对 `navigation.openRuntimeChat` 的宿主 MR（`fix/runtime-expert-chat-navigation`）在本插件改用宿主动作后不再被本插件依赖。

## 2026-09-20：审计列表改为服务端游标分页（独立 worktree，未发布）

- 根因：Runtime 全量导出审计、解析筛选、自动校验，再由插件全量渲染；随日志增长放大磁盘、CPU、内存和 DOM 开销。
- 改动：`src/runtime-contracts.ts` 定义分页 DTO 和 100 条页大小；`src/RuntimeSecurityControls.tsx` 增加上一页/下一页、固定快照、筛选/刷新重置、加载与错误状态，并拒绝旧后端超量结果；显式校验入口保留。`src/runtime-i18n.tsx` 增加中英文文案；`dev/main.tsx` mock 支持 250 条分页；`deploy/real_runtime_proxy.py` 说明分页透传；`tests/test_runtime_adapter.py`、`tests/ui/security-workflows.test.tsx` 和新增 `tests/ui/audit-pagination.test.tsx` 覆盖合同、翻页、过期响应、错误与旧接口。
- 联动：在另外两个仓各自的 `fix/audit-pagination` worktree 修改 Runtime 和 Security。Security 新增管理 D-Bus QueryAudit、SQL 游标分页和索引；Runtime 直接转发且移除查询时全量导出/校验，自带控制台也补翻页。详细合同、上线顺序和测试边界见配套 Security 仓 `docs/audit-pagination.md`。
- K3 隔离副本 `/home/bianbu/audit-pagination-20260920/bibit-runtime-plugin` 验证：`npm run typecheck`、`npm run build:dev` 通过；`npm run test:ui` 106 passed；`npm run test:adapter` 22 passed。Runtime 相关回归 33 passed。Security 全量 842 passed/3 skipped，最后游标上限优化再跑审计与真实私有 D-Bus 用例 41 passed。
- K3 合成百万条日志查询引擎压测：首页/中间页各取 100 条，中位数均约 1.73 ms；Hook/拒绝筛选约 2.6–3.0 ms。不含网络与桌面渲染，不作为端到端延迟承诺。
- 遗留：未提交/推送/发布/替换线上服务；需先更新 Security 服务和客户端，再更新 Runtime/插件并做真实 Bibit 桌面验收。显式全量校验仍可能较慢；单条超大文本没有字节限制。本轮不调整版本与最低依赖。
## 2026-09-21：每个设置入口改用各自角色的图标并在 K3 实机验收

- 触发：用户指出左侧设置导航里除「安全」外全是同一颗 settings 齿轮，要求把各入口换成各自角色的图标，实机验证后再提交、开 MR。
- 改动文件：`bibit.feature.json`（agents→`users`、providers→`plug`、bibit-models→`brain`、tools→`wrench`、mcp→`server`、skills→`sparkles`、plugins→`puzzle`、agent-top→`gauge`、runtime-status→`activity`、capture→`radio`、logs→`logs`，security 保持 `security`）、`tests/ui/settings-pages.test.tsx`。
- 版本：本轮不动任何版本号、changelog 与 `debian/rules` 的包名（UI 仍是 0.2.28、deb 仍是 0.1.30），发版由该负责人自己安排。
- 测试口径变化：旧用例锁死「恰好是宿主 0.1.15 的五个字形」，改为断言每个声明值都落在宿主字形表 `FEATURE_ICON_KEYS` 内、12 个入口字形互不重复，并锁住具体映射——以后宿主扩表时改映射不会再被旧断言挡住，而声明宿主不认识的值仍会失败。
- 为什么现在能换：宿主 `bi-bit` 0.1.16（tag `bianbu/0.1.16`，含宿主提交 `2334acf` 的 17 个字形）已发布并装在三块板上。0.1.15 及更早把 `iconKey` 当闭合枚举，声明未知值会让整插件被拒，所以本版实际要求宿主 0.1.16 及以上。
- 版本漂移（本轮未改，留给发版负责人）：0.2.28 那轮只改了 `package.json`／`bibit.feature.json`，`debian/rules` 仍装 `runtime-0.2.27.bibit-plugin.tgz`；按约定本轮没碰，发版时记得一起对齐。
- 本机验证：`npm run typecheck`、`npm run test:adapter`（21/21）、`npm run test:ui`（106/106）、`npm run build:dev`、`git diff --check` 全部通过；`npm run build:plugin` 产出 `artifacts/runtime-0.2.28.bibit-plugin.tgz`（包内 manifest 版本就是提交里的 0.2.28）。
- K3 实机验收（板 K3DEB1-2；平台租约 `req-9b8b962667d4459098777e5f1b7ace82`／`att-1c87df1773344b058be84b722188b1a9`；宿主用平台从 `bibit-gui` main `e39093fa8`（0.1.16 发布提交）构建的 `gui-73da4a51bcbd`，界面 `App Version v0.1.16`）：
  - 宿主校验：签名包放到 `/usr/lib/bibit/plugins/runtime.bibit-plugin.tgz`、插件仓库 `desired.runtime` 切到 0.2.28 后重启 Bibit，日志为 `Loaded trusted plugins: agent-hub@0.3.0, filesearch@0.1.0, memory@0.1.4, runtime@0.2.28`，无 `Rejected trusted plugin`——新 iconKey 通过原生校验。
  - 字形渲染：设置导航截图里 Experts/Providers/Bibit Models/Tools/MCP/Skills/Plugins/Security/Agent Top/Runtime Status/API Capture/Logs 十二个入口各有一个字形（此前除安全外全是齿轮）。
  - 功能未回归：点 `users` 字形的 Experts 入口正常进入页面，显示 `Runtime connected` 与真实专家（BibitEdgeAssistant、test）。
  - 证据目录：`~/.local/state/bibit-dev/evidence/req-9b8b962667d4459098777e5f1b7ace82/`（`ui-settings-nav-r2-20260921-101019.png`、`ui-extensions-r2-20260921-101043.png`、`ui-experts-r2-20260921-101053.png`）；四条结论已写进该产物 `gui-73da4a51bcbd` 的 `verify.tsv`。
  - 收尾：板端插件包还原为 0.2.27（sha `985bf92a0db0001c`）、`registry.json` desired/active/current 还原为 0.2.27，重启后日志回到 `runtime@0.2.27`；GUI 二进制由平台 release 按基线还原为 `bb2ea88e2b24c98f`。
- 遗留：本轮只逐页点开了 Experts，其余 11 个入口验到「字形各自独立且列表可渲染」，没有逐页点开；插件内部页面本轮无改动。
- 遗留（同板实测发现，属于上一轮 0.2.28 改动）：板端 `/etc/bibit/feature-capability-grants.d/runtime.json` 只授予 `service:runtime`／`service:runtime-security`，本仓 `deploy/feature-capability-grants-runtime.json` 同样没有 `host:actions`；因此按包安装的设备上专家页「Use expert」会因能力未下发而保持禁用（实测按钮为灰态）。要真正启用宿主动作，需要把 `host:actions` 加进该 grant 文件；本轮未改，留给该功能的负责人确认。

## 2026-09-21：0.1.31 流水线失败定位与修复（本次发 0.1.32）

- 现象：tag `bianbu/0.1.31`（指向 `ae0f049`）的 CI 在 `override_dh_auto_install` 报
  `install: No such file or directory`——rules 要装 `artifacts/runtime-0.2.27.bibit-plugin.tgz`，
  而同一次构建 `npm run build:plugin` 产出的是 `artifacts/runtime-0.2.28.bibit-plugin.tgz`。
  测试、typecheck、build 全过，只有最后安装那一步炸。
- 根因：0.2.28 那轮只把 `package.json`／`bibit.feature.json` 提到 0.2.28，`debian/rules` 里的
  文件名留在了 0.2.27（上一轮 process.md 已记为"版本漂移，留给发版负责人"，这次正好踩上）。
- 修复：`debian/rules` 不再写死文件名，`PLUGIN_VERSION` 从 `bibit.feature.json` 的 `version` 推导，
  安装 `artifacts/runtime-$(PLUGIN_VERSION).bibit-plugin.tgz`。
- 回归用例：`tests/test_deployment_grants.py` 新增两条——grant 必须覆盖 manifest 的
  `requiredHostCapabilities`；`debian/rules` 不得再出现 `artifacts/runtime-X.Y.Z.bibit-plugin.tgz`
  这种写死形式。两条在修复前的文件上都失败（红-绿已核）。
- 附带修复（上一轮 K3 实测遗留）：`deploy/feature-capability-grants-runtime.json` 的
  `features.runtime` 补上 `host:actions`；此前 manifest 声明了该能力、grant 却没给，按包装机的
  设备上专家页「Use expert」因能力未下发保持灰态。
- 本机验证：`python3 -m unittest discover -s tests -q` 24 passed；`npm run typecheck`、
  `npm run test:ui` 全过。
- 版本：0.1.31 的包没进 archive（构建阶段就失败），`packaging/main` 的 changelog 已被 CI 推到
  0.1.31，所以本次发 0.1.32；tag 打在修复提交上。

## 2026-09-21：0.1.32 出包、入库与 K3 实机验收

- 发布：修复提交 `0330251` 推上 main 后，tag `bianbu/0.1.32` 推送；pack job 把 `packaging/main`
  同步到 0.1.32（10:42），binary 构建 + 入库通过，archive `resolute-porting` 索引在 10:48 出现 0.1.32
  （上一版 0.1.30；0.1.31 卡在 `debian/rules` 写死的 bundle 名上，没有产出二进制包）。
- 本机整包验证：`dpkg-buildpackage -us -uc -b` 全过，`bibit-runtime-plugin_0.1.32_all.deb` 里
  `/usr/lib/bibit/plugins/runtime.bibit-plugin.tgz` 的 manifest 版本是 0.2.28，grant 文件带
  `host:actions`——正是 0.1.31 失败的那一步。
- K3 实机验收（`10.0.91.146`）：`apt-get install --only-upgrade bibit-runtime-plugin` 升到 0.1.32，
  `dpkg --audit` 为空，`bibit-runtime-adapter@bianbu.service` active；
  `/etc/bibit/feature-capability-grants.d/runtime.json` 由包更新为
  `["service:runtime","service:runtime-security","host:actions"]`；装出来的 bundle manifest 仍是 0.2.28。
- 未验：桌面侧还没重启 Bibit 复核「Use expert」不再灰态——板上 Bibit 宿主是 0.1.16，grant 已经到位，
  下一次宿主重启/换包时按 0.1.16 的验收路径复核即可。
## 2026-09-21：按用户要求删除「API 捕获」设置入口

- 触发：用户要求「把 bibit-runtime-plugin 那边的 API 捕获删了，不需要这个」。只动本插件，`bianbu-agent-runtime` 的 `/api/v1/provider-capture` 与 `providerCapture.*.v1` operation 保留不动。
- 删除文件：`src/RuntimeCapture.tsx`、`src/runtime-capture-model-i18n.ts`、`tests/ui/capture-model-parity.test.tsx`（原文件同时覆盖 Bibit 模型组件，其中 3 条模型用例搬进新文件 `tests/ui/bibit-models.test.tsx`）。
- 拆分共用样式：`src/runtime-capture-model.css` 是捕获页与 Bibit 模型页共用的样式文件，删掉捕获规则后另存为 `src/runtime-bibit-models.css`（只留 `.runtime-model-*`／`.runtime-models` 规则），`RuntimeBibitModels.tsx` 改 import 该文件。i18n 同理：`runtime-capture-model-i18n.ts` 的模型条目搬进 `src/runtime-bibit-models-i18n.ts`，在 `runtime-i18n.tsx` 里换掉 spread。
- 删除实现：`bibit.feature.json` 去掉 `id/path: capture` 与 `runtime:capture` 标题；`src/runtime-contracts.ts` 去掉 5 个 `providerCapture*` operation 和 `ProviderCapturePreview/RecordView/View` DTO；`deploy/real_runtime_proxy.py` 去掉 5 个 `/api/v1/provider-capture*` 分支；`deploy/feature-capability-grants-runtime.json` 去掉对应 5 条授权；`dev/main.tsx` 去掉捕获 mock 与 `ProviderCaptureView` 引用；`src/RuntimeSettingsPage.tsx` 去掉捕获 tab 的数据加载、1 s 轮询、服务商目录轮询、`pageTitleSources` 条目与渲染分支；`src/runtime.css` 去掉 `.runtime-console-capture` 宽度选择器；`src/runtime-i18n.tsx` 去掉「API 捕获」页标题、`Provider API 捕获`、`更新/清空/清除 Capture 目标` 等捕获文案。
- 测试调整：`tests/ui/settings-pages.test.tsx` 删掉捕获专属用例与 `capture: 'radio'` 图标断言，入口清单由 12 条改 11 条；「服务商目录不可用时的统一恢复文案」原来跑在 capture 页，改为在 providers 页验证同一保证。`tests/test_runtime_adapter.py` 删掉捕获合同用例、5 个 operation 映射和 5 条 `/api/v1/provider-capture*` 调用断言。
- 文档：`README.md` 监控分组去掉「API 捕获」；`docs/plugin-development.md` 的页面数量 12 → 11、组件清单去掉 `RuntimeCapture`。`docs/superpowers/` 下 2026-09-02／09-07 的已定稿设计文档按历史记录保留原文。
- 验证命令与结果：`npm run typecheck` 通过；`npm run test:adapter`（21/21）通过；`npm run test:ui`（8 文件 104 用例）通过；`npm run build:dev` 通过；`git diff --check` 通过。`npm run dev --mock` 用 playwright-cli 打开 `http://127.0.0.1:5173/?mock=1`：工作台贡献清单为 11 条且不含 capture，Runtime 状态、日志页正常渲染，页面 console 无 error。
- 版本：与下面的本地模型改动一起随 0.1.33 发布（UI bundle 0.2.29）。
- 遗留：宿主若仍保留旧 manifest 缓存，需重启 Bibit 后生效。移除授权后旧插件实例若再调
  `providerCapture.*.v1` 会被宿主拒绝，属预期。

## 2026-09-21：本地模型页改为只读并删除插件 Console 依赖

- 触发：用户要求「本地模型依赖上 ai-gateway 来看即可」，把模型页改成只读（不再有下载/启动/停止按钮），并说明模型状态由 `spacemit-ai-gateway` 包提供。与 Runtime 仓同期的改动是移除 Plugin Console 机制、新增只读资源 `GET /api/v1/local-models`。
- operation：`src/runtime-contracts.ts` 去掉 `pluginConsolesGet` / `pluginConsolesAction`，新增 `localModelsGet: 'localModels.get.v1'`；`BIBIT_MODEL_PLUGIN_ID`、`BIBIT_MODEL_ACTIONS` 与 `PluginConsoleView` 一并删除（Runtime 已无 plugin console 路由）。
- DTO：`BibitModelsView` 改为 `LocalModelsView`：`source`、`read_only`、`models[]` 带 `backend`、`port`（可为 null）、`path`、`registered`、`download{status,progress}`、`server{status,managed}`；不再有 `actions`。
- 组件：`src/RuntimeBibitModels.tsx` → `src/RuntimeLocalModels.tsx`（新增，只渲染状态：模型名、位置、运行/加载状态，下载中显示进度；无任何按钮）。样式 `runtime-bibit-models.css` → `runtime-local-models.css`（去掉按钮规则，新增 `.runtime-model-empty`），i18n `runtime-bibit-models-i18n.ts` → `runtime-local-models-i18n.ts`（`runtimeLocalModelsEnglish`）。
- 页面：`src/RuntimeSettingsPage.tsx` 的 `bibit-models` 分支改调 `localModelsGet`，数据字段 `bibitModels` → `localModels`，失败面板由「Bibit 端侧服务不可用」改为「本地模型状态不可用」（提示 AI Gateway 18790 / bibit-intent 8765，并说明读取失败不影响对话）；`pageTitleSources`、`runtime-i18n.tsx` 的页面名与 `bibit.feature.json` 的 `fallbackTitle` 由 Bibit 模型改为本地模型 / Local Models（入口 id、路径 `bibit-models` 与 `titleKey` 保持不变，避免宿主导航合同变化）。
- 适配与部署：`deploy/real_runtime_proxy.py` 用 `localModels.get.v1` → `GET /api/v1/local-models` 替换两个 plugin console 分支；`deploy/feature-capability-grants-runtime.json` 两条授权改为一条 `localModels.get.v1`；`dev/main.tsx` mock 改为只读 `localModels` 对象。
- 测试：`tests/ui/bibit-models.test.tsx` → `tests/ui/local-models.test.tsx`（3 条：只读渲染与无按钮、无效响应、未注册模型）；`tests/ui/settings-pages.test.tsx` 更新入口标题与两条模型页用例（不可用提示、只读渲染）；`tests/test_runtime_adapter.py` 的 operation 与 `/api/v1/local-models` 断言同步。
- 文档：`README.md`（管理分组与本地模型的服务边界）、`docs/plugin-development.md`（组件名）。`docs/superpowers/` 下的历史设计文档保留原文。
- 验证命令与结果：`npm run typecheck` 通过；`npm run test:adapter`（21/21）通过；`npm run test:ui`（8 文件 104 用例）通过；`npm run build:dev` 通过；`git diff --check` 通过。
- dev host 本机检查：`npm run dev` 后 playwright-cli 打开 `http://127.0.0.1:5173/?mock=1`，点「Settings · bibit-models」：页面只有页头 Refresh 一个按钮，无下载/启动/停止控件；卡片显示 `bibit-llm` / `bibit-embed`（位置 `/opt/bibit-intent/models/bibit-embed.gguf`，下载进度 40%），状态 Running / Not loaded；无 `[role=alert]`，页面 console 无 error。
- 版本：本轮的「删 API 捕获 + 本地模型只读」一起发 0.1.33；UI bundle 从 0.2.28 提到 0.2.29
  （`package.json` 与 `bibit.feature.json` 同步），`debian/rules` 按 manifest 推导 bundle 名，
  不再需要手工对齐文件名。
- 宿主影响：`localModels.get.v1` 由本插件自己的 adapter 翻译成 Runtime 的
  `GET /api/v1/local-models`，不再经过宿主插件 Console，所以宿主版本不变也能用；导航字形仍要求
  宿主 `bi-bit` 0.1.16 及以上。
- 遗留：本页依赖 Runtime 侧的 `/api/v1/local-models`；Runtime 未升级到带该资源的版本时，页面会
  显示「本地模型状态不可用」。

## 2026-09-21：0.1.33 / 0.1.34 发版尝试与本项目 CI 未响应

- 动作：内容提交 `b6e7265` 推上 `main` 后，`bianbu-dev tag --version 0.1.33` 打 tag 并 push
  （12:03）；一小时后 `origin/packaging/main` 仍停在 0.1.32、archive 没有 0.1.33。12:57 删掉
  tag 再推一次（同 ref 新 push 事件）无变化；13:10 再打全新 tag `bianbu/0.1.34` 并 push，同样
  没有任何 pipeline 活动。
- 对照：同一时间窗内、同一套 `.bianbu-ci.yml` 模板的 Runtime 仓 tag `bianbu/0.1.109`（12:03
  推送）在 40 秒内就更新了 `packaging/main`，14 分钟内出包并进 archive，K3 已从 archive 升级到
  0.1.109。所以不是模板问题、也不是 runner 池整体不可用，而是**本项目的 tag pipeline 没有跑起来**
  （未创建，或作业被阻塞），需要从 GitLab 侧查（本机没有该实例的凭据，看不到 job 日志）。
- 有意没做：1) 没有用 `bianbu-dev pack/build/upload` 手动把包塞进 archive——那会绕过 CI 写
  `packaging/main` changelog 的既有记录方式；2) 这段时间没有往 `main` 推任何提交，避免 pack job
  收尾 `git push origin --all` 因非快进失败（0.1.31 就是这样整版丢失的）。
- 版本：0.1.33 与 0.1.34 指向同一个提交 `b6e7265`，谁先被流水线打包都可以；两者都进不去时需要
  在 GitLab 侧恢复本项目 pipeline。

## 2026-09-21：新「本地模型」页在 K3 真机上的数据通路验证

- 板 `10.0.91.146` 已从 archive 升级到 Runtime `0.1.109`（带 `GET /api/v1/local-models`）：
  - `curl /api/v1/local-models` → `source=bibit-intent`、`read_only=true`、`bibit-llm` 与
    `bibit-embed` 都是 `running`；
  - 用本仓真实 adapter `deploy/real_runtime_proxy.py`（`RUNTIME_BASE_URL` 指向该 Runtime、走
    SSH 转发）调 `localModels.get.v1` → `ok:true`，返回同样的只读结构，说明从插件 operation 到
    Runtime 资源的翻译在真机上通；
  - `GET /api/v1/plugin-consoles/bianbu.bibit.intent` → 404，宿主侧的插件 Console 依赖确实已消失；
  - Runtime Console 页面用 `agent-browser` 打开确认只有「刷新」一个按钮、两个模型「运行中」。
- 未做：Bibit 宿主（bi-bit 0.1.16）里的页面验收——需要重启宿主并借助平台 GUI 环境；页面本身由
  `tests/ui/local-models.test.tsx` 与 dev host `?mock=1` 的 playwright 检查覆盖。

## 2026-09-21：卸掉误提交进来的 debhelper 中间产物

- 触发：本地跑一次 `dpkg-buildpackage` 就让工作区出现 9 个改动，查下来是 `3a6a12c` 把
  `debian/bibit-runtime-plugin/**`（打包暂存目录）、`debian/.debhelper/**`、`debian/files`、
  `debian/debhelper-build-stamp`、`debian/bibit-runtime-plugin.substvars` 等 24 个构建产物提交
  进了仓库。除了每次都改脏工作区，打包时还有把上一版 `DEBIAN/control`、`md5sums` 当输入的风险。
- 改动：从索引移除这些文件并写进 `.gitignore`（`debian/rules` 每次构建都会重新生成）。
- 验证：删掉跟踪后重跑 `dpkg-buildpackage -us -uc -b` 成功、工作区保持干净；产出的 deb 内
  `/usr/lib/bibit/plugins/runtime.bibit-plugin.tgz` manifest 版本 0.2.29，`dist/plugin.js` 含
  `localModels.get.v1` 与「本地模型」、不含 `providerCapture`，grant 为
  `service:runtime` / `service:runtime-security` / `host:actions`。
- 该提交在 `chore/drop-packaging-artifacts` 分支上，等发版流水线跑完（避免 push 竞争）再推 `main`。

## 2026-09-21：0.1.35 流水线失败定位与 0.1.36 发版

- 现象：tag `bianbu/0.1.35`（指向 `7422b61`）的 pack job 在源码包步骤失败——
  `dpkg-source -Zxz -b . && dpkg-genchanges -S -sa -O../bibit-runtime-plugin_0.1.35_source.changes`
  报 `dpkg-genchanges: error: cannot fstat file ../bibit-runtime-plugin_0.1.32_amd64.buildinfo:
  No such file or directory`，退出 25。此前 0.1.33 / 0.1.34 的「流水线没反应」很可能是同一处失败，
  只是当时看不到 job 日志。
- 根因：`dpkg-genchanges` 无条件加载 `debian/files`，其中 `package_type=buildinfo` 的条目在
  「源码包只上传」的分支之前就被 `add_from_file`（dpkg 1.22.6 的 `/usr/bin/dpkg-genchanges:347`）。
  `3a6a12c` 误提交的 `debian/files` 里写着上一版 0.1.32 的 buildinfo，CI 树里没有这个文件，于是
  fstat 失败。与 `debian/` 其它内容、changelog 都无关，纯粹是陈旧打包产物被当成输入。
- 本机复现：clone `7422b61` 后 `dpkg-source -Zxz -b .` 成功，紧接着 `dpkg-genchanges -S -sa`
  报出与 CI 完全相同的错误（`../` 前缀一致）。
- 修复：把 `chore/drop-packaging-artifacts`（`0aa9ccd` + `16c13ba`）rebase 到 `main` 后快进合入，
  24 个 debhelper 中间产物移出索引并写进 `.gitignore`。
- 验证：同一份修复树上重跑 `dpkg-source -Zxz -b .` + `dpkg-genchanges -S -sa` 退出 0，产出
  `bibit-runtime-plugin_0.1.32_source.changes`，`debian/` 下不再有被跟踪的产物。
- 版本：0.1.33 / 0.1.34 / 0.1.35 三个 tag 都没进 archive（`packaging/main` 仍停在 0.1.32），
  本次发 0.1.36；插件 bundle 版本保持 0.2.29——0.2.29 本身从未发布（0.1.32 发的是 0.2.28），
  且这次只有打包侧改动，与 0.1.32 只改 `debian/rules` 时保持 0.2.28 同一种处理。
- 发布结果：tag `bianbu/0.1.36`（指向 `b22e10e`）推送后约 40 秒，`origin/packaging/main`
  出现 `Sync change from bianbu/0.1.36`（`7a9cf56`）与 `Update changelog for 0.1.36 release`
  （`d733feb`），同步提交里不再有 debhelper 产物；14:32 archive `resolute-porting` 索引出现
  0.1.36（14:24 打 tag，约 8 分钟出包入库）。
- 入库包核对：`pool/main/b/bibit-runtime-plugin/bibit-runtime-plugin_0.1.36_all.deb`
  （151432 B，SHA256 `8df610914ae16756119ff829a50dc3f80d42532ce564525f21359b2c3e7380f3`，
  `Depends: bianbu-agent-runtime, python3:any, systemd`）。包内
  `usr/lib/bibit/plugins/runtime.bibit-plugin.tgz` 的 manifest 版本是 0.2.29、capability 为
  `service:runtime` / `service:runtime-security` / `host:actions`；`dist/plugin.js` 含
  `localModels.get.v1` 与「本地模型」、不含 `providerCapture`。
- K3 实机验收（`10.0.91.146`）：`apt-get install --only-upgrade bibit-runtime-plugin` 从 0.1.32
  升到 0.1.36，`dpkg --audit` 为空、状态 `install ok installed`；postinst 自动重启的
  `bibit-runtime-adapter@bianbu.service` active；`/etc/bibit/feature-capability-grants.d/runtime.json`
  由包更新为 `["service:runtime","service:runtime-security","host:actions"]`；装出来的 bundle
  manifest 也是 0.2.29；经适配器真实调用 `localModels.get.v1`
  （`POST http://127.0.0.1:5186/bibit/v1/invoke`，`protocolVersion: 1`）返回 `ok:true`，内容与
  `GET http://127.0.0.1:9899/api/v1/local-models` 一致（`bibit-llm`、`bibit-embed` 均 running）。
- 未做：Bibit 宿主侧的页面验收需要重启桌面宿主，留给下一次宿主重启时复核。

## 2026-09-21：本地模型页改称「大语言模型」，卡片显示具体模型名

- 触发：用户看 K3 真机页面后要求 LLM 分节标题不要写「意图识别模型」而要写「大语言模型」，
  卡片要写具体模型名，不要露出 Gateway 条目 id（`bibit-llm` / `bibit-embed`）。
- Runtime 侧配套：`GET /api/v1/local-models` 的每个模型新增 `artifact` 字段（Gateway 注册路径里的
  具体模型文件名，如 `glm-edge-1.5b-chat-q4_0.gguf`），`name` 仍是上游模型标识；Intent 只报
  Gateway 条目 id 时由 Runtime 查 Gateway 注册表解析，读不到 Gateway 就留空、前端退回 `name`。
- 插件改动：`src/RuntimeLocalModels.tsx` 的 LLM 分节标题改为「大语言模型」、卡片标题改渲染
  `model.artifact || model.name`；`src/runtime-local-models-i18n.ts` 词典键同步；
  `src/runtime-contracts.ts` 的 `LocalModelsView.models[]` 增加可选 `artifact?: string | null`
  （老 Runtime 不返回该字段时行为不变）。「向量模型」标题与只读行为保持不变。
- 测试与 mock：`tests/ui/local-models.test.tsx`、`tests/ui/settings-pages.test.tsx`、`dev/main.tsx`
  的 fixture 换成真机形状（`name: 'bibit-llm'` + `artifact: 'glm-edge-1.5b-chat-q4_0.gguf'` +
  `/home/bianbu/.cache/models/...`），并断言页面不再出现 `bibit-llm` / `bibit-embed` 字样。
- 验证：`npm run typecheck` 通过；`npm run test:adapter`（23/23）与 `npm run test:ui`（8 文件 104 用例）
  通过；另用 Runtime 的 `LocalModelClient` 经 SSH 隧道读 K3（`10.0.91.146`）真实的 Intent 与
  Gateway，得到 `artifact` 为 `glm-edge-1.5b-chat-q4_0.gguf` / `Qwen3-Embedding-0.6B-Q4_0.gguf`。
- 版本：随 deb 0.1.37 发布，插件 bundle 0.2.29 → 0.2.30（`package.json` 与
  `bibit.feature.json` 同步），Runtime 侧对应 `bianbu/0.1.110`。

## 2026-09-21：「工具」页介绍随界面语言切换并在悬浮时显示完整文本

- 触发：用户反馈设置「工具」页的工具介绍中英混排、卡片上又只显示两行看不全，要求支持中英文
  切换，并且悬浮时能看到详情。
- 根因：工具介绍来自 Runtime 内置工具的 docstring（模型可见的说明），一次只写一种语言
  （`browser_*`、`files/` 是英文，`kanban_*` 是中文），插件页只能原样显示再两行截断。
- Runtime 侧配套（`bianbu/0.1.111`）：新增 `bianbu_agent/tools/summaries.py`，33 个内置工具各带
  zh/en 一句话简介，随 `GET /api/v1/capabilities/{kind}` 的 `summaries` 字段下发；Runtime 不拥有
  的工具（用户工具、Plugin 工具、MCP 工具）为空对象。
- 插件改动：`src/runtime-i18n.tsx` 新增 `useRuntimeLanguage()`（宿主语言归一化成 zh/en）；
  `src/RuntimeCatalog.tsx` 按语言取 `summaries[lang]`、为空时退回 `description`，卡片的
  `<p>` 增加 `title` 作为悬浮详情；`src/runtime-contracts.ts` 的 `CapabilityView` 增加可选
  `summaries?: Record<string, string>`。
- 测试与 mock：新增 `tests/ui/catalog-intro.test.tsx`（中文取中文简介、切换英文后取英文、无简介
  回退 description、空白简介不算命中），`dev/main.tsx` 的 tools mock 补上双语简介与一个超长
  description 用于肉眼检查截断与悬浮。`npm run test:ui` 9 文件 108 用例。
- 版本：随 deb 0.1.38 发布，插件 bundle 0.2.30 → 0.2.31（`package.json` 与 `bibit.feature.json`
  同步）。

## 2026-09-21：「专家」编辑弹窗的能力详情也按界面语言取工具简介

- 触发：修「工具」页介绍时一并核对，发现专家编辑弹窗的能力列表里那行详情仍然直接用
  `item.description`（Runtime 内置工具的英文 docstring），中文界面上同样中英混排。
- 改法：`src/RuntimeExperts.tsx` 的 `ExpertEditor` 取 `useRuntimeLanguage()`，详情先取
  `item.summaries?.[language]?.trim()`，为空时退回 `item.description`；该行本来就有
  `title`，悬浮仍显示完整文本。用户 / Plugin / MCP 工具没有 summaries，行为同旧版。
- 测试：`tests/ui/experts-page.test.tsx` 新增用例固定中文简介优先与悬浮详情；临时回退
  `src/RuntimeExperts.tsx` 时该用例失败。
- 版本：随 deb 0.1.39 发布，插件 bundle 0.2.31 → 0.2.32（`package.json` 与
  `bibit.feature.json` 同步），Runtime 侧对应 `bianbu/0.1.113`。

## 2026-09-21：0.1.39 打包流水线失败定位与 0.1.40 重新出包

- 现象：tag `bianbu/0.1.39` push 后流水线在 `bianbu-pkg -u local -w . -t bianbu/0.1.39`
  处停下——`Error: Tag bianbu/0.1.39 is on multiple branches: fix/expert-capability-language, main`，
  脚本在非交互环境里 `input()` 读到 EOF，退出码 1，包没出。
- 根因：发 0.1.39 时所在提交 `9027db8` 同时等于 `main` 与 `fix/expert-capability-language`
  两个分支的顶端（功能分支与 main 完全同一个提交，没有 merge commit），`bianbu-pkg`
  按 tag 反查分支时判成歧义。不是代码或打包配置的问题。
- 处理：在 `main` 上新提交后重新打 tag，让新 tag 指向只属于 main 的提交——
  `README.md` 里写死的插件版本 0.2.9（早已过期）改成引用 `bibit.feature.json` 的当前版本，
  `debian/changelog` 增 0.1.40 条目，`package.json` / `package-lock.json` / `bibit.feature.json`
  同步 0.2.32 → 0.2.33；`debian/rules` 从 manifest 取版本，无需改动。
- 遗留：`fix/expert-capability-language` 与 main 同提交、工作已合入，远端分支本身没删；
  同名的 `bianbu/0.1.39` tag 未移动也未删除，重跑那次 job 仍会撞同样的歧义提示。
- 验证：`npm run typecheck`、`npm run test:adapter`、`npm run test:ui`、`git diff --check` 通过。
- 发布结果：main `78dc691` 推送后 `CI=true bianbu-dev tag --version 0.1.40`，tag
  `bianbu/0.1.40`（`c86612f` → `78dc691`）推送，`git branch -a --contains` 只剩
  `main`/`origin/main`，歧义消失；约 40 秒后 `origin/packaging/main` 出现
  `Sync change from bianbu/0.1.40`（`1e95cd9`）与 `Update changelog for 0.1.40 release`
  （`ce74cdb`）。
- 入库核对：`curl https://archive.bianbu.xyz/bianbu4/dists/resolute-porting/main/binary-riscv64/Packages.gz`
  里 0.1.40 于 16:23 出现（16:16 打 tag，约 7 分钟出包入库），
  `pool/main/b/bibit-runtime-plugin/bibit-runtime-plugin_0.1.40_all.deb`。
- K3 实机验收（`bianbu@10.0.91.146`）：`apt-get install --only-upgrade bibit-runtime-plugin`
  从 0.1.38 升到 0.1.40，`dpkg --audit` 为空、`ii bibit-runtime-plugin 0.1.40 all`；
  postinst 重启的 `bibit-runtime-adapter@bianbu.service` active；装出来的
  `/usr/lib/bibit/plugins/runtime.bibit-plugin.tgz` 内 `plugin.json.featureManifest.version`
  为 0.2.33，签名与宿主加载路径不变。

## 2026-09-23：安全控制台「最近活动」与 Runtime 回答语言两处修复的实机验收

- 触发：用户报「安全控制中心 Agent 界面的最近活动字段未取值」与「问答时突然用英文
  回答」。两处根因都不在本仓，本仓只做验收、结论与文档记录，代码无需改动。
- 安全侧（`~/bianbu-agent-security`）：`ListAgents` 过去只返回 manifest 元信息与能力
  计数，从未提供 `last_seen`，前端读不到值只能渲染空列。修复 `7041d16` 合并四类活动
  证据（审计链最近记录、syscall 拦截事件、caller 绑定时间、manifest 安装时间兜底），
  随 `bianbu-agent-securityd 0.1.33` 发布。
- Runtime 侧（`~/bianbu-agent-runtime`）：语言规则原本只由 Expert Soul 承载，埋在以
  英文为主的提示词里（Skill、工具描述、策略都是英文），英文工具输出一进上下文就会让
  中文提问得到整段英文回答。修复改为 Runtime 拥有的 `## Response Language` 系统提示
  词段，外加每次模型调用前的当轮提醒，随 `bianbu-agent-runtime 0.1.122` 发布。
- K3 实机验收（`bianbu@10.0.91.146`，`0.1.122` + `0.1.33`，`bianbu-securityd` 与
  `bianbu-agent-runtime@bianbu.service` 均 active，`dpkg --audit` 为空）：
  - `POST http://127.0.0.1:9899/security-api/invoke`（`agents.list.v1`）返回 13 个
    Agent，`last_seen` 无空值；`POST http://127.0.0.1:5186/bibit/v1/invoke`
    （`serviceId=runtime-security`）同样带 `last_seen`，与本仓
    `src/RuntimeSecurityControls.tsx` 的 `agent.last_seen || '-'` 渲染路径一致。
  - 中文提问「用一句话说明你跑在什么设备上。」得到全中文回答；英文提问
    "In one short sentence, say which device you are running on." 得到全英文回答
    （"I'm running on a SpacemiT K3 Pico-ITX board (riscv64) with Bianbu 4.0.7."）；
    会话 `request/context` 的系统提示词尾部确认含 `## Response Language`。
- 本仓改动：无。`SecurityAgentSummary` 已声明 `last_seen`，UI 已按
  `last_seen || '-'` 渲染，`debian/changelog`、`package.json`、`bibit.feature.json`
  均不动，本次不出包。

## 2026-09-24：卸载 MCP 后面板不刷新（宿主 30s 预算 + 网关 422）修复

- 触发：用户报「bibit 中【mcp】卸载 MCP，MCP Server 面板没有及时移除，需要手动点击刷新」。
- 实机取证（K3 `bianbu@10.0.91.146`，Runtime control 9899 / adapter 5186）：
  - Runtime 的 `POST/DELETE /api/v1/mcp-servers` 会经 `_reload_active_worker(force=True)` 重建整代
    Worker，每台 MCP 都要重启一次；`mcps.install.v1` / `mcps.delete.v1` / `mcps.refresh.v1` 实测各
    ≈18.1s，直连 `POST /api/v1/mcp-health-checks` 同样 ≈18.1s。
  - 宿主 `~/bibit` 的硬预算是 30s（`src-tauri/src/external_services.rs` 的 `DEFAULT_TIMEOUT_MS`），
    registry `/etc/bibit/external-services.d/runtime.json` 里 `requestTimeoutMs: 30000`；变更一旦被
    掐断，`runAction` 的 `await refresh()` 就再也执行不到，面板停在卸载前的快照上。
  - 顺带查到一个真 bug：`mcps.refresh.v1` 网关过去 POST `/api/v1/mcp-health-checks` 时带了 `{}`，
    Runtime 的 `_require_empty_body` 直接 422；日志里 15:33:59 / 15:35:26 / 15:43:5x 都是这条。
- 改动文件：`src/runtime-contracts.ts`（新增 `RUNTIME_MUTATION_TIMEOUT_MS = 180_000`、
  `RUNTIME_MUTATION_SUFFIXES` 与 `runtimeRequestTimeoutMs(operationId)`，读操作沿用宿主默认）；
  `src/RuntimeSettingsPage.tsx`（`request()` 传 `timeoutMs`；`runAction` 先接住失败、再 `await refresh()`、
  最后才报结果）；`src/RuntimeResourcePages.tsx`（MCP 页 `removingId` 乐观移除，`.finally()` 复位）；
  `deploy/real_runtime_proxy.py`（`RUNTIME_TIMEOUT_SECONDS` 默认 180，替换全部 `timeout=30`；
  `mcps.refresh.v1` 改为不带 body 的 POST）；`deploy/runtime.json`（`requestTimeoutMs` 30000 → 180000）。
- 测试：`tests/ui/settings-pages.test.tsx` 新增「卸载后无需手点刷新即移除」「宿主报超时但 Runtime 已
  做成时仍重读目录」「变更用长预算、读操作用宿主默认」三条；`tests/test_runtime_adapter.py` 新增
  `mcps.refresh.v1` 不带 body 与网关 180s 等待两条；`tests/test_deployment_grants.py` 新增注册表
  `requestTimeoutMs ≥ 180000` 一条。
- 验证命令：`npm run typecheck`、`npm run build:dev`、`npm run test:adapter`（26 项）、
  `npm run test:ui`（10 文件 119 项）、`git diff --check`，全部通过。
- 遗留：宿主 `~/bibit` 里其它 feature 的 `service.request` 仍然是 30s 默认预算，本轮只在 registry
  给 runtime 服务放宽；Runtime 侧「某台 MCP 起不来会拖垮整代 reload」本身未改 Runtime 源码，
  仅记录在此，后续单独开 issue。

## 2026-09-29：技能/工具名随语言切换、MCP 生命周期状态、刷新按钮合并

- 背景（用户报的两个问题）：
  1. 「从 AgentHub 装了 bilibili.search MCP 之后，UI 一直 not_loaded / preparing，
     不知道它到底是什么状态」——Runtime 只给一个原始 `status`，`preparing` 不区分
     「正在下载 npm 包」和「正在握手」，`not_loaded` 也不区分「没人选它」和
     「读不到 Worker」，`detail` 在准备中恒为空，本插件更没有渲染它。
  2. 「专家那边配置技能的地方也要随语言切换 skill/工具显示」；以及
     「插件里有两个刷新按钮很抽象」。
- Runtime 侧配套（`~/bianbu-agent-runtime`，另一个仓，本仓只消费）：
  `MCPServerView` 新增 `state`（not_loaded|preparing|ready|degraded|failed|stopped|unknown）、
  `phase`（installing|starting）、`ready`、`tools_count`，`detail` 仍只放可行动原因；
  新增 `bianbu_agent/mcp/lifecycle.py` 统一投影各层状态，准备工作分阶段上报
  （新增 `MCPPreparationState.phase`、`MCP_PHASE_INSTALLING/STARTING`），Worker catalog
  的 `mcp_statuses[]` 带 `state`/`phase`，Control 视图合并后按生命周期输出。
- 本仓改动：
  - `src/runtime-contracts.ts`：`CapabilityView` 增加 Power 格式 v2 展示字段
    `name_zh`/`name_en`/`description_zh`；`MCPServerView` 增加
    `state`/`phase`/`ready`/`tools_count`/`detail`。
  - `src/runtime-i18n.tsx`：新增 `runtimeDisplayName`/`runtimeDisplayDescription`
    （中文取 `name_zh`，英文取 `name_en`，缺失回退 `display_name`/`name`；
    `description_zh` 只在中文界面生效），`RuntimeCatalog.tsx`、`RuntimeExperts.tsx`
    （专家配置里的技能/工具/插件/MCP 选择项与说明）改用它们，随界面语言切换。
  - `src/runtime-i18n.tsx`：新增 `McpLifecycleFields`、`mcpServerState`（老 Runtime 只有
    `status` 时归一化，不把徽章退化成英文原文）、`mcpStateSource`、`mcpStateDetailSource`
    （有真原因显示原因，否则按 state/phase 说明进度）、`mcpServerReady`，并补中英词条。
  - `src/RuntimeResourcePages.tsx`：MCP 卡片显示生命周期词 + 进度/原因 + 工具数；
    插件页的成员 MCP 行改用同一套生命周期词（`running` → 就绪）并把原因放进 title；
    **删掉 MCP 页里的第二个刷新按钮**。
  - `src/RuntimeSettingsPage.tsx`：页面顶部的「刷新」在 MCP/插件页会先做一次
    `mcps.refresh.v1` 健康检查再重读目录（一个按钮做完整件事）；MCP 页在存在
    `preparing` 的 Server 时按 3s 轮询，用户不必反复点刷新才能看到阶段变化。
  - `src/runtime.css`：新增 `.runtime-pill-preparing`（中性蓝，和失败的琥珀色区分）
    与 `.runtime-resource-hint-warn`（只有真原因才用警告色）。
  - `dev/main.tsx`：mock 补 v2 展示字段（含一个没有 v2 名字的 legacy 技能）与
    ready/preparing 两种 MCP 生命周期。
- 测试：`tests/ui/catalog-intro.test.tsx` 断言技能/工具名随 `language` 切换并回退到
  `display_name`；`tests/ui/settings-pages.test.tsx` 更新「刷新」入口并新增
  「未就绪的 MCP 说明自己在做什么」；插件页断言改成生命周期词。
- 验证命令与结果：`npm run typecheck` 通过；`npm run test:ui` 10 文件 123 项通过；
  `npm run build:dev` 通过；`npm run test:adapter` 27 项通过；`git diff --check` 干净。
- 基线与迁移：本轮改动原本基于 `81ccbf9`，落地时已迁到 `0d8ef40` 之上重建；
  上游那条 commit 改了 `src/runtime-i18n.tsx` 的 offline 文案（
  `bianbu-agent-runtime@bianbu` → `bianbu-agent-runtime`）和 `test_runtime_adapter.py`，
  两者都已保留（见测试 343/349 行断言）。
- 遗留：Runtime 侧「一台 MCP 起不来会拖垮整代 reload」仍未改（属 Runtime 仓问题）；
  本仓 `detail` 只在卡片 hint / title 里显示，未提供展开面板；未发版、未装到 K3。

## 2026-09-29（续）：发版与 K3 实机验收

- 发版：
  - Runtime `~/bianbu-agent-runtime`：`feat/capabilities` 改动 + 移除随包第三方插件 → tag
    `bianbu/0.1.139`；随后 K3 实机验收发现 Worker catalog 在 0.1.139 上整体失败
    （`ToolSpec` 没有 `name_zh`，见下），补 `fix(worker)` → tag `bianbu/0.1.140`。
  - 本仓：UI 版本 0.2.37 → 0.2.38，Debian 版本 0.1.44 → 0.1.45，tag `bianbu/0.1.45`。
    顺带把 `package-lock.json` 的 `version` 从 0.2.36 对齐到 0.2.38（0.1.44 那次漏了）。
  - 流水线确认：两仓 `git fetch origin packaging/main` 都出现
    `Sync change from bianbu/0.1.139|0.1.140|0.1.45` 与 `Update changelog for ... release`。
- K3 实机验收（`root@10.0.91.146`，手动打包安装，见 `k3-runtime-manual-package-smoke`）：
  - Runtime 在 K3 源码树打 `dpkg-buildpackage -us -uc -b` 得到 `0.1.140` 并 `dpkg -i`；
    本仓 deb 在 x86 本机构建（`Architecture: all`）后 scp 到 K3 安装 `0.1.45`，重启
    `bibit-runtime-adapter@bianbu`，服务 active。
  - `GET /api/v1/mcp-servers` 现在给出：`bianbu.bibit.intent/*`、`bianbu.memory/memory`
    为 `state=ready, ready=true, tools=33/89/44/4`；`mcp.bilibili-search`、`mcp.nws` 为
    `state=not_loaded`——两者都没有任何在跑的 Worker 选它，正是新文案要说的那句
    「还没有 Worker 加载它：请确认有专家选了这台 Server」。
  - 适配器 `POST /bibit/v1/invoke {operationId: mcps.list.v1}` 透传
    `state`/`phase`/`ready`/`tools_count`（例如 `bibit-admin` 是
    `"state": "ready", "ready": true, "tools_count": 33`），UI 读到的就是这个。
  - `capabilities.list.v1 {kind: skill}` 返回 11 个技能，内置技能带
    `name_zh`/`name_en`（如 `appcli-router` → 「AppCLI 产物路由」/「AppCLI Router」），
    插件技能 `hello-greeting` 两者为空 → UI 回退 `display_name`，与设计一致。
- 过程中修掉的回归（教训：手工打包验收抓到了单测没覆盖的路径）：
  0.1.139 给 Worker catalog 的每个能力读 `spec.name_zh`，但只有 `SkillSpec` 有这个字段，
  `ToolSpec` 只有 `name`/`description`/`input_schema`/`metadata`。每个内置 Tool 抛
  `AttributeError` 把整次 `worker.catalog` RPC 打挂，Control 于是把所有 MCP 报成
  `unknown`（`mcp_servers` 的 warning 只进了 operational log，不看那里只看到一片未知）。
  0.1.140 改成先读属性、再回退 `spec.metadata`，并补了三个回归测试
  （`tests/runtime/test_service.py::test_agent_worker_catalog_*`），已确认去掉修复即失败。
- 实机未覆盖：`preparing` / `phase=installing` 这一刻的状态没有在 K3 上跑到——只有 Expert
  选中某台 MCP 时才会准备，当前 K3 上没有在跑的 Worker 选 `npx` 型 MCP。该路径由
  `tests/sdk/mcp/test_preparation.py` 与插件侧用例覆盖。
- 联动仓 `~/bibit`（Bibit 应用本体）：技能选择器/`/` 菜单/chips 也要按语言显示技能名，
  已在 `fix/runtime-skill-localized-names` 分支实现并**按用户约定提 MR**
  （https://gitlab.dc.com:8443/bianbu/bianbu-star/bibit/-/merge_requests/16），
  验证条目写在 `docs/verification/pending/task-0fb848c6a2f24503.md`。
  MR 合并后需要给 bibit 打 tag 发版，本机与 K3 上的 BiBit 才会带上这个改动。


## 2026-09-30：专家展示字段随 Runtime 改名为 `name_zh`

- 起因：Power 格式 v2 的展示字段统一叫 `name_zh`（Skill 早就是），Runtime 的专家
  `agent.yaml` / HTTP API / CLI 本轮把旧键 `zh_name` 全量改名成 `name_zh`，不再接受
  旧键（用户明确不需要兼容）。插件作为 `/api/v1/agents` 的消费方必须同步，否则专家
  列表页的中文名、Provider 引用清单和监控页会读到空值。
- 改动文件：`src/runtime-contracts.ts`（`AgentView.name_zh`、`AgentTopAgentView.name_zh`）、
  `src/RuntimeExperts.tsx`（列表/删除弹窗/编辑表单的取值与提交 payload，内部 state
  `zhName` → `nameZh`）、`src/RuntimeProviders.tsx`、`src/RuntimeMonitorPages.tsx`、
  `dev/main.tsx` mock，以及 `tests/ui/` 四个用例文件。
- 未改：operation/DTO 名称、adapter、失败文案与界面结构；插件自有的 Skill/Tool
  `name_zh` 字段早就是新名字。
- 验证命令与结果：`npm run typecheck` 通过；`npx vitest run` 10 文件 123 项通过；
  `git diff --check` 干净。Runtime 侧同批改动跑 `python3 -m pytest tests` 全量。
- 遗留：`~/bibit`（Bibit 应用本体）读同一个字段，已另开分支走 MR
  （https://gitlab.dc.com:8443/bianbu/bianbu-star/bibit/-/merge_requests/17）；
  两仓与 Runtime 必须一起发版，旧插件配新 Runtime 会读不到中文名。

### K3 实机验收（2026-09-30，`bianbu@10.0.91.146`）

- Runtime 侧：K3 源码树 `/home/bianbu/bianbu-agent-runtime` 从 `df44ef87` ff 到
  `b04bf0aa`（bundle 同步），`sh debian/tests/validate-source-package.sh` 通过，
  `dpkg-buildpackage -us -uc -b` 出 `bianbu-agent-runtime_0.1.143_riscv64.deb` 并
  `dpkg -i` 升级（0.1.142 → 0.1.143，`dpkg --audit` 为空，
  `bianbu-agent-runtime.service` active）。
- 旧键行为已实测：升级前 6 个用户专家目录写的是 `zh_name`，重启后 5 个被判为
  unloadable 并 retire（`journalctl` 里 5 条 `Retired unloadable Agent record`）；
  `.staging/retired-agent-*` 随即被 `cleanup_retired_packages()` 删除，所以「retire」
  等价于删除——**升级前必须先把 agent.yaml 的键改成 `name_zh`**。本轮用升级前的
  `~/agents-backup-*.tgz` 恢复：把备份里的 `zh_name:` 改成 `name_zh:`，放回
  `~/.bianbu-agent/agents/`，重启后 6 个专家全部回到列表，`name_zh` 正常。
- 接口实测：`PATCH /api/v1/agents/test-agent {"name_zh":"测试代理"}` → 200 且生效；
  `{"zh_name":"旧键"}` → 422 `extra_forbidden`；`/` 提供的 `assets/js/console.js`
  含 11 处 `name_zh`、0 处 `zh_name`。
- 插件侧：本机 `dpkg-buildpackage -us -uc -b` 出 `bibit-runtime-plugin_0.1.46_all.deb`
  并 scp 到 K3 安装（0.1.45 → 0.1.46），重启 `bibit-runtime-adapter@bianbu.service`
  active；`POST http://127.0.0.1:5186/bibit/v1/invoke`
  `{protocolVersion:1,serviceId:"runtime",operationId:"agents.list.v1"}` 返回
  `ok:true` 与 6 个专家，每个都带 `name_zh`（如「K3媒体测试专家」「OOM复现」）。
- 未覆盖：Bibit 桌面应用本体的专家入口/专家 chip 需要 `~/bibit` 的 MR 合并发版后
  才能在真机上点；本轮只验到「Runtime 与 adapter 都吐 `name_zh`，Console 静态资源
  已切到 `name_zh`」。

## Power 格式 v2 展示字段与界面语言（2026-09-30）

- 起因：Runtime 把专家记录升级到 Power 格式 v2（`schema_version: 2`，新增
  `name_en` / `description_zh`，Runtime 读 v1/v2、写 v2），插件必须一起读，否则
  英文界面只能回退到调用名 `name`。用户同时要求「专家那边配置技能的地方也随语言
  切换 skill / 工具显示」，所以这一轮把语言维度补全。
- 改动文件：`src/runtime-contracts.ts`（`AgentView` / `AgentTopAgentView` 增加
  `name_en` / `description_zh`）、`src/RuntimeExperts.tsx`（列表、删除弹窗、编辑
  表单新增「英文名称」「中文简介」，调用名标签改为「调用名」，payload 与去重集合
  带新字段）、`src/RuntimeProviders.tsx`（Provider 的「还有专家在用」清单改用
  `runtimeDisplayName(agent, language)`）、`src/RuntimeMonitorPages.tsx`、
  `src/runtime-i18n.tsx` 词条、`dev/main.tsx` mock，以及 `tests/ui/` 四个用例文件。
- 能力目录的 Skill / Tool / MCP / Plugin 面板本来就走
  `runtimeDisplayName` + `summaries[language]`，本轮只补了 Provider 页的漏网项，
  没有新增取值规则。
- 验证命令与结果：`npm run typecheck` 通过；`npx vitest run` 10 文件 126 项通过
  （新增「名字取当前语言、缺 `name_en` 回退调用名」用例）。Runtime 侧同批：全量
  `python3 -m pytest tests` 2864 项通过；Console 专家编辑器打开时切换语言会就地
  重绘能力面板（`tests/sdk/console/test_browser_contract.py` 新增用例，去掉修复
  即失败）。

### K3 实机验收（2026-09-30，0.1.145 / 0.1.47）

- Runtime：K3 源码树 `git reset --hard 5f82d85c`（保留本地 `go.sh`），
  `dpkg-buildpackage -us -uc -b` 出 `bianbu-agent-runtime_0.1.145_riscv64.deb`，
  `dpkg -i` 升级 0.1.144 → 0.1.145，`bianbu-agent-runtime.service` active；
  升级前 `~/agents-backup-*.tgz` 备份，升级后 6 个专家全部还在（没有 retire）。
- 插件：`dpkg-buildpackage -us -uc -b` 出 `bibit-runtime-plugin_0.1.47_all.deb`，
  scp 到 K3 安装（0.1.46 → 0.1.47），`bibit-runtime-adapter@bianbu.service` active。
- 接口：`GET /api/v1/agents` 与 adapter
  `POST http://127.0.0.1:5186/bibit/v1/invoke`
  `{protocolVersion:1,requestId:...,serviceId:"runtime",operationId:"agents.list.v1"}`
  都返回 `name` / `name_zh` / `name_en` / `description` / `description_zh`；
  市场里的两个 Agent（`nws-agent` v1.0.3、`test-agent` v1.0.3，Power 格式 v2）
  升级后正常列出。
- Console：`/assets/js/console.js` 含新的语言切换重绘逻辑；Playwright 直连
  `http://10.0.91.146:9899/chat` 打开 `test-agent` 的专家编辑器，中文显示
  `APM 使用手册` 等 `name_zh`，`setLanguage('en')` 后同一面板就地变成
  `APM Agent Handbook` 等 `name_en`（没有 v2 名字的 Skill 回退到 `name`），
  切回中文再变回；表单标签同时变成 `Call name` / `English name` /
  `Chinese description`。

## MCP 状态的真实来源与增删后的等待（2026-09-30）

- 起因：Runtime 侧修好了「已安装但没人选中」的 MCP 一直没有真实状态的问题
  （Worker 只枚举被 Agent 选中的能力目录，未选中的 Server 永远停在
  `not_loaded`；安装发布用的是不带 `force` 的重载，新 Server 也没有人去准备）。
  插件这边要跟着修两件事：`not_loaded` 的解释已经过时，以及刚增删完那几秒
  页面会停在「未加载」不动。
- 改动文件：`src/runtime-i18n.tsx`（`not_loaded` 提示改为「Runtime 会在 Worker
  就绪时自动准备，点「刷新」可立即重试」并补英文对照）、
  `src/RuntimeSettingsPage.tsx`（新增 `mcpSettlingUntil` 与 `rearmPoll`：MCP 页
  的动作结束后把轮询链接回来，90 秒窗口内 `not_loaded`/`unknown` 也继续每 3 秒
  读一次目录）、`tests/ui/settings-pages.test.tsx`（新增「装完不点刷新，页面自己
  等到 ready」用例，并把 `not_loaded` 文案断言改成运行时真实语义）。
- `package.json` / `package-lock.json` / `bibit.feature.json` 0.2.40→0.2.41、
  `debian/changelog` 0.1.48。
- 本机验证：`npx tsc --noEmit` 通过；`npx vitest run` 10 文件 127 项通过（新增
  用例去掉 `mcpSettlingUntil` 赋值即失败）；`npm run build:dev` 通过；`npm run
  test:adapter` 27 项通过；`npm run build:plugin` 产出
  `artifacts/runtime-0.2.41.bibit-plugin.tgz`；`git diff --check` 干净。
- Runtime 对应改动（同批，已推 `bianbu-agent-runtime` main）：Worker catalog 按
  「已安装目录」而不是「选中的能力目录」枚举 MCP 状态；任何重载都会重新准备已安装
  Server（不再只在 `force` 时做）；Console 增删后同样有一个有界的等待窗口。
- 未覆盖：K3 上插件包尚未重装验证（下一步 `dpkg-buildpackage` 出 0.1.48 后 scp
  安装并重启 `bibit-runtime-adapter@bianbu.service`）。
