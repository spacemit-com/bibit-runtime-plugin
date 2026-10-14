# Runtime 插件控制台开发计划

## 1. 背景与目标

`bianbu-agent-runtime` 的配置由 `config.yaml`、运行期 `config.json`、Agent、Provider 和 MCP 等文件化资源共同组成。Bibit 需要在自己的 UI 中消费这些配置能力，因此本项目提供一个 Bibit Feature 插件和一个 external-service adapter，把 Runtime 当前 `/api/v1` 管理 API 聚合成稳定 operation。

## 2. 功能范围

| 模块 | 能力 |
|---|---|
| 概览 | 展示 Runtime readiness、Worker 状态、数据目录、默认 Agent 和资源数量 |
| 运行参数 | 读取和保存 `/api/v1/settings` 中的 runtime 参数及部署语言 |
| 服务商 | 列出、新增和删除 Provider |
| Agent | 列出、新增和删除 Agent，展示模型、能力选择和可用状态 |
| MCP | 列出、安装、删除和刷新 MCP Server 健康状态 |

## 3. 技术设计

- 前端只注册 settings contribution，不注册 conversation presenter。
- 生产能力使用 Bibit `service:runtime`，所有 operation ID 定义在 `src/runtime-contracts.ts`。
- `deploy/real_runtime_proxy.py` 提供 `/bibit/v1/invoke`，将 operation 映射到 Runtime `/api/v1`。
- Dev Host 默认连接 `/runtime-api/invoke`，URL 增加 `?mock=1` 时使用内存 mock。
- 不做旧接口兼容；Runtime `/api/v1` 合同变化时同步重构插件合同和 adapter。

## 4. 验收标准

- `npm run typecheck` 通过。
- `npm run build:dev` 成功产出 `dist/`。
- `npm run test:adapter` 通过。
- `git diff --check` 无空白错误。
- Manifest 声明 `service:runtime`，adapter registry 指向 `127.0.0.1:5186`。
