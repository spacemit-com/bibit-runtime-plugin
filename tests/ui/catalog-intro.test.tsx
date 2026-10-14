import React from 'react'
import {afterEach, expect, it} from 'vitest'
import {cleanup, render, screen} from '@testing-library/react'
import {RuntimeCatalog} from '../../src/RuntimeCatalog'
import {RuntimeI18nProvider} from '../../src/runtime-i18n'
import type {CapabilityView} from '../../src/runtime-contracts'
afterEach(cleanup)
const item: CapabilityView = {id:'web_search',name:'web_search',display_name:'web_search',enabled:true,origin:'builtin',description:'Search the web; use category=news for current events.',summaries:{zh:'搜索网页；查时事用 category=news。',en:'Search the web; use category=news for current events.'}}
function renderTool(capability: CapabilityView, language: string) {
  const {container} = render(<RuntimeI18nProvider language={language}><RuntimeCatalog kind="tool" items={[capability]}/></RuntimeI18nProvider>)
  return container.querySelector('.runtime-catalog-description') as HTMLElement
}
it('shows the tool intro in Chinese and keeps the full text on hover', () => {
  const description = renderTool(item, 'zh-CN')
  expect(description.textContent).toBe('搜索网页；查时事用 category=news。')
  expect(description.getAttribute('title')).toBe('搜索网页；查时事用 category=news。')
})
it('switches the same tool intro to English with the host language', () => {
  const description = renderTool(item, 'en-US')
  expect(description.textContent).toBe('Search the web; use category=news for current events.')
})
it('keeps the tool description for tools that ship no intro', () => {
  const description = renderTool({...item, summaries: undefined, description: 'Targeted find-and-replace edits in files.'}, 'zh-CN')
  expect(description.textContent).toBe('Targeted find-and-replace edits in files.')
  expect(description.getAttribute('title')).toBe('Targeted find-and-replace edits in files.')
})
it('does not use an empty intro', () => {
  const description = renderTool({...item, summaries: {zh: '  '}, description: 'Fallback description'}, 'zh-CN')
  expect(description.textContent).toBe('Fallback description')
})

const skill: CapabilityView = {id:'using-apm',name:'using-apm',display_name:'using-apm',enabled:true,origin:'standalone',description:'Manage Powers with APM.',description_zh:'使用 APM 管理 Power 资源。',name_zh:'APM 使用手册',name_en:'APM Agent Handbook'}

function renderSkill(capability: CapabilityView, language: string) {
  const {container} = render(<RuntimeI18nProvider language={language}><RuntimeCatalog kind="skill" items={[capability]}/></RuntimeI18nProvider>)
  return {
    title: container.querySelector('.runtime-catalog-name strong') as HTMLElement,
    description: container.querySelector('.runtime-catalog-description') as HTMLElement,
  }
}

it('shows the Power-format v2 skill name and intro in the host language', () => {
  const chinese = renderSkill(skill, 'zh-CN')
  expect(chinese.title.textContent).toBe('APM 使用手册')
  expect(chinese.description.textContent).toBe('使用 APM 管理 Power 资源。')
  const english = renderSkill(skill, 'en-US')
  expect(english.title.textContent).toBe('APM Agent Handbook')
  expect(english.description.textContent).toBe('Manage Powers with APM.')
})

it('falls back to name for skills written before Power format v2', () => {
  const legacy: CapabilityView = {...item, id:'plain-skill', name:'plain-skill', display_name:'plain-skill', summaries: undefined}
  for (const language of ['zh-CN', 'en-US']) {
    const rendered = renderSkill(legacy, language)
    expect(rendered.title.textContent).toBe('plain-skill')
    expect(rendered.description.textContent).toBe('Search the web; use category=news for current events.')
  }
})
