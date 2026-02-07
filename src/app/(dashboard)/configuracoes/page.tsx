'use client'

import { useEffect, useState } from 'react'
import { Settings, Users, Tag, Plus, Shield, ShieldCheck, ShieldAlert, Building2, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { updateEmpresa } from '@/lib/supabase-helpers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { ImageUpload } from '@/components/ui/image-upload'
import { useToast } from '@/lib/toast-context'
import { useAuth } from '@/lib/auth-context'
import { useEmpresa } from '@/lib/empresa-context'
import type { Profile, Categoria, UserRole } from '@/lib/types'

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  caixa: 'Operador de Caixa',
  garcom: 'Garcom',
}

const roleIcons: Record<UserRole, typeof Shield> = {
  admin: ShieldAlert,
  caixa: ShieldCheck,
  garcom: Shield,
}

export default function ConfiguracoesPage() {
  const { role } = useAuth()
  const { toast } = useToast()
  const { empresa, refresh: refreshEmpresa } = useEmpresa()
  const [usuarios, setUsuarios] = useState<Profile[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'empresa' | 'usuarios' | 'categorias'>('empresa')

  // Empresa form
  const [empNome, setEmpNome] = useState('')
  const [empEndereco, setEmpEndereco] = useState('')
  const [empTelefone, setEmpTelefone] = useState('')
  const [empCnpj, setEmpCnpj] = useState('')
  const [empLogo, setEmpLogo] = useState<string | null>(null)
  const [empSaving, setEmpSaving] = useState(false)

  // Modal de categoria
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [catNome, setCatNome] = useState('')
  const [catSaving, setCatSaving] = useState(false)

  // Modal de editar role
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [newRole, setNewRole] = useState<UserRole>('garcom')
  const [roleSaving, setRoleSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  // Preencher form da empresa quando carregar
  useEffect(() => {
    if (empresa) {
      setEmpNome(empresa.nome || '')
      setEmpEndereco(empresa.endereco || '')
      setEmpTelefone(empresa.telefone || '')
      setEmpCnpj(empresa.cnpj || '')
      setEmpLogo(empresa.logo_url || null)
    }
  }, [empresa])

  async function loadData() {
    try {
      const { data: usrs } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at')
      if (usrs) setUsuarios(usrs as Profile[])

      const { data: cats } = await supabase
        .from('categorias')
        .select('*')
        .order('ordem')
      if (cats) setCategorias(cats as Categoria[])
    } catch (error) {
      console.error('Erro ao carregar configuracoes:', error)
    } finally {
      setLoading(false)
    }
  }

  // Salvar dados da empresa
  async function handleSaveEmpresa(e: React.FormEvent) {
    e.preventDefault()
    if (!empNome.trim()) { toast('Informe o nome da empresa', 'error'); return }

    setEmpSaving(true)
    try {
      await updateEmpresa({
        nome: empNome.trim(),
        endereco: empEndereco.trim() || null,
        telefone: empTelefone.trim() || null,
        cnpj: empCnpj.trim() || null,
        logo_url: empLogo,
      })
      await refreshEmpresa()
      toast('Dados da empresa salvos!', 'success')
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setEmpSaving(false)
    }
  }

  // Salvar nova categoria
  async function handleSaveCat(e: React.FormEvent) {
    e.preventDefault()
    if (!catNome.trim()) { toast('Informe o nome da categoria', 'error'); return }

    setCatSaving(true)
    try {
      const { error } = await supabase.from('categorias').insert({
        nome: catNome.trim(),
        ordem: categorias.length + 1,
      })
      if (error) throw new Error(error.message)
      toast('Categoria criada!', 'success')
      setCatModalOpen(false)
      setCatNome('')
      loadData()
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setCatSaving(false)
    }
  }

  // Alterar role do usuario
  async function handleChangeRole(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser) return

    setRoleSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', selectedUser.id)
      if (error) throw new Error(error.message)
      toast(`Permissao de ${selectedUser.nome} alterada!`, 'success')
      setRoleModalOpen(false)
      loadData()
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setRoleSaving(false)
    }
  }

  // Somente admin pode acessar
  if (role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <ShieldAlert className="w-10 h-10 text-danger mx-auto" />
          <p className="font-heading text-lg font-bold">Acesso Negado</p>
          <p className="text-sm text-text-muted">Somente administradores podem acessar esta pagina</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-text-muted">carregando...</span>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10 space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl lg:text-4xl font-bold">CONFIGURACOES</h1>
        <p className="text-sm text-text-muted">Gerencie sua empresa e equipe</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('empresa')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
            tab === 'empresa' ? 'bg-orange text-text-dark' : 'bg-bg-card text-text-muted hover:text-text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Empresa
        </button>
        <button
          onClick={() => setTab('usuarios')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
            tab === 'usuarios' ? 'bg-orange text-text-dark' : 'bg-bg-card text-text-muted hover:text-text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Usuarios
        </button>
        <button
          onClick={() => setTab('categorias')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
            tab === 'categorias' ? 'bg-orange text-text-dark' : 'bg-bg-card text-text-muted hover:text-text-white'
          }`}
        >
          <Tag className="w-4 h-4" />
          Categorias
        </button>
      </div>

      {/* Tab: Empresa */}
      {tab === 'empresa' && (
        <form onSubmit={handleSaveEmpresa} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formulario */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="font-heading text-xl font-semibold">Dados da Empresa</h2>

              <div className="flex items-start gap-6">
                <ImageUpload
                  value={empLogo}
                  onChange={setEmpLogo}
                  bucket="empresa"
                  shape="circle"
                  size={100}
                />
                <div className="flex-1 space-y-4">
                  <Input
                    label="Nome da Empresa"
                    value={empNome}
                    onChange={e => setEmpNome(e.target.value)}
                    placeholder="Ex: Espetinhos do Joao"
                  />
                  <Input
                    label="CNPJ"
                    value={empCnpj}
                    onChange={e => setEmpCnpj(e.target.value)}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>

              <Input
                label="Endereco"
                value={empEndereco}
                onChange={e => setEmpEndereco(e.target.value)}
                placeholder="Rua, numero, bairro, cidade..."
              />

              <Input
                label="Telefone / WhatsApp"
                value={empTelefone}
                onChange={e => setEmpTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
              />

              <div className="pt-2">
                <Button type="submit" loading={empSaving}>
                  <Save className="w-4 h-4" />
                  Salvar
                </Button>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-3">
              <h3 className="font-heading text-sm font-semibold text-text-muted">PREVIEW</h3>
              <div className="p-6 bg-bg-card rounded-2xl flex flex-col items-center gap-4 text-center">
                {empLogo ? (
                  <img src={empLogo} alt="Logo" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-bg-elevated flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-text-muted" />
                  </div>
                )}
                <div>
                  <p className="font-heading text-lg font-bold text-text-white">
                    {empNome || 'Nome da Empresa'}
                  </p>
                  {empEndereco && (
                    <p className="text-xs text-text-muted mt-1">{empEndereco}</p>
                  )}
                  {empTelefone && (
                    <p className="text-xs text-text-muted">{empTelefone}</p>
                  )}
                  {empCnpj && (
                    <p className="font-mono text-xs text-text-muted">{empCnpj}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Tab: Usuarios */}
      {tab === 'usuarios' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-semibold">Usuarios ({usuarios.length})</h2>
          </div>
          <div className="rounded-2xl overflow-hidden space-y-px">
            {usuarios.map(user => {
              const RoleIcon = roleIcons[user.role] || Shield
              return (
                <div key={user.id} className="flex items-center justify-between gap-4 px-5 py-4 bg-bg-card">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-bg-elevated rounded-xl flex items-center justify-center">
                      <span className="text-[11px] text-text-muted">
                        {user.nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="text-[13px] text-text-white font-medium">{user.nome}</p>
                      <p className="text-xs text-text-muted">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-bg-elevated text-xs text-text-muted">
                      <RoleIcon className="w-3 h-3" />
                      {roleLabels[user.role]}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user)
                        setNewRole(user.role)
                        setRoleModalOpen(true)
                      }}
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tab: Categorias */}
      {tab === 'categorias' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-semibold">Categorias ({categorias.length})</h2>
            <Button onClick={() => setCatModalOpen(true)} variant="primary" size="sm">
              <Plus className="w-4 h-4" />
              Nova
            </Button>
          </div>
          <div className="rounded-2xl overflow-hidden space-y-px">
            {categorias.map(cat => (
              <div key={cat.id} className="flex items-center justify-between gap-4 px-5 py-4 bg-bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cat.cor }} />
                  <span className="text-[13px] text-text-white font-medium">{cat.nome}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-lg ${cat.ativo ? 'bg-success/20 text-success' : 'bg-bg-elevated text-text-muted'}`}>
                  {cat.ativo ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Nova Categoria */}
      <Modal open={catModalOpen} onOpenChange={setCatModalOpen} title="Nova Categoria">
        <form onSubmit={handleSaveCat} className="space-y-4">
          <Input
            label="Nome da Categoria"
            value={catNome}
            onChange={e => setCatNome(e.target.value)}
            placeholder="Ex: Petiscos, Doses..."
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="ghost" onClick={() => setCatModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={catSaving}>Criar Categoria</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Alterar Role */}
      <Modal open={roleModalOpen} onOpenChange={setRoleModalOpen} title="Alterar Permissao" description={selectedUser ? `Alterar permissao de ${selectedUser.nome}` : ''}>
        <form onSubmit={handleChangeRole} className="space-y-4">
          <Select
            label="Nova Permissao"
            options={[
              { value: 'admin', label: 'Administrador' },
              { value: 'caixa', label: 'Operador de Caixa' },
              { value: 'garcom', label: 'Garcom' },
            ]}
            value={newRole}
            onChange={e => setNewRole(e.target.value as UserRole)}
          />
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="ghost" onClick={() => setRoleModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={roleSaving}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
