import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SecurityAudit } from '../../src/RuntimeSecurityControls'
import { SECURITY_OPS } from '../../src/runtime-contracts'

afterEach(cleanup)
const label = { next: /下一页|Next page/, previous: /上一页|Previous page/, refresh: /^(刷新|Refresh)$/, filter: /审计过滤|Audit filter/ }
function mockRequest() {
  let latest = 250
  const request = vi.fn(async (operation, params) => {
    if (operation === SECURITY_OPS.auditVerify) return { intact: true }
    const snapshot = params.snapshot_seq ?? latest
    const rows = Array.from({ length: latest }, (_, i) => ({ seq: latest - i, target: `record-${latest - i}`, result: 'DENY' }))
      .filter(row => row.seq <= snapshot && (!params.cursor || row.seq < params.cursor))
    const records = rows.slice(0, params.limit)
    return { records, snapshot_seq: snapshot, has_more: rows.length > params.limit, next_cursor: rows.length > params.limit ? records.at(-1)!.seq : null }
  })
  return { request, append: () => { latest++ } }
}

it('renders one page, browses a fixed snapshot in both directions and refreshes to latest', async () => {
  const { request, append } = mockRequest()
  render(<SecurityAudit agentId="a" request={request as any} />)
  await screen.findByText('record-250')
  expect(screen.getAllByRole('row')).toHaveLength(101)
  expect(request.mock.calls[0]).toEqual([SECURITY_OPS.auditQuery, { agent_id: 'a', filter: 'all', cursor: 0, limit: 100 }])
  expect(request.mock.calls.some(([op]) => op === SECURITY_OPS.auditVerify)).toBe(false)
  append()
  fireEvent.click(screen.getByRole('button', { name: label.next }))
  await screen.findByText('record-150')
  expect(screen.queryByText('record-250')).toBeNull()
  expect(request.mock.calls.at(-1)![1]).toMatchObject({ cursor: 151, snapshot_seq: 250 })
  fireEvent.click(screen.getByRole('button', { name: label.next }))
  await screen.findByText('record-50')
  expect(screen.getAllByRole('row')).toHaveLength(51)
  expect((screen.getByRole('button', { name: label.next }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: label.previous }))
  await screen.findByText('record-150')
  fireEvent.click(screen.getByRole('button', { name: label.previous }))
  await screen.findByText('record-250')
  expect(screen.queryByText('record-251')).toBeNull()
  expect(request.mock.calls.at(-1)![1]).toMatchObject({ cursor: 0, snapshot_seq: 250 })
  fireEvent.click(screen.getByRole('button', { name: label.refresh }))
  await screen.findByText('record-251')
  expect(request.mock.calls.at(-1)![1]).not.toHaveProperty('snapshot_seq')
})

it('resets pagination on filter changes and verifies only on explicit click', async () => {
  const { request } = mockRequest()
  render(<SecurityAudit agentId="a" request={request as any} />)
  await screen.findByText('record-250')
  fireEvent.click(screen.getByRole('button', { name: label.next }))
  await screen.findByText('record-150')
  fireEvent.change(screen.getByLabelText(label.filter), { target: { value: 'deny' } })
  await screen.findByText('record-250')
  expect(request.mock.calls.at(-1)![1]).toEqual({ agent_id: 'a', filter: 'deny', limit: 100, cursor: 0 })
  expect((screen.getByRole('button', { name: label.previous }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: /校验哈希链|Verify hash chain/ }))
  await waitFor(() => expect(request).toHaveBeenCalledWith(SECURITY_OPS.auditVerify, { agent_id: 'a' }))
})

it('ignores late responses for a previous filter and shows failures without stale rows', async () => {
  let resolveOld!: (value: any) => void
  const request = vi.fn((_operation, params) => params.filter === 'all'
    ? new Promise(resolve => { resolveOld = resolve })
    : Promise.resolve({ records: [{ seq: 2, target: 'filtered' }], snapshot_seq: 2, has_more: false, next_cursor: null }))
  render(<SecurityAudit agentId="a" request={request as any} />)
  fireEvent.change(screen.getByLabelText(label.filter), { target: { value: 'deny' } })
  await screen.findByText('filtered')
  await act(async () => resolveOld({ records: [{ seq: 1, target: 'stale' }], snapshot_seq: 1, has_more: false, next_cursor: null }))
  expect(screen.queryByText('stale')).toBeNull()
  request.mockRejectedValueOnce(Error('query unavailable'))
  fireEvent.click(screen.getByRole('button', { name: label.refresh }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'query unavailable')
  expect(screen.queryByText('filtered')).toBeNull()
})

it('rejects an unpaged backend response instead of rendering all historical rows', async () => {
  const request = vi.fn(async () => ({ records: Array.from({ length: 1000 }, (_, seq) => ({ seq, target: `old-${seq}` })) }))
  render(<SecurityAudit agentId="a" request={request as any} />)
  await screen.findByRole('alert')
  expect(screen.getAllByRole('row')).toHaveLength(1)
  expect(screen.queryByText('old-999')).toBeNull()
})
