import { CREATE_CONVERSATION_ACTION, HOST_ACTIONS_CAPABILITY, RUNTIME_AGENT_RESOURCE } from './runtime-contracts'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFeatureHostApi, type FeatureSettingsProps } from '@bibit/feature-sdk'
import type { FeatureHostCapability } from '@bibit/feature-contracts'
import './runtime.css'
import { AgentTopContent, RuntimeStatusContent, LogsContent } from './RuntimeMonitorPages'
import { RuntimeLocalModels } from './RuntimeLocalModels'
import { RuntimeExperts } from './RuntimeExperts'
import { RuntimeProviders } from './RuntimeProviders'
import { RuntimeCatalog } from './RuntimeCatalog'
import { RuntimeMcpContent, RuntimePluginsContent } from './RuntimeResourcePages'
import type { LocalModelsView } from './runtime-contracts'
import { RuntimeI18nProvider, mcpServerState, useRuntimeI18n } from './runtime-i18n'
import { serviceFailureText } from './runtime-service-errors'
import {
  RUNTIME_OPS,
  RUNTIME_SERVICE_ID,
  RUNTIME_CAPABILITY,
  runtimeRequestTimeoutMs,
  type RuntimeWorkersView,
  type AgentTopView,
  type AgentView,
  type CatalogKind,
  type CapabilityView,
  type MCPServerView,
  type PluginView,
  type ProviderView,
  type RuntimeStatus,
} from './runtime-contracts'

type RuntimeService = {
  request<TResult = unknown>(input: {
    serviceId: typeof RUNTIME_SERVICE_ID
    operationId: string
    params: Readonly<Record<string, unknown>>
    timeoutMs?: number
  }): Promise<TResult>
}

type RuntimeData = {
  status?: RuntimeStatus
  providers: ProviderView[]
  agents: AgentView[]
  capabilities: Record<CatalogKind, CapabilityView[]>
  mcps: MCPServerView[]
  plugins: PluginView[]
  agentTop?: AgentTopView
  logs: string
  localModels?: LocalModelsView
  workers?: RuntimeWorkersView
}


const emptyData: RuntimeData = {
  providers: [],
  agents: [],
  capabilities: { tool: [], skill: [] },
  mcps: [],
  plugins: [],
  logs: '',
}

const pageTitleSources: Record<string, string> = {
  agents: '专家', providers: '服务商', 'bibit-models': '本地模型', tools: '工具', mcp: 'MCP', skills: '技能', plugins: '插件', security: '安全', 'agent-top': 'Agent Top', 'runtime-status': 'Runtime 状态', logs: '日志',
}

function useRuntimeService() {
  const t = useRuntimeI18n()
  const host = useFeatureHostApi()
  const service = host.getCapability(RUNTIME_CAPABILITY as FeatureHostCapability) as RuntimeService | undefined
  const request = useCallback(<T,>(operationId: string, params: Record<string, unknown> = {}) => {
    if (!service) return Promise.reject(new Error(t('宿主未提供 Runtime 服务能力，请检查插件授权配置并重启 Bi-bit。')))
    // 目录变更会重建 Worker generation（每台 MCP 都要重启），30s 的宿主默认预算
    // 会把「已经成功、只是还没做完」的变更报成超时；读操作用默认值即可。
    return service.request<T>({
      serviceId: RUNTIME_SERVICE_ID,
      operationId,
      params,
      timeoutMs: runtimeRequestTimeoutMs(operationId),
    })
  }, [service, t])
  return { service, request }
}

/**
 * Turns the host's conversation action into the callable the experts page uses.
 * A missing capability or a refused expert is reported to the caller so the
 * page can show why, instead of silently doing nothing.
 */
function useStartExpertConversation() {
  const t = useRuntimeI18n()
  const host = useFeatureHostApi()
  const actions = host.getCapability(HOST_ACTIONS_CAPABILITY)
  return useMemo(() => {
    if (!actions) return undefined
    return async (agentId: string) => {
      const outcome = await actions.invoke(CREATE_CONVERSATION_ACTION, {
        target: { ...RUNTIME_AGENT_RESOURCE, id: agentId },
      })
      if (outcome.status === 'completed') return
      throw new Error(outcome.status === 'rejected' ? outcome.error.message : t('新建会话已取消。'))
    }
  }, [actions, t])
}

export function RuntimeSettingsPage(props: FeatureSettingsProps) {
  return <RuntimeI18nProvider language={props.language}><RuntimePage key={props.contributionId} {...props} /></RuntimeI18nProvider>
}

function RuntimePage({ contributionId: tab }: FeatureSettingsProps) {
  const t = useRuntimeI18n()
  const { service, request } = useRuntimeService()
  const startConversation = useStartExpertConversation()
  const sequence = useRef(0)
  const refreshing = useRef<Promise<void> | null>(null)
  const alive = useRef(true)
  const modelPollMs = useRef(3000)
  const title = t(pageTitleSources[tab] ?? 'Runtime')
  const [data, setData] = useState<RuntimeData>(emptyData)
  const [error, setError] = useState('')
  const [edgeError, setEdgeError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [hasData, setHasData] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  // 轮询判定放在 ref 里：effect 只依赖 [refresh, tab]，直接读 data 会一直看到
  // 挂载时的那份快照。
  const mcpPreparing = useRef(false)
  // 增删 MCP 之后 Worker 还要重建 Generation 才会发布，那几秒里新 Server 仍是
  // 未加载：刚动过目录的这一小段时间也要接着看，否则装完立刻刷新只会看到
  // 「未加载」，用户又得自己反复点。
  const mcpSettlingUntil = useRef(0)
  // 轮询链是在 effect 里自己接下去的：动作结束后也得能把它接回来，否则一次
  // 增删之后的等待就再没人看着了。
  const rearmPoll = useRef<() => void>(() => undefined)

  const refresh = useCallback(async (background = false, propagateError = false): Promise<void> => {
    while (refreshing.current) { await refreshing.current; if (background) return }
    if (!alive.current) return
    let finish: () => void = () => undefined
    refreshing.current = new Promise<void>(resolve => { finish = resolve })
    if (!background) setLoading(true)
    if (!background) setError('')
    const current = ++sequence.current
    try {
      const next: RuntimeData = { ...emptyData }
      const loadProviders = async () => { next.providers = (await request<{ providers: ProviderView[] }>(RUNTIME_OPS.providersList)).providers ?? [] }
      const loadAgents = async () => { next.agents = (await request<{ agents: AgentView[] }>(RUNTIME_OPS.agentsList)).agents ?? [] }
      switch (tab) {
        case 'agents':
          await loadAgents(); break
        case 'providers':
          // The Provider editor has to name the Experts that still use a
          // Provider: the host client drops the Runtime's own refusal text.
          await Promise.all([loadProviders(), loadAgents()]); break
        case 'bibit-models': {
          try {
            const descriptor = await request<LocalModelsView>(RUNTIME_OPS.localModelsGet)
            if (!Array.isArray(descriptor.models)) throw new Error(t('本地模型服务未返回有效模型列表'))
            next.localModels = descriptor
            if (sequence.current === current) setEdgeError('')
            modelPollMs.current = descriptor.models.some(model => ['pending', 'downloading'].includes(model.download.status) || model.server.status === 'starting') ? 1000 : 3000
          } catch (reason) {
            // 读不到本地模型状态不等于 Runtime 不可用：单独提示，不影响对话。
            modelPollMs.current = 3000
            if (sequence.current === current) setEdgeError(reason instanceof Error ? serviceFailureText(reason, t) : t('本地模型状态不可用'))
          }
          break
        }
        case 'tools': case 'skills': {
          const kind: CatalogKind = tab === 'skills' ? 'skill' : 'tool'
          next.capabilities = { ...next.capabilities, [kind]: ((await request<{ capabilities: CapabilityView[] }>(RUNTIME_OPS.capabilitiesList, { kind })).capabilities ?? []).filter(item => !item.plugin_id) }; break
        }
        case 'mcp':
          // 保留完整清单：MCP 页自己过滤插件成员，并说明它们去哪儿了。
          next.mcps = (await request<{ mcps: MCPServerView[] }>(RUNTIME_OPS.mcpsList)).mcps ?? []
          break
        case 'plugins':
          next.plugins = (await request<{ plugins: PluginView[] }>(RUNTIME_OPS.pluginsList)).plugins ?? []
          // 插件自带的 MCP 的实时状态挂回插件卡片，靠 owner_plugin_id 关联。这份
          // 快照拿不到只是状态退化成 unknown，不该把插件清单一起带下水。
          next.mcps = await request<{ mcps: MCPServerView[] }>(RUNTIME_OPS.mcpsList)
            .then(result => result.mcps ?? [])
            .catch(() => [])
          break
        case 'agent-top': next.agentTop = await request<AgentTopView>(RUNTIME_OPS.agentTopGet); break
        case 'runtime-status':
          await Promise.all([(async () => { next.workers = await request<RuntimeWorkersView>(RUNTIME_OPS.workersGet) })(), (async () => { next.status = await request<RuntimeStatus>(RUNTIME_OPS.statusGet) })()]); break
        case 'logs': {
          const result = await request<{ text?: string } | string>(RUNTIME_OPS.logsGet)
          next.logs = typeof result === 'string' ? result : result.text ?? ''
          break
        }
        default: throw new Error(t('未知 Runtime 设置页面'))
      }
      if (sequence.current === current) { setData(next); setHasData(true); setError('') }
    } catch (reason) {
      if (propagateError) throw reason
      if (sequence.current === current) setError(reason instanceof Error ? serviceFailureText(reason, t) : t('Runtime 服务不可用。'))
    } finally {
      refreshing.current = null
      finish()
      if (sequence.current === current) setLoading(false)
    }
  }, [request, tab, t])

  useEffect(() => {
    mcpPreparing.current = data.mcps.some(server => mcpServerState(server) === 'preparing')
  }, [data.mcps])

  useEffect(() => {
    alive.current = true
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined
    // MCP 页平时不轮询，但「准备中」是要看的：首次启动要下载 npm 包，几分钟里
    // 状态和 phase 都会变，用户不该为了看到变化反复点刷新。
    const interval = () => tab === 'bibit-models' ? modelPollMs.current : ['agent-top', 'runtime-status', 'logs'].includes(tab) ? 3000 : tab === 'mcp' && (mcpPreparing.current || Date.now() < mcpSettlingUntil.current) ? 3000 : undefined
    const load = async (background = false) => {
      await refresh(background)
      const delay = interval()
      if (!stopped && delay) timer = setTimeout(() => { void load(true) }, delay)
    }
    rearmPoll.current = () => {
      if (stopped) return
      clearTimeout(timer)
      const delay = interval()
      if (delay) timer = setTimeout(() => { void load(true) }, delay)
    }
    void load()
    return () => { stopped = true; alive.current = false; clearTimeout(timer); sequence.current += 1; rearmPoll.current = () => undefined }
  }, [refresh, tab])

  // MCP 和插件页显示的 MCP 状态是有生命周期的：只重新读一遍目录，不会让一台
  // 准备失败或卡住的 Server 再试一次，只有健康检查会。所以这两个页面的「刷新」
  // 两件事一起做，而不是再放第二个刷新按钮让用户猜哪个管用。
  const headerRefresh = useCallback(async () => {
    if (tab === 'mcp' || tab === 'plugins') {
      try {
        await request(RUNTIME_OPS.mcpsRefresh)
      } catch {
        // 健康检查失败不该挡住这次读取：refresh() 仍会给出目录里的最新状态。
      }
    }
    await refresh()
  }, [refresh, request, tab])

  const runAction = useCallback(async (label: string, action: () => Promise<unknown>) => {
    setMessage('')
    setError('')
    setActionBusy(true)
    // MCP 页上的动作只有安装和卸载，两个都改了 Worker 要发布的东西。
    if (tab === 'mcp') mcpSettlingUntil.current = Date.now() + 90000
    let failure: unknown
    try {
      await action()
    } catch (reason) {
      failure = reason
    }
    // 宿主报超时不等于 Runtime 没做成：目录变更在服务端还会继续跑完。先重新读一遍
    // 目录再报结果，否则页面停在动作前的快照上，用户只能手动点「刷新」。
    await refresh()
    setMessage(failure ? '' : t('{action} 已完成', { action: label }))
    if (failure) setError(serviceFailureText(failure, t))
    setActionBusy(false)
    rearmPoll.current()
  }, [refresh, t, tab])

  const connected = Boolean(service && !error && !loading)
  return <section className={`runtime-settings runtime-console runtime-console-${tab}`}>
    {!(tab === 'agents' && hasData) && <header className="runtime-header">
      <div>
        <h2>{title}</h2>

      </div>
      <div className="runtime-header-actions">
        <span className={`runtime-state ${connected ? 'is-online' : 'is-offline'}`}><i />{t(!service ? '宿主能力未提供' : connected ? 'Runtime 已连接' : loading ? '连接中' : 'Runtime 不可用')}</span>
        <button className="runtime-button runtime-button-secondary" type="button" onClick={() => void headerRefresh()} disabled={loading}>{t(loading ? '刷新中' : '刷新')}</button>
      </div>
    </header>}

    {error ? <Panel kind="error">{error}</Panel> : null}
    {message ? <Panel kind="success">{message}</Panel> : null}
    {loading ? <Panel>{t('正在加载 Runtime 数据')}</Panel> : null}

    {hasData && <fieldset className="runtime-content" disabled={loading || actionBusy}>
      {tab === 'agents' && <RuntimeExperts startConversation={startConversation} agents={data.agents} request={request} onChanged={() => refresh(false, true)} status={<span className={`runtime-state ${connected ? 'is-online' : 'is-offline'}`}><i />{t(connected ? 'Runtime 已连接' : 'Runtime 不可用')}</span>} />}
      {tab === 'providers' && <RuntimeProviders providers={data.providers} agents={data.agents} request={request} onChanged={refresh} />}
      {tab === 'bibit-models' && (data.localModels
        ? <RuntimeLocalModels descriptor={data.localModels} />
        : edgeError ? <LocalModelsUnavailable message={edgeError} onRetry={() => { void refresh() }} /> : null)}
      {(['tools', 'skills'] as string[]).includes(tab) && <RuntimeCatalog items={data.capabilities[tab === 'skills' ? 'skill' : 'tool']} kind={tab === 'skills' ? 'skill' : 'tool'} />}
      {tab === 'mcp' && <RuntimeMcpContent mcps={data.mcps} request={request} runAction={runAction} />}
      {tab === 'plugins' && <RuntimePluginsContent plugins={data.plugins} mcps={data.mcps} request={request} runAction={runAction} />}
      {tab === 'runtime-status' && <RuntimeStatusContent workers={data.workers!} status={data.status!} />}
      {tab === 'agent-top' && <AgentTopContent data={data.agentTop!} request={request} />}
      {tab === 'logs' && <LogsContent text={data.logs} />}
    </fieldset>}
  </section>
}

function LocalModelsUnavailable({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useRuntimeI18n()
  return <Panel kind="error">
    <strong>{t('本地模型状态不可用')}</strong>
    <p>{t('设备上的本地模型由 AI Gateway 提供。请确认 AI Gateway（127.0.0.1:18790）或 Bibit Intent 服务（127.0.0.1:8765）已启动，然后重试；读取失败不影响对话。')}</p>
    {message ? <p>{message}</p> : null}
    <button className="runtime-button runtime-button-secondary" type="button" onClick={onRetry}>{t('重试')}</button>
  </Panel>
}

function Panel({ children, kind = 'normal' }: { children: ReactNode; kind?: 'normal' | 'error' | 'success' }) {
  return <div role={kind === 'error' ? 'alert' : undefined} className={`runtime-panel runtime-panel-${kind}`}>{children}</div>
}
