import { useEffect, useRef, useState, type ReactNode } from 'react'
import { RuntimeAgentAvatar } from './RuntimeAgentAvatar'
import { RuntimeDialog } from './RuntimeDialog'
import { runtimeDisplayDescription, runtimeDisplayName, useRuntimeI18n, useRuntimeLanguage } from './runtime-i18n'
import { AGENT_AVATAR_MAX_BYTES, RUNTIME_OPS, type StartExpertConversation, type AgentAvatarView, type AgentView, type CapabilityView, type MCPServerView, type PluginView, type ProviderView, type ProviderModelView } from './runtime-contracts'
import { serviceFailureText } from './runtime-service-errors'
import './runtime-experts.css'

type Request = <T>(op: string, params?: Record<string, unknown>) => Promise<T>
type Group = 'tools' | 'skills' | 'plugins' | 'mcps'
const groups: Group[] = ['tools', 'skills', 'plugins', 'mcps']
const titles = { tools: '工具', skills: '技能', plugins: '插件', mcps: 'MCP' }
const capabilityKey = (item: CapabilityView) => item.name || item.id
// 默认能力来自 Runtime 的 config.yaml（presets）：每个专家都强制启用，界面只能显示不能取消。
const presetKeys = (items: CapabilityView[]) => items.filter(item => item.preset === true && item.enabled !== false).map(capabilityKey)
const withPresetKeys = (current: string[], items: CapabilityView[]) => { const presets = presetKeys(items); return current.includes('*') ? current : [...presets, ...current.filter(key => !presets.includes(key))] }
const presets = ['🤖', '✨', '🧠', '🔎', '🧑‍💻', '🎨', '📚', '🧭', '🛠️', '📊', '🎯', '🔮']
const uploaded = (value: string) => /^\/api\/v1\/agents\/[^/]+\/avatar$/i.test(value)
const message = (error: unknown) => error instanceof Error ? error.message : String(error)
const equal = (left: unknown, right: unknown): boolean => {
  if (left === right) return true
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false
  if (Array.isArray(left) || Array.isArray(right)) return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => equal(value, right[index]))
  const a = left as Record<string, unknown>; const b = right as Record<string, unknown>
  return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => Object.hasOwn(b, key) && equal(a[key], b[key]))
}
export function RuntimeExperts({ agents, request, onChanged, status, startConversation }: { startConversation?: StartExpertConversation; status?: ReactNode; agents: AgentView[]; request: Request; onChanged: () => Promise<void> }) {
  const t = useRuntimeI18n(); const language = useRuntimeLanguage(); const [editing, setEditing] = useState<AgentView | null | undefined>(); const [deleting, setDeleting] = useState<AgentView>(); const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  const [cards, setCards] = useState(agents); const [notice, setNotice] = useState('')
  useEffect(() => setCards(agents), [agents])
  async function useExpert(id: string) { if (!startConversation || busy) return; setBusy(true); setError(''); try { await startConversation(id) } catch (reason) { setError(message(reason)) } finally { setBusy(false) } }
  return <div className="runtime-experts"><header className="runtime-experts-heading"><div><h2>{t('专家')}</h2><p>{t('创建和管理专家，配置模型与能力。安全设置由安全控制中心统一维护。')}</p>{status}</div><div><button onClick={() => setEditing(null)}>{t('创建专家')}</button></div></header>{notice && <p role="status">{t(notice)}</p>}{error && <p role="alert">{error}</p>}
    {!cards.length && <div className="runtime-expert-empty"><h3>{t('暂无专家')}</h3><p>{t('创建第一个专家，为它配置模型和能力。')}</p><button onClick={() => setEditing(null)}>{t('创建专家')}</button></div>}
    <div className="runtime-expert-grid">{cards.map(agent => <article key={agent.id} className="runtime-expert-card" tabIndex={0} role="button" aria-label={`${t('编辑专家')} ${runtimeDisplayName(agent, language)}`} onClick={() => setEditing(agent)} onKeyDown={event => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); setEditing(agent) } }}><div className="runtime-expert-card-top"><RuntimeAgentAvatar agent={agent} request={request} revision={agent} /><button aria-label={`${t('删除专家')} ${runtimeDisplayName(agent, language)}`} onClick={event => { event.stopPropagation(); setError(''); setDeleting(agent) }}>{t('删除')}</button></div><h3>{runtimeDisplayName(agent, language)}</h3><p>{runtimeDisplayDescription(agent, language)}</p><div className="runtime-expert-meta">{agent.origin === 'system' && <span>{t('系统专家')}</span>}<span>{agent.model ? `${agent.model.provider} · ${agent.model.name}` : t('不可用')}</span><span>✦ {groups.reduce((n, group) => n + agent[group].length, 0)}</span></div>{!agent.available && agent.unavailable_reason && <small>{agent.unavailable_reason === 'agent_model_required' ? t('尚未配置模型，请编辑专家选择服务商和模型。') : agent.unavailable_reason}</small>}<button className="runtime-expert-use" type="button" disabled={busy || !startConversation || !agent.available} onClick={event => { event.stopPropagation(); void useExpert(agent.id) }} title={!startConversation ? t('当前 Bibit 未提供宿主动作能力，无法新建会话。') : agent.unavailable_reason || undefined}>{t('使用专家')}</button></article>)}</div>
    {editing !== undefined && <ExpertEditor agent={editing} request={request} onChanged={async (saved, feedback) => { setCards(current => current.some(item => item.id === saved.id) ? current.map(item => item.id === saved.id ? saved : item) : [...current, saved]); setNotice(feedback); setError(''); try { await onChanged() } catch (error) { setError(`${t('专家已保存，但列表刷新失败。')} ${message(error)}`) } }} onClose={() => setEditing(undefined)} />}
    {deleting && <RuntimeDialog title={t('删除专家')} onClose={() => { if (!busy) setDeleting(undefined) }}><p>{t('确定删除专家 {name}？此操作不可撤销。', { name: runtimeDisplayName(deleting, language) })}</p>{deleting.origin === 'system' && <p>{t('Bibit 自带的出厂专家；删除后需重新安装或升级 Runtime 包才能恢复，本地修改也会一起删除。')}</p>}{error && <p role="alert">{error}</p>}<footer className="runtime-expert-footer"><button disabled={busy} onClick={() => setDeleting(undefined)}>{t('取消')}</button><button disabled={busy} onClick={() => { setBusy(true); setError(''); void request(RUNTIME_OPS.agentsDelete, { agent_id: deleting.id }).then(async () => { setDeleting(undefined); try { await onChanged() } catch (error) { setError(`${t('专家已删除，但列表刷新失败。')} ${message(error)}`) } }).catch(error => setError(serviceFailureText(error, t))).finally(() => setBusy(false)) }}>{t('删除')}</button></footer></RuntimeDialog>}
  </div>
}
function ExpertEditor({ agent, request, onChanged, onClose }: { agent: AgentView | null; request: Request; onChanged: (saved: AgentView, feedback: string) => Promise<void>; onClose: () => void }) {
  const t = useRuntimeI18n(); const language = useRuntimeLanguage(); const [id, setId] = useState(agent?.id || ''); const [name, setName] = useState(agent?.name || ''); const [nameZh, setNameZh] = useState(agent?.name_zh || ''); const [nameEn, setNameEn] = useState(agent?.name_en || ''); const [description, setDescription] = useState(agent?.description || ''); const [descriptionZh, setDescriptionZh] = useState(agent?.description_zh || ''); const [soul, setSoul] = useState(agent?.soul || ''); const [avatar, setAvatar] = useState(agent?.avatar || '🤖'); const [file, setFile] = useState<AgentAvatarView>(); const [provider, setProvider] = useState(agent?.model?.provider || ''); const [model, setModel] = useState(agent?.model?.name || ''); 
  const [selected, setSelected] = useState<Record<Group, string[]>>({ tools: agent?.tools || [], skills: agent?.skills || [], plugins: agent?.plugins || [], mcps: agent?.mcps || [] }); const [catalog, setCatalog] = useState<Record<Group, CapabilityView[]>>({ tools: [], skills: [], plugins: [], mcps: [] }); const [providers, setProviders] = useState<ProviderView[]>([]); const [models, setModels] = useState<ProviderModelView[]>([]); const [modelStatus, setModelStatus] = useState(''); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const alive = useRef(true)
  const [catalogErrors, setCatalogErrors] = useState<Partial<Record<Group | 'providers', string>>>({})
  const pluginsTouched = useRef(false)
  const initialAvatar = useRef(avatar)
  const [catalogPending, setCatalogPending] = useState<Record<Group, boolean>>({ tools: true, skills: true, plugins: true, mcps: true })
  const [catalogAttempt, setCatalogAttempt] = useState(0)
  const visibleCatalog = (group: Group): CapabilityView[] => {
    const known = new Set(catalog[group].map(item => item.name || item.id))
    const missing = selected[group]
      .filter(item => item !== '*' && !known.has(item))
      .map(item => ({ id: item, name: item, display_name: item, description: '', enabled: false, unavailable_reason: t('能力已卸载或不可用'), retained_missing: true as const }))
    return [...catalog[group], ...missing]
  }
  useEffect(() => {
    let current = true
    alive.current = true
    setLoading(true)
    setCatalogErrors({})
    setCatalogPending({ tools: true, skills: true, plugins: true, mcps: true })
    void request<{ providers: ProviderView[] }>(RUNTIME_OPS.providersList).then(result => {
      if (!current) return
      const available = result.providers.filter(item => item.configured)
      setProviders(available)
      setProvider(value => value || (available.length === 1 ? available[0].id : ''))
    }).catch(error => { if (current) setCatalogErrors(value => ({ ...value, providers: message(error) })) })
      .finally(() => { if (current) setLoading(false) })
    groups.forEach(group => {
      const operation = group === 'mcps'
        ? request<{ mcps: MCPServerView[] }>(RUNTIME_OPS.mcpsList).then(result => result.mcps.filter(item => !item.owner_plugin_id).map(item => ({ ...item })))
        : group === 'plugins'
          ? request<{ plugins: PluginView[] }>(RUNTIME_OPS.pluginsList).then(result => result.plugins.map(item => ({ id: item.id, name: item.id, display_name: item.name || item.id, description: String(item.description || ''), enabled: item.enabled })))
          : request<{ capabilities: CapabilityView[] }>(RUNTIME_OPS.capabilitiesList, { kind: { tools: 'tool', skills: 'skill' }[group] }).then(result => result.capabilities.filter(item => !item.plugin_id))
      void operation.then(rawItems => {
        const items = rawItems as CapabilityView[]
        if (!current) return
        setCatalog(value => ({ ...value, [group]: items }))
        // 默认能力由 Runtime 的配置决定，连专家自己都取消不了：编辑器保持勾选并锁定。
        if (items.some(item => item.preset === true)) {
          setSelected(value => ({ ...value, [group]: withPresetKeys(value[group], items) }))
        }
      })
        .catch(error => { if (current) setCatalogErrors(value => ({ ...value, [group]: message(error) })) })
        .finally(() => { if (current) setCatalogPending(value => ({ ...value, [group]: false })) })
    })
    return () => { current = false; alive.current = false }
  }, [request, catalogAttempt])
  useEffect(() => { let current = true; setModels([]); setModelStatus(''); if (provider) { setModelStatus('正在获取模型列表…'); void request<{ models: ProviderModelView[] }>(RUNTIME_OPS.providersModelsList, { provider_id: provider }).then(result => { if (current) { setModels(result.models); setModelStatus('可选择模型，也可手动输入模型名称。') } }).catch(() => { if (current) setModelStatus('无法获取模型列表，请手动输入模型名称') }) } return () => { current = false } }, [provider, request])
  async function save() {
    if (loading || catalogErrors.providers) return
    setError(''); if (!name.trim()) { setError(t('请填写英文名称')); return } if (!provider && model.trim()) { setError(t('请选择服务商并填写模型名称')); return }
    setBusy(true)
    try {
      const metadataAvatar = uploaded(avatar) ? (typeof agent?.metadata.avatar === 'string' && !uploaded(agent.metadata.avatar) ? agent.metadata.avatar : '🤖') : avatar
      const metadata = { ...agent?.metadata }
      if (!agent || avatar !== initialAvatar.current) metadata.avatar = metadataAvatar
      const payload: Record<string, unknown> = { name: name.trim(), name_zh: nameZh.trim(), name_en: nameEn.trim(), description: description.trim(), description_zh: descriptionZh.trim(), soul: soul.trim(), model: model.trim() ? { provider, name: model.trim() } : null, ...selected, metadata }
      if (agent) {
        for (const key of ['name', 'name_zh', 'name_en', 'description', 'description_zh', 'soul'] as const) {
          if (payload[key] === (agent[key] || '').trim()) delete payload[key]
        }
        if (equal(payload.model, agent.model)) delete payload.model
        for (const group of groups) if (equal(selected[group], agent[group]) && !(group === 'plugins' && pluginsTouched.current)) delete payload[group]
        if (equal(metadata, agent.metadata)) delete payload.metadata
      }
      const nextRunChange = ['model', 'soul', ...groups].some(key => key in payload)
      const saved = agent && !Object.keys(payload).length ? agent : await request<AgentView>(id ? RUNTIME_OPS.agentsUpdate : RUNTIME_OPS.agentsCreate, { ...payload, ...(id ? { agent_id: id } : {}) })
      const savedId = saved.id || id; if (!savedId) throw Error(t('Runtime 未返回专家 ID')); setId(savedId)
      let updated = saved
      if (file) { await request(RUNTIME_OPS.agentAvatarUpload, { agent_id: savedId, ...file }); updated = { ...saved, avatar: `/api/v1/agents/${savedId}/avatar` } }
      else if (agent && uploaded(agent.avatar) && !uploaded(avatar)) { await request(RUNTIME_OPS.agentAvatarDelete, { agent_id: savedId }); updated = { ...saved, avatar } }
      onClose(); await onChanged(updated, !agent ? '专家已保存。' : nextRunChange ? '配置已保存，下次运行生效；当前运行不受影响。' : '专家已保存。')
    } catch (error) { setError(message(error)) } finally { setBusy(false) }
  }
  return <RuntimeDialog title={t(agent ? '编辑专家' : '创建专家')} onClose={() => { if (!busy) onClose() }}><form className="runtime-expert-form" onSubmit={event => { event.preventDefault(); void save() }}><fieldset disabled={busy}>
    <div className="runtime-expert-fields"><div><span>{t('头像')}</span><div className="runtime-expert-avatar-picker">{file ? <span className="runtime-expert-avatar"><img src={`data:${file.media_type};base64,${file.base64}`} alt="" /></span> : agent && uploaded(avatar) ? <RuntimeAgentAvatar agent={agent} request={request} revision={agent} /> : <span className="runtime-expert-avatar">{avatar}</span>}<div><small>{t('选择预设头像')}</small><div className="runtime-expert-presets">{presets.map(item => <button type="button" key={item} aria-label={item} aria-pressed={!file && avatar === item} onClick={() => { setAvatar(item); setFile(undefined) }}>{item}</button>)}</div></div><div className="runtime-expert-upload-area"><label className="runtime-expert-upload-button">{t('上传图片')}<input className="runtime-upload-input" aria-label={t('上传图片')} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={event => { const file = event.target.files?.[0]; if (!file) return; if (file.size > AGENT_AVATAR_MAX_BYTES || !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) { setError(t('PNG/JPEG/WebP/GIF · ≤ 2 MB')); event.target.value = ''; return } const reader = new FileReader(); reader.onload = () => { if (alive.current) { setFile({ media_type: file.type as AgentAvatarView['media_type'], base64: String(reader.result).split(',')[1] }); setError('') } }; reader.onerror = () => setError(t('无法读取头像图片')); reader.readAsDataURL(file) }} /></label><small>PNG/JPEG/WebP/GIF · ≤ 2 MB</small></div></div></div><label>{t('调用名')}<input className="runtime-control" maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="ResearchAssistant" /></label></div>
    <label>{t('中文名称')}<input className="runtime-control" maxLength={80} value={nameZh} onChange={event => setNameZh(event.target.value)} /></label><label>{t('英文名称')}<input className="runtime-control" maxLength={80} value={nameEn} onChange={event => setNameEn(event.target.value)} placeholder="Research Assistant" /></label><label>{t('简介')}<input className="runtime-control" maxLength={500} value={description} onChange={event => setDescription(event.target.value)} /></label><label>{t('中文简介')}<input className="runtime-control" maxLength={500} value={descriptionZh} onChange={event => setDescriptionZh(event.target.value)} /></label><label>Soul<textarea className="runtime-control" rows={7} maxLength={20000} value={soul} onChange={event => setSoul(event.target.value)} /></label>
    <div className="runtime-expert-fields runtime-expert-model-fields"><label>{t('服务商')}<select disabled={loading || !!catalogErrors.providers} value={provider} onChange={event => { setProvider(event.target.value); setModel('') }}><option value="">{t('选择服务商')}</option>{provider && !providers.some(item => item.id === provider) && <option value={provider}>{provider}</option>}{providers.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>{t('模型')}<input className="runtime-control" aria-label={t('模型')} list="runtime-expert-model-options" value={model} onChange={event => setModel(event.target.value)} /><datalist id="runtime-expert-model-options">{models.map(item => <option key={item.name} value={item.name}>{item.label || item.name}</option>)}</datalist><small>{t(modelStatus)}</small></label></div>
{catalogErrors.providers && <p role="alert">{t('服务商目录不可用')}: {catalogErrors.providers}</p>}{Object.keys(catalogErrors).length > 0 && <button type="button" disabled={loading} onClick={() => setCatalogAttempt(value => value + 1)}>{t('重试加载目录')}</button>}{loading && <p role="status">{t('正在加载专家目录…')}</p>}<div className="runtime-expert-capabilities">{groups.map(group => <section key={group} aria-label={t(titles[group])}><header><strong>{t(titles[group])}</strong><button type="button" disabled={catalogPending[group] || !!catalogErrors[group]} onClick={() => { if (group === 'plugins') pluginsTouched.current = true; setSelected(current => ({ ...current, [group]: current[group].includes('*') || (catalog[group].length > 0 && catalog[group].every(item => current[group].includes(item.name || item.id))) ? presetKeys(catalog[group]) : ['*'] })) }}>{t('全选')}</button></header>{catalogErrors[group] && <p role="alert">{catalogErrors[group]}</p>}{catalogPending[group] && <p role="status">{t('正在加载专家目录…')}</p>}{!catalogPending[group] && !catalogErrors[group] && !visibleCatalog(group).length && <p>{t('暂无可用能力')}</p>}{visibleCatalog(group).map(item => { const key = item.name || item.id; const label = runtimeDisplayName(item, language) || key; const preset = item.preset === true; const summary = item.summaries?.[language]?.trim() ?? ''; const detail = [preset ? t('默认能力，所有专家固定启用') : '', summary || runtimeDisplayDescription(item, language), item.enabled === false ? item.unavailable_reason : ''].filter(Boolean).join(' · '); return <label className="runtime-expert-capability" key={key}><input className="runtime-checkbox" aria-label={key} type="checkbox" disabled={catalogPending[group] || !!catalogErrors[group] || preset || (item.enabled === false && !('retained_missing' in item))} checked={preset || selected[group].includes('*') || selected[group].includes(key)} onChange={event => { if (group === 'plugins') pluginsTouched.current = true; const checked = event.target.checked; setSelected(current => { const existing = current[group].includes('*') ? catalog[group].map(item => item.name || item.id) : current[group]; return { ...current, [group]: checked ? [...existing, key] : existing.filter(value => value !== key) } }) }} /><span><strong title={label}>{label}</strong>{detail && <small title={detail}>{detail}</small>}</span></label> })}</section>)}</div>
    </fieldset>{busy && <p role="status">{t('正在保存…')}</p>}{error && <p role="alert">{error}</p>}<footer className="runtime-expert-footer"><button type="button" disabled={busy} onClick={onClose}>{t('取消')}</button><button type="submit" disabled={busy || loading || !!catalogErrors.providers}>{t('保存')}</button></footer></form></RuntimeDialog>
}
