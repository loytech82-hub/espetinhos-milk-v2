'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  maxWidth?: string
}

export function Modal({ open, onOpenChange, title, description, children, maxWidth = 'max-w-lg' }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95vw] ${maxWidth} bg-bg-card border border-bg-elevated rounded-xl shadow-2xl p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <Dialog.Title className="font-heading text-xl font-bold text-text-white">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="text-sm text-text-muted mt-1">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close className="text-text-muted hover:text-text-white transition-colors p-1 rounded-lg hover:bg-bg-elevated">
              <X size={20} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
