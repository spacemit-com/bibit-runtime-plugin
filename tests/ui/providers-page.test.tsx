import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { RuntimeProviders } from '../../src/RuntimeProviders'
import { RuntimeI18nProvider } from '../../src/runtime-i18n'
import { RUNTIME_OPS, type AgentView, type ProviderView } from '../../src/runtime-contracts'
afterEach(cleanup)
const factory: ProviderView = { id:'custom:bibit', label:'Bibit Built-in', base_url:'https://api.deepseek.com/v1', configured:true, api_key_masked:'sk-****d9d1', origin:'system', parameters:{ record_kind:'custom_provider', custom_id:'bibit', name:'Bibit Built-in', protocol:'openai-compatible' } }
const owned: ProviderView = { id:'deepseek', label:'DeepSeek', base_url:'https://api.deepseek.com/v1', configured:true, api_key_masked:'sk-****d9d1', origin:'user', parameters:{ record_kind:'provider_credential', protocol:'openai-compatible' } }
const handmade: ProviderView = { id:'custom:mine', label:'Mine', base_url:'https://mine.test/v1', configured:true, api_key_masked:'sk-****mine', origin:'user', parameters:{ record_kind:'custom_provider', custom_id:'mine', name:'Mine', protocol:'openai-compatible' } }
const expert = (overrides: Partial<AgentView>): AgentView => ({ id:'com.bianbu.1', name:'BibitEdgeAssistant', name_zh:'Bibit端侧智能助手',name_en:'',description_zh:'', avatar:'🤖', description:'', soul:'', model:null, tools:[], skills:[], mcps:[], plugins:[], permissions:{}, metadata:{}, is_default:false, available:true, unavailable_reason:'', missing_powers:[], ...overrides })
// Chinese assertions pin the language too: the Expert list on this page shows
// the display name of the active language, so an unset context would read the
// English fallback while the rest of the page stays Chinese.
const renderProviders = (ui: React.ReactElement, language = 'zh') => render(<RuntimeI18nProvider language={language}>{ui}</RuntimeI18nProvider>)
const requests = () => vi.fn(async (_op:string, _params?:Record<string,unknown>):Promise<any> => ({ ok:true }))
it('marks the factory provider and deletes it through providers.delete.v1',async()=>{
  const request=requests(); const changed=vi.fn(async()=>{})
  renderProviders(<RuntimeProviders providers={[factory,owned]} agents={[]} request={request} onChanged={changed}/>)
  fireEvent.click(screen.getByRole('button',{name:/Bibit Built-in/}))
  expect(await screen.findByText('出厂服务商：删除后需重新安装或升级 Runtime 包才能恢复。')).toBeTruthy()
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'删除'}))
  expect(request).toHaveBeenCalledWith(RUNTIME_OPS.providersDelete,{provider_id:'custom:bibit'})
  await waitFor(()=>expect(changed).toHaveBeenCalled())
})
it('refuses to delete a provider an expert still uses and names the expert',async()=>{
  // The host client keeps only the error code and drops the Runtime message, so
  // the refusal has to be written by the plugin -- and it has to name the
  // Expert, because the Runtime only reports a content-hash ID.
  const request=requests()
  renderProviders(<RuntimeProviders providers={[factory]} agents={[expert({id:'com.bianbu.278200e1617c',model:{provider:'custom:bibit',name:'deepseek-flash'}})]} request={request} onChanged={async()=>{}}/>)
  fireEvent.click(screen.getByRole('button',{name:/Bibit Built-in/}))
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button',{name:'删除'}))
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(screen.getByText(/Bibit端侧智能助手/)).toBeTruthy()
  expect(screen.getByText(/请先在“专家”页/)).toBeTruthy()
  expect(request).not.toHaveBeenCalledWith(RUNTIME_OPS.providersDelete, expect.anything())
  expect(screen.getByRole('dialog')).toBeTruthy()
})
it('names the blocking expert in the active language and falls back to the call name',async()=>{
  // `name_en` is optional in Power format v2, so an Expert without one keeps its
  // call name instead of showing an empty list entry.
  const named = expert({ id:'com.bianbu.2', name:'WeatherExpert', name_zh:'天气专家', name_en:'NWS Weather Expert', model:{ provider:'custom:bibit', name:'deepseek-flash' } })
  const request=requests()
  const view = (language:string, agent:AgentView) => renderProviders(<RuntimeProviders providers={[factory]} agents={[agent]} request={request} onChanged={async()=>{}}/>, language)
  view('zh', named)
  fireEvent.click(screen.getByRole('button',{name:/Bibit Built-in/}))
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button',{name:'删除'}))
  expect(screen.getByText(/天气专家/)).toBeTruthy()
  cleanup()
  view('en', named)
  fireEvent.click(screen.getByRole('button',{name:/Bibit Built-in/}))
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button',{name:'Delete'}))
  expect(await screen.findByText(/NWS Weather Expert/)).toBeTruthy()
  cleanup()
  view('en', expert({ id:'com.bianbu.3', name:'PlainExpert', model:{ provider:'custom:bibit', name:'deepseek-flash' } }))
  fireEvent.click(screen.getByRole('button',{name:/Bibit Built-in/}))
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button',{name:'Delete'}))
  expect(await screen.findByText(/PlainExpert/)).toBeTruthy()
})

it('deletes a provider once no expert uses it',async()=>{
  const request=requests()
  renderProviders(<RuntimeProviders providers={[owned]} agents={[expert({model:{provider:'custom:bibit',name:'deepseek-flash'}})]} request={request} onChanged={async()=>{}}/>)
  fireEvent.click(screen.getByRole('button',{name:/DeepSeek/}))
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button',{name:'删除'}))
  expect(request).toHaveBeenCalledWith(RUNTIME_OPS.providersDelete,{provider_id:'deepseek'})
})
it('does not mark a provider the user made as a factory resource',async()=>{
  // ``record_kind`` is ``custom_provider`` for packaged and hand-made custom
  // Providers alike; only ``origin`` separates them.
  renderProviders(<RuntimeProviders providers={[handmade]} agents={[]} request={requests()} onChanged={async()=>{}}/>)
  fireEvent.click(screen.getByRole('button',{name:/Mine/}))
  expect(screen.queryByText('出厂服务商：删除后需重新安装或升级 Runtime 包才能恢复。')).toBeNull()
  expect(screen.queryByText('出厂服务商')).toBeNull()
})
it('explains a refusal the host client reduced to a bare error code',async()=>{
  const request=requests(); const base=request.getMockImplementation()!
  request.mockImplementation(async(op,p)=>{ if(op===RUNTIME_OPS.providersDelete){ const error=new Error('The service request failed'); (error as Error & {code:string}).code='unknown'; throw error } return base(op,p) })
  renderProviders(<RuntimeProviders providers={[owned]} agents={[]} request={request} onChanged={async()=>{}}/>)
  fireEvent.click(screen.getByRole('button',{name:/DeepSeek/}))
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button',{name:'删除'}))
  expect(await screen.findByText(/Runtime 拒绝了该操作/)).toBeTruthy()
  expect(screen.queryByText('The service request failed')).toBeNull()
})
it('keeps the runtime refusal message while experts still use it',async()=>{
  const request=requests(); const base=request.getMockImplementation()!
  request.mockImplementation(async(op,p)=>{ if(op===RUNTIME_OPS.providersDelete) throw Error('服务商 custom:bibit 正在被专家使用：com.bianbu.278200e1617c。请先在这些专家里换用其它服务商或删除这些专家，再删除该服务商。'); return base(op,p) })
  renderProviders(<RuntimeProviders providers={[factory]} agents={[]} request={request} onChanged={async()=>{}}/>)
  fireEvent.click(screen.getByRole('button',{name:/Bibit Built-in/}))
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button',{name:'删除'}))
  expect(await screen.findByText(/正在被专家使用/)).toBeTruthy()
  expect(screen.getByRole('dialog')).toBeTruthy()
})

it('offers every vendor the Bibit client lists, plus the Runtime-only local ones',async()=>{
  // The vendor picker is a hard-coded copy of the Runtime catalog, so pin the
  // full set here: the Bibit list (openai..nvidia) plus the Runtime extras.
  renderProviders(<RuntimeProviders providers={[]} agents={[]} request={requests()} onChanged={async()=>{}}/>)
  fireEvent.click(screen.getByRole('button',{name:'添加服务商'}))
  const dialog = await screen.findByRole('dialog')
  const vendors = ['OpenAI','Anthropic','Gemini','OpenRouter','DeepSeek','MiniMax','SiliconFlow','Mistral','Groq','xAI','NVIDIA','Hugging Face','Azure OpenAI','Ollama','LM Studio','自定义服务商']
  for (const vendor of vendors) {
    expect(within(dialog).getByRole('button',{name:new RegExp(`^${vendor.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}( |$)`)})).toBeTruthy()
  }
})

it('says an existing API key can be replaced instead of looking unconfigured', async () => {
  // 服务端只回掩码：输入框空着时，placeholder 必须说明凭据已经存在，否则用户会
  // 以为自己刚配好的密钥没保存。（契约同 DeepSeek Harness 的 keyStored。）
  const { rerender } = renderProviders(<RuntimeProviders providers={[factory]} agents={[]} request={requests()} onChanged={async () => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /Bibit Built-in/ }))
  const stored = within(await screen.findByRole('dialog')).getByLabelText('API Key')
  expect((stored as HTMLInputElement).placeholder).toBe('已配置 — 输入新值可替换')
  expect((stored as HTMLInputElement).value).toBe('')
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '取消' }))

  // 新增服务商时没有可替换的凭据，说的是「输入 API 密钥」。
  rerender(<RuntimeI18nProvider language="zh"><RuntimeProviders providers={[factory]} agents={[]} request={requests()} onChanged={async () => {}} /></RuntimeI18nProvider>)
  fireEvent.click(screen.getByRole('button', { name: '添加服务商' }))
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /DeepSeek/ }))
  const blank = within(await screen.findByRole('dialog')).getByLabelText('API Key')
  expect((blank as HTMLInputElement).placeholder).toBe('输入 API 密钥')
})

it('keeps the stored API key when the field is left untouched', async () => {
  const request = requests()
  renderProviders(<RuntimeProviders providers={[owned]} agents={[]} request={request} onChanged={async () => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /DeepSeek/ }))
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: '保存' }))
  await waitFor(() => expect(request).toHaveBeenCalledWith(RUNTIME_OPS.providersUpdate, expect.objectContaining({ provider_id: 'deepseek' })))
  expect(request.mock.calls[0][1]).not.toHaveProperty('api_key')
})
