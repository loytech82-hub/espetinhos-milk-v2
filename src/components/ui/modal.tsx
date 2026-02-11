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
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className={`fixed z-[70] bg-bg-card shadow-2xl inset-0 flex flex-col lg:inset-auto lg:left-1/2 lg:-translate-x-1/2 lg:top-1/2 lg:-translate-y-1/2 lg:w-[95vw] ${maxWidth} lg:rounded-xl lg:border lg:border-bg-elevated lg:max-h-[90vh] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95`}>
          {/* Header fixo */}
          <div className="shrink-0 flex items-center justify-between p-4 pb-3 border-b border-bg-elevated lg:p-6 lg:pb-4 lg:border-0">
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
            <Dialog.Close className="text-text-muted hover:text-text-white transition-colors p-2 rounded-xl hover:bg-bg-elevated">
              <X size={24} />
            </Dialog.Close>
          </div>
          {/* Conteudo scrollavel */}
          <div className="flex-1 overflow-y-auto p-4 pt-3 lg:p-6 lg:pt-0">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
