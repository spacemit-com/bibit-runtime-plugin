import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { AgentTopContent, LogsContent, RuntimeStatusContent } from '../../src/RuntimeMonitorPages'
import { RuntimeI18nProvider } from '../../src/runtime-i18n'
import type { AgentTopView, RuntimeStatus } from '../../src/runtime-contracts'

afterEach(cleanup)
const request = vi.fn(async () => ({ media_type: 'image/png', base64: 'aGVsbG8=' })) as any
const data: AgentTopView = {
  server_time: 100000,
  summary: { agents: 1, available_agents: 1, sessions: 2, runs: 3, active_runs: 1, waiting_runs: 0, failed_runs: 2 },
  agents: [{ id: 'agent-1', name: 'Expert', name_zh: '专家一',name_en:'',description_zh:'', avatar: '🤖', available: true, status: 'running', session_count: 2, run_count: 3, active_run_count: 1, failed_run_count: 2, last_active_at: 99930 }],
  recent_runs: [{ id: 'run-1234567890123456', agent_id: 'agent-1', session_id: 'session-1', session_title: 'My session', status: 'failed', created_at: 80000, updated_at: 92800 }],
}
describe('Runtime monitor parity', () => {
  it('renders current Agent Top summary, workload columns and recent_runs with server-relative age', () => {
    render(<RuntimeI18nProvider language="zh-CN"><AgentTopContent request={request} data={data} /></RuntimeI18nProvider>)
    const tables = screen.getAllByRole('table')
    expect(within(tables[0]).getAllByRole('columnheader').map(node => node.textContent)).toEqual(['状态', '专家', '会话', '执行数', '活跃', '失败', '最近活动'])
    expect(within(tables[0]).getByText('专家一')).toBeTruthy()
    expect(within(tables[0]).getByText('1m')).toBeTruthy()
    expect(within(tables[1]).getByText('run-12345678').getAttribute('title')).toBe(data.recent_runs[0].id)
    expect(within(tables[1]).getByText('My session')).toBeTruthy()
    expect(within(tables[1]).getByText('2h')).toBeTruthy()
    expect(document.querySelectorAll('.runtime-monitor-stat')).toHaveLength(7)
  })
  it('loads uploaded avatars through the Runtime service instead of the Bibit origin', async () => {
    render(<AgentTopContent request={request} data={{ ...data, agents: [{ ...data.agents[0], avatar: '/api/v1/agents/agent-1/avatar' }] }} />)
    await waitFor(() => expect(document.querySelector('.runtime-monitor-avatar img')?.getAttribute('src')).toBe('data:image/png;base64,aGVsbG8='))
    expect(request).toHaveBeenCalledWith('agents.avatar.get.v1', { agent_id: 'agent-1' })
  })
  it('retains run session fallback and zero/future timestamp behavior', () => {
    render(<AgentTopContent request={request} data={{ ...data, agents: [{ ...data.agents[0], last_active_at: 0 }], recent_runs: [{ ...data.recent_runs[0], session_title: '', updated_at: 100001 }] }} />)
    expect(screen.getByText('session-1')).toBeTruthy()
    expect(screen.getByText('0s')).toBeTruthy()
    expect(screen.getByText('--')).toBeTruthy()
  })
  it('shows Control overview, process fields and all eight Worker columns', () => {
    render(<RuntimeStatusContent status={{ status: 'AGENT_READY' } as RuntimeStatus} workers={{ control: { pid: 101, state: 'CONTROL_READY', control_ready: true, effective_mode: 'host', backend: 'direct', sandboxed: false }, worker_count: 1, workers: [{ agent_id: 'agent-1', state: 'AGENT_READY', pid: 202, effective_mode: 'sandbox', backend: 'bwrap', sandboxed: true, generation_id: 0, error: 'Worker diagnostic' }] }} />)
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('columnheader').map(node => node.textContent)).toEqual(['状态', '专家', 'PID', '模式', '后端', '沙箱', '代次', '错误'])
    for (const text of ['202', 'bwrap', 'yes', '0', 'Worker diagnostic']) expect(within(table).getByText(text)).toBeTruthy()
    expect(screen.getByText('READY')).toBeTruthy()
    expect(screen.getByText('no')).toBeTruthy()
  })
  it('filters levels and inherited traceback lines, preserves filters for incoming logs and autoscrolls', () => {
    const { rerender } = render(<LogsContent text={'unclassified\n[INFO] online\n[ERROR] broken\ntraceback\n'} />)
    expect(screen.getAllByRole('checkbox')).toHaveLength(5)
    fireEvent.click(screen.getByRole('checkbox', { name: 'ERROR' }))
    expect(screen.getByText('[ERROR] broken').hidden).toBe(true)
    expect(screen.getByText('traceback').hidden).toBe(true)
    expect(screen.getByText('unclassified').hidden).toBe(false)
    const output = screen.getByRole('log')
    Object.defineProperty(output, 'scrollHeight', { configurable: true, value: 500 })
    rerender(<LogsContent text={'[ERROR] later\n[WARNING] attention\n'} />)
    expect(screen.getByText('[ERROR] later').hidden).toBe(true)
    expect(screen.getByText('[WARNING] attention').hidden).toBe(false)
    expect(output.scrollTop).toBe(500)
    fireEvent.click(screen.getByRole('checkbox', { name: 'ERROR' }))
    expect(screen.getByText('[ERROR] later').hidden).toBe(false)
  })

  it('names the operational runtime log and shows an explicit empty state', () => {
    const { rerender } = render(<RuntimeI18nProvider language="zh-CN"><LogsContent text="" /></RuntimeI18nProvider>)
    expect(screen.getByText('运行日志 (runtime.jsonl)')).toBeTruthy()
    expect(screen.getByText('暂无日志记录。')).toBeTruthy()
    expect(screen.getByRole('log').getAttribute('aria-label')).toBe('runtime.jsonl')
    rerender(<RuntimeI18nProvider language="en-US"><LogsContent text="" /></RuntimeI18nProvider>)
    expect(screen.getByText('Runtime log (runtime.jsonl)')).toBeTruthy()
    expect(screen.getByText('No log records yet.')).toBeTruthy()
    rerender(<RuntimeI18nProvider language="en-US"><LogsContent text={'2026-09-18 18:00:00.000 [INFO] bianbu-agent.runtime: ready'} /></RuntimeI18nProvider>)
    expect(screen.queryByText('No log records yet.')).toBeNull()
    expect(screen.getByText(/ready/)).toBeTruthy()
  })
})
