import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useRuntimeI18n } from './runtime-i18n'

export function RuntimeDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const t = useRuntimeI18n()
  const ref = useRef<HTMLDialogElement>(null)
  const heading = useId()
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const previous = dialog.ownerDocument.activeElement as HTMLElement | null
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    return () => { if (typeof dialog.close === 'function') dialog.close(); previous?.focus() }
  }, [])
  return <dialog ref={ref} className="runtime-dialog" aria-labelledby={heading} onCancel={event => { event.preventDefault(); onClose() }}>
    <header className="runtime-dialog-heading"><h3 id={heading}>{title}</h3><button className="runtime-link" type="button" aria-label={t('关闭')} onClick={onClose}>×</button></header>
    {children}
  </dialog>
}
