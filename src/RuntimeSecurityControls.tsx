import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { RuntimeTranslate } from './runtime-i18n'
import { SECURITY_OPS, type SecurityAgentDetail, type SecurityAgentSummary, type SecurityCapability, type SecurityDlpRow, type SecurityAuditRecord, type SecurityPermissionGroup, type SecurityPermissionSettings, type SecurityScope, type SecuritySyscallCatalog, type SecuritySyscallSelection, type SecuritySyscallAuditPage } from './runtime-contracts'
import { useRuntimeI18n } from './runtime-i18n'
import { formatSecurityActivity, securityClockTime } from './runtime-security-time'
import { RuntimeDialog } from './RuntimeDialog'
import { SECURITY_AUDIT_PAGE_SIZE, type SecurityAuditFilter, type SecurityAuditPage, type SecurityAuditQuery } from './runtime-contracts'

type Request = <T>(operation: string, params?: Record<string, unknown>) => Promise<T>
type Context = { agentId: string; request: Request }
function message(reason: unknown) { return reason instanceof Error ? reason.message : String(reason) }
function ErrorNotice({ error }: { error: string }) { return error ? <p className="runtime-panel runtime-panel-error" role="alert">{error}</p> : null }
function Table({ headings, children }: { headings: string[]; children: ReactNode }) {
  return <div className="runtime-table-wrap"><table className="runtime-table"><thead><tr>{headings.map(heading => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
}
function useResource<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const sequence = useRef(0)
  const load = useCallback(async () => {
    const current = ++sequence.current
    setLoading(true); setError('')
    try { const value = await loader(); if (sequence.current === current) setData(value) } catch (reason) { if (sequence.current === current) setError(message(reason)) }
    finally { if (sequence.current === current) setLoading(false) }
  }, [loader])
  useEffect(() => { void load(); return () => { sequence.current += 1 } }, [load])
  const mutate = async (action: () => Promise<unknown>) => {
    if (busy) return false
    setBusy(true); setError('')
    try { await action(); await load(); return true }
    catch (reason) { setError(message(reason)); return false }
    finally { setBusy(false) }
  }
  return { data, error, setError, loading, busy, load, mutate }
}

// 最近活动列：securityd 下发 UTC，这里按浏览器本地时区显示；没有活动证据时明确写
// 「暂无活动」，安装时间只放进悬浮提示——拿安装时间顶替活动时间会让用户对不上。
function SecurityActivityCell({ agent, t }: { agent: SecurityAgentSummary; t: RuntimeTranslate }) {
  const activity = formatSecurityActivity(agent.last_seen, t)
  if (activity) return <>{activity}</>
  const installed = securityClockTime(agent.installed_at)
  return <span className="runtime-muted" title={installed ? t('安装于 {time}', { time: installed }) : undefined}>{t('暂无活动')}</span>
}

export function SecurityInventory({ agents, request, refresh, inspect }: { agents: SecurityAgentSummary[]; request: Request; refresh: () => Promise<void>; inspect: (id: string) => void }) {
  const t = useRuntimeI18n()
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [notice, setNotice] = useState(false)
  const suspend = async (id: string) => {
    setBusy(true); setError(''); setNotice(false)
    try { await request(SECURITY_OPS.agentSuspend, { agent_id: id }); setNotice(true); await refresh() }
    catch (reason) { setError(message(reason)) } finally { setBusy(false) }
  }
  return <section className="runtime-panel"><div className="runtime-panel-heading"><div><span className="runtime-eyebrow">RUNTIME INVENTORY</span><h3>{t('已注册 Agent')}</h3><p>{t('查看身份、版本、状态和能力数量。')}</p></div><button className="runtime-button runtime-button-secondary" onClick={() => void refresh()} disabled={busy}>{t('刷新')}</button></div><ErrorNotice error={error} /><p>{t('仅记录审计并发送暂停请求，不会停止 Agent 执行。')}</p>{notice && <p role="status">{t('暂停请求已发送。Agent 未停止，仍可能继续执行。')}</p>}<Table headings={['Agent', t('版本'), t('状态'), t('能力数'), t('最近活动'), t('操作')]}>{agents.map(agent => <tr key={agent.agent_id}><td><strong>{agent.name || agent.agent_id}</strong><small className="runtime-table-sub">{agent.agent_id}</small></td><td>{agent.version || '-'}</td><td>{agent.status || 'active'}</td><td>{agent.capability_count || 0}</td><td><SecurityActivityCell agent={agent} t={t} /></td><td><button disabled={busy} className="runtime-link" onClick={() => inspect(agent.agent_id)}>{t('查看')}</button><button disabled={busy} className="runtime-link-danger" onClick={() => void suspend(agent.agent_id)}>{t('发送暂停请求')}</button></td></tr>)}</Table></section>
}

export function SecurityCapabilities({ agentId, request }: Context) {
  const t = useRuntimeI18n()
  const loader = useCallback(async () => {
    const [detail, mode, catalog] = await Promise.all([
      request<SecurityAgentDetail>(SECURITY_OPS.agentGet, { agent_id: agentId }),
      request<{ mode?: string }>(SECURITY_OPS.securityModeGet, { agent_id: agentId }),
      request<{ capabilities?: SecurityCapability[] }>(SECURITY_OPS.capabilitiesCatalog, { agent_id: agentId }),
    ])
    return { detail, mode: mode.mode || 'normal', catalog: catalog.capabilities || [] }
  }, [agentId, request])
  const state = useResource(loader)
  const [draft, setDraft] = useState<SecurityCapability>()
  const caps = state.data?.detail.capabilities || []
  const catalog = [...new Map([...caps, ...(state.data?.catalog || [])].map(cap => [cap.tool, cap])).values()]
  const disabled = state.loading || state.busy || !state.data
  const mode = state.data?.mode || 'normal'
  const open = (cap?: SecurityCapability) => setDraft(cap ? { ...cap } : { tool: '', policy: 'allow', framework: '' })
  const policyCounts = ['allow', 'ask', 'deny'].map(policy => `${caps.filter(cap => cap.policy === policy).length} ${policy}`).join(' · ')
  return <section className="runtime-panel"><div className="runtime-panel-heading"><div><span className="runtime-eyebrow">POLICY CONTROL</span><h3>{t('能力管理')}</h3><p>{t('每个工具一条策略：allow 放行 / ask 确认 / deny 拒绝。')}</p></div><div className="runtime-header-actions"><span className="runtime-pill">{policyCounts}</span><button disabled={disabled} className="runtime-button" onClick={() => open()}>{t('新增工具策略')}</button></div></div>
    <ErrorNotice error={state.error} />
    <div className="runtime-security-mode"><div><h4>{t('Agent 安全模式')} · {t(mode === 'yolo' ? 'YOLO · 高风险' : '标准模式')}</h4><p>{t(mode === 'yolo' ? '工具默认放行；跳过 DLP 扫描、网络限制与审批；保留审计记录。' : '按每个工具的 allow / ask / deny 策略执行。')}</p></div><button disabled={disabled} className="runtime-button runtime-button-secondary" onClick={() => void state.mutate(() => request(SECURITY_OPS.securityModeUpdate, { agent_id: agentId, mode: mode === 'yolo' ? 'normal' : 'yolo' }))}>{t(mode === 'yolo' ? '关闭 YOLO' : '启用 YOLO')}</button></div>
    <Table headings={[t('工具'), t('策略'), t('框架'), t('操作')]}>{caps.map(cap => <tr key={cap.tool}><td><strong>{cap.tool}</strong><small className="runtime-table-sub">{cap.summary}</small></td><td><select disabled={disabled} aria-label={`${cap.tool} policy`} value={cap.policy} onChange={event => void state.mutate(() => request(SECURITY_OPS.capabilitiesUpdate, { agent_id: agentId, tool: cap.tool, policy: event.target.value, framework: cap.framework || '' }))}>{['allow','ask','deny'].map(policy => <option key={policy}>{policy}</option>)}</select></td><td>{cap.framework || '-'}</td><td><button disabled={disabled} className="runtime-link" onClick={() => open(cap)}>{t('编辑')}</button></td></tr>)}{!state.loading && caps.length === 0 && <tr><td colSpan={4}>{t('该 Agent 还没有工具策略。')}</td></tr>}</Table>
    {draft && <RuntimeDialog title={t('编辑工具策略')} onClose={() => { if (!state.busy) setDraft(undefined) }}><p>{t('当前 Agent')}: {agentId}</p><fieldset className="runtime-content runtime-resource-form runtime-capability-editor" disabled={state.busy}>
      <label>{t('工具名')}<input className="runtime-control" value={draft.tool} onChange={event => setDraft({ ...draft, tool: event.target.value })} list="runtime-security-tool-catalog" /><datalist id="runtime-security-tool-catalog">{catalog.map(cap => <option key={cap.tool} value={cap.tool} />)}</datalist></label>
      <label>{t('策略')}<select value={draft.policy} onChange={event => setDraft({ ...draft, policy: event.target.value as SecurityCapability['policy'] })}>{['allow','ask','deny'].map(policy => <option key={policy}>{policy}</option>)}</select></label>
      <small>{t('allow 放行、ask 调用前确认、deny 拒绝。未在目录中声明的工具按 unmapped 默认策略处置。')}</small>
      <ErrorNotice error={state.error} /><div className="runtime-dialog-actions"><button className="runtime-button runtime-button-secondary" onClick={() => setDraft(undefined)}>{t('取消')}</button><button className="runtime-button" disabled={!draft.tool.trim()} onClick={() => void state.mutate(() => request(SECURITY_OPS.capabilitiesUpdate, { agent_id: agentId, tool: draft.tool.trim(), policy: draft.policy, framework: draft.framework || '' })).then(saved => { if (saved) setDraft(undefined) })}>{t('保存策略')}</button></div>
    </fieldset></RuntimeDialog>}
  </section>
}

const lines = (value: string) => value.split('\n').map(item => item.trim()).filter(Boolean)
const scopeLines = (scope: SecurityScope | undefined) => (scope?.include || []).join('\n')
const excludeLines = (scope: SecurityScope | undefined) => (scope?.exclude || []).join('\n')

/** 安全权限设置独占一页：能力管理决定「这个 tool 能不能调」，这里决定
 * 「调用之后能碰什么」。可读/可写都是「包含 + 排除」两段式——可读排除＝完全
 * 不可见，可写排除＝仍可读但不可写。执行模式由 securityd 从这些设置推导。 */
export function SecurityPermissions({ agentId, request }: Context) {
  const t = useRuntimeI18n()
  const loader = useCallback(async () => request<SecurityPermissionSettings>(SECURITY_OPS.permissionsGet, { agent_id: agentId }), [agentId, request])
  const state = useResource(loader)
  const [readInclude, setReadInclude] = useState('')
  const [readExclude, setReadExclude] = useState('')
  const [writeInclude, setWriteInclude] = useState('')
  const [writeExclude, setWriteExclude] = useState('')
  const [networkDomains, setNetworkDomains] = useState('')
  const [loadedFor, setLoadedFor] = useState('')
  const settings = state.data
  // 服务端读到的设置只在切换 Agent 时回填一次，避免保存后覆盖正在编辑的输入。
  if (settings && loadedFor !== agentId) {
    setLoadedFor(agentId)
    setReadInclude(scopeLines(settings.read))
    setReadExclude(excludeLines(settings.read))
    setWriteInclude(scopeLines(settings.write))
    setWriteExclude(excludeLines(settings.write))
    setNetworkDomains((settings.network?.domains || []).join('\n'))
  }
  const disabled = state.loading || state.busy || !settings
  const saveGroup = (group: SecurityPermissionGroup, value: unknown) =>
    state.mutate(() => request(SECURITY_OPS.permissionsSetGroup, { agent_id: agentId, group, value }))
  const saveRead = () => void saveGroup('read', { include: lines(readInclude), exclude: lines(readExclude) })
  const saveWrite = () => void saveGroup('write', { include: lines(writeInclude), exclude: lines(writeExclude) })
  const saveNetwork = () => void state.mutate(() => request(SECURITY_OPS.permissionsSetGroup, {
    agent_id: agentId, group: 'network',
    mode: lines(networkDomains).length ? 'whitelist' : 'allow_all',
    domains: lines(networkDomains),
  }))
  const boundary = settings?.execution_mode
  const boundaryMode = boundary?.mode || 'host'
  const boundaryReasons = (boundary?.reasons || []).join(' / ')
  return <section className="runtime-panel">
    <div className="runtime-panel-heading"><div><span className="runtime-eyebrow">PERMISSION SCOPE</span><h3>{t('安全权限设置')}</h3><p>{t('能力管理决定「这个 tool 能不能调」；这里决定「调用之后能碰什么」。可读/可写都是「包含 + 排除」：包含项列出允许触碰的目录，排除项从其中挖掉子目录——可读排除＝完全不可见，可写排除＝仍可读但不可写。')}</p></div><span className="runtime-pill">{boundaryMode === 'sandbox' ? t('沙箱模式') : t('主机模式')}</span></div>
    <ErrorNotice error={state.error} />
    {state.loading && <p role="status">{t('正在加载安全权限设置')}</p>}
    <div className="runtime-security-mode"><div><h4>{t('执行模式')} · {boundaryMode === 'sandbox' ? t('沙箱模式') : t('主机模式')}</h4><p>{boundaryMode === 'sandbox'
      ? t('已声明 {reasons}，需要沙箱命名空间与 seccomp 落实；重启 Worker 后生效。', { reasons: boundaryReasons || t('安全设置') })
      : t('未声明额外安全设置，在宿主上以受约束的 systemd 单元运行。')}</p></div></div>
    <fieldset className="runtime-content" disabled={disabled}>
      <div className="runtime-form-grid">
        <label>{t('可读范围 · 包含')}<textarea className="runtime-control" rows={4} placeholder="/opt/data" value={readInclude} onChange={event => setReadInclude(event.target.value)} /></label>
        <label>{t('可读范围 · 排除')}<textarea className="runtime-control" rows={4} placeholder="/opt/data/secret" value={readExclude} onChange={event => setReadExclude(event.target.value)} /></label>
      </div>
      <small>{t('包含项每条一行；排除项从包含范围里挖掉，可读排除＝完全不可见。')}</small>
      <div className="runtime-header-actions"><button className="runtime-button" onClick={saveRead}>{t('保存可读范围')}</button></div>
      <div className="runtime-form-grid">
        <label>{t('可写范围 · 包含')}<textarea className="runtime-control" rows={4} placeholder="/var/lib/app" value={writeInclude} onChange={event => setWriteInclude(event.target.value)} /></label>
        <label>{t('可写范围 · 排除')}<textarea className="runtime-control" rows={4} placeholder="/var/lib/app/cache" value={writeExclude} onChange={event => setWriteExclude(event.target.value)} /></label>
      </div>
      <small>{t('排除项只收回写权限，目录仍可读。')}</small>
      <div className="runtime-header-actions"><button className="runtime-button" onClick={saveWrite}>{t('保存可写范围')}</button></div>
      <label htmlFor="runtime-security-network-domains">{t('网络访问范围')}</label>
      <span className="runtime-help">{t('当前模式：{mode}。填写域名后按白名单模式保存；留空表示允许全部。', { mode: t(settings?.network?.mode === 'whitelist' ? '白名单' : settings?.network?.mode === 'deny_all' ? '全部拒绝' : settings?.network?.mode === 'learning' ? '学习模式' : '允许全部') })}</span>
      <textarea id="runtime-security-network-domains" className="runtime-control" rows={4} placeholder="api.example.com" value={networkDomains} onChange={event => setNetworkDomains(event.target.value)} />
      <div className="runtime-header-actions"><button className="runtime-button" onClick={saveNetwork}>{t('保存网络范围')}</button></div>
    </fieldset>
  </section>
}

export function SecurityDlp({ agentId, request }: Context) {
  const t = useRuntimeI18n()
  const loader = useCallback(async () => {
    const [matrix, stats, mode] = await Promise.all([request<{ rows?: SecurityDlpRow[] }>(SECURITY_OPS.dlpMatrix, { agent_id: agentId }), request<{ total: number }>(SECURITY_OPS.dlpStats, { agent_id: agentId }), request<{ mode: string }>(SECURITY_OPS.securityModeGet, { agent_id: agentId })])
    return { rows: matrix.rows || [], total: stats.total, mode: mode.mode }
  }, [agentId, request])
  const state = useResource(loader)
  const [text, setText] = useState(''), [result, setResult] = useState(''), [scanning, setScanning] = useState(false)
  const scan = async () => {
    if (disabled || scanning) return
    setScanning(true); state.setError('')
    try { const r = await request<{ findings?: unknown[]; masked_text?: string }>(SECURITY_OPS.dlpScan, { agent_id: agentId, text }); setResult(t('发现 {count} 项；{text}', { count: r.findings?.length || 0, text: r.masked_text || '' })) }
    catch (reason) { state.setError(message(reason)) } finally { setScanning(false) }
  }
  const disabled = state.loading || state.busy || !state.data || state.data.mode === 'yolo'
  return <section className="runtime-panel"><div className="runtime-panel-heading"><div><span className="runtime-eyebrow">DATA PROTECTION</span><h3>{t('DLP / 个人信息策略')}</h3><p>{t('控制敏感数据的放行、记录、脱敏或拦截行为。')}</p></div><span className="runtime-pill">{state.data?.total || 0} {t('次干预')}</span></div><ErrorNotice error={state.error} />{state.data?.mode === 'yolo' && <p>{t('YOLO 不执行 DLP 扫描或检查；保留 normal 模式规则和审计记录。')}</p>}<Table headings={[t('PII 类型'),t('动作'),t('来源'),t('操作')]}>{(state.data?.rows || []).map(row => <tr key={row.pii_type}><td>{row.pii_type}</td><td>{t(row.action)}</td><td><select disabled={disabled} value={row.action} onChange={event => void state.mutate(() => request(SECURITY_OPS.dlpPolicyUpdate, { agent_id: agentId, pii_type: row.pii_type, action: event.target.value }))}>{['allow','ask','deny','mask'].map(action => <option key={action}>{action}</option>)}</select></td><td>{row.source || 'inherited'}</td><td><button disabled={disabled} className="runtime-link" onClick={() => void state.mutate(() => request(SECURITY_OPS.dlpPolicyDelete, { agent_id: agentId, pii_type: row.pii_type }))}>{t('恢复默认')}</button></td></tr>)}</Table><section className="runtime-subpanel runtime-security-scan"><h4>{t('DLP 文本试扫')}</h4><textarea disabled={disabled || scanning} className="runtime-control" value={text} onChange={event => setText(event.target.value)} placeholder={t('输入待检测文本')} /><button disabled={disabled || scanning} className="runtime-button" onClick={() => void scan()}>{t('扫描文本')}</button><p role="status">{result}</p></section></section>
}

export function SecurityAudit({ agentId, request }: Context) {
  const t = useRuntimeI18n()
  const [page, setPage] = useState<{ filter: SecurityAuditFilter; cursor: number; snapshot?: number; history: number[] }>({ filter: 'all', cursor: 0, history: [] })
  const [status, setStatus] = useState('未校验'), [verifying, setVerifying] = useState(false)
  const state = useResource(useCallback(async () => {
    const query: SecurityAuditQuery = { agent_id: agentId, filter: page.filter, limit: SECURITY_AUDIT_PAGE_SIZE, cursor: page.cursor, ...(page.snapshot === undefined ? {} : { snapshot_seq: page.snapshot }) }
    const result = await request<SecurityAuditPage>(SECURITY_OPS.auditQuery, { ...query })
    if (!Array.isArray(result.records) || result.records.length > SECURITY_AUDIT_PAGE_SIZE || !Number.isSafeInteger(result.snapshot_seq) || typeof result.has_more !== 'boolean' || (result.has_more && (!Number.isSafeInteger(result.next_cursor) || Number(result.next_cursor) <= 0))) {
      throw Error(t('审计分页接口不可用，请更新 Runtime 和 Security 服务。'))
    }
    return result
  }, [agentId, request, page, t]))
  const reset = (filter = page.filter) => { setStatus('未校验'); setPage({ filter, cursor: 0, history: [] }) }
  const next = () => {
    if (!state.data?.has_more || state.data.next_cursor === null) return
    setPage({ ...page, cursor: state.data.next_cursor, snapshot: state.data.snapshot_seq, history: [...page.history, page.cursor] })
  }
  const previous = () => {
    if (!page.history.length) return
    setPage({ ...page, cursor: page.history[page.history.length - 1], history: page.history.slice(0, -1) })
  }
  const verify = async () => { setVerifying(true); try { const result = await request<{ intact: boolean }>(SECURITY_OPS.auditVerify, { agent_id: agentId }); setStatus(result.intact ? '哈希链完整' : '校验失败') } catch (reason) { state.setError(message(reason)) } finally { setVerifying(false) } }
  const records = state.loading || state.error ? [] : state.data?.records || []
  return <section className="runtime-panel" aria-busy={state.loading}>
    <div className="runtime-panel-heading"><div><span className="runtime-eyebrow">TRACEABILITY</span><h3>{t('审计日志')}</h3><p>{t('记录安全 Hook、权限判定和策略变更。')}</p></div><span className="runtime-pill">{t('本页')} {records.length} {t('条记录')}</span></div>
    <ErrorNotice error={state.error} />
    <div className="runtime-panel-heading"><select aria-label={t('审计过滤')} value={page.filter} onChange={event => reset(event.target.value as SecurityAuditFilter)}><option value="all">{t('全部事件')}</option><option value="hook">{t('安全 Hook')}</option><option value="deny">{t('仅拒绝')}</option></select><div className="runtime-header-actions"><button className="runtime-button runtime-button-secondary" disabled={state.loading} onClick={() => reset()}>{t('刷新')}</button><button className="runtime-button runtime-button-secondary" disabled={state.loading || verifying} onClick={() => void verify()}>{t('校验哈希链')}</button><span className="runtime-pill">{t(status)}</span></div></div>
    {state.loading && <p role="status">{t('正在加载审计记录')}</p>}
    <Table headings={[t('序号'),t('时间'),t('操作'),t('目标'),t('结果')]}>{records.map(row => <tr key={row.seq}><td>{row.seq}</td><td>{securityClockTime(row.ts) || row.ts}</td><td>{row.op_type}</td><td>{row.target}</td><td>{row.result}</td></tr>)}{!state.loading && !state.error && records.length === 0 && <tr><td colSpan={5}>{t('暂无记录')}</td></tr>}</Table>
    <div className="runtime-header-actions"><button className="runtime-button runtime-button-secondary" disabled={state.loading || !page.history.length} onClick={previous}>{t('上一页')}</button><span>{t('页码')} {page.history.length + 1}</span><button className="runtime-button runtime-button-secondary" disabled={state.loading || !!state.error || !state.data?.has_more} onClick={next}>{t('下一页')}</button></div>
  </section>
}

export function SecuritySyscalls({ agentId, request }: Context) {
  const t = useRuntimeI18n()
  const [arch, setArch] = useState('riscv64')
  const [additions, setAdditions] = useState<string[]>([])
  const [selected, setSelected] = useState(false)
  const state = useResource(useCallback(async () => {
    const [catalog, policy, audit] = await Promise.all([
      request<SecuritySyscallCatalog>(SECURITY_OPS.syscallCatalog, { arch }),
      request<SecuritySyscallSelection>(SECURITY_OPS.syscallPolicyGet, { agent_id: agentId, arch }),
      // 独立 syscall 审计链是可选的：老 securityd 没有这条链时页面仍应可用。
      request<SecuritySyscallAuditPage>(SECURITY_OPS.syscallAuditEvents, { agent_id: agentId, limit: 100, cursor: 0 })
        .catch(() => ({ events: [], records: [] }) as SecuritySyscallAuditPage),
    ])
    return { catalog: catalog.syscalls || [], policy, audit: audit.events || audit.records || [] }
  }, [agentId, arch, request]))
  if (state.data && !selected) {
    setSelected(true)
    setAdditions(state.data.policy.agent_additions || [])
  }
  const disabled = state.loading || state.busy || !state.data
  const toggle = (name: string) => setAdditions(current => current.includes(name) ? current.filter(item => item !== name) : [...current, name])
  const save = () => void state.mutate(() => request(SECURITY_OPS.syscallPolicyUpdate, { agent_id: agentId, arch, additions }))
  const reset = () => void state.mutate(() => request(SECURITY_OPS.syscallPolicyReset, { agent_id: agentId, arch })).then(ok => { if (ok) setSelected(false) })
  const policy = state.data?.policy
  return <section className="runtime-panel">
    <div className="runtime-panel-heading"><div><span className="runtime-eyebrow">SYSCALL POLICY</span><h3>{t('系统调用黑名单')}</h3><p>{t('默认不限制：勾选即拦截，没有强制基线。改动仅对该 Agent 生效，且需重启 Worker（并进入沙箱）才装载过滤器。')}</p></div><div className="runtime-header-actions"><label>{t('架构')}<select className="runtime-control" value={arch} onChange={event => { setSelected(false); setArch(event.target.value) }}><option value="riscv64">riscv64</option><option value="x86_64">x86_64</option></select></label><span className="runtime-pill">{policy ? t('策略版本 {version} · 已应用 {applied} · {state}', { version: policy.policy_version ?? '-', applied: policy.applied_policy_version ?? '-', state: t(policy.pending_restart ? '待重启' : '已应用') }) : '-'}</span></div></div>
    <ErrorNotice error={state.error} />
    {state.loading && <p role="status">{t('正在加载系统调用策略')}</p>}
    <Table headings={[t('启用'), t('系统调用'), t('编号'), t('说明'), t('状态')]}>{(state.data?.catalog || []).map(entry => { const name = String(entry.name || entry.syscall || ''); const blocked = additions.includes(name); return <tr key={name}><td><input type="checkbox" checked={blocked} disabled={disabled} onChange={() => toggle(name)} aria-label={`${name} ${t('启用')}`} /></td><td><strong>{name}</strong></td><td>{entry.number ?? '-'}</td><td>{entry.description || entry.reason || t('危险系统调用')}</td><td><span className="runtime-pill">{t(blocked ? '已拦截' : '可拦截')}</span></td></tr> })}{!state.loading && !state.error && !(state.data?.catalog || []).length && <tr><td colSpan={5}>{t('暂无系统调用目录')}</td></tr>}</Table>
    <div className="runtime-header-actions"><button className="runtime-button runtime-button-secondary" disabled={disabled} onClick={() => void state.load()}>{t('刷新')}</button><button className="runtime-button runtime-button-secondary" disabled={disabled} onClick={reset}>{t('恢复默认')}</button><button className="runtime-button" disabled={disabled} onClick={save}>{t('保存策略')}</button><small>{t('策略已保存；重启 Worker 后生效。')}</small></div>
    <section className="runtime-subpanel"><h4>{t('系统调用拦截审计')}</h4><Table headings={[t('时间'), 'Agent', t('系统调用'), 'PID', t('后端'), t('结果')]}>{(state.data?.audit || []).map((row, index) => <tr key={`${row.ts || index}:${row.syscall || ''}`}><td>{securityClockTime(row.ts) || row.ts || '-'}</td><td>{row.worker_agent_id || row.agent_id || '-'}</td><td><strong>{row.syscall || '-'}</strong> ({row.number ?? '-'})</td><td>{row.pid ?? '-'}</td><td>{row.backend || '-'}</td><td>{row.action || 'deny'}</td></tr>)}{!state.loading && !(state.data?.audit || []).length && <tr><td colSpan={6}>{t('暂无系统调用拦截事件')}</td></tr>}</Table></section>
  </section>
}
