import { useState } from 'react'
import { RUNTIME_OPS, type AgentView, type ProviderView } from './runtime-contracts'
import { runtimeDisplayName, useRuntimeI18n, useRuntimeLanguage } from './runtime-i18n'
import { RuntimeDialog } from './RuntimeDialog'
import { serviceFailureText } from './runtime-service-errors'

type Request = <T>(operation: string, params?: Record<string, unknown>) => Promise<T>
const templates = [
  { id: 'openai', name: 'OpenAI', base: 'https://api.openai.com/v1' },
  { id: 'anthropic', name: 'Anthropic', base: 'https://api.anthropic.com/v1' },
  { id: 'gemini', name: 'Gemini', base: 'https://generativelanguage.googleapis.com/v1beta/openai' },
  { id: 'openrouter', name: 'OpenRouter', base: 'https://openrouter.ai/api/v1' },
  { id: 'deepseek', name: 'DeepSeek', base: 'https://api.deepseek.com/v1' },
  { id: 'minimax', name: 'MiniMax', base: 'https://api.minimaxi.com/v1' },
  { id: 'siliconflow', name: 'SiliconFlow', base: 'https://api.siliconflow.cn/v1' },
  { id: 'mistral', name: 'Mistral', base: 'https://api.mistral.ai/v1' },
  { id: 'groq', name: 'Groq', base: 'https://api.groq.com/openai/v1' },
  { id: 'xai', name: 'xAI', base: 'https://api.x.ai/v1' },
  { id: 'nvidia', name: 'NVIDIA', base: 'https://integrate.api.nvidia.com/v1' },
  { id: 'huggingface', name: 'Hugging Face', base: 'https://router.huggingface.co/v1' },
  { id: 'azure', name: 'Azure OpenAI', base: '' },
  { id: 'ollama', name: 'Ollama', base: 'http://127.0.0.1:11434/v1' },
  { id: 'lm-studio', name: 'LM Studio', base: 'http://127.0.0.1:1234/v1' },
  { id: 'custom', name: '自定义服务商', base: '' },
]

export function RuntimeProviders({ providers, agents, request, onChanged }: { providers: ProviderView[]; agents: AgentView[]; request: Request; onChanged: () => Promise<void> }) {
  const t = useRuntimeI18n(); const language = useRuntimeLanguage()
  const [picker, setPicker] = useState(false)
  const [editor, setEditor] = useState<{ id?: string; template: string; name: string; protocol: string; base: string; key: string; factory?: boolean; keyStored?: boolean }>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // ``record_kind`` is ``custom_provider`` for packaged and hand-made custom
  // Providers alike, so only ``origin`` separates them.
  const isFactory = (provider: ProviderView) => provider.origin === 'system'
  // Experts that still select this Provider. The host client drops every
  // message the Runtime builds for a failed call, so the refusal has to be
  // written here to stay actionable.
  const users = (providerId?: string) => providerId
    ? agents.filter(agent => agent.model?.provider === providerId).map(agent => runtimeDisplayName(agent, language))
    : []
  const edit = (provider: ProviderView) => {
    setError('')
    // 服务端只回掩码，从不回密钥本身，所以输入框永远是空的：placeholder 是唯一
    // 能告诉用户「这里已经有一份凭据、输入新值即替换」的地方（同 DeepSeek Harness
    // 的 keyStored）。留空保存等于保留旧值。
    setEditor({ id: provider.id, template: 'custom', name: provider.label, protocol: String(provider.parameters.protocol || 'openai-compatible'), base: provider.base_url, key: '', factory: isFactory(provider), keyStored: provider.configured || Boolean(provider.api_key_masked) })
  }
  const save = async () => {
    if (!editor || busy) return
    if (!editor.name.trim() || !editor.base.trim()) { setError(t('请填写名称和 API Base')); return }
    const generated = editor.name.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'provider'
    const id = editor.template === 'custom' ? `custom:${generated}` : editor.template
    if (!editor.id && providers.some(provider => provider.id === id)) { setError(t('服务商名称已存在')); return }
    setBusy(true); setError('')
    try {
      await request(editor.id ? RUNTIME_OPS.providersUpdate : RUNTIME_OPS.providersCreate, {
        ...(editor.id ? { provider_id: editor.id } : { id }),
        label: editor.name.trim(), base_url: editor.base.trim(), parameters: { protocol: editor.protocol },
        ...(editor.key.trim() ? { api_key: editor.key.trim() } : {}),
      })
      setEditor(undefined)
      await onChanged()
    } catch (reason) { setError(serviceFailureText(reason, t)) }
    finally { setBusy(false) }
  }
  const remove = async () => {
    if (!editor?.id || busy) return
    const inUse = users(editor.id)
    if (inUse.length) {
      setError(t('服务商 {name} 正在被专家使用：{experts}。请先在“专家”页给这些专家换用其它服务商，或删除这些专家，再删除该服务商。', { name: editor.id, experts: inUse.join('、') }))
      return
    }
    setBusy(true); setError('')
    try { await request(RUNTIME_OPS.providersDelete, { provider_id: editor.id }); setEditor(undefined); await onChanged() }
    catch (reason) { setError(serviceFailureText(reason, t)) }
    finally { setBusy(false) }
  }
  return <div className="runtime-stack">
    <div className="runtime-panel-heading"><p className="runtime-page-description">{t('管理模型服务商，为专家配置模型')}</p><button className="runtime-button" type="button" onClick={() => setPicker(true)}>{t('添加服务商')}</button></div>
    {!providers.length && <p className="runtime-catalog-empty">{t('尚未配置服务商。添加服务商后即可为 Agent 选择模型。')}</p>}
    {providers.map(provider => <button className="runtime-provider-row" type="button" key={provider.id} onClick={() => edit(provider)}><span><strong>{provider.label || provider.id}</strong>{isFactory(provider) && <em>{t('出厂服务商')}</em>}<small>{String(provider.parameters.protocol || 'openai-compatible')} · {provider.base_url}</small></span><span className={`runtime-pill runtime-pill-${provider.configured ? 'online' : 'warn'}`}>{t(provider.configured ? '已配置' : '缺少配置')}</span></button>)}
    {picker && <RuntimeDialog title={t('选择服务商')} onClose={() => setPicker(false)}><div className="runtime-provider-picker">{templates.map(template => <button className="runtime-provider-row" type="button" key={template.id} onClick={() => { setPicker(false); setError(''); setEditor({ template: template.id, name: t(template.name), protocol: 'openai-compatible', base: template.base, key: '' }) }}><span><strong>{t(template.name)}</strong><small>openai-compatible</small></span></button>)}</div></RuntimeDialog>}
    {editor && <RuntimeDialog title={t(editor.id ? '编辑服务商' : '添加服务商')} onClose={() => { if (!busy) setEditor(undefined) }}>
      <form className="runtime-resource-form runtime-provider-editor" onSubmit={event => { event.preventDefault(); void save() }}>
        <fieldset className="runtime-content runtime-resource-form" disabled={busy}>
          <label>{t('协议')}<select value={editor.protocol} onChange={event => setEditor({ ...editor, protocol: event.target.value })}><option value="openai-compatible">OpenAI Compatible</option></select></label>
          <label>{t('名称')}<input className="runtime-control" value={editor.name} autoComplete="off" onChange={event => setEditor({ ...editor, name: event.target.value })} /></label>
          <label>API Base<input className="runtime-control" value={editor.base} placeholder="https://...../v1" onChange={event => setEditor({ ...editor, base: event.target.value })} /></label>
          <label>API Key<input className="runtime-control" type="password" autoComplete="off" value={editor.key} placeholder={editor.keyStored ? t('已配置 — 输入新值可替换') : t('输入 API 密钥')} onChange={event => setEditor({ ...editor, key: event.target.value })} /></label>
          {error && <p className="runtime-panel-error" role="alert">{error}</p>}
          {editor.factory && <p role="note">{t('出厂服务商：删除后需重新安装或升级 Runtime 包才能恢复。')}</p>}
          <div className="runtime-dialog-actions">{editor.id && <button className="runtime-link-danger" type="button" onClick={() => void remove()}>{t('删除')}</button>}<button className="runtime-button runtime-button-secondary" type="button" onClick={() => setEditor(undefined)}>{t('取消')}</button><button className="runtime-button" type="submit">{t('保存')}</button></div>
        </fieldset>
      </form>
    </RuntimeDialog>}
  </div>
}
