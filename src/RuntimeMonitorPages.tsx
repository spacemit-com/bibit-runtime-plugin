import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AgentTopView, RuntimeStatus, RuntimeWorkersView } from './runtime-contracts'
import { runtimeDisplayName, useRuntimeI18n, useRuntimeLanguage } from './runtime-i18n'
import { RuntimeAgentAvatar } from './RuntimeAgentAvatar'
import './runtime-monitor.css'

function age(timestamp: number, serverTime: number) {
  if (!timestamp) return '--'
  const seconds = Math.max(0, Math.floor(serverTime - timestamp))
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}
function Status({ value }: { value?: string }) {
  return <span className="runtime-monitor-status" data-state={(value || 'idle').toLowerCase()}>{value || 'idle'}</span>
}
function Stats({ values }: { values: Array<[string, string | number]> }) {
  return <div className="runtime-monitor-stats">{values.map(([label, value]) => <div className="runtime-monitor-stat" key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
}
function Panel({ title, description, children, runs = false }: { title: string; description: string; children: ReactNode; runs?: boolean }) {
  return <section className="runtime-monitor-panel"><div className="runtime-monitor-panel-heading"><span className="runtime-monitor-icon" aria-hidden="true">{runs ? '⌁' : '♙'}</span><div><h3>{title}</h3><p>{description}</p></div></div>{children}</section>
}
function Table({ headings, children }: { headings: string[]; children: ReactNode }) {
  return <div className="runtime-monitor-table-wrap"><table className="runtime-monitor-table"><thead><tr>{headings.map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
}
function Live({ label }: { label?: string }) { const t = useRuntimeI18n(); return <span className="runtime-monitor-live"><span />{label ?? t('实时')}</span> }

export function AgentTopContent({ data, request }: { data: AgentTopView; request: <T>(op: string, params?: Record<string, unknown>) => Promise<T> }) {
  const t = useRuntimeI18n(); const language = useRuntimeLanguage()
  const summary = data.summary
  return <div className="runtime-monitor-dashboard">
    <p className="runtime-monitor-description">{t('实时查看 Agent、Session 与 Run 状态')}</p>
    <section className="runtime-monitor-overview"><div className="runtime-monitor-overview-heading"><div><strong>{t('运行概览')}</strong><p>{t('更新时间')} <time>{new Date((data.server_time || Date.now() / 1000) * 1000).toLocaleTimeString()}</time></p></div><Live /></div>
      <Stats values={[
        [t('专家数'), summary.agents], [t('可用'), summary.available_agents], [t('会话数'), summary.sessions], [t('执行数'), summary.runs], [t('活跃'), summary.active_runs], [t('等待'), summary.waiting_runs], [t('失败数'), summary.failed_runs],
      ]} />
    </section>
    <Panel title={t('专家')} description={t('Agent 可用性与工作负载')}><Table headings={[t('状态'), t('专家'), t('会话'), t('执行数'), t('活跃'), t('失败'), t('最近活动')]}>
      {data.agents.map(agent => <tr key={agent.id}><td><Status value={agent.status} /></td><td><span className="runtime-monitor-avatar"><RuntimeAgentAvatar agent={agent} request={request} /></span>{runtimeDisplayName(agent, language) || agent.id}</td><td>{agent.session_count}</td><td>{agent.run_count}</td><td>{agent.active_run_count}</td><td>{agent.failed_run_count}</td><td>{age(agent.last_active_at, data.server_time)}</td></tr>)}
      {!data.agents.length && <tr><td colSpan={7}>--</td></tr>}
    </Table></Panel>
    <Panel title={t('最近 Runs')} description={t('最新执行活动')} runs><Table headings={[t('状态'), t('执行'), t('专家'), t('会话'), t('更新时间')]}>
      {data.recent_runs.map(run => <tr key={run.id}><td><Status value={run.status} /></td><td title={run.id}>{run.id.slice(0, 12)}</td><td>{run.agent_id || '--'}</td><td>{run.session_title || run.session_id || '--'}</td><td>{age(run.updated_at, data.server_time)}</td></tr>)}
      {!data.recent_runs.length && <tr><td colSpan={5}>--</td></tr>}
    </Table></Panel>
  </div>
}

export function RuntimeStatusContent({ workers, status }: { workers: RuntimeWorkersView; status: RuntimeStatus }) {
  const t = useRuntimeI18n()
  const control = workers.control
  const updated = useMemo(() => new Date().toLocaleTimeString(), [workers, status])
  return <div className="runtime-monitor-dashboard">
    <p className="runtime-monitor-description">{t('查看 Control 进程与 Agent Worker 的运行关系')}</p>
    <section className="runtime-monitor-overview"><div className="runtime-monitor-overview-heading"><div><strong>{t('运行概览')}</strong><p>{t('更新时间')} <time>{updated}</time></p></div><Status value={status.status || control.state || '--'} /></div>
      <Stats values={[
        [t('控制进程 PID'), control.pid ?? '--'], [t('Worker 数'), workers.worker_count], [t('Runtime'), status.status || '--'], [t('Control'), control.control_ready ? 'READY' : control.state || '--'],
      ]} />
    </section>
    <Panel title={t('Control 进程')} description={t('控制面进程负责 API、会话和 Worker 调度')}><div className="runtime-monitor-control">{[['PID', control.pid ?? '--'], [t('状态'), control.state || '--'], [t('模式'), control.effective_mode || '--'], [t('后端'), control.backend || '--'], [t('沙箱'), control.sandboxed ? 'yes' : 'no']].map(([key, value]) => <div key={key}><small>{key}</small><strong>{value}</strong></div>)}</div></Panel>
    <Panel title={t('Worker 池')} description={t('每个 Agent 对应一个受管 Worker 进程')}><Table headings={[t('状态'), t('专家'), 'PID', t('模式'), t('后端'), t('沙箱'), t('代次'), t('错误')]}>
      {workers.workers.map(worker => <tr key={worker.agent_id}><td><Status value={worker.state} /></td><td>{worker.agent_id || '--'}</td><td>{worker.pid ?? '--'}</td><td>{worker.effective_mode || '--'}</td><td>{worker.backend || '--'}</td><td>{worker.sandboxed ? 'yes' : 'no'}</td><td>{worker.generation_id ?? '--'}</td><td>{worker.error || '--'}</td></tr>)}
      {!workers.workers.length && <tr><td colSpan={8}>{t('暂无 Worker')}</td></tr>}
    </Table></Panel>
  </div>
}

const levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'] as const
export function LogsContent({ text }: { text: string }) {
  const t = useRuntimeI18n()
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())
  const output = useRef<HTMLDivElement>(null)
  const lines = useMemo(() => {
    let lastLevel = ''
    return text.split('\n').flatMap((line, index, all) => {
      if (index === all.length - 1 && line === '') return []
      const level = ['CRITICAL', 'ERROR', 'WARNING', 'INFO', 'DEBUG'].find(item => line.includes(`[${item}]`))
      if (level) lastLevel = level
      return [{ text: line, level: lastLevel }]
    })
  }, [text])
  useEffect(() => { if (output.current) output.current.scrollTop = output.current.scrollHeight }, [text])
  const empty = text.trim() === ''
  return <div className="runtime-monitor-logs"><p className="runtime-monitor-description">{t('运行日志 (runtime.jsonl)')}</p>
    <div className="runtime-monitor-terminal"><div className="runtime-monitor-terminal-heading"><span className="runtime-monitor-terminal-dots" aria-hidden="true"><i /><i /><i /></span><span className="runtime-monitor-log-filename">runtime.jsonl</span>
      <div className="runtime-monitor-log-filters">{levels.map(level => <label key={level} data-level={level}><input className="runtime-checkbox" type="checkbox" checked={!hidden.has(level)} onChange={() => setHidden(current => { const next = new Set(current); if (next.has(level)) next.delete(level); else next.add(level); return next })} />{level}</label>)}</div><Live label={t('最近')} /></div>
      <div className="runtime-monitor-log-output" ref={output} role="log" aria-label="runtime.jsonl" aria-live="off">{empty ? <span className="runtime-monitor-log-empty">{t('暂无日志记录。')}</span> : lines.map((line, index) => <span className="runtime-monitor-log-line" data-level={line.level} hidden={hidden.has(line.level)} key={index}>{line.text}{'\n'}</span>)}</div>
    </div>
  </div>
}
