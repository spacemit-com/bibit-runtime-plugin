import { useState } from 'react'
import { RUNTIME_OPS, type MCPServerView, type PluginView } from './runtime-contracts'
import { mcpServerState, mcpStateDetailSource, mcpStateSource, useRuntimeI18n } from './runtime-i18n'
import { RuntimeDialog } from './RuntimeDialog'

type Request = <T>(operation: string, params?: Record<string, unknown>) => Promise<T>
type RunAction = (label: string, action: () => Promise<unknown>) => Promise<void>

/** 生命周期着色与 Runtime 控制台一致：准备中是中性蓝，失败/降级才是警告。 */
function mcpPillClass(server: MCPServerView): string {
  switch (mcpServerState(server)) {
    case 'ready': return 'runtime-pill-online'
    case 'preparing': return 'runtime-pill-preparing'
    case 'failed': case 'degraded': return 'runtime-pill-warn'
    default: return ''
  }
}

/** 进度类解释由界面本地化；真实原因（准备失败原文）原样显示。 */
function mcpDetail(server: MCPServerView): string {
  return mcpStateDetailSource(server)
}

/** 只有「就绪」却一个工具都没有，才是这台 Server 真没有工具。 */
function mcpToolsPlaceholder(server: MCPServerView): string {
  switch (mcpServerState(server)) {
    case 'preparing': return '后台启动中…'
    case 'ready': return '暂无工具'
    default: return '未连接'
  }
}

export function RuntimeMcpContent({ mcps, request, runAction }: { mcps: MCPServerView[]; request: Request; runAction: RunAction }) {
  const t = useRuntimeI18n()
  const [name, setName] = useState('')
  const [command, setCommand] = useState('')
  const [removing, setRemoving] = useState<MCPServerView>()
  // 卸载要等服务端把整代 Worker 重建完才回话，卡片不能跟着一起等：先按用户意图
  // 把这一行收起来，随后那次重新读取如果发现它还在，就会把它放回来。
  const [removingId, setRemovingId] = useState('')
  // 插件随包提供的 MCP 是插件的成员：归属只有一个地方，状态也只在一个地方讲，
  // 免得同一台 server 在这里和插件页各说一遍、还可能说得不一致。
  const pluginOwned = mcps.filter(server => server.owner_plugin_id)
  const standalone = mcps.filter(server => !server.owner_plugin_id && server.id !== removingId)
  // 刷新只有一个入口：页面顶部的「刷新」在 MCP/插件页会连同健康检查一起做
  // （见 RuntimeSettingsPage 的 headerRefresh）。这里再放一个按钮，两个按钮做
  // 两件不一样的事，用户只能靠猜。
  const install = () => runAction(t('安装 MCP'), async () => {
    await request(RUNTIME_OPS.mcpsInstall, {
      name: name.trim(), command: command.trim(), upgrade: true,
    })
    setName(''); setCommand('')
  })
  return <div className="runtime-stack">
    <div className="runtime-resource-heading"><p className="runtime-page-description">{t('用启动命令安装和管理 MCP Server')}</p></div>
    <section className="runtime-panel">
      <form className="runtime-resource-form" onSubmit={event => { event.preventDefault(); void install() }}>
        <label>{t('名称')}<input className="runtime-control" required value={name} onChange={event => setName(event.target.value)} placeholder="Filesystem" /></label>
        <label>{t('启动命令')}<div className="runtime-resource-inline"><input className="runtime-control" required value={command} onChange={event => setCommand(event.target.value)} placeholder="npx -y @modelcontextprotocol/server-filesystem /data/projects" /><button type="submit" className="runtime-button" disabled={!name.trim() || !command.trim()}>{t('安装或更新')}</button></div></label>
        <p className="runtime-resource-hint">{t('示例')}：<code>npx -y @modelcontextprotocol/server-filesystem /data/projects</code></p>
        <p className="runtime-resource-hint">{t('命令会直接启动程序，不经过 Shell；请只安装可信来源，并限制 Filesystem MCP 可访问的目录。')}</p>
      </form>
    </section>
    {pluginOwned.length > 0 && <p className="runtime-resource-hint">{t('插件随包提供的 MCP 在插件页随插件显示状态，这里只管理独立 MCP')}（{pluginOwned.length}）</p>}
    {!standalone.length && <p className="runtime-catalog-empty">{pluginOwned.length ? t('这里没有独立 MCP；插件自带的 MCP 在插件页显示') : t('暂无 MCP Server')}</p>}
    <div className="runtime-catalog-grid">{standalone.map(server => <article className="runtime-panel" key={server.id}>
      <div className="runtime-resource-card-heading"><div><div className="runtime-catalog-name"><strong>{server.display_name || server.id}</strong><span className={`runtime-pill ${mcpPillClass(server)}`.trim()}>{t(mcpStateSource(server))}</span><span className="runtime-pill">{server.transport || 'stdio'}</span>{server.tools.length > 0 && <span className="runtime-pill">{server.tools.length} {t('个工具')}</span>}</div><code className="runtime-catalog-id">{server.id}</code></div>
        {server.removable === false ? <span className="runtime-resource-hint">{t('系统安装')}</span> : <button type="button" className="runtime-link-danger" onClick={() => setRemoving(server)}>{t('卸载')}</button>}
      </div>
      {server.command && <code className="runtime-resource-command">{server.command}</code>}
      {mcpDetail(server) && <p className={`runtime-resource-hint ${mcpServerState(server) === 'failed' || mcpServerState(server) === 'degraded' ? 'runtime-resource-hint-warn' : ''}`.trim()}>{t(mcpDetail(server))}</p>}
      <div className="runtime-resource-tags">{server.tools.length ? server.tools.map(tool => <span key={tool.id || tool.name}>{tool.display_name || tool.name || tool.id}</span>) : <span>{t(mcpToolsPlaceholder(server))}</span>}</div>
    </article>)}</div>
    {removing && <RuntimeDialog title={t('卸载 MCP Server')} onClose={() => setRemoving(undefined)}><p>{t('确定卸载此 MCP Server？')}</p><p>{removing.display_name || removing.id}</p><div className="runtime-dialog-actions"><button className="runtime-button runtime-button-secondary" type="button" onClick={() => setRemoving(undefined)}>{t('取消')}</button><button className="runtime-button" type="button" onClick={() => { const id = removing.id; setRemoving(undefined); setRemovingId(id); void runAction(t('删除 MCP'), () => request(RUNTIME_OPS.mcpsDelete, { id })).finally(() => setRemovingId('')) }}>{t('卸载')}</button></div></RuntimeDialog>}
  </div>
}

export function RuntimePluginsContent({ plugins, mcps, request, runAction }: { plugins: PluginView[]; mcps: MCPServerView[]; request: Request; runAction: RunAction }) {
  const t = useRuntimeI18n()
  const [source, setSource] = useState('')
  const [details, setDetails] = useState('')
  const [inspecting, setInspecting] = useState(false)
  // 插件自带的 MCP 的实时状态来自 /mcp-servers；拿不到那份快照时退回成员清单，
  // 状态显示 unknown 而不是假装健康。
  const pluginMcpRows = (pluginId: string, members: PluginView['members'] | undefined) => {
    const live = mcps.filter(server => server.owner_plugin_id === pluginId)
    if (live.length) {
      // 整条 server 一起带走：状态词、准备阶段和原因共用同一套生命周期函数，
      // 插件页和 MCP 页才不会对同一台 Server 各说一句话。
      return live.map(server => ({
        id: server.id, server, tools: server.tools.length,
      })).sort((left, right) => left.id.localeCompare(right.id))
    }
    return (members || [])
      .filter(member => typeof member !== 'string' && String(member.kind || '').toLowerCase() === 'mcp')
      .map(member => ({ id: String((member as { id?: string; name?: string }).id || (member as { name?: string }).name || ''), server: null as MCPServerView | null, tools: null as number | null }))
  }
  const install = () => runAction(t('安装插件'), async () => {
    await request(RUNTIME_OPS.pluginsInstall, { source: source.trim() })
    setSource('')
  })
  const inspect = async (id: string) => {
    setInspecting(true)
    try { setDetails(JSON.stringify(await request(RUNTIME_OPS.pluginsGet, { plugin_id: id }), null, 2)) }
    catch (error) { setDetails(error instanceof Error ? error.message : t('加载插件详情失败')) }
    finally { setInspecting(false) }
  }
  return <div className="runtime-stack">
    <p className="runtime-page-description">{t('安装和管理插件及 MCP Server')}</p>
    <section className="runtime-panel"><form className="runtime-resource-form" onSubmit={event => { event.preventDefault(); void install() }}><label>{t('本地插件目录')}<div className="runtime-resource-inline"><input className="runtime-control" required value={source} placeholder="/absolute/path/to/plugin" onChange={event => setSource(event.target.value)} /><button type="submit" className="runtime-button" disabled={!source.trim()}>{t('安装')}</button></div></label></form></section>
    {!plugins.length && <p className="runtime-catalog-empty">{t('暂无插件')}</p>}
    <div className="runtime-catalog-grid">{plugins.map(plugin => {
      const mcpRows = pluginMcpRows(plugin.id, plugin.members)
      const otherMembers = (plugin.members || []).filter(member => typeof member === 'string'
        || String((member as { kind?: string }).kind || '').toLowerCase() !== 'mcp')
      return <article key={plugin.id} className="runtime-panel"><h3>{plugin.id}</h3><div className="runtime-resource-tags">{otherMembers.map(member => {
        if (typeof member === 'string') return member
        const labels: Record<string, string> = { hook: 'Hook', skill: 'Skill', tool: 'Tool' }
        const kind = String(member.kind || '').toLowerCase()
        return `${labels[kind] || kind || 'Member'} · ${member.name || member.id || ''}`
      }).filter(Boolean).map(member => <span key={member}>{member}</span>)}{mcpRows.length ? <span>{t('MCP 见下方')}</span> : null}</div>
    {mcpRows.length > 0 && <div className="runtime-plugin-mcp"><p className="runtime-resource-hint">{t('插件自带的 MCP')}</p>
      <div className="runtime-resource-tags">{mcpRows.map(row => <span key={row.id} title={row.server ? t(mcpDetail(row.server)) : ''}><code>{row.id}</code><span className={`runtime-pill ${row.server ? mcpPillClass(row.server) : ''}`.trim()}>{t(row.server ? mcpStateSource(row.server) : '未知')}</span><em>{row.tools === null ? t('工具数未知') : `${row.tools} ${t('个工具')}`}</em></span>)}</div>
    </div>}<div className="runtime-resource-tags"><button type="button" className="runtime-link" disabled={inspecting} onClick={() => void inspect(plugin.id)}>{t('查看详情')}</button><button type="button" className="runtime-link-danger" onClick={() => void runAction(t('删除插件'), () => request(RUNTIME_OPS.pluginsDelete, { plugin_id: plugin.id }))}>{t('删除')}</button></div></article>})}</div>
    {details && <pre className="runtime-resource-details">{details}</pre>}
  </div>
}
