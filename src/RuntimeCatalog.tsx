import type { CatalogKind, CapabilityView } from './runtime-contracts'
import { runtimeDisplayDescription, runtimeDisplayName, useRuntimeI18n, useRuntimeLanguage } from './runtime-i18n'

// Content structure follows Runtime console loadToolsSection/renderSkillCard.
// Catalog pages deliberately have no package mutation forms, and Hooks are not
// a selectable capability: a Plugin loads its own Hooks, so there is nothing to
// show here besides the Plugin that owns them.
export function RuntimeCatalog({ kind, items }: { kind: CatalogKind; items: CapabilityView[] }) {
  const t = useRuntimeI18n()
  const language = useRuntimeLanguage()
  const isSkill = kind === 'skill'
  const availableCount = items.filter(item => item.enabled !== false).length
  const description = isSkill ? '查看 Agent 技能；请在专家配置中选择启用项' : '查看 Agent 可调用的内置工具及其状态'
  return <div className="runtime-catalog">
    <div className="runtime-catalog-intro">
      <p>{t(description)}</p>
    </div>
    <div className="runtime-catalog-heading">
      <h3>{t(isSkill ? '技能' : '内置工具')}</h3>
      {items.length > 0 && <span className="runtime-catalog-count">{isSkill ? items.length : `${availableCount}/${items.length}`}</span>}
    </div>
    {items.length === 0 ? <p className="runtime-catalog-empty">{t(isSkill ? '暂无技能' : '暂无内置工具')}</p> : <div className="runtime-catalog-grid">
      {items.map(item => {
        const available = item.enabled !== false
        const title = runtimeDisplayName(item, language)
        // Runtime-owned tools ship a one-line intro per language; anything else
        // (user, Plugin and MCP tools) keeps its own description. The card
        // clamps it and the title attribute is the hover detail.
        const summary = item.summaries?.[language]?.trim() ?? ''
        const description = summary || runtimeDisplayDescription(item, language) || (isSkill ? '--' : item.unavailable_reason || t('依赖或运行环境未满足'))
        return <article key={item.id} className={`runtime-catalog-card${!available && !isSkill ? ' runtime-catalog-unavailable' : ''}`}>
          <span className={`runtime-catalog-icon runtime-catalog-icon-${kind}`} aria-hidden="true">{isSkill ? 'ϟ' : '⚒'}</span>
          <div className="runtime-catalog-body">
            <div className="runtime-catalog-name">
              <strong>{title}</strong>
              {!isSkill && <span className={`runtime-pill runtime-pill-${available ? 'online' : 'warn'}`}>{t(available ? '可用' : '未启用')}</span>}
              {!isSkill && item.origin === 'mcp' && <span className="runtime-pill">MCP · {item.plugin_id || ''}</span>}
            </div>
            <p className="runtime-catalog-description runtime-catalog-clamp" title={description}>{description}</p>
          </div>
        </article>
      })}
    </div>}
  </div>
}
