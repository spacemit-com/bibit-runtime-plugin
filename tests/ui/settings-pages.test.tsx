import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { RuntimeSettingsPage } from '../../src/RuntimeSettingsPage'
import manifest from '../../bibit.feature.json'
import { FEATURE_ICON_KEYS } from '@bibit/feature-contracts'
import { RUNTIME_OPS } from '../../src/runtime-contracts'
import { featureModule } from '../../src/feature'

const mocks = vi.hoisted(() => ({ request: vi.fn(), available: true, actions: undefined as undefined | { invoke: (action: string, input: unknown) => Promise<unknown> } }))
const { request } = mocks
vi.mock('@bibit/feature-sdk', () => {
  const service = { request: mocks.request }
  const host = { getCapability: (capability: string) =>
    capability === 'host:actions' ? mocks.actions : (mocks.available ? service : undefined) }
  return { useFeatureHostApi: () => host }
})
const props = (contributionId: string, language = 'zh-CN') => ({ featureId: 'runtime', contributionId, language, subpath: '', search: {}, navigation: { push() {}, replace() {}, back() {} } })
afterEach(() => { cleanup(); request.mockReset(); mocks.available = true; mocks.actions = undefined })

describe('independent Runtime settings pages', () => {
  it('hides plugin resources from standalone pages and shows their MCP status on the plugin page', async () => {
    request.mockImplementation(async ({ operationId, params }) => {
      if (operationId === RUNTIME_OPS.mcpsList) return { mcps: [{ id: 'office.core/weather', display_name: 'Plugin weather', owner_plugin_id: 'office.core', status: 'running', transport: 'stdio', removable: false, tools: [{ id: 'w1', name: 'w1' }] }] }
      if (operationId === RUNTIME_OPS.capabilitiesList && params?.kind === 'skill') return { capabilities: [{ id: 'office.core/review', display_name: 'Plugin review', plugin_id: 'office.core' }] }
      if (operationId === RUNTIME_OPS.pluginsList) return { plugins: [{ id: 'office.core', members: [
        { id: 'office.core/check', kind: 'hook', name: 'check' },
        { id: 'office.core/review', kind: 'skill', name: 'review' },
        { id: 'office.core/weather', kind: 'mcp', name: 'weather' },
      ] }] }
      throw Error(`Unexpected operation: ${operationId}`)
    })
    const { rerender } = render(<RuntimeSettingsPage {...props('skills')} />)
    await screen.findByText('暂无技能')
    expect(screen.queryByText('Plugin review')).toBeNull()
    rerender(<RuntimeSettingsPage {...props('mcp')} />)
    // 插件自带的 MCP 不在 MCP 页显示状态，只在原地说明它们去哪儿了。
    await screen.findByText(/这里没有独立 MCP；插件自带的 MCP 在插件页显示/)
    expect(screen.queryByText('Plugin weather')).toBeNull()
    expect(screen.queryByText('running')).toBeNull()
    rerender(<RuntimeSettingsPage {...props('plugins')} />)
    expect(await screen.findByText('Hook · check')).toBeTruthy()
    expect(screen.getByText('Skill · review')).toBeTruthy()
    // 成员清单里不再混入 MCP，状态单独一段，来自 /mcp-servers 的实时快照；
    // 状态用生命周期词（running → 就绪），与控制台同一套。
    expect(screen.getByText('MCP 见下方')).toBeTruthy()
    expect(screen.getByText('office.core/weather')).toBeTruthy()
    expect(screen.getByText('就绪')).toBeTruthy()
    expect(screen.getByText('1 个工具')).toBeTruthy()
  })
  it('explains what a not-ready MCP is doing instead of one status word', async () => {
    // 用户报的是「装完 bilibili.search 之后一直 not_loaded/preparing，不知道
    // 在干什么」：状态词要说清是哪一步，真实原因要原样带出来。
    request.mockImplementation(async ({ operationId }) => {
      if (operationId === RUNTIME_OPS.mcpsList) return { mcps: [
        { id: 'mcp.bilibili-search', display_name: 'bilibili-search', command: 'npx bilibili-mcp-js',
          status: 'preparing', state: 'preparing', phase: 'installing', ready: false, tools_count: 0,
          transport: 'stdio', tools: [], removable: true },
        { id: 'mcp.notes', display_name: 'notes', command: 'notes-mcp',
          status: 'not_loaded', state: 'not_loaded', phase: '', ready: false, tools_count: 0,
          transport: 'stdio', tools: [], removable: true },
        { id: 'mcp.broken', display_name: 'broken', command: 'npx broken',
          status: 'unhealthy', state: 'failed', phase: '', ready: false, tools_count: 0,
          detail: 'npm 404 Not Found', transport: 'stdio', tools: [], removable: true },
        { id: 'mcp.done', display_name: 'done', command: 'done-mcp',
          status: 'healthy', state: 'ready', phase: '', ready: true, tools_count: 2,
          transport: 'stdio', tools: [{ id: 'a', name: 'a', display_name: 'a' }], removable: true },
      ] }
      throw Error(`Unexpected operation: ${operationId}`)
    })
    render(<RuntimeSettingsPage {...props('mcp')} />)

    expect(await screen.findByText('准备中')).toBeTruthy()
    expect(screen.getByText(/正在安装依赖/)).toBeTruthy()
    // not_loaded 不是死状态：Runtime 会自己准备已安装的 Server，也能刷新重试。
    expect(screen.getByText('未加载')).toBeTruthy()
    expect(screen.getByText(/Runtime 会在 Worker 就绪时自动准备/)).toBeTruthy()
    // 真原因原样显示，不翻译成「失败」两个字。
    expect(screen.getByText('失败')).toBeTruthy()
    expect(screen.getByText('npm 404 Not Found')).toBeTruthy()
    // 已就绪的 Server 不再解释进度，只报工具数。
    expect(screen.getByText('就绪')).toBeTruthy()
    expect(screen.getByText('1 个工具')).toBeTruthy()
  })

  it('renders the MCP lifecycle in the host language', async () => {
    request.mockImplementation(async ({ operationId }) => {
      if (operationId === RUNTIME_OPS.mcpsList) return { mcps: [
        { id: 'mcp.a', display_name: 'a', command: 'a', status: 'preparing', state: 'preparing',
          phase: 'starting', ready: false, tools_count: 0, transport: 'stdio', tools: [], removable: true },
      ] }
      throw Error(`Unexpected operation: ${operationId}`)
    })
    render(<RuntimeSettingsPage {...props('mcp', 'en-US')} />)
    expect(await screen.findByText('Preparing')).toBeTruthy()
    expect(screen.getByText('Starting and handshaking...')).toBeTruthy()
  })

  it('shows system MCP ownership without a plugin label or uninstall action', async () => {
    request.mockResolvedValue({ mcps: [{ id: 'bibit-intent', display_name: 'Intent',
      status: 'not_loaded', transport: 'stdio', tools: [], source_kind: 'system',
      owner_plugin_id: null, removable: false }] })
    render(<RuntimeSettingsPage {...props('mcp')} />)
    await screen.findByText('系统安装')
    expect(screen.queryByRole('button', { name: '卸载' })).toBeNull()
    expect(screen.queryByText(/Plugin ·/)).toBeNull()
  })
  it('sends MCP installs as updates so an existing server can be replaced', async () => {
    request.mockImplementation(async ({ operationId }) => {
      if (operationId === RUNTIME_OPS.mcpsList) return { mcps: [] }
      if (operationId === RUNTIME_OPS.mcpsInstall) return { ok: true }
      throw Error(`Unexpected operation: ${operationId}`)
    })
    render(<RuntimeSettingsPage {...props('mcp')} />)
    await screen.findByText('暂无 MCP Server')
    fireEvent.change(screen.getByLabelText('名称'), { target: { value: 'filesystem' } })
    fireEvent.change(screen.getByLabelText('启动命令'), { target: { value: 'npx server /data' } })
    fireEvent.click(screen.getByRole('button', { name: '安装或更新' }))
    await waitFor(() => expect(request).toHaveBeenCalledWith(expect.objectContaining({ operationId: RUNTIME_OPS.mcpsInstall, params: { name: 'filesystem', command: 'npx server /data', upgrade: true } })))
  })
  it('keeps looking after an install until the Worker publishes the server', async () => {
    // 安装响应可以比 Worker 先到（那一步有 5 秒上界），刚装完刷新只能看到
    //「未加载」。页面得自己接着看，不许把这个状态留给用户去猜。
    let reads = 0
    let installed = false
    request.mockImplementation(async ({ operationId }) => {
      if (operationId === RUNTIME_OPS.mcpsInstall) { installed = true; return { ok: true } }
      if (operationId === RUNTIME_OPS.mcpsList) {
        if (!installed) return { mcps: [] }
        reads += 1
        return { mcps: [{ id: 'mcp.notes', display_name: 'notes', command: 'notes-mcp',
          status: reads >= 2 ? 'healthy' : 'not_loaded', state: reads >= 2 ? 'ready' : 'not_loaded',
          phase: '', ready: reads >= 2, tools_count: 0, transport: 'stdio', tools: [], removable: true }] }
      }
      throw Error(`Unexpected operation: ${operationId}`)
    })
    render(<RuntimeSettingsPage {...props('mcp')} />)
    await screen.findByText('暂无 MCP Server')
    fireEvent.change(screen.getByLabelText('名称'), { target: { value: 'notes' } })
    fireEvent.change(screen.getByLabelText('启动命令'), { target: { value: 'notes-mcp' } })
    fireEvent.click(screen.getByRole('button', { name: '安装或更新' }))

    // 谁也没点刷新：页面自己等到 Worker 发布完。
    expect(await screen.findByText('就绪', {}, { timeout: 8000 })).toBeTruthy()
    expect(reads).toBeGreaterThanOrEqual(2)
  })
  it('refreshes MCP health from the page refresh instead of a second button', async () => {
    // 之前这里有两个刷新按钮：页面顶部一个「刷新」、MCP 面板里一个「刷新 MCP
    // 状态」，做的事还不一样。现在只有一个，且它会连同健康检查一起做。
    request.mockImplementation(async ({ operationId }) => {
      if (operationId === RUNTIME_OPS.mcpsList || operationId === RUNTIME_OPS.mcpsRefresh) return { mcps: [] }
      throw Error(`Unexpected operation: ${operationId}`)
    })
    render(<RuntimeSettingsPage {...props('mcp')} />)
    await screen.findByText('暂无 MCP Server')
    expect(screen.queryByRole('button', { name: '刷新 MCP 状态' })).toBeNull()
    request.mockClear()
    fireEvent.click(screen.getByRole('button', { name: '刷新' }))
    await waitFor(() => expect(request).toHaveBeenCalledWith(expect.objectContaining({ operationId: RUNTIME_OPS.mcpsRefresh })))
    // 健康检查之后还要重新读一遍目录，否则面板停在健康检查前的那份快照上。
    await waitFor(() => expect(request).toHaveBeenCalledWith(expect.objectContaining({ operationId: RUNTIME_OPS.mcpsList })))
  })
  it('drops an uninstalled MCP Server from the panel without a manual refresh', async () => {
    let installed = true
    request.mockImplementation(async ({ operationId }) => {
      if (operationId === RUNTIME_OPS.mcpsList) return { mcps: installed ? [{ id: 'mcp.demo', display_name: 'Demo MCP', status: 'running', transport: 'stdio', tools: [], removable: true }] : [] }
      if (operationId === RUNTIME_OPS.mcpsDelete) { installed = false; return { ok: true } }
      throw Error(`Unexpected operation: ${operationId}`)
    })
    render(<RuntimeSettingsPage {...props('mcp')} />)
    await screen.findByText('Demo MCP')
    fireEvent.click(screen.getByRole('button', { name: '卸载' }))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: '卸载' }))
    expect(await screen.findByText('暂无 MCP Server')).toBeTruthy()
    expect(screen.queryByText('Demo MCP')).toBeNull()
  })
  it('reads the catalog again when the host cuts a mutation off as a timeout', async () => {
    let installed = true
    request.mockImplementation(async ({ operationId }) => {
      if (operationId === RUNTIME_OPS.mcpsList) return { mcps: installed ? [{ id: 'mcp.demo', display_name: 'Demo MCP', status: 'running', transport: 'stdio', tools: [], removable: true }] : [] }
      if (operationId === RUNTIME_OPS.mcpsDelete) {
        // 宿主在 30s 上把这次变更掐了，但 Runtime 还在重建 Worker，随后会做完。
        installed = false
        const error = new Error('Runtime service request timed out') as Error & { code: string }
        error.code = 'timeout'
        throw error
      }
      throw Error(`Unexpected operation: ${operationId}`)
    })
    render(<RuntimeSettingsPage {...props('mcp')} />)
    await screen.findByText('Demo MCP')
    fireEvent.click(screen.getByRole('button', { name: '卸载' }))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: '卸载' }))
    // 报超时之前先重读目录：否则面板停在动作前的快照上，用户只能手点刷新。
    expect(await screen.findByText('暂无 MCP Server')).toBeTruthy()
    expect(await screen.findByText(/请求超时/)).toBeTruthy()
    expect(screen.queryByText('Demo MCP')).toBeNull()
  })
  it('gives catalog mutations the long budget and leaves reads on the host default', async () => {
    request.mockImplementation(async ({ operationId }) => {
      if (operationId === RUNTIME_OPS.mcpsList) return { mcps: [] }
      if (operationId === RUNTIME_OPS.mcpsInstall) return { ok: true }
      throw Error(`Unexpected operation: ${operationId}`)
    })
    render(<RuntimeSettingsPage {...props('mcp')} />)
    await screen.findByText('暂无 MCP Server')
    fireEvent.change(screen.getByLabelText('名称'), { target: { value: 'filesystem' } })
    fireEvent.change(screen.getByLabelText('启动命令'), { target: { value: 'npx server /data' } })
    fireEvent.click(screen.getByRole('button', { name: '安装或更新' }))
    await waitFor(() => expect(request).toHaveBeenCalledWith(expect.objectContaining({ operationId: RUNTIME_OPS.mcpsInstall, timeoutMs: 180000 })))
    const reads = request.mock.calls.map(([input]) => input as { operationId: string; timeoutMs?: number }).filter(call => call.operationId === RUNTIME_OPS.mcpsList)
    expect(reads.length).toBeGreaterThan(0)
    expect(reads.every(call => call.timeoutMs === undefined)).toBe(true)
  })
  it('relays the Runtime reason when an MCP Server cannot be uninstalled', async () => {
    request.mockImplementation(async ({ operationId }) => {
      if (operationId === RUNTIME_OPS.mcpsList) return { mcps: [{ id: 'mcp.demo', display_name: 'Demo MCP', status: 'running', transport: 'stdio', tools: [], removable: true }] }
      if (operationId === RUNTIME_OPS.mcpsDelete) {
        const error = new Error('MCP server mcp.demo 由插件 runtime 管理，请改为删除所属插件。') as Error & { code: string }
        error.code = 'unknown'
        throw error
      }
      throw Error(`Unexpected operation: ${operationId}`)
    })
    render(<RuntimeSettingsPage {...props('mcp')} />)
    fireEvent.click(await screen.findByRole('button', { name: '卸载' }))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: '卸载' }))
    expect(await screen.findByText(/由插件 runtime 管理/)).toBeTruthy()
  })
  it('explains a refused Plugin delete the host reduced to a bare error code', async () => {
    request.mockImplementation(async ({ operationId }) => {
      if (operationId === RUNTIME_OPS.pluginsList) return { plugins: [{ id: 'demo.plugin', members: [] }] }
      if (operationId === RUNTIME_OPS.pluginsDelete) {
        const error = new Error('The service request failed') as Error & { code: string }
        error.code = 'unknown'
        throw error
      }
      throw Error(`Unexpected operation: ${operationId}`)
    })
    render(<RuntimeSettingsPage {...props('plugins')} />)
    fireEvent.click(await screen.findByRole('button', { name: '删除' }))
    expect(await screen.findByText(/Runtime 拒绝了该操作/)).toBeTruthy()
  })
  it.each(['tools', 'skills'])('preserves the Runtime catalog workflow for %s', async page => {
    request.mockImplementation(async ({ operationId }) => {
      if (operationId !== RUNTIME_OPS.capabilitiesList) throw Error('Catalog must not require package administration')
      return { capabilities: [{ id: 'catalog-entry', name: 'catalog-entry', display_name: 'Example capability', description: 'Capability description', enabled: false, origin: 'builtin', assignable: false, unavailable_reason: 'Missing dependency' }] }
    })
    render(<RuntimeSettingsPage {...props(page, 'en')} />)
    expect(await screen.findByText('Example capability')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Install' })).toBeNull()
    expect(request.mock.calls.map(([input]) => input.operationId)).toEqual([RUNTIME_OPS.capabilitiesList])
    if (page !== 'skills') expect(screen.getByText('Unavailable')).toBeTruthy()
  })
  it('distinguishes a missing host grant from a backend request failure', async () => {
    mocks.available = false
    render(<RuntimeSettingsPage {...props('runtime-status')} />)
    expect(await screen.findByText('宿主未提供 Runtime 服务能力，请检查插件授权配置并重启 Bi-bit。')).toBeTruthy()
    expect(screen.getByText('宿主能力未提供')).toBeTruthy()
    expect(request).not.toHaveBeenCalled()
  })
  it('registers all screenshot entries in core order with separate paths and names', () => {
    const items = manifest.contributions.settings
    expect(items.map(item => item.navigation.fallbackTitle)).toEqual(['Experts', 'Providers', 'Local Models', 'Tools', 'MCP', 'Skills', 'Plugins', 'Security', 'Agent Top', 'Runtime Status', 'Logs'])
    expect(items.map(item => item.navigation.titleKey)).toEqual(items.map(item => `runtime:${item.id}`))
    expect(items.every(item => item.navigation.group === 'core' && item.path !== '')).toBe(true)
    expect(new Set(items.map(item => item.path)).size).toBe(11)
    expect(items.slice(0,8).every(item => item.navigation.section.fallbackTitle === 'Management' && item.navigation.section.titleKey === 'runtime:management')).toBe(true)
    expect(items.slice(8).every(item => item.navigation.section.fallbackTitle === 'Monitoring' && item.navigation.section.titleKey === 'runtime:monitoring')).toBe(true)
  })
  it('gives every settings entry its own icon from the shipped host glyph set', () => {
    const icons = Object.fromEntries(
      manifest.contributions.settings.map(item => [item.id, item.navigation.iconKey]),
    )
    // 声明宿主不认识的 iconKey 会让旧宿主（闭合枚举）整插件拒绝，所以声明的键
    // 必须落在宿主字形表里；字形表随宿主发布走，宿主扩表后这里才跟着扩。
    expect(
      Object.values(icons).every(iconKey =>
        (FEATURE_ICON_KEYS as readonly string[]).includes(iconKey),
      ),
    ).toBe(true)
    // 这些入口曾经共用一颗 settings 齿轮，导航里分不出谁是谁。
    expect(new Set(Object.values(icons)).size).toBe(manifest.contributions.settings.length)
    expect(icons).toEqual({
      agents: 'users',
      providers: 'plug',
      'bibit-models': 'brain',
      tools: 'wrench',
      mcp: 'server',
      skills: 'sparkles',
      plugins: 'puzzle',
      security: 'security',
      'agent-top': 'gauge',
      'runtime-status': 'activity',
      logs: 'logs',
    })
  })
  it('exports menu resources for both official host languages', () => {
    expect(Object.keys(featureModule.locales ?? {}).sort()).toEqual(['en', 'zh-CN'])
    expect(featureModule.locales?.en.management).toBe('Management')
    expect(featureModule.locales?.['zh-CN'].security).toBe('安全')
    for (const language of ['en', 'zh-CN'] as const) {
      const resource = featureModule.locales?.[language] ?? {}
      for (const item of manifest.contributions.settings) {
        expect(resource[item.navigation.titleKey.split(':')[1]]).toBeTruthy()
        expect(resource[item.navigation.section.titleKey.split(':')[1]]).toBeTruthy()
      }
    }
  })
  it('renders page copy from the language supplied by the host', async () => {
    request.mockResolvedValue({ text: '' })
    const view = render(<RuntimeSettingsPage {...props('logs', 'en')} />)
    expect(await screen.findByRole('heading', { name: 'Logs' })).toBeTruthy()
    expect(screen.getByRole('log')).toBeTruthy()
    view.rerender(<RuntimeSettingsPage {...props('logs', 'zh-CN')} />)
    expect(await screen.findAllByRole('heading', { name: '日志' })).toHaveLength(1)
  })
  it('preserves an unsaved draft and busy state during a host language switch', async () => {
    let finishCreate: (value: unknown) => void = () => undefined
    const creating = new Promise(resolve => { finishCreate = resolve })
    request.mockImplementation(async ({ operationId }) => {
      if (operationId === RUNTIME_OPS.providersList) return { providers: [] }
      // The Provider page also lists Experts: the delete guard needs their
      // names, because the host client drops the Runtime's own refusal text.
      if (operationId === RUNTIME_OPS.agentsList) return { agents: [] }
      if (operationId === RUNTIME_OPS.providersCreate) return creating
      throw new Error(`Unexpected operation: ${operationId}`)
    })
    const view = render(<RuntimeSettingsPage {...props('providers', 'en')} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Add Provider' }))
    fireEvent.click(screen.getByRole('button', { name: /Custom Provider/ }))
    const id = screen.getByLabelText('Name')
    fireEvent.change(screen.getByLabelText('API Base'), { target: { value: 'https://example.test/v1' } })
    fireEvent.change(id, { target: { value: 'draft-provider' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    view.rerender(<RuntimeSettingsPage {...props('providers', 'zh-CN')} />)
    expect((screen.getByLabelText('名称') as HTMLInputElement).value).toBe('draft-provider')
    expect((screen.getByRole('button', { name: '保存' }).closest('fieldset') as HTMLFieldSetElement).disabled).toBe(true)
    finishCreate({})
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
  it('loads only logs on the log route and has no nested console tabs', async () => {
    request.mockImplementation(async ({operationId}) => {
      if (operationId === RUNTIME_OPS.logsGet) return {text: 'log from actual adapter'}
      throw new Error('Unrelated endpoint must not load')
    })
    render(<RuntimeSettingsPage {...props('logs')} />)
    await screen.findByText('log from actual adapter')
    expect(screen.queryByRole('navigation', {name: 'Runtime console sections'})).toBeNull()
    expect(request.mock.calls.map(([input]) => input.operationId)).toEqual([RUNTIME_OPS.logsGet])
  })
  it('loads skills separately and preserves explicit service failure', async () => {
    request.mockRejectedValue(new Error('skills endpoint rejected the request'))
    render(<RuntimeSettingsPage {...props('skills')} />)
    await screen.findByRole('alert')
    expect(screen.getByRole('alert').textContent).toContain('skills endpoint rejected the request')
    expect(request.mock.calls.some(([input]) => input.operationId === RUNTIME_OPS.capabilitiesList && input.params.kind === 'skill')).toBe(true)
    expect(screen.queryByText('Runtime 已连接')).toBeNull()
  })
  it('turns a host offline code into the command that brings the adapter back', async () => {
    // /usr/bin/bibit-gui throws ExternalServiceError('offline',
    // 'The service is offline') when the external-service adapter is dead, and
    // that placeholder names nothing a user can act on.
    request.mockRejectedValue(Object.assign(new Error('The service is offline'), { code: 'offline' }))
    render(<RuntimeSettingsPage {...props('skills')} />)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('bibit-runtime-adapter@bianbu.service')
    expect(alert.textContent).toContain('sudo systemctl start bianbu-agent-runtime bibit-runtime-adapter@bianbu')
    expect(alert.textContent).not.toContain('The service is offline')
  })
  it('translates the offline recovery command', async () => {
    request.mockRejectedValue(Object.assign(new Error('The service is offline'), { code: 'offline' }))
    render(<RuntimeSettingsPage {...props('skills', 'en')} />)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Run sudo systemctl start bianbu-agent-runtime bibit-runtime-adapter@bianbu in a terminal'))
    expect(screen.getByRole('alert').textContent).not.toContain('The service is offline')
  })
  it('still names the adapter when the host drops the error code', async () => {
    // The vendored dev host throws only `Error(envelope.error.message)`, so the
    // offline sentence can arrive without a code, in the host's wording
    // ("The service is offline") or the adapter's ("Runtime service is offline").
    for (const placeholder of ['The service is offline', 'Runtime service is offline']) {
      request.mockRejectedValue(new Error(placeholder))
      const view = render(<RuntimeSettingsPage {...props('skills')} />)
      await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('bibit-runtime-adapter@bianbu.service'))
      expect(screen.getByRole('alert').textContent).not.toContain(placeholder)
      view.unmount()
    }
  })
  it('uses the same recovery text when the provider catalog is unreachable', async () => {
    request.mockImplementation(async ({ operationId }) => {
      if (operationId === RUNTIME_OPS.providersList) throw Object.assign(new Error('The service is offline'), { code: 'offline' })
      throw Error(`Unexpected operation: ${operationId}`)
    })
    render(<RuntimeSettingsPage {...props('providers')} />)
    const alerts = await screen.findAllByRole('alert')
    expect(alerts.some(node => node.textContent?.includes('bibit-runtime-adapter@bianbu.service'))).toBe(true)
  })
  it('reports the local model state as unavailable without claiming the Runtime is down', async () => {
    request.mockImplementation(async ({ operationId }) => {
      if (operationId === RUNTIME_OPS.localModelsGet) {
        throw Error('Bibit Intent request failed (http://127.0.0.1:8765/v1/models): All connection attempts failed')
      }
      throw Error(`Unexpected operation: ${operationId}`)
    })
    render(<RuntimeSettingsPage {...props('bibit-models')} />)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('本地模型状态不可用')
    expect(alert.textContent).toContain('All connection attempts failed')
    expect(alert.textContent).toContain('AI Gateway')
    expect(screen.getByText('Runtime 已连接')).toBeTruthy()
    expect(screen.getByRole('button', { name: '重试' })).toBeTruthy()
  })
  it('shows the local models read-only, without any lifecycle button', async () => {
    request.mockImplementation(async ({operationId}) => {
      if (operationId === RUNTIME_OPS.localModelsGet) return {source:'bibit-intent', read_only:true, models: [{model_type:'llm', name:'bibit-llm', artifact:'glm-edge-1.5b-chat-q4_0.gguf', backend:'ai_gateway', port:null, path:'/home/bianbu/.cache/models/llm/glm-edge-1.5b-chat-q4_0.gguf', download:{status:'completed',progress:100}, server:{status:'running'}},{model_type:'embed',name:'bibit-embed',artifact:'Qwen3-Embedding-0.6B-Q4_0.gguf',backend:'ai_gateway',port:null,path:'/home/bianbu/.cache/models/embed/Qwen3-Embedding-0.6B-Q4_0.gguf',download:{status:'downloading',progress:64},server:{status:'stopped'}}]}
      throw Error(`Unexpected operation: ${operationId}`)
    })
    render(<RuntimeSettingsPage {...props('bibit-models')} />)
    await screen.findByText('glm-edge-1.5b-chat-q4_0.gguf')
    expect(screen.getByText('Qwen3-Embedding-0.6B-Q4_0.gguf')).toBeTruthy()
    expect(screen.queryByText(/bibit-llm/)).toBeNull()
    expect(screen.queryByText(/bibit-embed/)).toBeNull()
    expect(screen.getByText('/home/bianbu/.cache/models/embed/Qwen3-Embedding-0.6B-Q4_0.gguf', {exact:false})).toBeTruthy()
    expect(screen.getByText('64%')).toBeTruthy()
    expect(screen.queryByRole('button', {name:'启动服务'})).toBeNull()
    expect(screen.queryByRole('button', {name:'停止服务'})).toBeNull()
    expect(screen.queryByRole('button', {name:'下载模型'})).toBeNull()
    expect(screen.queryByRole('button', {name:'取消下载'})).toBeNull()
    await waitFor(() => expect(request).toHaveBeenCalledWith(expect.objectContaining({operationId:RUNTIME_OPS.localModelsGet})))
  })
  it('opens the original plugin descriptor and installs using the current source contract', async () => {
    request.mockImplementation(async ({ operationId }) => {
      if (operationId === RUNTIME_OPS.pluginsList) return { plugins: [{ id: 'example-plugin' }] }
      if (operationId === RUNTIME_OPS.pluginsGet) return { id: 'example-plugin', version: '1.2.3' }
      if (operationId === RUNTIME_OPS.pluginsInstall) return { id: 'installed-plugin' }
      throw Error('Unexpected request')
    })
    render(<RuntimeSettingsPage {...props('plugins', 'en')} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Inspect' }))
    expect(await screen.findByText(/1.2.3/)).toBeTruthy()
    fireEvent.change(screen.getByPlaceholderText('/absolute/path/to/plugin'), { target: { value: ' /tmp/plugin ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Install', exact: true }))
    await waitFor(() => expect(request).toHaveBeenCalledWith(expect.objectContaining({ operationId: RUNTIME_OPS.pluginsInstall, params: { source: '/tmp/plugin' } })))
    await waitFor(() => expect((screen.getByPlaceholderText('/absolute/path/to/plugin') as HTMLInputElement).value).toBe(''))
  })

  it('loads current runtime workers instead of the separate executions API', async () => {
    request.mockImplementation(async ({operationId}) => {
      if (operationId === 'workers.get.v1') return {control:{pid:123,state:'running'},worker_count:1,workers:[{agent_id:'real-worker',state:'running',pid:456}]}
      if (operationId === RUNTIME_OPS.statusGet) return {status:'AGENT_READY'}
      if (operationId === RUNTIME_OPS.settingsGet) return {deployment:{},runtime:{}}
      throw Error('Unsupported endpoint')
    })
    render(<RuntimeSettingsPage {...props('runtime-status')} />)
    await screen.findByText('real-worker')
    expect(request.mock.calls.some(([input]) => input.operationId === RUNTIME_OPS.executionsList)).toBe(false)
  })
  it.each(['mcp','plugins'])('does not request unsupported package kinds for %s', async id => {
    request.mockImplementation(async ({operationId}) => {
      if (operationId === RUNTIME_OPS.packagesList) throw Error('Only tool, skill, hook, agent supported')
      return {mcps:[],plugins:[]}
    })
    render(<RuntimeSettingsPage {...props(id)} />)
    await screen.findByText('Runtime 已连接')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(request.mock.calls.some(([input]) => input.operationId === RUNTIME_OPS.packagesList)).toBe(false)
  })

  it('preserves an edited form when a service mutation fails', async () => {
    request.mockImplementation(async ({operationId}) => {
      if(operationId === RUNTIME_OPS.providersList) return {providers:[]}
      if(operationId === RUNTIME_OPS.agentsList) return {agents:[]}
      throw Error('Provider save rejected')
    })
    render(<RuntimeSettingsPage {...props('providers')} />)
    fireEvent.click(await screen.findByRole('button', { name: '添加服务商' }))
    fireEvent.click(screen.getByRole('button', { name: /自定义服务商/ }))
    const input = screen.getByLabelText('名称')
    fireEvent.change(screen.getByLabelText('API Base'), { target: { value: 'https://example.test/v1' } })
    fireEvent.change(input, {target:{value:'my-provider'}})
    fireEvent.click(screen.getByRole('button',{name:'保存',exact:true}))
    await screen.findByText('Provider save rejected')
    expect((screen.getByLabelText('名称') as HTMLInputElement).value).toBe('my-provider')
  })

})

it('reports saved status when the real expert list refresh fails', async () => {
  let created = false
  request.mockImplementation(async ({ operationId }) => {
    if (operationId === RUNTIME_OPS.agentsList) { if (created) throw Error('list offline'); return { agents: [] } }
    if (operationId === RUNTIME_OPS.providersList) return { providers: [{ id: 'local', label: 'Local', configured: true }] }
    if (operationId === RUNTIME_OPS.capabilitiesList) return { capabilities: [] }
    if (operationId === RUNTIME_OPS.mcpsList) return { mcps: [] }
    if (operationId === RUNTIME_OPS.providersModelsList) return { models: [] }
    if (operationId === RUNTIME_OPS.agentsCreate) { created = true; return { id: 'created', name: 'Created', name_zh: '',name_en:'',description_zh:'', description: '', soul: '', avatar: '🤖', model: { provider: 'local', name: 'qwen' }, tools: [], skills: [], plugins: [], mcps: [], permissions: {}, metadata: {}, is_default: false, available: true, unavailable_reason: '' } }
    throw Error(operationId)
  })
  render(<RuntimeSettingsPage {...props('agents')} />)
  fireEvent.click((await screen.findAllByRole('button', { name: '创建专家' }))[0])
  await waitFor(() => expect((screen.getByLabelText('服务商') as HTMLSelectElement).value).toBe('local'))
  fireEvent.change(screen.getByLabelText('调用名'), { target: { value: 'Created' } })
  fireEvent.change(screen.getByLabelText('模型'), { target: { value: 'qwen' } })
  fireEvent.click(screen.getByRole('button', { name: '保存' }))
  expect(await screen.findByText(/专家已保存，但列表刷新失败/)).toBeTruthy()
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('removes the separate configuration page and follows host language without writing runtime settings', async () => {
  expect(manifest.contributions.settings.some(item => item.id === 'settings')).toBe(false)
  expect(featureModule.settings).not.toHaveProperty('settings')
  request.mockResolvedValue({ text: '' })
  const view = render(<RuntimeSettingsPage {...props('logs', 'en')} />)
  await screen.findByRole('heading', { name: 'Logs' })
  view.rerender(<RuntimeSettingsPage {...props('logs', 'zh-CN')} />)
  await screen.findByRole('heading', { name: '日志' })
  expect(screen.queryByLabelText('Language')).toBeNull()
  expect(screen.queryByLabelText('语言')).toBeNull()
  expect(request.mock.calls.some(([input]) => [RUNTIME_OPS.settingsGet, RUNTIME_OPS.settingsUpdate].includes(input.operationId))).toBe(false)
})

describe('expert conversation host action', () => {
  const expert = { id: 'expert', name: 'Research', name_zh: '研究',name_en:'',description_zh:'', avatar: '🤖', description: 'Research expert', soul: 'Be precise', model: { provider: 'local', name: 'qwen' }, tools: ['*'], skills: [], plugins: [], mcps: [], permissions: {}, metadata: { preserve: true }, is_default: false, available: true, unavailable_reason: '' }
  const withAgents = () => request.mockImplementation(async ({ operationId }: { operationId: string }) => {
    if (operationId === RUNTIME_OPS.agentsList) return { agents: [expert] }
    if (operationId === RUNTIME_OPS.capabilitiesList) return { capabilities: [] }
    return { ok: true }
  })

  it('asks the host action for a conversation with the expert reference', async () => {
    const invoke = vi.fn(async () => ({ status: 'completed' }))
    mocks.actions = { invoke }
    withAgents()
    render(<RuntimeSettingsPage {...props('agents')} />)
    fireEvent.click(await screen.findByRole('button', { name: '使用专家' }))
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('conversation.create', {
      target: { namespace: 'runtime', type: 'agent', id: 'expert' },
    }))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('surfaces a refused expert and keeps the button usable', async () => {
    mocks.actions = { invoke: vi.fn(async () => ({ status: 'rejected', error: { code: 'INVALID_INPUT', message: '暂无可用助手' } })) }
    withAgents()
    render(<RuntimeSettingsPage {...props('agents')} />)
    fireEvent.click(await screen.findByRole('button', { name: '使用专家' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', '暂无可用助手')
    expect((screen.getByRole('button', { name: '使用专家' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('disables the expert action when the host does not grant it', async () => {
    withAgents()
    render(<RuntimeSettingsPage {...props('agents')} />)
    const button = (await screen.findByRole('button', { name: '使用专家' })) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(button.getAttribute('title')).toBe('当前 Bibit 未提供宿主动作能力，无法新建会话。')
  })
})
