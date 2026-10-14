import { useRuntimeI18n } from './runtime-i18n'
import type { LocalModelsView } from './runtime-contracts'
import './runtime-local-models.css'

const types = ['llm', 'embed'] as const

function statusLabel(status: string): string {
  if (status === 'running') return '运行中'
  if (status === 'starting') return '加载中'
  if (status === 'loaded') return '已加载'
  if (status === 'stopped') return '未加载'
  return '状态未知'
}

/**
 * Read-only view of the on-device models.
 *
 * The Runtime only relays what `spacemit-ai-gateway` publishes (through
 * bibit-intent), so this page shows state and never offers download, load or
 * unload controls: those belong to the Gateway, not to Bi-bit.
 */
export function RuntimeLocalModels({ descriptor }: { descriptor: LocalModelsView }) {
  const t = useRuntimeI18n()
  const models = Array.isArray(descriptor.models) ? descriptor.models : []
  const valid = models.every(model => types.includes(model.model_type)
    && typeof model.name === 'string' && model.name.trim().length > 0
    && typeof model.backend === 'string'
    && (model.port === undefined || model.port === null || (Number.isInteger(model.port) && model.port > 0 && model.port <= 65535))
    && (model.path === undefined || model.path === null || typeof model.path === 'string')
    && typeof model.download?.status === 'string' && Number.isFinite(Number(model.download.progress))
    && typeof model.server?.status === 'string')
    && types.every(type => models.filter(model => model.model_type === type).length <= 1)
  return <div className="runtime-models">
    <p>{t('设备上的本地模型由 AI Gateway 提供，本页只读显示状态')}</p>
    {!valid ? <p role="alert">{t('本地模型响应无效')}</p> : <div className="runtime-model-sections">{types.map(type => {
      const model = models.find(item => item.model_type === type)
      const download = model?.download
      const progress = Math.max(0, Math.min(100, Math.round(Number(download?.progress) || 0)))
      const downloading = Boolean(download && ['pending', 'downloading'].includes(download.status))
      const status = model ? t(statusLabel(model.server.status)) : t('未在 AI Gateway 注册')
      return <section key={type} className="runtime-model-section" aria-label={t(type === 'llm' ? '大语言模型' : '向量模型')}>
        <header><div><small>{type.toUpperCase()}</small><h3>{t(type === 'llm' ? '大语言模型' : '向量模型')}</h3></div><span role="status">{status}</span></header>
        {model
          ? <article className="runtime-model-card"><div><div className="runtime-model-title"><h4 title={model.artifact || model.name}>{model.artifact || model.name}</h4></div><div className="runtime-model-meta"><span>{t('模型位置')}: {model.path || model.backend || 'AI Gateway'}</span><span>{status}</span>{downloading && <><progress aria-label={t('下载进度')} max={100} value={progress} /><span>{progress}%</span></>}</div></div></article>
          : <p className="runtime-model-empty">{t('设备上没有该模型的下载或加载记录。')}</p>}
      </section>
    })}</div>}
  </div>
}
