import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useFeatureCapability, type FeatureSettingsProps } from '@bibit/feature-sdk'
import './security-runtime.css'
import { SecurityInventory, SecurityCapabilities, SecurityPermissions, SecuritySyscalls, SecurityDlp, SecurityAudit } from './RuntimeSecurityControls'
import { SECURITY_MUTATION_OPS, type SecurityMutationReceipt, SECURITY_OPS, SECURITY_SERVICE_ID, SECURITY_CAPABILITY, type SecurityAgentSummary } from './runtime-contracts'
import { RuntimeI18nProvider, useRuntimeI18n, type RuntimeTranslate } from './runtime-i18n'

type Tab = 'agents' | 'capabilities' | 'permissions' | 'syscalls' | 'dlp' | 'audit'
type SecurityService = { request<T>(input: { serviceId: typeof SECURITY_SERVICE_ID; operationId: string; params: Readonly<Record<string, unknown>> }): Promise<T> }

export function RuntimeSecurityPage(props: FeatureSettingsProps) {
  return <RuntimeI18nProvider language={props.language}><SecurityPage /></RuntimeI18nProvider>
}

function SecurityPage() {
  const t = useRuntimeI18n()
  const service = useFeatureCapability(SECURITY_CAPABILITY) as SecurityService | undefined
  const request = useCallback(<T,>(operationId: string, params: Record<string, unknown> = {}) => service
    ? service.request<T>({ serviceId: SECURITY_SERVICE_ID, operationId, params }).then(result => {
      if (SECURITY_MUTATION_OPS.has(operationId) && (result === false || (result as SecurityMutationReceipt | null)?.ok === false)) throw new Error(t('安全服务拒绝执行此操作。'))
      return result
    })
    : Promise.reject(new Error(t('宿主未提供 Security 服务能力，请检查插件授权配置并重启 Bi-bit。'))), [service, t])
  const [agents, setAgents] = useState<SecurityAgentSummary[]>([])
  const [agentId, setAgentId] = useState('')
  const [tab, setTab] = useState<Tab>('agents')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const [revision, setRevision] = useState(0)
  const refreshAgents = useCallback(async () => {
    setBusy(true); setError('')
    try { const result = await request<{ agents?: SecurityAgentSummary[] }>(SECURITY_OPS.agentsList); const next = result.agents ?? []; setAgents(next); setRevision(value => value + 1); setAgentId((current) => next.some((a) => a.agent_id === current) ? current : next[0]?.agent_id ?? '') }
    catch (reason) { setAgents([]); setError(messageOf(reason, t('无法连接 securityd。'))) }
    finally { setBusy(false) }
  }, [request, t])
  useEffect(() => { void refreshAgents() }, [refreshAgents])
  return <section className="runtime-security">
    <header className="runtime-security-header"><div><p className="runtime-eyebrow">SECURITYD</p><h2>{t('安全控制中心')}</h2><p>{t('管理系统调用、Agent 权限、敏感数据策略、审计和运行边界。')}</p></div><div className="runtime-security-actions"><span className={`runtime-state ${service && !error ? 'is-online' : 'is-offline'}`}><i />{!service ? t('宿主能力未提供') : busy ? t('连接中') : service && !error ? t('securityd 已连接') : t('securityd 不可用')}</span><button className="runtime-button runtime-button-secondary" onClick={() => void refreshAgents()} disabled={busy}>{t('刷新')}</button></div></header>
    {error && <Notice kind="error">{error} {service && t('请检查 Bibit 服务授权和 Runtime 安全桥接连接后重试。')}</Notice>}
    <div className="runtime-security-context"><label>{t('当前 Agent')}<select value={agentId} onChange={(event) => setAgentId(event.target.value)} disabled={!agents.length}>{agents.length ? agents.map((agent) => <option key={agent.agent_id} value={agent.agent_id}>{agent.name || agent.agent_id}</option>) : <option value="">{t('暂无可用 Agent')}</option>}</select></label><span>{t('切换 Agent 以查看和配置对应的安全策略。')}</span></div>
    <nav className="runtime-tabs" aria-label={t('安全设置')}>{([['agents', 'Agent'], ['capabilities', t('能力管理')], ['permissions', t('安全权限设置')], ['syscalls', t('系统调用黑名单')], ['dlp', 'DLP / PII'], ['audit', t('审计')]] as const).map(([id, label]) => <button key={id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}</button>)}</nav>
    {!error && !busy && !agentId ? <Notice>{t('securityd 未返回已注册 Agent。')}</Notice> : null}
    {!error && tab === 'agents' && <SecurityInventory agents={agents} request={request} refresh={refreshAgents} inspect={id => { setAgentId(id); setTab('capabilities') }} />}
        {!error && agentId && tab === 'capabilities' && <SecurityCapabilities key={`${agentId}:${revision}`} agentId={agentId} request={request} />}
    {!error && agentId && tab === 'permissions' && <SecurityPermissions key={`${agentId}:${revision}`} agentId={agentId} request={request} />}
    {!error && agentId && tab === 'syscalls' && <SecuritySyscalls key={`${agentId}:${revision}`} agentId={agentId} request={request} />}
    {!error && agentId && tab === 'dlp' && <SecurityDlp key={`${agentId}:${revision}`} agentId={agentId} request={request} />}
    {!error && agentId && tab === 'audit' && <SecurityAudit key={`${agentId}:${revision}`} agentId={agentId} request={request} />}
      </section>
}

type Request = <T>(operationId: string, params?: Record<string, unknown>) => Promise<T>
function Notice({ children, kind = 'normal' }: { children: ReactNode; kind?: 'normal' | 'error' }) { return <div role={kind === 'error' ? 'alert' : undefined} className={`runtime-panel runtime-security-notice ${kind === 'error' ? 'runtime-panel-error' : ''}`}>{children}</div> }
function messageOf(reason: unknown, fallback: string) { return reason instanceof Error ? reason.message : fallback }
