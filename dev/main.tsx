import React from 'react'
import { createRoot } from 'react-dom/client'
import { FeatureDevHost } from '@bibit/feature-dev-host'
import '@bibit/feature-dev-host/styles.css'
import type { FeatureManifestV1 } from '@bibit/feature-contracts'
import manifestJson from '../bibit.feature.json'
import { featureModule } from '../src/feature'
import {
  RUNTIME_OPS,
  type LocalModelsView,
  SECURITY_OPS,
  SECURITY_SERVICE_ID,
  type AgentView,
  type AgentTopView,
  type CapabilityView,
  type ExecutionView,
  type MCPServerView,
  type PackageView,
  type PluginView,
  type ProviderModelView,
  type ProviderView,
  type RuntimeSettings,
  type RuntimeStatus,
  type SecurityAgentDetail,
  type SecurityCapability,
  type SecurityDlpRow,
} from '../src/runtime-contracts'

const status: RuntimeStatus = {
  status: 'AGENT_READY',
  role: 'control',
  control_ready: true,
  agent_ready: true,
  instance_id: 'dev-worker',
  pid: 9899,
  effective_mode: 'host',
  backend: 'systemd',
  sandboxed: false,
  policy_digest: 'sha256:dev',
  generation_id: 7,
  worker_state: 'running',
}

const settings: RuntimeSettings = {
  deployment: {
    data_dir: '/home/bianbu/.bianbu-agent',
    default_agent_id: 'bianbu-agent-default',
    service: { title: 'Bianbu Agent', host: '0.0.0.0', port: 9899 },
    language: 'zh',
    require_file_backed_capabilities: true,
    plugin_stop_timeout_seconds: 5,
    allow_unmanaged_capabilities: false,
  },
  runtime: {
    search_strategy: 'searxng',
    self_evolution_enabled: false,
    self_evolution_idle_minutes: 10,
    self_evolution_min_turns: 6,
  },
}

const providers: ProviderView[] = [
  { id: 'minimax', label: 'MiniMax', base_url: 'https://api.minimax.chat/v1', configured: true, api_key_masked: 'min***1234', origin: 'system', parameters: {} },
  { id: 'custom:local', label: 'Local OpenAI Compatible', base_url: 'http://127.0.0.1:8080/v1', configured: false, api_key_masked: '', origin: 'user', parameters: {} },
]

const agents: AgentView[] = [
  {
    id: 'bianbu-agent-default',
    name: 'Default',
    name_zh: '默认助手',
    name_en: 'Default Assistant',
    avatar: '🤖',
    description: 'Default Runtime Agent',
    description_zh: '默认 Runtime 专家',
    soul: '回答简洁准确',
    model: { provider: 'minimax', name: 'abab6.5-chat' },
    tools: ['*'],
    skills: ['*'],
    mcps: [],
    plugins: [],
    permissions: {},
    metadata: {},
    is_default: true,
    available: true,
    unavailable_reason: '',
  },
  {
    id: 'runtime-debug-agent',
    name: 'Runtime Debugger',
    name_zh: '运行时诊断助手',
    name_en: 'Runtime Debugger',
    avatar: '🛠️',
    description: 'Mock agent for Runtime configuration checks',
    description_zh: '用于 Runtime 配置检查的 Mock 专家',
    soul: '检查 Runtime 状态并给出配置建议',
    model: { provider: 'custom:local', name: 'local-debug-model' },
    tools: ['runtime.status', 'runtime.settings'],
    skills: ['diagnostics'],
    mcps: ['mcp.filesystem'],
    plugins: [],
    permissions: {},
    metadata: { mock: true },
    is_default: false,
    available: true,
    unavailable_reason: '',
  },
]

const mcps: MCPServerView[] = [
  { id: 'mcp.filesystem', display_name: 'Filesystem', command: 'npx -y @modelcontextprotocol/server-filesystem /data/projects', kind: 'mcp', status: 'healthy', state: 'ready', phase: '', ready: true, tools_count: 1, detail: '', transport: 'stdio', tools: [{ id: 'read_file', name: 'read_file', display_name: 'Read File' }], source_kind: 'managed', owner_plugin_id: null, removable: true, health_checked_at: new Date().toISOString() },
  // 第一次启动要下载 npm 包的 Server：dev 环境也要能看见「准备中」是什么样子，
  // 否则本地看到的永远只有就绪那一种状态。
  { id: 'mcp.bilibili-search', display_name: 'bilibili-search', command: 'npx bilibili-mcp-js', kind: 'mcp', status: 'preparing', state: 'preparing', phase: 'installing', ready: false, tools_count: 0, detail: '', transport: 'stdio', tools: [], source_kind: 'standalone', owner_plugin_id: null, removable: true, health_checked_at: null },
]

const providerModels: Record<string, ProviderModelView[]> = {
  minimax: [
    { name: 'abab6.5-chat', label: 'abab6.5-chat', context_length: 245760, owned_by: 'minimax' },
    { name: 'MiniMax-Text-01', label: 'MiniMax-Text-01', context_length: 1000192, owned_by: 'minimax' },
  ],
  'custom:local': [
    { name: 'local-debug-model', label: 'Local Debug Model', context_length: 32768, owned_by: 'local' },
  ],
}

const capabilities: Record<string, CapabilityView[]> = {
  tool: [
    ...['skills_list', 'skill_view', 'skill_manage', 'terminal', 'process', 'read_file', 'write_file'].map(id => ({ id, display_name: id, description: `Use ${id}`, summaries: { zh: `用于 ${id} 的内置工具。`, en: `Built-in tool for ${id}.` }, source_kind: 'builtin' })),
    { id: 'search_files', display_name: 'search_files', description: 'Search file contents or find files by name. Use this instead of grep/rg/find/ls in terminal. Ripgrep-backed, faster than shell equivalents.', summaries: { zh: '按内容或文件名搜索文件（ripgrep 实现，替代 terminal 里的 grep/rg/find/ls）。', en: 'Search file contents or find files by name (ripgrep-backed; use it instead of grep/rg/find/ls).' }, source_kind: 'builtin' },
    { id: 'patch', display_name: 'patch', description: 'Targeted find-and-replace edits in files.', source_kind: 'builtin' },
    { id: 'runtime.status', display_name: 'Runtime Status', description: 'Read Runtime status', source_kind: 'builtin' },
    { id: 'filesystem.read', display_name: 'Read File', description: 'Read workspace files', source_kind: 'mcp', owner_plugin_id: 'mcp.filesystem' },
  ],
  skill: [
    // Power 格式 v2 的展示字段：中文取 name_zh、英文取 name_en，缺失才回退到
    // display_name/name。dev 环境两种都要有，否则看不出切换语言的效果。
    { id: 'diagnostics', display_name: 'Diagnostics', description: 'Runtime diagnostics skill', name_zh: '运行时诊断', name_en: 'Runtime Diagnostics', description_zh: 'Runtime 诊断技能', source_kind: 'builtin' },
    { id: 'coding', display_name: 'Coding', description: 'Code editing workflow', name_zh: '代码编辑', name_en: 'Code Editing', description_zh: '代码编辑工作流', source_kind: 'plugin', owner_plugin_id: 'dev.skills' },
    // 没有 v2 名字的技能保持可读：回退链要能在 dev 环境里被验证。
    { id: 'legacy', display_name: 'Legacy Skill', description: 'Written before v2', source_kind: 'builtin' },
  ],
}

const packages: Record<string, PackageView[]> = {
  agent: [
    { id: 'bianbu-agent-default', kind: 'agent', version: '0.1.0', status: 'installed', path: '/opt/bianbu/agents/default.agent' },
  ],
  skill: [
    { id: 'diagnostics', kind: 'skill', version: '0.1.0', status: 'installed', owner_plugin_id: 'dev.skills' },
  ],
  tool: [],
}

const plugins: PluginView[] = [
  { id: 'security.console', name: 'Security Console', version: '0.2.0', enabled: true, active: true, members: [{ kind: 'hook', name: 'audit' }] },
  { id: 'dev.skills', name: 'Developer Skills', version: '0.1.0', enabled: true, active: true, members: [{ kind: 'skill', name: 'diagnostics' }] },
  { id: 'bianbu.bibit.intent', name: 'Bibit Intent Models', version: '0.1.0', enabled: true, active: true, members: [{ kind: 'mcp', name: 'intent' }] },
]

const localModels: LocalModelsView = {
  source: 'bibit-intent',
  read_only: true,
  models: [
    { model_type: 'llm', name: 'bibit-llm', artifact: 'glm-edge-1.5b-chat-q4_0.gguf', backend: 'ai_gateway', port: null, path: '/home/bianbu/.cache/models/llm/glm-edge-1.5b-chat-q4_0.gguf', download: { status: 'completed', progress: 100 }, server: { status: 'running', managed: true } },
    { model_type: 'embed', name: 'bibit-embed', artifact: 'Qwen3-Embedding-0.6B-Q4_0.gguf', backend: 'ai_gateway', port: null, path: '/home/bianbu/.cache/models/embed/Qwen3-Embedding-0.6B-Q4_0.gguf', download: { status: 'downloading', progress: 40 }, server: { status: 'stopped', managed: true } },
  ],
}

const executions: ExecutionView[] = [
  { instance_id: 'dev-worker', agent_id: 'bianbu-agent-default', state: 'running', pid: 9899, started_at: new Date().toISOString(), sandboxed: false, policy_digest: 'sha256:dev' },
  { instance_id: 'debug-worker', agent_id: 'runtime-debug-agent', state: 'stopped', pid: null, started_at: null, sandboxed: true, policy_digest: 'sha256:debug' },
]

const agentTop: AgentTopView = {
  server_time: Date.now() / 1000,
  summary: { agents: agents.length, available_agents: agents.filter(agent => agent.available).length, sessions: 1, runs: 1, active_runs: 0, waiting_runs: 0, failed_runs: 0 },
  agents: agents.map((agent, index) => ({ id: agent.id, name: agent.name, name_zh: agent.name_zh, avatar: agent.avatar, available: agent.available, status: agent.available ? 'idle' : 'unavailable', session_count: index === 0 ? 1 : 0, run_count: index === 0 ? 1 : 0, active_run_count: 0, failed_run_count: 0, last_active_at: index === 0 ? Date.now() / 1000 - 60 : 0 })),
  recent_runs: [{ id: 'run-dev-123456789', agent_id: 'bianbu-agent-default', session_id: 'session-dev-1', session_title: 'Development session', status: 'completed', created_at: Date.now() / 1000 - 120, updated_at: Date.now() / 1000 - 60 }],
}

const logs = [
  '[info] Runtime control plane started',
  '[info] Worker dev-worker ready',
  '[warn] Provider custom:local has no API key configured',
].join('\n')

function DevRuntimeService() {
  return ({ operationId, params }: { operationId: string; params: Readonly<Record<string, unknown>> }) => {
    switch (operationId) {
      case RUNTIME_OPS.workersGet:
        return { control: { pid: 9899, state: 'running', control_ready: true, effective_mode: 'host', backend: 'control-process' }, worker_count: 1, workers: [{ agent_id: 'bianbu-agent-default', state: 'running', pid: 9900, effective_mode: 'sandbox', backend: 'bwrap', sandboxed: true, generation_id: 7 }] }
      case RUNTIME_OPS.statusGet:
        return status
      case RUNTIME_OPS.settingsGet:
        return settings
      case RUNTIME_OPS.settingsUpdate:
        if (params.runtime && typeof params.runtime === 'object') Object.assign(settings.runtime, params.runtime)
        if (params.deployment && typeof params.deployment === 'object') Object.assign(settings.deployment, params.deployment)
        return settings
      case RUNTIME_OPS.providersList:
        return { providers }
      case RUNTIME_OPS.providersModelsList:
        return { models: providerModels[String(params.provider_id)] ?? [] }
      case RUNTIME_OPS.providersCreate:
        providers.push({ id: String(params.id), label: String(params.label || params.id), base_url: String(params.base_url || ''), configured: Boolean(params.base_url && params.api_key), api_key_masked: params.api_key ? '***' : '', origin: 'user', parameters: {} })
        return providers.at(-1)
      case RUNTIME_OPS.providersUpdate: {
        const provider = providers.find(item => item.id === params.provider_id)
        if (!provider) throw new Error('Provider not found')
        if (typeof params.label === 'string') provider.label = params.label
        if (typeof params.base_url === 'string') provider.base_url = params.base_url
        if (params.parameters && typeof params.parameters === 'object') provider.parameters = { ...params.parameters }
        if (params.api_key) provider.api_key_masked = '***'
        provider.configured = Boolean(provider.base_url)
        return provider
      }
      case RUNTIME_OPS.providersDelete:
        providers.splice(providers.findIndex((item) => item.id === params.provider_id), 1)
        return { ok: true }
      case RUNTIME_OPS.capabilitiesList:
        return { capabilities: capabilities[String(params.kind)] ?? [] }
      case RUNTIME_OPS.packagesList:
        return { packages: packages[String(params.kind)] ?? [] }
      case RUNTIME_OPS.packagesGet:
        return (packages[String(params.kind)] ?? []).find((item) => item.id === params.package_id) ?? null
      case RUNTIME_OPS.packagesInstall: {
        const kind = String(params.kind)
        const record = { id: String(params.path || `package-${Date.now()}`), kind, version: '0.1.0', status: 'installed', path: String(params.path || '') }
        packages[kind] = [...(packages[kind] ?? []), record]
        return record
      }
      case RUNTIME_OPS.packagesVerify:
        return { ok: true, package_id: params.package_id, verified: true }
      case RUNTIME_OPS.packagesDelete: {
        const kind = String(params.kind)
        packages[kind] = (packages[kind] ?? []).filter((item) => item.id !== params.package_id)
        return { ok: true }
      }
      case RUNTIME_OPS.pluginsList:
        return { plugins }
      case RUNTIME_OPS.pluginsEffective:
        return { plugins: plugins.filter((plugin) => plugin.active !== false) }
      case RUNTIME_OPS.pluginsGet:
        return plugins.find((plugin) => plugin.id === params.plugin_id) ?? null
      case RUNTIME_OPS.pluginsInstall:
        plugins.push({ id: String(params.id || params.source || `plugin-${plugins.length + 1}`), name: String(params.name || params.id || 'Installed Plugin'), version: '0.1.0', enabled: true, active: true })
        return plugins.at(-1)
      case RUNTIME_OPS.pluginsDelete:
        plugins.splice(plugins.findIndex((plugin) => plugin.id === params.plugin_id), 1)
        return { ok: true }
      case RUNTIME_OPS.pluginsRollback:
        return { ok: true, plugin_id: params.plugin_id, rolled_back: true }
      case RUNTIME_OPS.localModelsGet:
        return localModels
      case RUNTIME_OPS.executionsList:
        return { executions }
      case RUNTIME_OPS.executionsGet:
        return executions.find((execution) => execution.instance_id === params.instance_id) ?? null
      case RUNTIME_OPS.executionsStop: {
        const execution = executions.find((item) => item.instance_id === params.instance_id)
        if (!execution) throw new Error('Unknown instance')
        execution.state = 'stopped'
        return { accepted: true }
      }
      case RUNTIME_OPS.agentsRevoke:
        return { ok: true, agent_id: params.agent_id, revoked: true }
      case RUNTIME_OPS.agentTopGet:
        return agentTop
      case RUNTIME_OPS.logsGet:
        return { text: logs }
      case RUNTIME_OPS.agentAvatarGet: {
        const agent = agents.find(item => item.id === params.agent_id)
        if (!agent || !agent.metadata.mock_avatar) throw new Error('Avatar not found')
        return agent.metadata.mock_avatar
      }
      case RUNTIME_OPS.agentAvatarUpload: {
        const agent = agents.find(item => item.id === params.agent_id)
        if (!agent) throw new Error('Agent not found')
        agent.metadata.mock_avatar = { media_type: params.media_type, base64: params.base64 }
        agent.avatar = `/api/v1/agents/${encodeURIComponent(agent.id)}/avatar`
        return agent
      }
      case RUNTIME_OPS.agentAvatarDelete: {
        const agent = agents.find(item => item.id === params.agent_id)
        if (!agent) throw new Error('Agent not found')
        delete agent.metadata.mock_avatar
        agent.avatar = String(agent.metadata.avatar || '🤖')
        return { ok: true }
      }
      case RUNTIME_OPS.agentsList:
        return { agents }
      case RUNTIME_OPS.agentsGet: {
        const agent = agents.find(item => item.id === params.agent_id)
        if (!agent) throw new Error('Agent not found')
        return agent
      }
      case RUNTIME_OPS.agentsCreate: {
        const metadata = params.metadata as AgentView['metadata'] || {}
        const model = params.model as AgentView['model']
        const agent: AgentView = { id: String(params.id || `agent-${Date.now()}`), name: String(params.name), name_zh: String(params.name_zh || ''), name_en: String(params.name_en || ''), description_zh: String(params.description_zh || ''), avatar: String(metadata.avatar || '🤖'), description: String(params.description || ''), soul: String(params.soul || ''), model, tools: params.tools as string[] || [], skills: params.skills as string[] || [], mcps: params.mcps as string[] || [], plugins: params.plugins as string[] || [], permissions: params.permissions as AgentView['permissions'] || {}, metadata, is_default: false, available: model !== null, unavailable_reason: model === null ? 'agent_model_required' : '' }
        agents.push(agent)
        return agent
      }
      case RUNTIME_OPS.agentsRestart:
        throw new Error('Worker rebuild requires a real Runtime; it is not simulated.')
      case RUNTIME_OPS.agentsUpdate: {
        const agent = agents.find(item => item.id === params.agent_id)
        if (!agent) throw new Error('Agent not found')
        const { agent_id: _, ...payload } = params
        Object.assign(agent, payload)
        if (!agent.metadata.mock_avatar) agent.avatar = String(agent.metadata.avatar || '🤖')
        return agent
      }
      case RUNTIME_OPS.agentsDelete: {
        const index = agents.findIndex(item => item.id === params.agent_id)
        if (index < 0) throw new Error('Agent not found')
        agents.splice(index, 1)
        return { ok: true }
      }
      case RUNTIME_OPS.mcpsList:
        return { mcps }
      case RUNTIME_OPS.mcpsInstall:
        mcps.push({ id: `mcp.${String(params.name).toLowerCase()}`, display_name: String(params.name), command: String(params.command), kind: 'mcp', status: 'not_loaded', state: 'not_loaded', phase: '', ready: false, tools_count: 0, detail: '', transport: 'stdio', tools: [], source_kind: 'managed', owner_plugin_id: null, removable: true, health_checked_at: null })
        return mcps.at(-1)
      case RUNTIME_OPS.mcpsDelete:
        mcps.splice(mcps.findIndex((item) => item.id === params.id), 1)
        return { ok: true }
      case RUNTIME_OPS.mcpsRefresh:
        return { mcps }
      default:
        throw new Error(`Unknown operation: ${operationId}`)
    }
  }
}

const securityAgents: SecurityAgentDetail[] = agents.map((agent) => ({
  agent_id: agent.id, name: agent.name_zh || agent.name, version: '0.1.0', status: agent.available ? 'active' : 'error', last_seen: new Date(Date.now() - 4 * 60 * 1000).toISOString(), installed_at: '2026-09-01T00:00:00.000+00:00', capability_count: 2,
  capabilities: [
    { tool: 'read_file', policy: 'allow', framework: 'runtime', summary: '读取文件内容' },
    { tool: 'terminal', policy: 'ask', framework: 'runtime', summary: '执行系统命令' },
    { tool: 'write_file', policy: 'deny', framework: 'runtime', summary: '写入或创建文件' },
  ],
}))
const securityDlp: SecurityDlpRow[] = [
  { pii_type: 'email', action: 'ask', source: 'inherited' },
  { pii_type: 'api_key', action: 'mask', source: 'agent' },
]
const securityModes: Record<string, string> = Object.fromEntries(securityAgents.map((a) => [a.agent_id, 'normal']))

function DevSecurityService() {
  return ({ operationId, params }: { operationId: string; params: Readonly<Record<string, unknown>> }) => {
    const agentId = String(params.agent_id || '')
    const agent = securityAgents.find((item) => item.agent_id === agentId)
    switch (operationId) {
      case SECURITY_OPS.agentsList: return { agents: securityAgents.map(({ capabilities: _, ...summary }) => summary) }
      case SECURITY_OPS.agentGet: if (!agent) throw new Error('Agent not found.'); return agent
      case SECURITY_OPS.agentSuspend: if (agent) agent.status = 'paused'; return { ok: true }
      case SECURITY_OPS.securityModeGet: return { mode: securityModes[agentId] ?? 'normal' }
      case SECURITY_OPS.securityModeUpdate: securityModes[agentId] = String(params.mode); return { mode: securityModes[agentId] }
      case SECURITY_OPS.capabilitiesCatalog: return { capabilities: agent?.capabilities ?? [] }
      case SECURITY_OPS.capabilitiesUpdate: { const cap = agent?.capabilities?.find((item) => item.tool === params.tool); if (cap) cap.policy = params.policy as SecurityCapability['policy']; return { ok: true } }
      case SECURITY_OPS.dlpMatrix: return { rows: securityDlp }
      case SECURITY_OPS.dlpPolicyUpdate: { const row = securityDlp.find((item) => item.pii_type === params.pii_type); if (row) { row.action = params.action as SecurityDlpRow['action']; row.source = 'agent' }; return { ok: true } }
      case SECURITY_OPS.dlpScan: return { findings: String(params.text).includes('@') ? [{ pii_type: 'email' }] : [], masked_text: String(params.text).replace(/[\w.+-]+@[\w.-]+/g, '[REDACTED]') }
      case SECURITY_OPS.auditQuery: {
        // Exercise multiple pages in the explicit mock preview as well.
        const snapshot = Number(params.snapshot_seq ?? 250)
        const cursor = Number(params.cursor || snapshot + 1)
        const limit = Number(params.limit || 100)
        const rows = Array.from({ length: 250 }, (_, index) => ({ seq: 250 - index, ts: '2026-09-20T00:00:00Z', op_type: index % 2 ? 'hook:before_tool' : 'capability.check', target: 'command.execute', result: index % 3 ? 'ALLOW' : 'DENY' }))
          .filter(row => row.seq <= snapshot && row.seq < cursor && (params.filter !== 'hook' || row.op_type.startsWith('hook:')) && (params.filter !== 'deny' || row.result === 'DENY'))
        const records = rows.slice(0, limit), has_more = rows.length > limit
        return { records, snapshot_seq: snapshot, has_more, next_cursor: has_more ? records[records.length - 1].seq : null }
      }
      case SECURITY_OPS.auditVerify: return { intact: true }
      case SECURITY_OPS.permissionsGet: return { agent_id: agentId, read: ['/opt/data'], write: [], network: { mode: 'whitelist', domains: ['api.deepseek.com'], version: 1 }, syscall: { arch: 'riscv64', mandatory: ['ptrace', 'mount'], agent_additions: ['bpf'], policy_version: 3, applied_policy_version: 2, pending_restart: true }, custom: { notes: 'dev mock' } }
      case SECURITY_OPS.permissionsSetGroup: return { ok: true, agent_id: agentId, group: params.group }
      default: throw new Error(`Unknown security operation: ${operationId}`)
    }
  }
}

const mockMode = globalThis.location.search.includes('mock=1')
function RuntimeDevApp() {
  const initialLanguage = new URLSearchParams(globalThis.location.search).get('lang') === 'zh-CN' ? 'zh-CN' : 'en'
  const [language, setLanguage] = React.useState<'en' | 'zh-CN'>(initialLanguage)
  return <>
    <label style={{ position: 'fixed', zIndex: 20, right: 20, top: 14 }}>UI language <select aria-label="UI language" value={language} onChange={(event) => setLanguage(event.target.value as 'en' | 'zh-CN')}><option value="en">English</option><option value="zh-CN">中文</option></select></label>
    <FeatureDevHost
      manifest={manifestJson as FeatureManifestV1}
      module={featureModule}
      language={language}
      {...(mockMode ? { serviceMocks: { runtime: DevRuntimeService(), [SECURITY_SERVICE_ID]: DevSecurityService() } } : { serviceConnections: { runtime: '/runtime-api/invoke', [SECURITY_SERVICE_ID]: '/security-api/invoke' } } as object)}
    />
  </>
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RuntimeDevApp />
  </React.StrictMode>,
)
