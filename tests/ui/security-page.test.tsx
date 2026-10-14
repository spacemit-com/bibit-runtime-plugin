import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { RuntimeSecurityPage } from '../../src/RuntimeSecurityPage'
import { SECURITY_OPS } from '../../src/runtime-contracts'

const mocks = vi.hoisted(() => { const request = vi.fn(); return { request, service: { request }, online: true } })
vi.mock('@bibit/feature-sdk', () => ({ useFeatureCapability: (name: string) => mocks.online && name === 'service:runtime-security' ? mocks.service : undefined }))
const props = { featureId: 'runtime', contributionId: 'security', language: 'zh-CN', subpath: '', search: {}, navigation: { push() {}, replace() {}, back() {} } }

afterEach(() => { cleanup(); mocks.request.mockReset(); mocks.online = true })

describe('Runtime security settings', () => {
  it('uses the isolated service when the standalone security plugin is installed', async () => {
    mocks.request.mockImplementation(async ({ serviceId }: { serviceId: string }) => {
      if (serviceId !== 'runtime-security') throw new Error('The service rejected authorization')
      return { agents: [{ agent_id: 'runtime-agent', name: 'Runtime Agent' }] }
    })
    render(<RuntimeSecurityPage {...props} />)
    expect(await screen.findByText('securityd 已连接')).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Runtime Agent' })).toBeTruthy()
  })

  it('does not diagnose an authorization rejection as a stopped security daemon', async () => {
    mocks.request.mockRejectedValue(new Error('The service rejected authorization'))
    render(<RuntimeSecurityPage {...props} />)
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText(/The service rejected authorization/)).toBeTruthy()
    expect(screen.queryByText(/请确认 securityd 与 Runtime security bridge 已启动/)).toBeNull()
  })

  it('switches all security navigation copy with the host language prop', async () => {
    mocks.request.mockResolvedValue({ agents: [] })
    const view = render(<RuntimeSecurityPage {...props} language="en" />)
    expect(await screen.findByRole('heading', { name: 'Security control center' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Capability management' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Audit' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Syscalls' })).toBeNull()
    expect(screen.getByText('securityd returned no registered agents.')).toBeTruthy()
    view.rerender(<RuntimeSecurityPage {...props} language="zh-CN" />)
    expect(screen.getByRole('heading', { name: '安全控制中心' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '能力管理' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '审计' })).toBeTruthy()
  })

  it('shows an actionable error when the independent security capability is offline', async () => {
    mocks.online = false
    render(<RuntimeSecurityPage {...props} />)

    expect(await screen.findByText(/宿主未提供 Security 服务能力/)).toBeTruthy()
    expect(screen.queryByText(/请确认 securityd/)).toBeNull()
    expect(screen.queryByText('securityd 已连接')).toBeNull()
  })

  it('keeps a failed tool policy update visible instead of leaking an unhandled rejection', async () => {
    mocks.request.mockImplementation(async ({ operationId }: { operationId: string }) => {
      if (operationId === SECURITY_OPS.agentsList) return { agents: [{ agent_id: 'agent-a', name: 'Agent A' }] }
      if (operationId === SECURITY_OPS.agentGet) return { agent_id: 'agent-a', capabilities: [{ tool: 'terminal', policy: 'ask' }] }
      if (operationId === SECURITY_OPS.capabilitiesCatalog) return { capabilities: [] }
      if (operationId === SECURITY_OPS.securityModeGet) return { mode: 'normal' }
      if (operationId === SECURITY_OPS.permissionsGet) return { agent_id: 'agent-a', read: { include: [], exclude: [] }, write: { include: [], exclude: [] }, network: { mode: 'allow_all', domains: [] }, syscall: { agent_additions: [] }, execution_mode: { mode: 'host', reasons: [] } }
      if (operationId === SECURITY_OPS.capabilitiesUpdate) throw new Error('securityd denied policy update')
      throw new Error(`Unexpected operation: ${operationId}`)
    })
    render(<RuntimeSecurityPage {...props} />)
    fireEvent.click(await screen.findByRole('button', { name: '能力管理' }))
    fireEvent.change(await screen.findByLabelText('terminal policy'), { target: { value: 'deny' } })

    expect(await screen.findByText('securityd denied policy update')).toBeTruthy()
  })

  it('saves include/exclude read and write scopes plus the network range', async () => {
    mocks.request.mockImplementation(async ({ operationId }: { operationId: string }) => {
      if (operationId === SECURITY_OPS.agentsList) return { agents: [{ agent_id: 'agent-a', name: 'Agent A' }] }
      if (operationId === SECURITY_OPS.agentGet) return { agent_id: 'agent-a', capabilities: [{ tool: 'terminal', policy: 'ask' }] }
      if (operationId === SECURITY_OPS.capabilitiesCatalog) return { capabilities: [] }
      if (operationId === SECURITY_OPS.securityModeGet) return { mode: 'normal' }
      if (operationId === SECURITY_OPS.permissionsGet) return { agent_id: 'agent-a', read: { include: ['/opt/data'], exclude: ['/opt/data/secret'] }, write: { include: [], exclude: [] }, network: { mode: 'whitelist', domains: ['api.example.com'] }, syscall: { agent_additions: [] }, execution_mode: { mode: 'sandbox', reasons: ['read'] } }
      if (operationId === SECURITY_OPS.permissionsSetGroup) return { ok: true }
      throw new Error(`Unexpected operation: ${operationId}`)
    })
    render(<RuntimeSecurityPage {...props} />)
    // 安全权限设置已独立成页，不再是能力管理页里的一组。
    fireEvent.click(await screen.findByRole('button', { name: '安全权限设置' }))
    const readInclude = await screen.findByLabelText('可读范围 · 包含') as HTMLTextAreaElement
    expect(readInclude.value).toBe('/opt/data')
    expect((screen.getByLabelText('可读范围 · 排除') as HTMLTextAreaElement).value).toBe('/opt/data/secret')
    expect(screen.getByText(/执行模式 · 沙箱模式/)).toBeTruthy()
    expect(screen.queryByLabelText('自定义补充项（JSON 对象）')).toBeNull()
    fireEvent.change(readInclude, { target: { value: '/opt/data\n/opt/extra' } })
    fireEvent.change(screen.getByLabelText('可读范围 · 排除'), { target: { value: '/opt/data/secret\n/opt/extra/tmp' } })
    fireEvent.click(screen.getByRole('button', { name: '保存可读范围' }))
    await waitFor(() => expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({ operationId: SECURITY_OPS.permissionsSetGroup, params: { agent_id: 'agent-a', group: 'read', value: { include: ['/opt/data', '/opt/extra'], exclude: ['/opt/data/secret', '/opt/extra/tmp'] } } })))
    fireEvent.change(screen.getByLabelText('网络访问范围'), { target: { value: 'api.example.com\ncdn.example.com' } })
    fireEvent.click(screen.getByRole('button', { name: '保存网络范围' }))
    await waitFor(() => expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({ operationId: SECURITY_OPS.permissionsSetGroup, params: { agent_id: 'agent-a', group: 'network', mode: 'whitelist', domains: ['api.example.com', 'cdn.example.com'] } })))
  })
})
