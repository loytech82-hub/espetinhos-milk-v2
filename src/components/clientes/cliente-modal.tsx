'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createCliente, updateCliente } from '@/lib/supabase-helpers'
import { useToast } from '@/lib/toast-context'
import type { Cliente } from '@/lib/types'

interface ClienteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente?: Cliente | null
  onSaved: () => void
}

export function ClienteModal({ open, onOpenChange, cliente, onSaved }: ClienteModalProps) {
  const { toast } = useToast()
  const isEdit = !!cliente
  const [loading, setLoading] = useState(false)

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')

  useEffect(() => {
    if (cliente) {
      setNome(cliente.nome)
      setTelefone(cliente.telefone || '')
      setEndereco(cliente.endereco || '')
    } else {
      setNome('')
      setTelefone('')
      setEndereco('')
    }
  }, [cliente, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!nome.trim()) { toast('Informe o nome do cliente', 'error'); return }

    setLoading(true)
    try {
      const data = {
        nome: nome.trim(),
        telefone: telefone.trim() || undefined,
        endereco: endereco.trim() || undefined,
      }

      if (isEdit && cliente) {
        await updateCliente(cliente.id, data)
        toast('Cliente atualizado!', 'success')
      } else {
        await createCliente(data)
        toast('Cliente cadastrado!', 'success')
      }
      onOpenChange(false)
      onSaved()
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Editar Cliente' : 'Novo Cliente'}
      description={isEdit ? 'Atualize os dados do cliente' : 'Cadastre um novo cliente'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome"
          value={nome}
          onChange={e => setNome(e.target.value)}
          placeholder="Nome completo"
          autoFocus
        />
        <Input
          label="Telefone"
          value={telefone}
          onChange={e => setTelefone(e.target.value)}
          placeholder="(00) 00000-0000"
        />
        <Input
          label="Endereco"
          value={endereco}
          onChange={e => setEndereco(e.target.value)}
          placeholder="Rua, numero, bairro..."
        />

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Salvar' : 'Cadastrar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
