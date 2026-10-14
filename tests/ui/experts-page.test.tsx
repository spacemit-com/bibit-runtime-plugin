import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { RuntimeAgentAvatar } from '../../src/RuntimeAgentAvatar'
import { RuntimeExperts } from '../../src/RuntimeExperts'
import { RuntimeI18nProvider } from '../../src/runtime-i18n'
import { RUNTIME_OPS, type AgentView } from '../../src/runtime-contracts'
afterEach(cleanup)
const renderExperts = (ui: React.ReactElement) => render(<RuntimeI18nProvider language="zh">{ui}</RuntimeI18nProvider>)
const agent: AgentView = { id:'expert',name:'Research',name_zh:'研究',name_en:'',description_zh:'',avatar:'🤖',description:'Research expert',soul:'Be precise',model:{provider:'local',name:'qwen'},tools:['*'],skills:[],plugins:[],mcps:[],permissions:{},metadata:{preserve:true},is_default:false,available:true,unavailable_reason:'' }
function requests() { return vi.fn(async (op:string, params?:Record<string,unknown>):Promise<any> => { if(op===RUNTIME_OPS.pluginsList) return {plugins:[]}; if(op===RUNTIME_OPS.providersList) return {providers:[{id:'local',label:'Local',configured:true}]}; if(op===RUNTIME_OPS.capabilitiesList) return {capabilities:params?.kind==='tool' ? [{id:'search',name:'search',display_name:'Search'},{id:'read',name:'read',display_name:'Read'}] : []}; if(op===RUNTIME_OPS.mcpsList || op===RUNTIME_OPS.mcpsRefresh) return {mcps:[]}; if(op===RUNTIME_OPS.providersModelsList) return {models:[]}; if(op===RUNTIME_OPS.agentsUpdate || op===RUNTIME_OPS.agentsCreate) return {...agent,...params}; return {ok:true} }) }
it('creates a model-less expert with the runtime default tools selected',async()=>{
  const defaults=['skills_list','skill_view','skill_manage','terminal','process','read_file','write_file','search_files','patch']
  const request=requests();const base=request.getMockImplementation()!
  request.mockImplementation(async(op,p)=>{
    // 默认能力由 Runtime 配置决定，目录用 preset 标记，插件不再自己维护清单。
    if(op===RUNTIME_OPS.capabilitiesList&&p?.kind==='tool')return {capabilities:[...defaults.map(name=>({id:name,name,display_name:name,enabled:true,preset:true})),{id:'disabled',name:'disabled',display_name:'disabled',enabled:false}]}
    if(op===RUNTIME_OPS.agentsCreate)return {...agent,...p,id:'draft',model:null,available:false,unavailable_reason:'agent_model_required'}
    return base(op,p)
  })
  renderExperts(<RuntimeExperts agents={[]} request={request} onChanged={async()=>{}}/>)
  fireEvent.click(screen.getAllByRole('button',{name:'创建专家'})[0])
  await screen.findByRole('checkbox',{name:'skills_list'})
  for(const name of defaults){const box=screen.getByRole('checkbox',{name}) as HTMLInputElement;expect(box.checked).toBe(true);expect(box.disabled).toBe(true)}
  expect((screen.getByRole('checkbox',{name:'disabled'}) as HTMLInputElement).checked).toBe(false)
  fireEvent.change(screen.getByLabelText('调用名'),{target:{value:'Draft'}})
  fireEvent.click(screen.getByRole('button',{name:'保存'}))
  await waitFor(()=>expect(request).toHaveBeenCalledWith(RUNTIME_OPS.agentsCreate,expect.objectContaining({name:'Draft',model:null,tools:defaults})))
  expect(await screen.findByText('尚未配置模型，请编辑专家选择服务商和模型。')).toBeTruthy()
})
it('loads catalogs only on opening and retains wildcard/metadata/current custom permissions',async()=>{const request=requests(); const changed=vi.fn(async()=>{}); renderExperts(<RuntimeExperts agents={[agent]} request={request} onChanged={changed}/>); expect(request).not.toHaveBeenCalled(); expect(screen.queryByRole('table')).toBeNull(); fireEvent.click(screen.getByRole('button',{name:'编辑专家 研究'})); await waitFor(()=>expect(screen.getByRole('button',{name:'保存'}).hasAttribute('disabled')).toBe(false)); expect((screen.getByLabelText('Search') as HTMLInputElement).checked).toBe(true); fireEvent.click(screen.getByRole('button',{name:'保存'})); await waitFor(()=>expect(changed).toHaveBeenCalled()); expect(request.mock.calls.some(([op])=>op===RUNTIME_OPS.agentsUpdate)).toBe(false); })
it('expands wildcard on individual deselection and restores wildcard through select all',async()=>{const request=requests(); renderExperts(<RuntimeExperts agents={[agent]} request={request} onChanged={async()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'编辑专家 研究'}));await screen.findByLabelText('Search');fireEvent.click(screen.getByLabelText('Search'));expect((screen.getByLabelText('Read') as HTMLInputElement).checked).toBe(true);fireEvent.click(within(screen.getByRole('region',{name:'工具'})).getByRole('button',{name:'全选'}));fireEvent.click(screen.getByRole('button',{name:'保存'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(request.mock.calls.some(([op])=>op===RUNTIME_OPS.agentsUpdate)).toBe(false);})
it('keeps failed save draft and requires deletion confirmation',async()=>{const request=requests();const base=request.getMockImplementation()!;request.mockImplementation(async(op,p)=>{if(op===RUNTIME_OPS.agentsUpdate)throw Error('security unavailable');return base(op,p)});renderExperts(<RuntimeExperts agents={[agent]} request={request} onChanged={async()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'编辑专家 研究'}));await screen.findByLabelText('Search');fireEvent.change(screen.getByLabelText('调用名'),{target:{value:'Draft'}});fireEvent.click(screen.getByRole('button',{name:'保存'}));await screen.findByRole('alert');expect((screen.getByLabelText('调用名') as HTMLInputElement).value).toBe('Draft');fireEvent.click(screen.getByRole('button',{name:'取消'}));fireEvent.click(screen.getByRole('button',{name:'删除专家 研究'}));expect(request.mock.calls.some(([op])=>op===RUNTIME_OPS.agentsDelete)).toBe(false);fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'删除'}));await waitFor(()=>expect(request).toHaveBeenCalledWith(RUNTIME_OPS.agentsDelete,{agent_id:'expert'}));})
it('owns no security configuration: the editor has no policy table, run mode or network scope',async()=>{const request=requests();renderExperts(<RuntimeExperts agents={[{...agent,permissions:{capabilities:[{tool:'search',policy:'allow'}]}}]} request={request} onChanged={async()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'编辑专家 研究'}));await screen.findByLabelText('Search');for(const name of ['search 策略','read 策略','策略表（JSON）','运行时','默认模式','域名','phone 策略']) expect(screen.queryByLabelText(name)).toBeNull();expect(screen.queryByText('能力管理')).toBeNull();fireEvent.change(screen.getByLabelText('简介'),{target:{value:'Changed'}});fireEvent.click(screen.getByRole('button',{name:'保存'}));await waitFor(()=>expect(request).toHaveBeenCalledWith(RUNTIME_OPS.agentsUpdate,expect.objectContaining({agent_id:'expert'})));expect(request.mock.calls.some(([op,params])=>op===RUNTIME_OPS.agentsUpdate&&('permissions' in (params as Record<string,unknown>)))).toBe(false);})
it('never sends a retired execution declaration when saving an expert',async()=>{const request=requests();renderExperts(<RuntimeExperts agents={[{...agent,metadata:{preserve:true}}]} request={request} onChanged={async()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'编辑专家 研究'}));await screen.findByLabelText('Search');fireEvent.change(screen.getByLabelText('简介'),{target:{value:'Changed'}});fireEvent.click(screen.getByRole('button',{name:'保存'}));await waitFor(()=>expect(request).toHaveBeenCalledWith(RUNTIME_OPS.agentsUpdate,expect.objectContaining({agent_id:'expert',description:'Changed'})));const update=request.mock.calls.find(([op])=>op===RUNTIME_OPS.agentsUpdate);expect(JSON.stringify(update?.[1]??{})).not.toContain('requested_mode');})
it('retries a partial create as update when avatar upload fails',async()=>{const request=requests();const base=request.getMockImplementation()!;request.mockImplementation(async(op,p)=>{if(op===RUNTIME_OPS.agentAvatarUpload)throw Error('avatar offline');return base(op,p)});renderExperts(<RuntimeExperts agents={[]} request={request} onChanged={async()=>{}}/>);fireEvent.click(screen.getAllByRole('button',{name:'创建专家'})[0]);await screen.findByLabelText('Search');fireEvent.change(screen.getByLabelText('调用名'),{target:{value:'Created'}});fireEvent.change(screen.getByLabelText('模型'),{target:{value:'qwen'}});const file=new File(['png'],'avatar.png',{type:'image/png'});fireEvent.change(screen.getByLabelText('上传图片'),{target:{files:[file]}});await waitFor(()=>expect(document.querySelector('.runtime-expert-avatar img')).toBeTruthy());fireEvent.click(screen.getByRole('button',{name:'保存'}));await screen.findByText('avatar offline');fireEvent.click(screen.getByRole('button',{name:'保存'}));await waitFor(()=>expect(request).toHaveBeenCalledWith(RUNTIME_OPS.agentsUpdate,expect.objectContaining({agent_id:'expert'})));expect(request.mock.calls.filter(([op])=>op===RUNTIME_OPS.agentsCreate)).toHaveLength(1);})
it('optional catalog failures preserve unknown IDs and wildcards while allowing edits and retries',async()=>{
  const request=requests(); const base=request.getMockImplementation()!; let fail=true
  request.mockImplementation(async(op,p)=>{if(fail && op===RUNTIME_OPS.capabilitiesList && ['tool','skill'].includes(String(p?.kind)))throw Error(`${p?.kind} offline`);return base(op,p)})
  const persisted={...agent,tools:['*'],skills:['missing-plugin-skill']}
  renderExperts(<RuntimeExperts agents={[persisted]} request={request} onChanged={async()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'编辑专家 研究'}))
  await screen.findByText('tool offline');expect(screen.getByRole('button',{name:'保存'}).hasAttribute('disabled')).toBe(false)
  expect(within(screen.getByRole('region',{name:'工具'})).getByRole('button',{name:'全选'}).hasAttribute('disabled')).toBe(true)
  fireEvent.change(screen.getByLabelText('调用名'),{target:{value:'Renamed'}})
  fireEvent.click(screen.getByRole('button',{name:'保存'}))
  await waitFor(()=>expect(request).toHaveBeenCalledWith(RUNTIME_OPS.agentsUpdate,{agent_id:'expert',name:'Renamed'}))
  fireEvent.click(screen.getByRole('button',{name:'编辑专家 研究'}));await screen.findByText('tool offline');fail=false
  fireEvent.click(screen.getByRole('button',{name:'重试加载目录'}));await screen.findByLabelText('Search');expect((screen.getByLabelText('Search') as HTMLInputElement).checked).toBe(true)
  expect(screen.queryByText('tool offline')).toBeNull()
})
it('shows the localized tool intro with a hover detail in the expert capability picker',async()=>{
  const request=requests();const base=request.getMockImplementation()!
  request.mockImplementation(async(op,p)=>{
    // 内置工具带 Runtime 下发的双语简介，专家配置里也应跟着界面语言走。
    if(op===RUNTIME_OPS.capabilitiesList&&p?.kind==='tool')return {capabilities:[{id:'search',name:'search',display_name:'Search',description:'Search the web; use category=news for current events.',summaries:{zh:'搜索网页；查时事用 category=news。',en:'Search the web; use category=news for current events.'}}]}
    return base(op,p)
  })
  render(<RuntimeI18nProvider language="zh-CN"><RuntimeExperts agents={[agent]} request={request} onChanged={async()=>{}}/></RuntimeI18nProvider>)
  fireEvent.click(screen.getByRole('button',{name:'编辑专家 研究'}))
  const box=await screen.findByRole('checkbox',{name:'search'}) as HTMLInputElement
  const detail=box.closest('.runtime-expert-capability')!.querySelector('small') as HTMLElement
  expect(detail.textContent).toBe('搜索网页；查时事用 category=news。')
  expect(detail.getAttribute('title')).toBe('搜索网页；查时事用 category=news。')
})
it('shows retained missing capability references and lets the user remove them',async()=>{
  const request=requests()
  const persisted={...agent,skills:['missing-plugin-skill'],available:false,unavailable_reason:'agent_skill_not_found'}
  renderExperts(<RuntimeExperts agents={[persisted]} request={request} onChanged={async()=>{}}/>)
  fireEvent.click(screen.getByRole('button',{name:'编辑专家 研究'}))
  const missing=await screen.findByLabelText('missing-plugin-skill') as HTMLInputElement
  expect(missing.checked).toBe(true)
  expect(screen.getByText('能力已卸载或不可用')).toBeTruthy()
  fireEvent.click(missing)
  fireEvent.click(screen.getByRole('button',{name:'保存'}))
  await waitFor(()=>expect(request).toHaveBeenCalledWith(RUNTIME_OPS.agentsUpdate,expect.objectContaining({agent_id:'expert',skills:[]})))
})
it('provider catalog failure blocks saving but retry recovers without discarding draft',async()=>{
  const request=requests();const base=request.getMockImplementation()!;let fail=true
  request.mockImplementation(async(op,p)=>{if(fail&&op===RUNTIME_OPS.providersList)throw Error('provider offline');return base(op,p)})
  renderExperts(<RuntimeExperts agents={[agent]} request={request} onChanged={async()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'编辑专家 研究'}));await screen.findByText(/provider offline/)
  fireEvent.change(screen.getByLabelText('调用名'),{target:{value:'Draft survives'}})
  expect(screen.getByRole('button',{name:'保存'}).hasAttribute('disabled')).toBe(true)
  fail=false;fireEvent.click(screen.getByRole('button',{name:'重试加载目录'}))
  await waitFor(()=>expect(screen.getByRole('button',{name:'保存'}).hasAttribute('disabled')).toBe(false))
  expect((screen.getByLabelText('调用名') as HTMLInputElement).value).toBe('Draft survives')
})

it('shared avatar uses Runtime service bytes rather than a host-relative image URL',async()=>{
  const request=vi.fn(async()=>({media_type:'image/png',base64:'aW1hZ2U='}))
  render(<RuntimeAgentAvatar agent={{id:'expert',avatar:'/api/v1/agents/expert/avatar'}} request={request as any}/>)
  await waitFor(()=>expect(document.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,aW1hZ2U='))
  expect(request).toHaveBeenCalledWith(RUNTIME_OPS.agentAvatarGet,{agent_id:'expert'})
})

it('refreshes replaced avatar bytes with the same agent ID and path', async () => {
  const request = vi.fn().mockResolvedValueOnce({ media_type: 'image/png', base64: 'b2xk' }).mockResolvedValueOnce({ media_type: 'image/png', base64: 'bmV3' })
  const original = { id: 'expert', avatar: '/api/v1/agents/expert/avatar' }
  const { rerender } = render(<RuntimeAgentAvatar agent={original} request={request as any} revision={original} />)
  await waitFor(() => expect(document.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,b2xk'))
  const refreshed = { ...original }
  rerender(<RuntimeAgentAvatar agent={refreshed} request={request as any} revision={refreshed} />)
  await waitFor(() => expect(document.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,bmV3'))
})


it('closes a saved expert before slow refresh finishes and reports refresh failure on the page', async () => {
  let rejectRefresh!: (reason: Error) => void
  const refreshing = new Promise<void>((_, reject) => { rejectRefresh = reject })
  const request = requests()
  renderExperts(<RuntimeExperts agents={[]} request={request} onChanged={() => refreshing} />)
  fireEvent.click(screen.getAllByRole('button', { name: '创建专家' })[0])
  await screen.findByLabelText('Search')
  fireEvent.change(screen.getByLabelText('调用名'), { target: { value: 'Created' } })
  fireEvent.change(screen.getByLabelText('模型'), { target: { value: 'qwen' } })
  fireEvent.click(screen.getByRole('button', { name: '保存' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  rejectRefresh(Error('list refresh offline'))
  expect((await screen.findByRole('alert')).textContent).toContain('list refresh offline')
  expect(screen.queryByRole('dialog')).toBeNull()
})


it('closes a deleted expert before reporting a list refresh failure', async () => {
  const request = requests()
  renderExperts(<RuntimeExperts agents={[agent]} request={request} onChanged={async () => { throw Error('list offline') }} />)
  fireEvent.click(screen.getByRole('button', { name: '删除专家 研究' }))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '删除' }))
  expect(await screen.findByText(/专家已删除，但列表刷新失败/)).toBeTruthy()
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('saves only a changed model while optional catalogs are pending and updates the card immediately', async () => {
  const request = requests(); const base = request.getMockImplementation()!
  request.mockImplementation(async (op, params) => {
    if (op === RUNTIME_OPS.capabilitiesList || op === RUNTIME_OPS.mcpsList) return new Promise(() => {})
    return base(op, params)
  })
  renderExperts(<RuntimeExperts agents={[{ ...agent, permissions: {}, metadata: {} }]} request={request} onChanged={() => new Promise(() => {})} />)
  fireEvent.click(screen.getByRole('button', { name: '编辑专家 研究' }))
  await waitFor(() => expect(screen.getByRole('button', { name: '保存' }).hasAttribute('disabled')).toBe(false))
  expect(within(screen.getByRole('region', { name: '工具' })).getByRole('button', { name: '全选' }).hasAttribute('disabled')).toBe(true)
  fireEvent.change(screen.getByLabelText('模型'), { target: { value: 'qwen-new' } })
  fireEvent.click(screen.getByRole('button', { name: '保存' }))
  await waitFor(() => expect(request).toHaveBeenCalledWith(RUNTIME_OPS.agentsUpdate, { agent_id: 'expert', model: { provider: 'local', name: 'qwen-new' } }))
  expect(await screen.findByText('local · qwen-new')).toBeTruthy()
  expect(screen.getByRole('status').textContent).toContain('下次运行')
})

it('reports a pending save while the model update is in flight', async () => {
  const request = requests(); const base = request.getMockImplementation()!
  let finish!: (value: AgentView) => void
  request.mockImplementation(async (op, params) => op === RUNTIME_OPS.agentsUpdate ? new Promise(resolve => { finish = resolve }) : base(op, params))
  renderExperts(<RuntimeExperts agents={[agent]} request={request} onChanged={async () => {}} />)
  fireEvent.click(screen.getByRole('button', { name: '编辑专家 研究' }))
  await screen.findByLabelText('Search')
  fireEvent.change(screen.getByLabelText('简介'), { target: { value: 'Changed' } })
  fireEvent.click(screen.getByRole('button', { name: '保存' }))
  expect(await screen.findByText('正在保存…')).toBeTruthy()
  expect(request).toHaveBeenCalledWith(RUNTIME_OPS.agentsUpdate, expect.objectContaining({ agent_id: 'expert', description: 'Changed' }))
  finish(agent)
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
})

it('keeps retired permissions untouched when an expert with an empty declaration is saved', async () => {
  const request = requests()
  renderExperts(<RuntimeExperts agents={[{ ...agent, permissions: {}, metadata: {} }]} request={request} onChanged={async () => {}} />)
  fireEvent.click(screen.getByRole('button', { name: '编辑专家 研究' }))
  await screen.findByLabelText('Search')
  fireEvent.change(screen.getByLabelText('简介'), { target: { value: 'Changed' } })
  fireEvent.click(screen.getByRole('button', { name: '保存' }))
  await waitFor(() => expect(request).toHaveBeenCalledWith(RUNTIME_OPS.agentsUpdate, expect.objectContaining({ agent_id: 'expert' })))
  const update = request.mock.calls.find(([op]) => op === RUNTIME_OPS.agentsUpdate)
  expect(Object.keys(update?.[1] ?? {})).not.toContain('permissions')
})

it('applies an edited selection and soul without resending unchanged process configuration', async () => {
  const request = requests()
  renderExperts(<RuntimeExperts agents={[agent]} request={request} onChanged={async () => {}} />)
  fireEvent.click(screen.getByRole('button', { name: '编辑专家 研究' }))
  await screen.findByLabelText('Search')
  fireEvent.click(screen.getByLabelText('Search'))
  fireEvent.change(screen.getByLabelText('Soul'), { target: { value: 'Updated instructions' } })
  fireEvent.click(screen.getByRole('button', { name: '保存' }))
  await waitFor(() => expect(request).toHaveBeenCalledWith(RUNTIME_OPS.agentsUpdate, { agent_id: 'expert', tools: ['read'], soul: 'Updated instructions' }))
})

it('saves an avatar preset without claiming process configuration is being applied', async () => {
  const request = requests(); const base = request.getMockImplementation()!
  let finish!: (value: AgentView) => void
  request.mockImplementation(async (op, params) => op === RUNTIME_OPS.agentsUpdate ? new Promise(resolve => { finish = resolve }) : base(op, params))
  renderExperts(<RuntimeExperts agents={[agent]} request={request} onChanged={async () => {}} />)
  fireEvent.click(screen.getByRole('button', { name: '编辑专家 研究' }))
  await screen.findByLabelText('Search')
  fireEvent.click(screen.getByRole('button', { name: '✨' }))
  fireEvent.click(screen.getByRole('button', { name: '保存' }))
  expect(await screen.findByText('正在保存…')).toBeTruthy()
  expect(screen.queryByText('正在应用进程与安全配置…')).toBeNull()
  finish({ ...agent, avatar: '✨' })
  expect(await screen.findByText('专家已保存。')).toBeTruthy()
})

it('selects plugins as units and excludes their members from independent selectors', async () => {
  const request = requests(); const base = request.getMockImplementation()!
  request.mockImplementation(async (op, params) => {
    if (op === RUNTIME_OPS.pluginsList) return { plugins: [{ id: 'example.bundle', name: 'Bundle', enabled: true }] }
    if (op === RUNTIME_OPS.capabilitiesList) return { capabilities: [{ id: 'owned', name: 'owned', display_name: 'Owned member', plugin_id: 'example.bundle' }] }
    if (op === RUNTIME_OPS.mcpsList || op === RUNTIME_OPS.mcpsRefresh) return { mcps: [{ id: 'example.bundle/server', owner_plugin_id: 'example.bundle' }] }
    return base(op, params)
  })
  renderExperts(<RuntimeExperts agents={[agent]} request={request} onChanged={async () => {}} />)
  fireEvent.click(screen.getByRole('button', { name: '编辑专家 研究' }))
  fireEvent.click(await screen.findByLabelText('Bundle'))
  expect(within(screen.getByRole('dialog')).queryByRole('button', { name: '刷新 MCP 状态' })).toBeNull()
  expect(screen.queryByLabelText('Owned member')).toBeNull()
  expect(screen.queryByRole('region', { name: 'Hook' })).toBeNull()
  expect(screen.queryByLabelText('example.bundle/server')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '保存' }))
  await waitFor(() => expect(request).toHaveBeenCalledWith(RUNTIME_OPS.agentsUpdate,
    { agent_id: 'expert', plugins: ['example.bundle'] }))
})
it('never renders a launch-mode selector even when metadata carries a retired declaration',async()=>{
  const request=requests()
  const retired={...agent,metadata:{preserve:true,runtime:{requested_mode:'sandbox'}}}
  renderExperts(<RuntimeExperts agents={[retired]} request={request} onChanged={async()=>{}}/>)
  fireEvent.click(screen.getByRole('button',{name:'编辑专家 研究'}))
  await screen.findByLabelText('Search')
  expect(screen.queryByLabelText('运行时')).toBeNull()
  const modes=screen.getAllByRole('combobox').filter(node=>Array.from(node.querySelectorAll('option')).some(option=>option.textContent==='主机模式 (HOST)'))
  expect(modes).toHaveLength(0)
})

it('starts a conversation for the selected expert without opening the editor',async()=>{
 const startConversation=vi.fn(async()=>{})
 renderExperts(<RuntimeExperts agents={[agent]} request={requests()} onChanged={async()=>{}} startConversation={startConversation}/>)
 fireEvent.click(screen.getByRole('button',{name:'使用专家'}))
 await waitFor(()=>expect(startConversation).toHaveBeenCalledWith('expert'))
 expect(screen.queryByRole('dialog')).toBeNull()
})
it('shows a refused expert and allows retry',async()=>{
 const startConversation=vi.fn(async()=>{throw Error('Runtime target switched')})
 renderExperts(<RuntimeExperts agents={[agent]} request={requests()} onChanged={async()=>{}} startConversation={startConversation}/>)
 fireEvent.click(screen.getByRole('button',{name:'使用专家'}))
 expect(await screen.findByRole('alert')).toHaveProperty('textContent','Runtime target switched')
 expect(screen.getByRole('button',{name:'使用专家'}).hasAttribute('disabled')).toBe(false)
})

it('keeps capability descriptions on one truncated line and exposes the full text on hover', async () => {
  const description = 'Search the local knowledge base and return the ranked passages of every workspace collection'
  const unavailable = '能力已卸载或不可用'
  const stylesheet = readFileSync(resolve(process.cwd(), 'src/runtime-experts.css'), 'utf8')
  const request = requests(); const base = request.getMockImplementation()!
  request.mockImplementation(async (op, params) => {
    if (op === RUNTIME_OPS.capabilitiesList) return { capabilities: params?.kind === 'tool' ? [{ id: 'search', name: 'search', display_name: 'Search knowledge base', description, enabled: false, unavailable_reason: unavailable }] : [] }
    return base(op, params)
  })
  renderExperts(<RuntimeExperts agents={[agent]} request={request} onChanged={async () => {}} />)
  fireEvent.click(screen.getByRole('button', { name: '编辑专家 研究' }))
  const checkbox = await screen.findByRole('checkbox', { name: 'search' })
  const capability = checkbox.closest('label')!
  const name = within(capability).getByText('Search knowledge base')
  const detail = within(capability).getByText(`${description} · ${unavailable}`)
  expect(name.getAttribute('title')).toBe('Search knowledge base')
  expect(detail.getAttribute('title')).toBe(`${description} · ${unavailable}`)
  expect(detail.previousElementSibling).toBe(name)
  expect(stylesheet).toContain('.runtime-expert-capability > span > strong, .runtime-expert-capability > span > small')
  expect(stylesheet).toContain('text-overflow: ellipsis')
  expect(stylesheet).toContain('white-space: nowrap')
})

it('locks runtime preset capabilities on and never sends an expert without them', async () => {
  const request = requests(); const base = request.getMockImplementation()!
  request.mockImplementation(async (op, params) => {
    if (op === RUNTIME_OPS.capabilitiesList) {
      if (params?.kind !== 'tool') return { capabilities: [] }
      return { capabilities: [
        { id: 'search', name: 'search', display_name: 'Search', description: 'Search files', enabled: true },
        { id: 'read_file', name: 'read_file', display_name: 'read_file', description: 'Read a file', enabled: true, preset: true },
      ] }
    }
    return base(op, params)
  })
  renderExperts(<RuntimeExperts agents={[]} request={request} onChanged={async () => {}} />)
  fireEvent.click(screen.getAllByRole('button', { name: '创建专家' })[0])
  const locked = await screen.findByRole('checkbox', { name: 'read_file' }) as HTMLInputElement
  const selectable = screen.getByRole('checkbox', { name: 'search' }) as HTMLInputElement
  expect(locked.checked).toBe(true)
  expect(locked.disabled).toBe(true)
  expect(within(locked.closest('label')!).getByText(/默认能力，所有专家固定启用/)).toBeTruthy()
  expect(selectable.checked).toBe(false)
  expect(selectable.disabled).toBe(false)

  const selectAll = within(screen.getByRole('region', { name: '工具' })).getByRole('button', { name: '全选' })
  fireEvent.click(selectAll)
  expect(selectable.checked).toBe(true)
  fireEvent.click(selectAll)
  expect(selectable.checked).toBe(false)
  expect(locked.checked).toBe(true)

  fireEvent.change(screen.getByLabelText('调用名'), { target: { value: 'Draft' } })
  fireEvent.click(screen.getByRole('button', { name: '保存' }))
  await waitFor(() => expect(request).toHaveBeenCalledWith(RUNTIME_OPS.agentsCreate,
    expect.objectContaining({ name: 'Draft', tools: ['read_file'] })))
})
it('deletes a factory (Bibit-shipped) expert and keeps the dialog with the runtime message when refused',async()=>{
  const factory: AgentView = { ...agent, id: 'com.bianbu.starter', origin: 'system' }
  const request=requests(); const base=request.getMockImplementation()!
  request.mockImplementation(async(op,p)=>{if(op===RUNTIME_OPS.agentsDelete)throw Error('Bibit 自带专家暂不允许删除');return base(op,p)})
  renderExperts(<RuntimeExperts agents={[factory]} request={request} onChanged={async()=>{}}/>)
  expect(screen.getByText('系统专家')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'删除专家 研究'}))
  expect(await screen.findByText('Bibit 自带的出厂专家；删除后需重新安装或升级 Runtime 包才能恢复，本地修改也会一起删除。')).toBeTruthy()
  expect(request.mock.calls.some(([op])=>op===RUNTIME_OPS.agentsDelete)).toBe(false)
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'删除'}))
  expect(await screen.findAllByText('Bibit 自带专家暂不允许删除')).toHaveLength(2)
  expect(screen.getByRole('dialog')).toBeTruthy()
})
it('removes a factory expert through agents.delete.v1 once the runtime deletes it',async()=>{
  const factory: AgentView = { ...agent, id: 'com.bianbu.starter', origin: 'system' }
  const request=requests(); const changed=vi.fn(async()=>{})
  renderExperts(<RuntimeExperts agents={[factory]} request={request} onChanged={changed}/>)
  fireEvent.click(screen.getByRole('button',{name:'删除专家 研究'}))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'删除'}))
  await waitFor(()=>expect(request).toHaveBeenCalledWith(RUNTIME_OPS.agentsDelete,{agent_id:'com.bianbu.starter'}))
  await waitFor(()=>expect(changed).toHaveBeenCalled())
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('shows the expert display name and summary for the host language', () => {
  const localized: AgentView = { ...agent, name: 'Research', name_zh: '研究专家', name_en: 'Research Expert', description: 'English summary.', description_zh: '中文简介。' }
  const request = requests()
  const { unmount } = render(<RuntimeI18nProvider language="en"><RuntimeExperts agents={[localized]} request={request} onChanged={async () => {}} /></RuntimeI18nProvider>)
  expect(screen.getByText('Research Expert')).toBeTruthy()
  expect(screen.getByText('English summary.')).toBeTruthy()
  expect(screen.queryByText('研究专家')).toBeNull()
  unmount()
  render(<RuntimeI18nProvider language="zh"><RuntimeExperts agents={[localized]} request={request} onChanged={async () => {}} /></RuntimeI18nProvider>)
  expect(screen.getByText('研究专家')).toBeTruthy()
  expect(screen.getByText('中文简介。')).toBeTruthy()
  expect(screen.queryByText('Research Expert')).toBeNull()
})

it('falls back to the call name when the host language has no display name', () => {
  const request = requests()
  render(<RuntimeI18nProvider language="en"><RuntimeExperts agents={[{ ...agent, name_zh: '研究', name_en: '', description_zh: '' }]} request={request} onChanged={async () => {}} /></RuntimeI18nProvider>)
  expect(screen.getByText('Research')).toBeTruthy()
})
it('leaves the network scope and personal-data policy to the security control center',async()=>{const request=requests();renderExperts(<RuntimeExperts agents={[{...agent,permissions:{capabilities:[{tool:'search',policy:'allow'}],network:{mode:'allow_all',domains:[]}}}]} request={request} onChanged={async()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'编辑专家 研究'}));await screen.findByLabelText('Search');for(const name of ['默认模式','域名','个人信息策略']) expect(screen.queryByLabelText(name)).toBeNull();expect(screen.queryByText('网络访问范围')).toBeNull();fireEvent.change(screen.getByLabelText('简介'),{target:{value:'Changed'}});fireEvent.click(screen.getByRole('button',{name:'保存'}));await waitFor(()=>expect(request).toHaveBeenCalledWith(RUNTIME_OPS.agentsUpdate,expect.objectContaining({agent_id:'expert',description:'Changed'})));expect(JSON.stringify(request.mock.calls.find(([op])=>op===RUNTIME_OPS.agentsUpdate)?.[1]??{})).not.toContain('network');})
