import { runtimeLocalModelsEnglish } from './runtime-local-models-i18n'
import { runtimeExpertsEnglish } from './runtime-experts-i18n'
import { runtimeMonitorEnglish } from './runtime-monitor-i18n'
import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react'

export type RuntimeLanguage = 'en' | 'zh'
export type RuntimeTranslate = (source: string, values?: Record<string, string | number>) => string

const english: Record<string, string> = {
  '切换 Agent 以查看和配置对应的安全策略。': 'Switch agents to view and configure their security policies.',
  '基础信息': 'Basic information', '从能力目录选择能力，并设置授权范围和确认策略。': 'Choose a capability from the catalog, then configure its scope and confirmation policy.',
  'Scope 示例：/data/project/*、example.com；留空表示不限制。': 'Scope examples: /data/project/*, example.com. Leave blank for unrestricted scope.',
  '安全服务拒绝执行此操作。': 'The security service rejected this operation.',
  '架构': 'Architecture', '刷新事件': 'Refresh events',
  '本页': 'This page', '页码': 'Page', '上一页': 'Previous page', '下一页': 'Next page',
  '正在加载审计记录': 'Loading audit records',
  '审计分页接口不可用，请更新 Runtime 和 Security 服务。': 'Audit pagination is unavailable. Please update Runtime and Security services.',
  '已注册 Agent': 'Registered agents', '查看身份、版本、状态和能力数量。': 'View identity, version, status and capability counts.', '能力数': 'Capabilities', '最近活动': 'Last active', '暂无活动': 'No activity yet', '刚刚': 'just now', '1 分钟前': '1 minute ago', '{minutes} 分钟前': '{minutes} minutes ago', '安装于 {time}': 'Installed {time}', '查看': 'Inspect', '发送暂停请求': 'Send pause request', '仅记录审计并发送暂停请求，不会停止 Agent 执行。': 'This only records an audit event and sends a pause request; it does not stop the agent.', '暂停请求已发送。Agent 未停止，仍可能继续执行。': 'Pause request sent. The agent has not been stopped and may continue executing.',
  '能力管理': 'Capability management', '每个工具一条策略：allow 放行 / ask 确认 / deny 拒绝。': 'One policy per tool: allow / ask / deny.', '查看并调整 Agent 的能力授权、范围和风险级别。': 'Review and adjust the allow / ask / deny policy for each tool.', '新增工具策略': 'Add tool policy',
  '工具': 'Tool', '策略': 'Policy', '框架': 'Framework', '编辑工具策略': 'Edit tool policy', '保存策略': 'Save policy',
  '该 Agent 还没有工具策略。': 'This agent has no tool policies yet.',
  '工具名': 'Tool name',
  'allow 放行、ask 调用前确认、deny 拒绝。未在目录中声明的工具按 unmapped 默认策略处置。': 'allow runs immediately, ask confirms before the call, deny blocks it. Tools absent from the catalog follow the unmapped default policy.',
    '安全权限设置': 'Security permission settings', '能力管理决定「这个 tool 能不能调」；这里决定「调用之后能碰什么」。可读/可写都是「包含 + 排除」：包含项列出允许触碰的目录，排除项从其中挖掉子目录——可读排除＝完全不可见，可写排除＝仍可读但不可写。': 'Capability management decides whether a tool may run; this page decides what it may touch afterwards. Read and write scopes are include + exclude pairs: include lists the directories the agent may touch, exclude carves subdirectories back out — an excluded read path becomes invisible, an excluded write path stays readable but not writable.',
  '可读范围 · 包含': 'Read scope · include', '可读范围 · 排除': 'Read scope · exclude', '可写范围 · 包含': 'Write scope · include', '可写范围 · 排除': 'Write scope · exclude',
  '包含项每条一行；排除项从包含范围里挖掉，可读排除＝完全不可见。': 'One include path per line; excludes carve paths back out of the include range. An excluded read path becomes completely invisible.',
  '排除项只收回写权限，目录仍可读。': 'Excludes only revoke write access; the directory stays readable.',
  '保存可读范围': 'Save read scope', '保存可写范围': 'Save write scope', '保存网络范围': 'Save network scope', '网络访问范围': 'Network scope',
  '正在加载安全权限设置': 'Loading security permission settings',
  '当前模式：{mode}。填写域名后按白名单模式保存；留空表示允许全部。': 'Current mode: {mode}. Entering domains saves in allowlist mode; leaving it empty allows everything.',
  '执行模式': 'Execution mode', '沙箱模式': 'Sandbox mode', '主机模式': 'Host mode',
  '已声明 {reasons}，需要沙箱命名空间与 seccomp 落实；重启 Worker 后生效。': 'Declared {reasons}; a sandbox namespace and seccomp are required to enforce it. Restart the worker to apply.',
  '未声明额外安全设置，在宿主上以受约束的 systemd 单元运行。': 'No extra security settings are declared, so the agent runs on the host inside a constrained systemd unit.',
  '允许全部': 'Allow all', '白名单': 'Allowlist', '全部拒绝': 'Deny all', '学习模式': 'Learning',
  'Agent 安全模式': 'Agent security mode', 'YOLO · 高风险': 'YOLO · High risk', '标准模式': 'Standard mode', '关闭 YOLO': 'Disable YOLO', '启用 YOLO': 'Enable YOLO',
  '工具默认放行；跳过 DLP 扫描、网络限制与审批；保留审计记录。': 'Tools run by default; DLP scanning and network approvals are skipped; audit recording continues.', '按每个工具的 allow / ask / deny 策略执行。': 'Enforce the allow / ask / deny policy of each tool.',
  '路径每条一行；留空表示沿用默认边界。': 'One path per line; leave blank to keep the default boundary.',
  '能力默认放行；跳过 DLP 扫描、网络限制与审批、Token 配额检查与审批；保留审计和用量记录。': 'Capabilities are allowed by default. YOLO skips DLP scanning, network restrictions and approvals, and token quota checks and approvals. Audit and usage recording continue.', '按细粒度 ALLOW、CONFIRM 和 DENY 策略执行。': 'Enforce individual ALLOW, CONFIRM and DENY policies.',
  '确认策略': 'Confirmation policy', '编辑': 'Edit', '权限判定': 'Permission check', '验证当前 Agent 对指定能力和 Scope 的判定结果。': 'Evaluate this agent’s permission for a capability and scope.', '能力名': 'Capability name', '判定权限': 'Check permission', '编辑能力': 'Edit capability', '请选择能力': 'Select a capability', '风险等级': 'Risk level', '留空表示不限制范围': 'Leave blank for unrestricted scope', '保存能力': 'Save capability',
  '控制敏感数据的放行、记录、脱敏或拦截行为。': 'Control whether sensitive data is allowed, audited, masked or blocked.', '次干预': 'interventions', 'DLP 文本试扫': 'DLP text scan',
  '审计日志': 'Audit log', '记录安全 Hook、权限判定和策略变更。': 'Track security hooks, permission decisions and policy changes.', '条记录': 'records', '审计过滤': 'Audit filter', '全部事件': 'All events', '安全 Hook': 'Security hooks', '仅拒绝': 'Denied only', '序号': 'Sequence', '结果': 'Result',
  '网络访问记录': 'Network access records', '记录 Worker 的 DNS 查询与网络连接目标。': 'Record worker DNS queries and network connection targets.', '刷新访问记录': 'Refresh access records', '采集中': 'Collecting', '未运行': 'Inactive', '采集异常': 'Collection degraded', 'DNS 查询': 'DNS query', '网络连接': 'Network connection', '次数': 'Count', '尚未观测到访问': 'No access observed yet',
  'YOLO 不执行 DLP 扫描或检查；保留 normal 模式规则和审计记录。': 'YOLO skips DLP scanning and checks. Saved normal-mode rules are preserved; audit recording continues.',
  'YOLO 不执行网络限制或审批；保留 normal 模式策略，切回后恢复。': 'YOLO bypasses network restrictions and approvals. Saved normal-mode policy is preserved for switching back.',
  'YOLO 模式下无法编辑、保存 Token 配额；normal 模式下可编辑、保存。': 'Token quotas cannot be edited or saved in YOLO mode; they can be edited and saved in normal mode.',
  'YOLO 使用无限 Token 配额并继续记录用量；普通模式配额保持不变，切回后恢复。': 'YOLO uses unlimited token quotas while continuing usage accounting. Normal-mode limits are preserved and restored when you switch back.',
  '尚未保存，运行中的策略未改变。': 'Unsaved changes; the running policy has not changed.',
  '重建 Worker 并应用策略': 'Rebuild worker and apply policy',
  '重建 Worker': 'Rebuild worker', '确认重建': 'Confirm rebuild',
  '重建此 Agent 的 Worker 并应用已保存策略。有在途任务时请先结束任务，再重试。': 'Rebuild this agent’s worker with the saved policy. Finish active tasks before retrying.',
  '停止实例失败，请刷新后重试。': 'Failed to stop the instance. Refresh and retry.',
  '策略已保存，需重启 Worker；尚未对全部运行实例生效。': 'Saved policy requires a worker restart; it is not yet effective for all running instances.',
  '已确认策略对全部运行实例生效。': 'The policy is confirmed effective for all running instances.',
  '无运行实例；策略将在下次启动时应用。': 'No running instances; the policy will be applied at the next start.',
  '尚未确认策略生效，请刷新检查。': 'Policy effectiveness is unconfirmed; refresh to check.',
  '刷新生效状态': 'Refresh apply status',
  '配置中心': 'Configuration center', '设置 Token 配额、网络边界和 Agent 安全模式。': 'Set token quotas, network boundaries and agent security mode.', '超限处理': 'When quota is exceeded', '暂停并通知': 'Pause and notify', '拒绝请求': 'Deny request', '当前 Agent 安全模式': 'Current agent security mode', '安全模式请在能力管理页面修改。YOLO 跳过 DLP、网络和 Token 配额检查与审批，保留审计和用量记录；normal 配置保持不变。': 'Change security mode in Capability management. YOLO skips DLP, network and token quota checks and approvals while retaining audit and usage recording. Normal-mode settings are preserved.', '前往能力管理': 'Open capability management',
  ...runtimeLocalModelsEnglish,
  ...runtimeMonitorEnglish,
  ...runtimeExpertsEnglish,
  '自定义服务商': 'Custom Provider', '请填写名称和 API Base': 'Enter a name and API Base', '服务商名称已存在': 'A provider with this name already exists',
  '删除失败': 'Delete failed', '管理模型服务商，为专家配置模型': 'Manage model providers for your experts',
  // The host client drops the Runtime's own error text, so these carry the
  // reason the plugin has to show by itself.
  '服务商 {name} 正在被专家使用：{experts}。请先在“专家”页给这些专家换用其它服务商，或删除这些专家，再删除该服务商。': 'Provider {name} is still used by {experts}. Switch those experts to another provider, or delete them, and then delete this provider.',
  'Runtime 未运行或无法连接。Bi-bit 通过 bibit-runtime-adapter@bianbu.service 访问 Runtime，两者都要在运行；请在终端执行 sudo systemctl start bianbu-agent-runtime bibit-runtime-adapter@bianbu 后重试。': 'Runtime is not running or unreachable. Bi-bit reaches the Runtime through bibit-runtime-adapter@bianbu.service, so both must be running. Run sudo systemctl start bianbu-agent-runtime bibit-runtime-adapter@bianbu in a terminal, then try again.',
  'Runtime 请求超时，请稍后重试。': 'The Runtime request timed out. Try again later.',
  'Runtime 服务暂时不可用，请稍后重试。': 'The Runtime service is temporarily unavailable. Try again later.',
  '插件缺少该 Runtime 操作的授权，请检查插件授权配置后重启 Bi-bit。': 'The plugin is not granted this Runtime operation. Check the plugin capability grants and restart Bi-bit.',
  '插件与 Runtime 协议不匹配，请同步升级 Runtime 包和插件。': 'The plugin and Runtime protocols do not match. Upgrade the Runtime package and the plugin together.',
  '操作已取消。': 'The operation was cancelled.',
  'Runtime 服务进程异常退出，请重启 Runtime 后重试。': 'The Runtime service process exited unexpectedly. Restart the Runtime and try again.',
  'Runtime 资源不足，请稍后重试。': 'The Runtime is out of resources. Try again later.',
  'Runtime 拒绝了该操作，且没有返回可展示的原因。请刷新后重试；如果刚改过专家，请先确认没有专家仍在使用它。': 'The Runtime refused the operation without a displayable reason. Refresh and try again; if you just changed experts, first confirm no expert still uses it.',
  '操作失败，请稍后重试。': 'The operation failed. Try again later.',
  '出厂服务商': 'Factory provider', '出厂服务商：删除后需重新安装或升级 Runtime 包才能恢复。': 'Factory provider. Reinstall or upgrade the Runtime package to restore it after deletion.', '添加服务商': 'Add Provider', '选择服务商': 'Select Provider', '编辑服务商': 'Edit Provider', '协议': 'Protocol', '保存': 'Save',
  '尚未配置服务商。添加服务商后即可为 Agent 选择模型。': 'No providers configured. Add a provider to select models for agents.',
  '用启动命令安装和管理 MCP Server': 'Install and manage MCP servers with launch commands',
  '示例': 'Example', '暂无 MCP Server': 'No MCP servers installed', '暂无工具': 'No tools', '未连接': 'not connected', '后台启动中…': 'starting in the background...',
  '卸载 MCP Server': 'Uninstall MCP server', '确定卸载此 MCP Server？': 'Uninstall this MCP server?',
  '取消': 'Cancel', '关闭': 'Close', '安装和管理插件及 MCP Server': 'Install and manage plugins and MCP servers',
  '本地插件目录': 'Local plugin directory', '暂无插件': 'No plugins installed', '查看详情': 'Inspect', '加载插件详情失败': 'Failed to load plugin details',
  '命令会直接启动程序，不经过 Shell；请只安装可信来源，并限制 Filesystem MCP 可访问的目录。': 'Commands launch programs directly, without a shell. Install trusted sources only and limit the directories accessible to Filesystem MCP.',
  '查看 Agent 技能；请在专家配置中选择启用项': 'View agent skills; select enabled skills in expert configuration',
  '查看 Agent 可调用的内置工具及其状态': 'View built-in tools available to agents and their status',
  '内置工具': 'Built-in tools',
  '暂无技能': 'No skills found', '暂无内置工具': 'No built-in tools', '未启用': 'Unavailable',
  '依赖或运行环境未满足': 'Dependency or runtime requirement is not met',
  '需要重启': 'Restart required', '可在专家中配置': 'Configurable in experts',
  '所属插件': 'Plugin', '随插件加载': 'Loaded with its plugin', '未加载，需重启': 'Not loaded; restart required',
  '专家': 'Experts', '配置': 'Configuration', '服务商': 'Providers', '本地模型': 'Local Models', '技能': 'Skills', '插件': 'Plugins', '安全': 'Security', 'Runtime 状态': 'Runtime Status', '日志': 'Logs',
  '管理': 'Management', '监控': 'Monitoring', '名称': 'Name', '状态': 'Status', '模型': 'Models', '操作': 'Actions', '来源': 'Source', '描述': 'Description', '版本': 'Version', '路径': 'Path', '命令': 'Command', '成员': 'Members', '头像': 'Avatar', '能力': 'Capabilities', '请求': 'Request', '响应': 'Response', '时间': 'Time', '错误': 'Error',
  'Runtime 已连接': 'Runtime connected', '连接中': 'Connecting', 'Runtime 不可用': 'Runtime unavailable', '刷新中': 'Refreshing', '刷新': 'Refresh', '正在加载 Runtime 数据': 'Loading Runtime data',
  '本地模型服务未返回有效模型列表': 'Local model service returned an invalid model list', '未知 Runtime 设置页面': 'Unknown Runtime settings page', '{action} 已完成': '{action} completed', '{action} 失败': '{action} failed',
  '本地模型状态不可用': 'Local model state unavailable', '设备上的本地模型由 AI Gateway 提供。请确认 AI Gateway（127.0.0.1:18790）或 Bibit Intent 服务（127.0.0.1:8765）已启动，然后重试；读取失败不影响对话。': 'On-device models are served by the AI Gateway. Make sure the AI Gateway (127.0.0.1:18790) or Bibit Intent service (127.0.0.1:8765) is running, then retry. A failed read does not affect chat.', '重试': 'Retry',
  '服务状态': 'Service status', '角色': 'Role', '模式': 'Mode', '部署配置': 'Deployment configuration', '数据目录': 'Data directory', '默认 Agent': 'Default agent', '监听端口': 'Listening port', '语言': 'Language',
  '正在加载运行参数': 'Loading runtime parameters', '保存运行参数': 'Save runtime parameters', '保存部署配置': 'Save deployment configuration', '运行参数': 'Runtime parameters', '最大上下文轮数': 'Maximum context turns', '最大步骤数': 'Maximum steps', '压缩阈值': 'Compression threshold', '压缩目标比例': 'Compression target ratio', '保护前 N 轮': 'Protect first N turns', '保护后 N 轮': 'Protect last N turns', '自进化空闲分钟': 'Self-evolution idle minutes', '自进化最小轮数': 'Self-evolution minimum turns', '摘要失败时中止压缩': 'Abort compression when summarization fails', '启用自进化': 'Enable self-evolution', '部署语言': 'Deployment language', '中文': 'Chinese',
  '模型发现失败': 'Model discovery failed', '新增 Provider': 'Add provider', '删除 Provider': 'Delete provider', '已配置': 'Configured', '缺少配置': 'Configuration missing', '删除': 'Delete', '模型发现': 'Model discovery', '发现模型': 'Discover models', '上下文未知': 'Context unknown', '新增': 'Add',
  '新增 Agent': 'Add agent', '删除 Agent': 'Delete agent', '撤销 Agent Execution': 'Revoke agent execution', '可用': 'Available', '撤销': 'Revoke', 'Agent 能力绑定': 'Agent capability bindings', 'id，可选': 'ID (optional)', '调用名': 'Call name', '英文名称': 'English name', '中文名称': 'Chinese name', '简介': 'Description', '中文简介': 'Chinese description', '模型名': 'Model name',
  '插件随包提供的 MCP 在插件页随插件显示状态，这里只管理独立 MCP': 'MCP servers shipped by a Plugin are listed with that Plugin on the Plugins page; only standalone servers are managed here',
  '这里没有独立 MCP；插件自带的 MCP 在插件页显示': 'No standalone MCP servers; Plugin-owned servers are listed with their Plugin',
  '插件自带的 MCP': 'MCP servers from this Plugin', 'MCP 见下方': 'MCP below', '个工具': 'tools', '工具数未知': 'tool count unknown',
  '已配置 — 输入新值可替换': 'Configured — enter a new value to replace', '输入 API 密钥': 'Enter API key',
  '系统安装': 'System installed', '安装 MCP': 'Install MCP', '删除 MCP': 'Delete MCP', '刷新 MCP 健康状态': 'Refresh MCP health', '刷新健康状态': 'Refresh health', '安装': 'Install', '安装或更新': 'Install or update', '启动命令': 'Start command',
  '安装包': 'Install package', '校验包': 'Verify package', '卸载包': 'Uninstall package', '校验': 'Verify', '卸载': 'Uninstall', '安装本地包': 'Install local package', '服务端本地路径': 'Server local path',
  '安装插件': 'Install plugin', '删除插件': 'Delete plugin', '回滚插件': 'Roll back plugin', '加载 Plugin Console 失败': 'Failed to load Plugin Console', '执行 Plugin Console 动作': 'Run Plugin Console action', '回滚': 'Roll back', '当前生效': 'Currently effective', '服务端本地插件路径': 'Server local plugin path', '选择插件行里的 Console 查看自描述动作。': 'Select Console in a plugin row to view its self-described actions.',
  'Control 进程': 'Control process', '后端': 'Backend', 'Worker 数量': 'Worker count', '目标': 'Target', '记录': 'Records',
  '类型': 'Type', '端口': 'Port', '下载': 'Download', '服务': 'Service', '模型服务拒绝执行此操作': 'The model service rejected this operation',
  '下载模型': 'Download model', '启动服务': 'Start service', '停止服务': 'Stop service', '取消下载': 'Cancel download',
  '生效插件': 'Effective Plugins', 'MCP 服务器': 'MCP Server', '插件控制台': 'Plugin Console', 'Worker 池': 'Worker Pool', '未返回日志。': 'No logs returned.',
  'Agent 包': 'Agent packages', '工具包': 'Tool packages', '技能包': 'Skill packages', '已启用': 'Enabled', '已禁用': 'Disabled',
  '宿主能力未提供': 'Host capability unavailable',
  '宿主未提供 Runtime 服务能力，请检查插件授权配置并重启 Bi-bit。': 'The host has not provided the Runtime service capability. Check plugin grants and restart Bi-bit.',
  '宿主未提供 Security 服务能力，请检查插件授权配置并重启 Bi-bit。': 'The host has not provided the Security service capability. Check plugin grants and restart Bi-bit.',
  'Runtime 服务不可用。': 'Runtime service is unavailable.', 'Security 服务不可用。': 'Security service is unavailable.',
  '安全控制中心': 'Security control center', '管理系统调用、Agent 权限、敏感数据策略、审计和运行边界。': 'Manage agent tool policies, sensitive-data policies and audits.', 'securityd 已连接': 'securityd connected', 'securityd 不可用': 'securityd unavailable', '无法连接 securityd。': 'Unable to connect to securityd.', '请检查 Bibit 服务授权和 Runtime 安全桥接连接后重试。': 'Check Bibit service authorization and the Runtime security bridge connection, then retry.', '当前 Agent': 'Current agent', '暂无可用 Agent': 'No agents available', '安全设置': 'Security settings', '能力策略': 'Capability policy', '审计': 'Audit', 'securityd 未返回已注册 Agent。': 'securityd returned no registered agents.',
  '当前 securityd 不支持系统调用策略与独立审计。请升级到与 Runtime 合同匹配的 securityd 后重试。': 'The current securityd does not support syscall policy or standalone auditing. Upgrade securityd to a version matching the Runtime contract and retry.', '无法读取系统调用策略。': 'Unable to read syscall policy.', '策略已保存；重启 Worker 后生效。': 'Policy saved; restart the worker to apply it.', '保存失败。': 'Save failed.', '恢复默认策略失败。': 'Failed to restore the default policy.', '系统调用策略': 'Syscall policy', '默认不限制：勾选即拦截，没有强制基线。改动仅对该 Agent 生效，且需重启 Worker（并进入沙箱）才装载过滤器。': 'Unrestricted by default: checked entries are blocked and there is no mandatory baseline. Changes apply to this agent only and need a worker restart (inside a sandbox) to install the filter.', '恢复默认': 'Restore defaults', '正在加载系统调用策略': 'Loading syscall policy', '启用': 'Enabled', '编号': 'Number', '说明': 'Description', '危险系统调用': 'Dangerous syscall', '已拦截': 'Blocked', '可拦截': 'Blockable', '策略版本 {version} · 已应用 {applied} · {state}': 'Policy version {version} · Applied {applied} · {state}', '待重启': 'Restart required', '已应用': 'Applied', '系统调用拦截审计': 'Syscall interception audit', '系统调用黑名单': 'Syscall denylist', '暂无系统调用目录': 'No syscall catalog', '暂无系统调用拦截事件': 'No syscall interception events',
  '无法读取能力策略。': 'Unable to read capability policy.', '安全策略更新失败。': 'Security policy update failed.', '查看授权范围、风险等级和确认策略。': 'Review authorization scopes, risk levels, and confirmation policies.', '正在加载能力策略': 'Loading capability policy', '域': 'Domain', '风险': 'Risk', '确认': 'Confirmation', '范围': 'Scope', '不限': 'Unlimited', '已授权': 'Granted', '待确认': 'Pending confirmation', '已撤销': 'Revoked', '授权': 'Grant',
  '无法读取 DLP 策略。': 'Unable to read DLP policy.', 'DLP 策略更新失败。': 'Failed to update DLP policy.', 'DLP / 个人信息策略': 'DLP / personal information policy', '正在加载 DLP 策略': 'Loading DLP policy', 'PII 类型': 'PII type', '动作': 'Action', '输入待检测文本': 'Enter text to scan', '扫描文本': 'Scan text', '发现 {count} 项；{text}': 'Found {count} item(s); {text}', '扫描失败。': 'Scan failed.',
  '未校验': 'Not verified', '无法读取审计。': 'Unable to read audit records.', '安全审计': 'Security audit', '哈希链完整': 'Hash chain intact', '校验失败': 'Verification failed', '校验失败。': 'Verification failed.', '校验哈希链': 'Verify hash chain',
  // MCP 生命周期：状态词和「它在干什么」分开，和 Runtime 控制台同一套词。
  '未加载': 'Not loaded', '准备中': 'Preparing', '就绪': 'Ready',
  '降级': 'Degraded', '失败': 'Failed', '已停止': 'Stopped', '未知': 'Unknown',
  '正在安装依赖（首次启动要下载 npm 包，可能需要 1-2 分钟）': 'Installing dependencies (the first start downloads the npm package and can take 1-2 minutes)',
  '正在启动并握手…': 'Starting and handshaking...',
  '还没有 Worker 启动它：Runtime 会在 Worker 就绪时自动准备，点「刷新」可立即重试。': 'No Worker has started it yet: the Runtime prepares installed servers once a Worker is ready, and Refresh retries immediately.',
  '暂时读不到 Worker 的加载状态，点「刷新」重试。': 'The Worker has not reported a status yet; refresh to retry.',
  '无法读取安全配置。': 'Unable to read security configuration.', '正在加载安全配置': 'Loading security configuration', 'Token 配额': 'Token quota', '单次对话上限': 'Per-conversation limit', '单日上限': 'Daily limit', '保存配额': 'Save quota', '网络策略': 'Network policy', '保存网络策略': 'Save network policy', '暂无记录': 'No records',
}

const RuntimeI18nContext = createContext<RuntimeTranslate>((source, values) => format(source, values))
const RuntimeLanguageContext = createContext<RuntimeLanguage>('en')

function format(template: string, values?: Record<string, string | number>) {
  return values ? template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`)) : template
}

export function normalizeRuntimeLanguage(language?: string): RuntimeLanguage { return language?.toLowerCase().startsWith('zh') ? 'zh' : 'en' }

export function RuntimeI18nProvider({ language, children }: { language?: string; children: ReactNode }) {
  const normalized = normalizeRuntimeLanguage(language)
  const translate = useMemo<RuntimeTranslate>(() => (source, values) => format(normalized === 'zh' ? source : english[source] ?? source, values), [normalized])
  return <RuntimeI18nContext.Provider value={translate}>
    <RuntimeLanguageContext.Provider value={normalized}>{children}</RuntimeLanguageContext.Provider>
  </RuntimeI18nContext.Provider>
}

export function useRuntimeI18n() {
  const current = useContext(RuntimeI18nContext)
  const currentRef = useRef(current)
  currentRef.current = current
  return useCallback<RuntimeTranslate>((source, values) => currentRef.current(source, values), [])
}

/** Current UI language, for values the Runtime ships per language. */
export function useRuntimeLanguage(): RuntimeLanguage {
  return useContext(RuntimeLanguageContext)
}

/** 能力目录里可能带 Power 格式 v2 展示字段的最小形状。 */
export type RuntimeDisplayFields = {
  id?: string
  name?: string
  display_name?: string
  name_zh?: string | null
  name_en?: string | null
  description?: string
  description_zh?: string | null
}

/**
 * 能力名随界面语言切换，与 Runtime 控制台同一条规则：中文取 `name_zh`、
 * 英文取 `name_en`，缺失时回退到 `display_name` / `name`。
 */
export function runtimeDisplayName(item: RuntimeDisplayFields, language: RuntimeLanguage): string {
  const preferred = language === 'zh' ? item.name_zh : item.name_en
  return String(preferred || '').trim() || item.display_name || item.name || item.id || ''
}

/** 中文界面显示 `description_zh`，其它语言保持模型侧原文。 */
export function runtimeDisplayDescription(item: RuntimeDisplayFields, language: RuntimeLanguage): string {
  const fallback = String(item.description || '')
  if (language !== 'zh') return fallback
  return String(item.description_zh || '').trim() || fallback
}

/** MCP 生命周期里可能出现的状态与准备阶段的最小形状。 */
export type McpLifecycleFields = {
  status?: string
  state?: string
  phase?: string
  ready?: boolean
  tools_count?: number
  detail?: string
}

export type McpLifecycleState =
  | 'not_loaded' | 'preparing' | 'ready' | 'degraded' | 'failed' | 'stopped' | 'unknown'

const MCP_STATE_KEYS: Record<McpLifecycleState, string> = {
  not_loaded: '未加载', preparing: '准备中', ready: '就绪',
  degraded: '降级', failed: '失败', stopped: '已停止', unknown: '未知',
}

/**
 * 生命周期归一化：老 Runtime 只给 status（healthy/unhealthy/preparing/…），
 * 升级插件时不能把徽章退化成英文原文；新 Runtime 直接给 `state`。
 */
export function mcpServerState(server?: McpLifecycleFields | null): McpLifecycleState {
  const state = String(server?.state || '').toLowerCase()
  if (Object.hasOwn(MCP_STATE_KEYS, state)) return state as McpLifecycleState
  switch (String(server?.status || '').toLowerCase()) {
    case 'healthy': case 'ready': case 'running': return 'ready'
    case 'preparing': case 'starting': return 'preparing'
    case 'degraded': return 'degraded'
    case 'failed': case 'unhealthy': case 'error': return 'failed'
    case 'stopped': return 'stopped'
    case 'not_loaded': return 'not_loaded'
    default: return 'unknown'
  }
}

/** 状态词随界面语言切换；这里返回的是待翻译 key。 */
export function mcpStateSource(server?: McpLifecycleFields | null): string {
  return MCP_STATE_KEYS[mcpServerState(server)]
}

/**
 * 「它在干什么」：有真实原因（准备失败原文）就显示原因，否则按 state/phase
 * 说明进度。只报 preparing 时，用户不知道是 116MB 的 npm 安装还是卡住了。
 */
export function mcpStateDetailSource(server?: McpLifecycleFields | null): string {
  const detail = String(server?.detail || '').trim()
  if (detail) return detail
  switch (mcpServerState(server)) {
    case 'preparing':
      return String(server?.phase || '').toLowerCase() === 'installing'
        ? '正在安装依赖（首次启动要下载 npm 包，可能需要 1-2 分钟）'
        : '正在启动并握手…'
    case 'not_loaded':
      return '还没有 Worker 启动它：Runtime 会在 Worker 就绪时自动准备，点「刷新」可立即重试。'
    case 'unknown':
      return '暂时读不到 Worker 的加载状态，点「刷新」重试。'
    default:
      return ''
  }
}

/** 只有 `ready` 才算可用；其余状态不能按“没工具”解释。 */
export function mcpServerReady(server?: McpLifecycleFields | null): boolean {
  return mcpServerState(server) === 'ready'
}

export const runtimeLocales = {
  en: { title: 'Runtime', description: 'Bianbu Agent Runtime configuration console', management: 'Management', monitoring: 'Monitoring', agents: 'Experts', providers: 'Providers', 'bibit-models': 'Local Models', tools: 'Tools', mcp: 'MCP', skills: 'Skills', plugins: 'Plugins', security: 'Security', 'agent-top': 'Agent Top', 'runtime-status': 'Runtime Status', logs: 'Logs' },
  'zh-CN': { title: 'Runtime', description: 'Bianbu Agent Runtime 配置控制台', management: '管理', monitoring: '监控', agents: '专家', providers: '服务商', 'bibit-models': '本地模型', tools: '工具', mcp: 'MCP', skills: '技能', plugins: '插件', security: '安全', 'agent-top': 'Agent Top', 'runtime-status': 'Runtime 状态', logs: '日志' },
}
