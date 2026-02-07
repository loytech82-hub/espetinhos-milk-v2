'use client'

import { Modal } from './modal'
import { Button } from './button'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
  loading?: boolean
  variant?: 'danger' | 'primary'
  confirmText?: string
  cancelText?: string
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  loading,
  variant = 'danger',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} maxWidth="max-w-md">
      <div className="flex gap-3 mb-4">
        <div className={`p-2 rounded-lg ${variant === 'danger' ? 'bg-danger/10 text-danger' : 'bg-orange-soft text-orange'}`}>
          <AlertTriangle size={20} />
        </div>
        <p className="text-text-muted text-sm leading-relaxed">{description}</p>
      </div>
      <div className="flex gap-3 justify-end">
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
          {cancelText}
        </Button>
        <Button variant={variant} onClick={onConfirm} loading={loading}>
          {confirmText}
        </Button>
      </div>
    </Modal>
  )
}
