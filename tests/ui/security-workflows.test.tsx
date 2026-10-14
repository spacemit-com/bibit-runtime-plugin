import React from 'react'
import { afterEach, it, expect, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { RuntimeSecurityPage } from '../../src/RuntimeSecurityPage'
import { SECURITY_OPS } from '../../src/runtime-contracts'
const mocks = vi.hoisted(() => { const request = vi.fn(); return { request, service: { request } } })
vi.mock('@bibit/feature-sdk', () => ({ useFeatureCapability: () => mocks.service }))
const props = { featureId: 'runtime', contributionId: 'security', language: 'en', subpath: '', search: {}, navigation: { push() {}, replace() {}, back() {} } }
afterEach(() => { cleanup(); mocks.request.mockReset() })
function setup(policy = 'ask') {
  mocks.request.mockImplementation(async ({ operationId, params }) => {
    if (operationId === SECURITY_OPS.agentsList) return { agents: [{ agent_id: 'agent-a', name: 'Agent A', version: '1.0', capability_count: 1 }] }
    if (operationId === SECURITY_OPS.agentGet) return { agent_id: 'agent-a', capabilities: [{ tool: 'terminal', policy, framework: 'runtime' }] }
    if (operationId === SECURITY_OPS.capabilitiesCatalog) return { capabilities: [{ tool: 'terminal', policy: 'ask', framework: 'runtime' }] }
    if (operationId === SECURITY_OPS.securityModeGet) return { mode: 'normal' }
    if (operationId === SECURITY_OPS.permissionsGet) return { agent_id: 'agent-a', read: { include: [], exclude: [] }, write: { include: [], exclude: [] }, network: { mode: 'whitelist', domains: ['example.test'] }, syscall: { agent_additions: [] }, execution_mode: { mode: 'sandbox', reasons: ['network'] } }
    if (operationId === SECURITY_OPS.dlpMatrix) return { rows: [{ pii_type: 'EMAIL', risk_level: 'L2', action: 'mask', source: 'override' }] }
    if (operationId === SECURITY_OPS.dlpStats) return { total: 12 }
    if (operationId === SECURITY_OPS.auditQuery) return { records: [{ seq: 1, ts: 'now', op_type: params.filter, target: 'resource', result: 'deny' }], snapshot_seq: 1, has_more: false, next_cursor: null }
    if ([SECURITY_OPS.agentSuspend, SECURITY_OPS.capabilitiesUpdate, SECURITY_OPS.dlpPolicyDelete, SECURITY_OPS.permissionsSetGroup].includes(operationId)) return { ok: true }
    throw Error(`Unexpected operation: ${operationId}`)
  })
  render(<RuntimeSecurityPage {...props} />)
}
it('starts with registered agents, opens their policy and suspends only the selected row', async () => {
  setup()
  await screen.findByRole('heading', { name: 'Registered agents' })
  expect(mocks.request.mock.calls.every(([input]) => input.operationId === SECURITY_OPS.agentsList)).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Send pause request' }))
  await waitFor(() => expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({ operationId: SECURITY_OPS.agentSuspend, params: { agent_id: 'agent-a' } })))
  await waitFor(() => expect((screen.getByRole('button', { name: 'Inspect' }) as HTMLButtonElement).disabled).toBe(false))
  expect(await screen.findByText('Pause request sent. The agent has not been stopped and may continue executing.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Inspect' }))
  expect(await screen.findByText('terminal')).toBeTruthy()
})
it('edits a tool policy through its modal', async () => {
  setup()
  fireEvent.click(await screen.findByRole('button', { name: 'Capability management' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Edit', exact: true }))
  const dialog = await screen.findByRole('dialog')
  fireEvent.change(within(dialog).getByLabelText('Tool name'), { target: { value: 'read_file' } })
  fireEvent.change(within(dialog).getByLabelText('Policy'), { target: { value: 'deny' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save policy' }))
  await waitFor(() => expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({ operationId: SECURITY_OPS.capabilitiesUpdate, params: expect.objectContaining({ agent_id: 'agent-a', tool: 'read_file', policy: 'deny' }) })))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
})
it('shows DLP intervention count and resets only the chosen PII override', async () => {
  setup()
  fireEvent.click(await screen.findByRole('button', { name: 'DLP / PII' }))
  expect(await screen.findByText('12 interventions')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Restore defaults' }))
  await waitFor(() => expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({ operationId: SECURITY_OPS.dlpPolicyDelete, params: { agent_id: 'agent-a', pii_type: 'EMAIL' } })))
})
it('sends the selected audit filter and keeps the original table headings', async () => {
  setup()
  fireEvent.click(await screen.findByRole('button', { name: 'Audit', exact: true }))
  fireEvent.change(await screen.findByLabelText('Audit filter'), { target: { value: 'deny' } })
  await waitFor(() => expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({ operationId: SECURITY_OPS.auditQuery, params: { agent_id: 'agent-a', filter: 'deny', limit: 100, cursor: 0 } })))
  expect(screen.getByRole('columnheader', { name: 'Sequence' })).toBeTruthy()
})
it('keeps the permission scope on its own tab and saves include/exclude ranges', async () => {
  setup()
  // 安全权限设置已独立成页：能力管理页里不再复述它。
  fireEvent.click(await screen.findByRole('button', { name: 'Capability management' }))
  await screen.findByText(/POLICY CONTROL/)
  expect(screen.queryByLabelText('Write scope · include')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Security permission settings' }))
  const write = await screen.findByLabelText('Write scope · include')
  fireEvent.change(write, { target: { value: '/var/lib/app' } })
  fireEvent.change(screen.getByLabelText('Write scope · exclude'), { target: { value: '/var/lib/app/cache' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save write scope' }))
  await waitFor(() => expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({ operationId: SECURITY_OPS.permissionsSetGroup, params: { agent_id: 'agent-a', group: 'write', value: { include: ['/var/lib/app'], exclude: ['/var/lib/app/cache'] } } })))
  fireEvent.change(screen.getByLabelText('Network scope'), { target: { value: 'api.example.com\ncdn.example.com' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save network scope' }))
  await waitFor(() => expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({ operationId: SECURITY_OPS.permissionsSetGroup, params: { agent_id: 'agent-a', group: 'network', mode: 'whitelist', domains: ['api.example.com', 'cdn.example.com'] } })))
  // 执行模式不再是声明，而是从安全设置推导出来。
  expect(screen.getByText(/Execution mode · Sandbox mode/)).toBeTruthy()
})
it('reports a negative mutation receipt without claiming success or refreshing the inventory', async () => {
  setup()
  await screen.findByRole('heading', { name: 'Registered agents' })
  const original = mocks.request.getMockImplementation()!
  mocks.request.mockImplementation(async input => input.operationId === SECURITY_OPS.agentSuspend ? { ok: false } : original(input))
  fireEvent.click(screen.getByRole('button', { name: 'Send pause request' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'The security service rejected this operation.')
  expect(mocks.request.mock.calls.filter(([input]) => input.operationId === SECURITY_OPS.agentsList)).toHaveLength(1)
})
it('disables DLP scanning and policy changes in YOLO and restores normal controls', async () => {
  setup()
  const base = mocks.request.getMockImplementation()!
  let mode = 'yolo'
  mocks.request.mockImplementation(async input => input.operationId === SECURITY_OPS.securityModeGet ? { mode } : base(input))
  fireEvent.click(await screen.findByRole('button', { name: 'DLP / PII' }))
  expect(await screen.findByText('YOLO skips DLP scanning and checks. Saved normal-mode rules are preserved; audit recording continues.')).toBeTruthy()
  expect((screen.getByRole('option', { name: 'mask', exact: true }).parentElement as HTMLSelectElement).disabled).toBe(true)
  expect((screen.getByPlaceholderText('Enter text to scan') as HTMLTextAreaElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Scan text' }))
  fireEvent.click(screen.getByRole('button', { name: 'Restore defaults' }))
  expect(mocks.request.mock.calls.some(([input]) => [SECURITY_OPS.dlpScan, SECURITY_OPS.dlpPolicyDelete].includes(input.operationId))).toBe(false)
  mode = 'normal'
  fireEvent.click(await screen.findByRole('button', { name: 'Security permission settings' }))
  await waitFor(() => expect((screen.getByLabelText('Network scope') as HTMLTextAreaElement).value).toBe('example.test'))
  expect((screen.getByRole('button', { name: 'Save network scope' }) as HTMLButtonElement).disabled).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: 'DLP / PII' }))
  await screen.findByText('12 interventions')
  expect((screen.getByRole('button', { name: 'Scan text' }) as HTMLButtonElement).disabled).toBe(false)
  expect((screen.getByRole('option', { name: 'mask', exact: true }).parentElement as HTMLSelectElement).value).toBe('mask')
})
