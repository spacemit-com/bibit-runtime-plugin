# 安装 Bi-bit 后如何开发插件

## 1. 先区分宿主与插件

`bi-bit` Debian 包安装桌面宿主，命令是 `bibit-gui`。开发插件还需要插件源码、Node.js/npm 和项目固定的 SDK；安装桌面包不会自动提供源码或开发工具。

通常修改插件页面、文案、样式或调用已经授权的 operation，只需重新构建、安装插件，不必重新编译 Bi-bit。新增宿主尚未支持的导航字段、Host API 或能力，则需要先升级宿主。本次「管理 / 监控」分组和语言 prop 需要包含这些改动的宿主，目标 Debian 版本为 `bi-bit 0.1.4`。

安装后查看版本：

```bash
dpkg-query -W bi-bit bibit-runtime-plugin
```

日常可以在电脑上开发，在 K3 上运行实际应用验收；也可以在 K3 的源码目录直接开发。

## 2. 修改当前 Runtime 插件

```bash
git clone git@gitlab.dc.com:bianbu/bianbu-star/bibit-runtime-plugin.git
cd bibit-runtime-plugin
git worktree add ../runtime-plugin-dev -b feat/my-runtime-change main
cd ../runtime-plugin-dev
cat process.md
npm ci
npm run dev
```

打开终端输出的开发地址，显式使用 mock：

```text
http://127.0.0.1:5173/?mock=1&lang=zh-CN
http://127.0.0.1:5173/?mock=1&lang=en
```

Dev Host 支持源码热更新、独立 contribution 选择和语言切换。它用于快速调试，不代表已经安装到 Bi-bit；mock 通过也不代表真实服务可用。

主要文件：

| 文件 | 修改内容 |
| --- | --- |
| `bibit.feature.json` | 页面入口、导航分组、标题 key、能力声明 |
| `src/feature.tsx` | contribution id 与 React 页面映射、locale 资源 |
| `src/plugin.tsx` | 注册插件并导出 `pluginLocales`，供安装后的宿主加载菜单翻译 |
| `src/RuntimeSettingsPage.tsx` | 管理及监控页面 |
| `src/RuntimeSecurityPage.tsx` | 安全页面 |
| `src/runtime-i18n.tsx` | 中英文文案和语言 Provider |
| `src/runtime-contracts.ts` | operation ID、DTO、能力名 |
| `dev/main.tsx` | Dev Host 和显式 mock |
| `deploy/real_runtime_proxy.py` | Runtime external-service adapter |
| `deploy/feature-capability-grants-runtime.json` | 宿主授权的 operation 清单 |

页面使用宿主传入的 `language`；菜单资源使用 `en` 和 `zh-CN`。不要复制宿主侧栏或设置外壳；CSS 使用 `.runtime-*`。生产页面通过 SDK 请求能力，不直接连接服务 URL。

## 3. 在 K3 连接真实服务预览

在 K3 的插件源码 worktree 中：

```bash
npm run build:dev
PORT=5194 BIND_HOST=127.0.0.1 python3 deploy/real_runtime_proxy.py & echo $! > /tmp/runtime-preview.pid
```

该命令使用已运行的 `http://127.0.0.1:9899` Runtime，并在 5194 提供构建页面和真实 API 转发。默认安装的 adapter 使用 5186，开发预览用 5194 避免占用它。若端口已有自己的开发进程，先停止该进程。

不要用 `pkill -f real_runtime_proxy.py` 结束预览：包安装的 `bibit-runtime-adapter@bianbu.service` 执行的是同一份脚本，`pkill -f` 会把系统 adapter 一起杀掉，Bi-bit 的专家、服务商、插件等页面会全部显示服务离线。用 `kill "$(cat /tmp/runtime-preview.pid)"` 结束预览。系统 adapter 若被停掉，先用 `sudo systemctl status bibit-runtime-adapter@bianbu` 确认，再 `sudo systemctl start bibit-runtime-adapter@bianbu` 恢复（0.1.27 起 unit 用 `Restart=always`，误杀会自动拉起）。

在开发电脑另开终端：

```bash
ssh -N -L 5194:127.0.0.1:5194 bianbu@10.0.91.146
```

打开 `http://127.0.0.1:5194/?lang=zh-CN`，不要添加 `mock=1`。此方式需要修改代码后重新执行 `npm run build:dev`。

## 4. 构建插件并安装进 Bi-bit

先验证：

```bash
npm run typecheck
npm run build:dev
npm run test:adapter
npm run test:ui
git diff --check
```

首次准备开发签名材料：

```bash
npm run keygen
```

已有 `.bibit-keys/` 时复用原密钥。不要提交或分发私钥；签名 key ID 与 trust store 中的 key ID 必须一致，本仓统一为 `runtime-development`。

每次交付新版，把 `package.json`、`package-lock.json` 的根包和 `bibit.feature.json` 版本同步为新版本，并更新 `debian/rules` 中的产物文件名，然后构建：

```bash
npm run build:plugin
```

输出 `artifacts/runtime-<版本>.bibit-plugin.tgz`。将该文件复制到 K3，在实际应用中进入：

```text
BiBit → Settings / 设置 → Extensions / 扩展
      → Trusted plugins → Install plugin
```

选择 bundle，按照安装界面的提示完成受控重启，再进入设置查看新页面。仅刷新 WebView 不等于重新加载插件。

注意：Runtime「管理」分组下的「插件」页面管理的是 Runtime 后端插件；安装 **Bibit Feature 插件**应使用宿主的 **Extensions / 扩展** 页面。

宿主把启用的插件放在用户级仓库 `~/.local/share/BiBit/data/plugins/`：`registry.json` 的 `desired` 决定 `active` 版本，`installed/<id>/<版本>/` 是已解包的内容。`/usr/lib/bibit/plugins/*.tgz`（deb 装的位置）只是安装源——deb 升级后宿主会把它导入 `installed/`，但**不会自动把 active 版本切过去，只重启 Bibit 也不会**。判断当前实际加载的版本看宿主日志：

```
Loaded trusted plugins: agent-hub@0.2.3, ..., runtime@0.2.24
```

要切换版本，要么在 **Extensions / 扩展** 页面做校验/安装，要么把 `registry.json` 里 `desired.<id>` 改成目标版本，退出并重启 Bibit。

当前内部 Debian 宿主启用 `allow-unsigned-plugins`，适用于内部开发。强制验签的正式宿主只接受已登记公钥；debug 构建可在完全退出应用后指定开发 trust store 启动：

```bash
BIBIT_PLUGIN_TRUST_STORE="$PWD/.bibit-keys/runtime-development-trust-store.json" bibit-gui
```

正式 release 构建不接受这个环境变量覆盖，需要发布宿主时登记公钥。

## 5. 同时更新 adapter：使用 Debian 包

如果还修改了 Python adapter、服务配置或权限清单，只安装 UI bundle 不够，需要部署对应服务文件。本仓已提供 Debian 打包：

```bash
dpkg-buildpackage -us -uc -b
sudo apt install ../bibit-runtime-plugin_<Debian版本>_all.deb
```

包安装 UI bundle 到 `/usr/lib/bibit/plugins/runtime.bibit-plugin.tgz`，安装 adapter 和 `/etc/bibit/` 配置，并重启 `bibit-runtime-adapter@bianbu`。

```bash
systemctl is-active bibit-runtime-adapter@bianbu
systemctl is-active bianbu-agent-runtime
```

随后完全退出并重新打开 Bi-bit。如果此前通过 UI 手动停用、回滚或选定过某个插件版本，系统包同步不会覆盖这些用户选择；到 Extensions 检查当前激活版本，必要时在那里安装并激活本次 bundle。

## 6. 新建自己的插件

可参考本仓的独立项目结构，使用 `vendor/` 中与目标宿主匹配的固定 SDK。新项目必须更换 Feature id、包名、CSS 前缀和贡献 id，并删除不使用的 Runtime 页面、能力和 adapter。

最小入口示例：

```tsx
import { registerFeaturePlugin } from '@bibit/feature-plugin-sdk'
import manifest from '../bibit.feature.json'
import { featureModule } from './feature'

export const pluginLocales = featureModule.locales
registerFeaturePlugin({ manifest, module: featureModule })
```

无需把新插件源码放入 Bi-bit 仓库。先独立 Dev Host 调试，再构建 bundle，通过宿主 Extensions 安装。新增 external-service 时，还需由平台部署 service registry 和 operation grants；仅在 manifest 声明能力并不会自动获得授权。

## 7. 最终验收

必须在 K3 已安装的 Bi-bit 应用内验证：入口分组、各页面真实数据、中英文切换、保存失败状态、重启后加载。出现明确服务不可用时检查服务与授权，不能用 mock 成功代替修复。当前 securityd 缺少 syscall 策略/独立审计 API 时，该子页会明确提示不支持；不影响其余页面的开发流程。

## 8. 服务能力与授权排查

插件能显示菜单，不代表已经取得服务调用权限。宿主依次检查 manifest 能力声明、系统授权文件、插件实例身份和具体 operation；通过后才经 adapter 调用 Runtime。

- “宿主未提供服务能力”：检查 `/etc/bibit/feature-capability-grants.d/runtime.json`。`serviceOperations` 的结构必须是 `[featureId][serviceId]`，例如 `serviceOperations.runtime["runtime-security"]`，且 `features.runtime` 和 manifest 都声明 `service:runtime-security`。无效文件会被宿主拒绝，并记录 `feature_capabilities.grants_invalid`。
- “服务拒绝授权”：查看宿主日志中 `external_service.request_unauthorized` 的 feature/version/service/operation，核对实例版本和操作授权。不要通过绕过授权解决；辅助窗口不能重复准备主窗口的插件实例，否则会使主窗口凭据失效。
- 授权文件在宿主进程内缓存，修改后必须完全退出并重新打开 Bi-bit。
- 后端健康检查：`systemctl is-active bibit-runtime-adapter@bianbu bianbu-agent-runtime`，以及 `curl --fail http://127.0.0.1:9899/api/v1/runtime/status`。HTTP 200 只证明后端可达，最终仍要从安装的 Bi-bit 插件页面验证完整调用链。

## 9. 保持 Runtime 页面一致

这 11 页以 Runtime 现有管理和监控页面为功能、操作流程与内容布局基准，Bibit 只提供设置外壳和视觉主题。新增或修改页面时，先对照 Runtime 的内容区、编辑弹窗和按钮行为，不将卡片或表单统一替换成表格/JSON。页面组件已拆分到 `RuntimeExperts`、`RuntimeProviders`、`RuntimeCatalog`、`RuntimeResourcePages`、`RuntimeLocalModels`、`RuntimeMonitorPages` 和安全组件。

服务商 API Key 是发送给 Runtime 的业务数据。当前宿主通过 `/etc/bibit/external-services.d/runtime.json` 的 `credentialParameters`，仅允许 `providers.create.v1` 和 `providers.update.v1` 的顶层 `api_key`；它不是宿主 HTTP 连接认证。修改该策略需重新部署配置并重启宿主，不能在插件前端放宽原生授权。

头像通过 operation 传输，插件不能直接把 `/api/v1/agents/.../avatar` 当作 Bibit 的 URL。单张头像最大 2 MiB，宿主请求上限为 3 MiB，以容纳 base64 数据。

专家安全配置中的 `permissions.resource_limits.tokens` 是配额对象。部署注册表通过 `businessObjectParameters`，只为 `agents.create.v1` / `agents.update.v1` 声明这一精确 JSON-pointer 路径；宿主仍递归检查对象内的凭据字段。未声明路径、字符串 token 和传输 headers 不因该声明放行。旧宿主没有这一注册表能力时，需要升级宿主包。


### Runtime 安全与独立 Security 插件共存

Runtime 安全设置使用独立的 `runtime-security` 服务（`service:runtime-security`），由本包
`runtime.json` 注册到 5186。adapter 只在转发到 9899 `/security-api/invoke` 时将
`serviceId` 映射为 Runtime 原生的 `security`，operation、params 和 requestId 原样保留。
独立 Security 插件继续拥有 `security` 服务及其 5185 配置；本包不注册、不覆盖该服务。

Bibit 按文件名顺序合并 external-service 注册表。旧部署中 `security.json` 会覆盖
`runtime.json` 的同名 `security` 条目，导致 Runtime 页面被路由到 5185 并报授权失败。
升级时需要同时安装新版 adapter、注册表、授权文件与 UI 签名包，然后重启 Bibit。
本插件不保留旧 `security` 服务入口兼容。定位类似问题时，检查最终服务地址与返回错误，
不要把 `The service rejected authorization` 当作 securityd 未启动。

配置页已移除：上下文与压缩由 Runtime 自动管理，插件界面语言跟随 Bibit 宿主，不再提供独立语言设置。

专家配置使用 tools、skills、mcps、plugins 四组，插件成员按插件整体启用；不提供独立 Hook 入口。
Runtime 的 legacy_plugin_selection 标识旧成员配置，修改模型或名称时不得隐式转换；用户修改插件选择才清理旧 Hook/插件成员选择。
