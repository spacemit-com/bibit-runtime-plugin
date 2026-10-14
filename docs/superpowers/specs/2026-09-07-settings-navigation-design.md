# Runtime 设置入口迁移

用户已确认以截图为准，将管理与监控的 14 个入口放入 Bibit 设置侧栏，作为与 Features 同级的两个分组，位于常规设置项之后、Features 之前，保留名称和顺序，以及与 Features 样式一致的「管理」「监控」静态标题，菜单始终展开，不再归入 Features。

入口：专家、配置、服务商、Bibit 模型、工具、MCP、技能、Hook、插件、安全、Agent Top、Runtime 状态、API 捕获、日志。

宿主新增 core 设置导航组和 contribution navigation 的 titleKey/fallbackTitle/iconKey 可选字段；同步 TS、JSON Schema、Rust 校验和静态/动态插件入口投影。保留命名空间路由。插件按独立 settings contributions 导出页面，不复制宿主设置壳。安全通过独立安全服务合同接入，Bibit 模型通过 bianbu.bibit.intent 的 Plugin Console 接入；不修改 Runtime 源码。每页独立加载，错误显式显示。

验证：宿主合同/导航/菜单测试；插件页面切换与服务错误验证；npm run typecheck、npm run build:dev、npm run test:adapter、git diff --check；签名构建验证新 manifest。
