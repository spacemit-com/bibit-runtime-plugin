# Bibit Runtime Plugin

在 Bibit 设置侧栏中，与 Features 同级提供两个与 Features 样式一致的静态标题分组；位于常规设置项之后、Features 之前：

- **管理**：专家、服务商、本地模型、工具、MCP、技能、Hook、插件、安全。
- **监控**：Agent Top、Runtime 状态、日志。

各项直接进入独立设置页，不再嵌套 Runtime 标签导航。插件只渲染内容，沿用 Bibit 的设置外壳、侧栏和滚动区域。内部路由为 `/settings/features/runtime/<入口 id>`；URL 命名空间不决定侧栏分组。

## 宿主要求

需要支持 `core` settings navigation、contribution 标题和 `section` 分组的新版 Bibit。当前实现同步于 Bibit `feat(feature-sdk): add core settings navigation sections`。`vendor/` 内四个 SDK 包由对应宿主源码 `npm pack` 生成，统一为 0.3.0；不依赖 npm override，也不从公共 registry 下载私有 SDK。

插件版本见 `bibit.feature.json`（当前 0.2.33），Debian 包版本独立递增、见 `debian/changelog`，
打包时 `debian/rules` 按 manifest 里的版本取用 `artifacts/` 中的签名 bundle。升级后重启 Bibit
以重新加载签名插件及导航合同。旧宿主不支持本 manifest，不提供兼容入口。

## 服务边界

- Runtime：`service:runtime`，通过 5186 adapter 调用当前 `/api/v1`。
- 本地模型：`localModels.get.v1` 读取 Runtime 的只读资源 `/api/v1/local-models`（数据来自
  `spacemit-ai-gateway`，由 bibit-intent 转述）；页面只显示状态，没有下载/启动/停止动作。
- Runtime 状态：读取 `/api/v1/runtime/status` 与 `/api/v1/runtime/workers`。
- 安全：`service:runtime-security`，5186 adapter 转发到 Runtime 已有的 `/security-api/invoke` 桥接，由独立 securityd 处理。
- MCP 与插件使用各自 API；通用包 API 只用于 agent/tool/skill/hook。

K3 当前 securityd 0.1.17 尚未实现 syscall 策略/独立审计 API；该子页会明确提示不支持并禁用编辑，能力、DLP、审计、配额/网络仍通过真实服务提供。

真实服务不可用时显示明确错误。生产插件不使用 mock 回退。部署 registry、权限清单和 systemd unit 位于 `deploy/`；包升级会重启 adapter。

完整流程见 [安装 Bi-bit 后如何开发插件](docs/plugin-development.md)，涵盖独立开发、真实服务调试、签名、应用内安装和 Debian 部署。

## 开发与验证

```bash
npm ci
npm run dev
# 显式 Mock 预览：http://127.0.0.1:5173/?mock=1
# 真实服务预览：构建后由 adapter 提供 dist 和 /runtime-api/invoke、/security-api/invoke
npm run typecheck
npm run build:dev
npm run test:adapter
npm run test:ui
git diff --check
npm run build:plugin
```

签名构建使用 `.bibit-keys/` 中的开发密钥。首次可执行 `npm run keygen`，交付时必须安装与签名 key ID 一致的公开信任配置。

K3 打包：`dpkg-buildpackage -us -uc -b`；安装生成的 `bibit-runtime-plugin_*_all.deb`。默认 adapter 监听 `127.0.0.1:5186`，转发 Runtime `127.0.0.1:9899`。

开发过程、验证结果和发布记录见 `process.md`。
