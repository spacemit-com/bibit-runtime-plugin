import type { RuntimeTranslate } from './runtime-i18n'

/**
 * Turn a Runtime service failure into text a user can act on.
 *
 * The Bi-bit host client keeps only the error *code*: it builds
 * `new ExternalServiceError(code, CANNED[code])` from the gateway envelope and
 * drops `error.message`. Whatever the Runtime adapter wrote there -- including
 * the Chinese sentence naming the Experts that still use a Provider -- never
 * reaches the screen, so every unclassified failure ("unknown") renders as one
 * generic sentence. The plugin therefore has to supply its own wording.
 */
// Runtime-authored reasons are Chinese sentences; the host's own placeholders
// ("The service request failed") are not. Keep the Runtime wording whenever it
// survives the gateway, and fall back to the canned text when it does not.
const RUNTIME_AUTHORED = /[\u3400-\u9fff\u3000-\u303f\uff00-\uffef]/
// The host's canned text for code `offline` ("The service is offline", from the
// error map it throws ExternalServiceError with) and the adapter's own wording
// for the same condition. A host that drops the code keeps only this sentence,
// so the wording is then the last thing identifying the failure.
const HOST_OFFLINE = /^(?:the |runtime )?service is offline\.?$/i

const FAILURES: Record<string, string> = {
  offline: 'Runtime 未运行或无法连接。Bi-bit 通过 bibit-runtime-adapter@bianbu.service 访问 Runtime，两者都要在运行；请在终端执行 sudo systemctl start bianbu-agent-runtime bibit-runtime-adapter@bianbu 后重试。',
  timeout: 'Runtime 请求超时，请稍后重试。',
  unavailable: 'Runtime 服务暂时不可用，请稍后重试。',
  unauthorized: '插件缺少该 Runtime 操作的授权，请检查插件授权配置后重启 Bi-bit。',
  incompatible: '插件与 Runtime 协议不匹配，请同步升级 Runtime 包和插件。',
  cancelled: '操作已取消。',
  provider_crashed: 'Runtime 服务进程异常退出，请重启 Runtime 后重试。',
  resource_exhausted: 'Runtime 资源不足，请稍后重试。',
  unknown: 'Runtime 拒绝了该操作，且没有返回可展示的原因。请刷新后重试；如果刚改过专家，请先确认没有专家仍在使用它。',
}

export function serviceFailureText(reason: unknown, t: RuntimeTranslate): string {
  const code = typeof reason === 'object' && reason !== null && 'code' in reason
    ? String((reason as { code?: unknown }).code ?? '')
    : ''
  const message = reason instanceof Error ? reason.message : ''
  if (RUNTIME_AUTHORED.test(message)) return message
  if (code in FAILURES) return t(FAILURES[code])
  if (HOST_OFFLINE.test(message.trim())) return t(FAILURES.offline)
  return message || t('操作失败，请稍后重试。')
}
