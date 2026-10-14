import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { RuntimeSecurityPage } from '../../src/RuntimeSecurityPage'
import { SECURITY_OPS } from '../../src/runtime-contracts'
import { formatSecurityActivity, securityClockTime, securityTimestamp } from '../../src/runtime-security-time'

const mocks = vi.hoisted(() => { const request = vi.fn(); return { request, service: { request }, online: true } })
vi.mock('@bibit/feature-sdk', () => ({ useFeatureCapability: (name: string) => mocks.online && name === 'service:runtime-security' ? mocks.service : undefined }))
const props = { featureId: 'runtime', contributionId: 'security', language: 'zh-CN', subpath: '', search: {}, navigation: { push() {}, replace() {}, back() {} } }
const translate = (source: string, values?: Record<string, string | number>) => (values ? source.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key])) : source)

afterEach(() => { cleanup(); mocks.request.mockReset() })

describe('security activity time', () => {
  it('parses the naive UTC form securityd writes for older install times', () => {
    expect(securityTimestamp('2026-09-21 01:11:47')).toBe(securityTimestamp('2026-09-21T01:11:47Z'))
  })

  it('renders the local wall clock instead of the raw UTC string', () => {
    const value = '2026-09-20T06:18:41.302+00:00'
    const date = new Date(value)
    const pad = (item: number) => String(item).padStart(2, '0')
    const local = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`

    expect(securityClockTime(value)).toBe(local)
    expect(formatSecurityActivity(value, translate)).toBe(local)
    expect(formatSecurityActivity(value, translate)).not.toContain('+00:00')
  })

  it('summarizes the recent past and falls back to the clock beyond an hour', () => {
    const now = new Date('2026-09-23T14:30:00Z').getTime()

    expect(formatSecurityActivity('2026-09-23T14:29:30Z', translate, now)).toBe('刚刚')
    expect(formatSecurityActivity('2026-09-23T14:26:00Z', translate, now)).toBe('4 分钟前')
    expect(formatSecurityActivity('2026-09-23T13:29:00Z', translate, now)).toMatch(/^\d{2}:\d{2}$/)
    expect(formatSecurityActivity('', translate, now)).toBe('')
  })

  it('shows local activity time in the inventory and never labels the install time as activity', async () => {
    mocks.request.mockImplementation(async ({ operationId }: { operationId: string }) => {
      if (operationId === SECURITY_OPS.agentsList) return { agents: [
        { agent_id: 'agent-active', name: 'Active Agent', last_seen: '2026-09-20T06:18:41.302+00:00' },
        { agent_id: 'agent-quiet', name: 'Quiet Agent', last_seen: '', installed_at: '2026-09-01T00:00:00.000+00:00' },
      ] }
      throw new Error(`Unexpected operation: ${operationId}`)
    })
    render(<RuntimeSecurityPage {...props} />)

    expect(await screen.findByText(securityClockTime('2026-09-20T06:18:41.302+00:00'))).toBeTruthy()
    const quiet = screen.getByText('暂无活动')
    expect(quiet.getAttribute('title')).toBe(`安装于 ${securityClockTime('2026-09-01T00:00:00.000+00:00')}`)
  })

  it('switches the placeholder copy with the host language', async () => {
    mocks.request.mockImplementation(async ({ operationId }: { operationId: string }) => {
      if (operationId === SECURITY_OPS.agentsList) return { agents: [{ agent_id: 'agent-quiet', name: 'Quiet Agent', last_seen: '' }] }
      throw new Error(`Unexpected operation: ${operationId}`)
    })
    render(<RuntimeSecurityPage {...props} language="en" />)

    expect(await screen.findByText('No activity yet')).toBeTruthy()
  })
})
