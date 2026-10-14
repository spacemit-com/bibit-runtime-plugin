/**
 * Host capability for actions that cross the Feature boundary. The host owns
 * what opening a conversation means; this plugin only names the expert.
 */
export const HOST_ACTIONS_CAPABILITY = 'host:actions'
export const CREATE_CONVERSATION_ACTION = 'conversation.create'
export const RUNTIME_AGENT_RESOURCE = { namespace: 'runtime', type: 'agent' } as const
/** Starts a new conversation bound to the given expert. */
export type StartExpertConversation = (agentId: string) => Promise<void>
export const RUNTIME_SERVICE_ID = 'runtime'
export const RUNTIME_CAPABILITY = 'service:runtime'
export const SECURITY_CAPABILITY = 'service:runtime-security'

export const RUNTIME_OPS = {
  statusGet: 'status.get.v1',
  workersGet: 'workers.get.v1',
  settingsGet: 'settings.get.v1',
  settingsUpdate: 'settings.update.v1',
  agentsList: 'agents.list.v1',
  agentsGet: 'agents.get.v1',
  agentsCreate: 'agents.create.v1',
  agentsUpdate: 'agents.update.v1',
  agentsRestart: 'agents.restart.v1',
  agentsDelete: 'agents.delete.v1',
  agentAvatarGet: 'agents.avatar.get.v1',
  agentAvatarUpload: 'agents.avatar.upload.v1',
  agentAvatarDelete: 'agents.avatar.delete.v1',
  providersList: 'providers.list.v1',
  providersModelsList: 'providers.models.list.v1',
  providersCreate: 'providers.create.v1',
  providersUpdate: 'providers.update.v1',
  providersDelete: 'providers.delete.v1',
  capabilitiesList: 'capabilities.list.v1',
  packagesList: 'packages.list.v1',
  packagesGet: 'packages.get.v1',
  packagesInstall: 'packages.install.v1',
  packagesVerify: 'packages.verify.v1',
  packagesDelete: 'packages.delete.v1',
  pluginsList: 'plugins.list.v1',
  pluginsEffective: 'plugins.effective.v1',
  pluginsGet: 'plugins.get.v1',
  pluginsInstall: 'plugins.install.v1',
  pluginsDelete: 'plugins.delete.v1',
  pluginsRollback: 'plugins.rollback.v1',
  localModelsGet: 'localModels.get.v1',
  executionsList: 'executions.list.v1',
  executionsGet: 'executions.get.v1',
  executionsStop: 'executions.stop.v1',
  agentsRevoke: 'agents.revoke.v1',
  agentTopGet: 'agentTop.get.v1',
  logsGet: 'logs.get.v1',
  mcpsList: 'mcps.list.v1',
  mcpsInstall: 'mcps.install.v1',
  mcpsDelete: 'mcps.delete.v1',
  mcpsRefresh: 'mcps.refresh.v1',
} as const

/**
 * Catalog mutations make the Runtime rebuild the Worker generation, which
 * restarts every MCP server: a single server may spend its own 120s startup
 * budget inside one install or delete. The host's default 30s request budget
 * used to cut those mutations off as timeouts even though the Runtime finished
 * them, so the affected page kept the pre-action catalog until the user
 * refreshed by hand. Reads keep the host default; this budget covers the
 * mutations, and the installed external-service registry allows the same wait.
 */
export const RUNTIME_MUTATION_TIMEOUT_MS = 180_000

/** Operation suffixes whose work is a Worker generation rebuild, not a read. */
const RUNTIME_MUTATION_SUFFIXES = [
  '.install.v1',
  '.delete.v1',
  '.rollback.v1',
  '.create.v1',
  '.update.v1',
  '.restart.v1',
  '.revoke.v1',
  '.refresh.v1',
] as const

export const runtimeRequestTimeoutMs = (operationId: string): number | undefined =>
  RUNTIME_MUTATION_SUFFIXES.some(suffix => operationId.endsWith(suffix))
    ? RUNTIME_MUTATION_TIMEOUT_MS
    : undefined
export type RuntimeOperationId = (typeof RUNTIME_OPS)[keyof typeof RUNTIME_OPS]
export type ExecutionMode = 'auto' | 'sandbox' | 'host'
export type CapabilityKind = 'tool' | 'skill' | 'hook'
export type CatalogKind = Extract<CapabilityKind, 'tool' | 'skill'>
export type PackageKind = 'agent' | 'skill'

export interface CollectionResult<T> {
  items?: T[]
  data?: T[]
  total?: number
  [key: string]: unknown
}

export interface RuntimeStatus {
  status: 'CONTROL_READY' | 'AGENT_READY' | 'DEGRADED' | 'STARTING' | 'STOPPING'
  role: 'control' | 'worker'
  control_ready: boolean
  agent_ready: boolean
  instance_id: string | null
  pid: number | null
  effective_mode: 'host' | 'sandbox' | null
  backend: string | null
  sandboxed: boolean
  policy_digest: string | null
  generation_id: number | null
  worker_state: string
}

export interface RuntimeSettings {
  deployment: {
    data_dir?: string
    default_agent_id?: string
    service?: { title?: string; host?: string; port?: number }
    language?: 'zh' | 'en'
    require_file_backed_capabilities?: boolean
    plugin_stop_timeout_seconds?: number
    allow_unmanaged_capabilities?: boolean
    runtime?: Record<string, unknown>
    security?: Record<string, unknown>
  }
  runtime: {
    search_strategy: 'searxng'
    self_evolution_enabled: boolean
    self_evolution_idle_minutes: number
    self_evolution_min_turns: number
  }
}

export interface ProviderView {
  id: string
  label: string
  base_url: string
  configured: boolean
  api_key_masked: string
  /** ``system``: shipped by the Runtime package; ``user``: created on device.
   * This is the only signal that separates a factory Provider from a Custom
   * Provider the user made: both carry ``record_kind: custom_provider``. */
  origin: 'system' | 'user'
  parameters: Record<string, unknown>
}

export interface ProviderModelView {
  id?: string
  name: string
  label?: string
  context_length?: number | null
  input_modalities?: string[]
  output_modalities?: string[]
  owned_by?: string
  [key: string]: unknown
}

export interface AgentModel {
  provider: string
  name: string
}

export interface AgentAvatarView { media_type: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'; base64: string }
export interface AgentAvatarUpload extends AgentAvatarView { agent_id: string }
export const AGENT_AVATAR_MAX_BYTES = 2 * 1024 * 1024

export interface AgentView {
  origin?: string
  id: string
  name: string
  name_zh: string
  name_en: string
  avatar: string
  description: string
  description_zh: string
  soul: string
  model: AgentModel | null
  tools: string[]
  skills: string[]
  mcps: string[]
  plugins: string[]
  permissions: Record<string, unknown>
  metadata: Record<string, unknown>
  is_default: boolean
  available: boolean
  unavailable_reason: string
}

export interface MCPServerToolView {
  id: string
  name: string
  display_name: string
}

export interface MCPServerView {
  id: string
  display_name: string
  command: string
  kind: 'mcp'
  /** Runtime 上报的原始 status（healthy/unhealthy/preparing/…），兼容用。 */
  status: string
  /**
   * 生命周期，所有界面共用一套词：not_loaded | preparing | ready |
   * degraded | failed | stopped | unknown。只显示 status 时，用户盯着
   * `preparing`/`not_loaded` 看不出到底在干什么。
   */
  state?: string
  /** `state=preparing` 时是 installing 或 starting，其余为空。 */
  phase?: string
  /** 是否已经握手、工具可调用。 */
  ready?: boolean
  /** 已发布的工具数；没握手前是 0。 */
  tools_count?: number
  /** 未就绪的原因原文（准备失败等），进度类解释由 UI 按 state/phase 本地化。 */
  detail?: string
  transport: string
  tools: MCPServerToolView[]
  source_kind: string
  owner_plugin_id: string | null
  removable: boolean
  health_checked_at: string | null
}

export interface CapabilityView {
  id: string
  enabled?: boolean
  origin?: string
  plugin_id?: string
  assignable?: boolean
  /** Runtime 配置里的默认能力：每个专家都强制启用，界面不能取消。 */
  preset?: boolean
  unavailable_reason?: string
  name?: string
  display_name?: string
  description?: string
  /**
   * Power 格式 v2 的展示字段（`name_zh` / `name_en` / `description_zh`）。
   * 只用于显示，`name` 仍是提交给 Run 的调用名；缺失时回退到 `name`。
   */
  name_zh?: string | null
  name_en?: string | null
  description_zh?: string | null
  /** Runtime-owned tools ship a short intro per language, e.g. { zh, en }. */
  summaries?: Record<string, string>
  owner_plugin_id?: string | null
  source_kind?: string
  metadata?: Record<string, unknown>
  [key: string]: unknown
}

export interface PackageView {
  id: string
  kind?: string
  version?: string
  path?: string
  installed_at?: string | null
  owner_plugin_id?: string | null
  status?: string
  digest?: string
  [key: string]: unknown
}

export interface PluginView {
  id: string
  name?: string
  version?: string
  enabled?: boolean
  active?: boolean
  path?: string
  members?: Array<string | { id?: string; kind?: string; name?: string }>
  status?: string
  [key: string]: unknown
}

export interface ExecutionView {
  state?: string
  instance_id: string
  agent_id?: string
  status?: string
  pid?: number | null
  started_at?: string | null
  updated_at?: string | null
  sandboxed?: boolean
  policy_digest?: string | null
  [key: string]: unknown
}

export interface AgentTopSummary {
  agents: number
  available_agents: number
  sessions: number
  runs: number
  active_runs: number
  waiting_runs: number
  failed_runs: number
}
export interface AgentTopAgentView {
  id: string
  name: string
  name_zh: string
  avatar: string
  available: boolean
  status: 'running' | 'waiting' | 'idle' | 'unavailable'
  session_count: number
  run_count: number
  active_run_count: number
  failed_run_count: number
  last_active_at: number
}
export interface AgentTopRunView {
  id: string
  session_id: string
  session_title: string
  agent_id: string
  status: 'queued' | 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled'
  created_at: number
  updated_at: number
}
export interface AgentTopView {
  summary: AgentTopSummary
  agents: AgentTopAgentView[]
  recent_runs: AgentTopRunView[]
  server_time: number
}

export const SECURITY_SERVICE_ID = 'runtime-security'

export const SECURITY_OPS = {
  agentsList: 'agents.list.v1', agentGet: 'agents.get.v1', agentSuspend: 'agents.suspend.v1',
  securityModeGet: 'agents.security-mode.get.v1', securityModeUpdate: 'agents.security-mode.update.v1',
  capabilitiesCatalog: 'capabilities.catalog.v1', capabilitiesUpdate: 'capabilities.update.v1',
  permissionsGet: 'permissions.get.v1', permissionsSetGroup: 'permissions.set-group.v1',
  syscallCatalog: 'syscall-catalog.v1', syscallPolicyGet: 'syscall-policy.get.v1',
  syscallPolicyUpdate: 'syscall-policy.agent.update.v1', syscallPolicyReset: 'syscall-policy.agent.reset.v1',
  syscallAuditEvents: 'syscall-audit.events.v1', syscallAuditStatus: 'syscall-audit.status.v1',
  dlpMatrix: 'dlp.matrix.v1', dlpPolicyUpdate: 'dlp.policy.update.v1', dlpPolicyDelete: 'dlp.policy.delete.v1', dlpScan: 'dlp.scan.v1', dlpStats: 'dlp.stats.v1',
  auditQuery: 'audit.query.v1', auditVerify: 'audit.verify.v1',
} as const

export const SECURITY_MUTATION_OPS: ReadonlySet<string> = new Set([
  SECURITY_OPS.agentSuspend, SECURITY_OPS.securityModeUpdate,
  SECURITY_OPS.capabilitiesUpdate,
  SECURITY_OPS.dlpPolicyUpdate, SECURITY_OPS.dlpPolicyDelete,
  SECURITY_OPS.permissionsSetGroup,
  SECURITY_OPS.syscallPolicyUpdate, SECURITY_OPS.syscallPolicyReset,
])
export interface SecurityMutationReceipt { ok?: boolean }

export interface SecurityAgentSummary { agent_id: string; name?: string; version?: string; status?: string; capability_count?: number; last_seen?: string; installed_at?: string }
export type SecurityPolicy = 'allow' | 'ask' | 'deny'
export interface SecurityCapability { tool: string; policy: SecurityPolicy; framework?: string; summary?: string }
export interface SecurityAgentDetail extends SecurityAgentSummary { capabilities?: SecurityCapability[] }
export interface SecurityAuditRecord { seq?: number; ts?: string; op_type?: string; target?: string; result?: string }
export const SECURITY_AUDIT_PAGE_SIZE = 100
export type SecurityAuditFilter = 'all' | 'hook' | 'deny'
export interface SecurityAuditQuery {
  agent_id: string
  filter: SecurityAuditFilter
  limit: number
  cursor: number
  snapshot_seq?: number
}
export interface SecurityAuditPage {
  records: SecurityAuditRecord[]
  snapshot_seq: number
  has_more: boolean
  next_cursor: number | null
}
export interface SecurityDlpRow { pii_type: string; action: 'allow' | 'ask' | 'deny' | 'mask'; source?: string }
/**
 * 安全权限设置：能力管理决定「这个 tool 能不能调」；这里决定「调用之后能碰
 * 什么」。可读 / 可写都是「包含 + 排除」两段式，网络访问范围单独一段。
 * 执行模式不再是声明，而是由这些设置推导出来。
 */
export interface SecuritySyscallEntry { name?: string; syscall?: string; number?: number; description?: string; reason?: string; dangerous?: boolean }
export interface SecuritySyscallCatalog { syscalls: SecuritySyscallEntry[] }
export interface SecuritySyscallAuditEvent { ts?: string; worker_agent_id?: string; agent_id?: string; syscall?: string; number?: number; pid?: number; backend?: string; action?: string }
export interface SecuritySyscallAuditPage { events?: SecuritySyscallAuditEvent[]; records?: SecuritySyscallAuditEvent[] }
export interface SecuritySyscallSelection {
  arch?: string
  agent_additions?: string[]
  policy_version?: number
  applied_policy_version?: number
  pending_restart?: boolean
}
/** 可读 / 可写范围是「包含 + 排除」两段式：包含项列出允许触碰的目录，
 * 排除项从其中挖掉子目录。可读排除＝完全不可见，可写排除＝仍可读但不可写。 */
export interface SecurityScope {
  include: string[]
  exclude: string[]
}
/** 执行模式由 securityd 从安全设置推导：声明了任何一项就走 sandbox，否则 host。 */
export interface SecurityExecutionMode {
  mode: 'host' | 'sandbox'
  reasons?: string[]
}
export interface SecurityPermissionSettings {
  agent_id?: string
  read: SecurityScope
  write: SecurityScope
  network: { mode: SecurityNetworkPolicy['mode']; domains: string[]; version?: number }
  syscall: SecuritySyscallSelection
  execution_mode?: SecurityExecutionMode
}
export type SecurityPermissionGroup = 'read' | 'write' | 'network'

export interface SecurityNetworkPolicy {
  mode: 'allow_all' | 'whitelist' | 'deny_all' | 'learning'
  domains: string[]
  apply?: { effective?: boolean; restart_required?: boolean; active_instances?: number; failed_instances?: number }
}


/**
 * Read-only report of the on-device models. The Runtime only relays what
 * `spacemit-ai-gateway` publishes through bibit-intent, so there is no action
 * to download, load or unload a model here.
 */
export interface LocalModelsView {
  source?: string
  read_only?: boolean
  models: Array<{
    model_type: 'llm' | 'embed'
    name: string
    artifact?: string | null
    backend?: string
    port?: number | null
    path?: string | null
    registered?: boolean
    download: { status: string; progress: number }
    server: { status: string; managed?: boolean }
  }>
}

export interface RuntimeWorkerView {
  agent_id: string
  state: string
  instance_id?: string
  pid?: number | null
  effective_mode?: string | null
  backend?: string | null
  sandboxed?: boolean
  generation_id?: number | null
  catalog_stale?: boolean
  error?: string | null
}
export interface RuntimeWorkersView {
  control: { pid?: number; state?: string; control_ready?: boolean; effective_mode?: string; backend?: string; sandboxed?: boolean }
  worker_count: number
  workers: RuntimeWorkerView[]
}
