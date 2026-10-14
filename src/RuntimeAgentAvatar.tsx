import { useEffect, useState } from 'react'
import { RUNTIME_OPS, type AgentAvatarView, type AgentView } from './runtime-contracts'

type Request = <T>(op: string, params?: Record<string, unknown>) => Promise<T>
const uploaded = (value: string) => /^\/api\/v1\/agents\/[^/]+\/avatar$/i.test(value)
const message = (error: unknown) => error instanceof Error ? error.message : String(error)
export function RuntimeAgentAvatar({ agent, request, revision }: { revision?: unknown; agent: Pick<AgentView, 'id' | 'avatar'>; request: Request }) {
  const [src, setSrc] = useState(''); const [error, setError] = useState('')
  useEffect(() => { let current = true; setSrc(''); setError(''); if (uploaded(agent.avatar)) void request<AgentAvatarView>(RUNTIME_OPS.agentAvatarGet, { agent_id: agent.id }).then(value => { if (current) setSrc(`data:${value.media_type};base64,${value.base64}`) }).catch(error => { if (current) setError(message(error)) }); return () => { current = false } }, [agent.id, agent.avatar, request, revision])
  return <span className="runtime-expert-avatar">{src ? <img src={src} alt="" /> : uploaded(agent.avatar) ? <span title={error}>{error ? '⚠' : '…'}</span> : agent.avatar || '🤖'}</span>
}
