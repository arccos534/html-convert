import { useLayoutEffect, useRef, type ReactNode } from 'react'

interface ModalProps {
  titleId: string
  className?: string
  onClose: () => void
  children: ReactNode
}

export const Modal = ({ titleId, className = '', onClose, children }: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement
    dialog?.showModal()
    return () => {
      dialog?.close()
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus({ preventScroll: true })
      }
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className={`editor-dialog ${className}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {children}
    </dialog>
  )
}
