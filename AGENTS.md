# 项目开发约定

## 必须遵守

1. 每次开始开发、修改代码或运行实现验证前，先完整阅读项目根目录的 `process.md`，依据其中的当前阶段和遗留问题继续工作。
2. 完成一个功能阶段后，必须把改动文件、验证命令、验证结果和遗留问题追加到 `process.md`。
3. Runtime 插件只负责 Bibit Feature UI、Runtime external-service adapter、部署描述和本仓文档，不修改 `bianbu-agent-runtime` 源码。
4. operation ID、DTO 和宿主能力名称必须集中定义在 `src/runtime-contracts.ts`；新增或修改 operation 时同步更新 `dev/main.tsx`、`deploy/real_runtime_proxy.py` 和 `tests/test_runtime_adapter.py`。
5. 真实 Runtime 不可用时必须展示明确错误状态，不把 mock 成功当作生产能力。
6. 设置 contribution 只能渲染内容，禁止复制 Bibit 的外层设置壳、侧栏或滚动容器；CSS 必须收口到 `.runtime-*`。
7. 本项目面向当前 Runtime `/api/v1` 合同，不维护历史接口兼容；需要重构时直接调整合同和实现。
8. 交付前必须执行 `npm run typecheck`、`npm run build:dev`、`npm run test:adapter`、`git diff --check`，需要签名包时再执行 `npm run build:plugin`。
