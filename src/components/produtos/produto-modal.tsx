'use client'

import { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ImageUpload } from '@/components/ui/image-upload'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { createProduto, updateProduto, deleteProduto } from '@/lib/supabase-helpers'
import { useToast } from '@/lib/toast-context'
import type { Produto } from '@/lib/types'
import { Trash2 } from 'lucide-react'

interface ProdutoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  produto?: Produto | null
  onSaved: () => void
}

const categorias = [
  { value: 'espetinhos', label: 'Espetinhos' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'acompanhamentos', label: 'Acompanhamentos' },
  { value: 'sobremesas', label: 'Sobremesas' },
  { value: 'combos', label: 'Combos' },
  { value: 'outros', label: 'Outros' },
]

// Sugestoes de produtos comuns para espetaria/restaurante
const sugestoesProdutos = [
  // Espetinhos
  { nome: 'Espetinho de Frango', categoria: 'espetinhos', preco: 8 },
  { nome: 'Espetinho de Carne', categoria: 'espetinhos', preco: 10 },
  { nome: 'Espetinho de Picanha', categoria: 'espetinhos', preco: 14 },
  { nome: 'Espetinho de Linguica', categoria: 'espetinhos', preco: 8 },
  { nome: 'Espetinho de Queijo Coalho', categoria: 'espetinhos', preco: 7 },
  { nome: 'Espetinho de Coracao', categoria: 'espetinhos', preco: 9 },
  { nome: 'Espetinho de Cupim', categoria: 'espetinhos', preco: 12 },
  { nome: 'Espetinho Misto', categoria: 'espetinhos', preco: 10 },
  { nome: 'Espetinho de Medalhao', categoria: 'espetinhos', preco: 13 },
  { nome: 'Espetinho de Kafta', categoria: 'espetinhos', preco: 10 },
  { nome: 'Espetinho de Calabresa', categoria: 'espetinhos', preco: 8 },
  { nome: 'Espetinho de Contra File', categoria: 'espetinhos', preco: 12 },
  { nome: 'Espetinho de Frango com Bacon', categoria: 'espetinhos', preco: 10 },
  { nome: 'Espetinho de Camarao', categoria: 'espetinhos', preco: 16 },
  // Bebidas
  { nome: 'Coca-Cola Lata 350ml', categoria: 'bebidas', preco: 6 },
  { nome: 'Coca-Cola 600ml', categoria: 'bebidas', preco: 8 },
  { nome: 'Coca-Cola 2L', categoria: 'bebidas', preco: 12 },
  { nome: 'Guarana Lata 350ml', categoria: 'bebidas', preco: 5 },
  { nome: 'Guarana 600ml', categoria: 'bebidas', preco: 7 },
  { nome: 'Guarana 2L', categoria: 'bebidas', preco: 10 },
  { nome: 'Fanta Laranja Lata', categoria: 'bebidas', preco: 5 },
  { nome: 'Sprite Lata', categoria: 'bebidas', preco: 5 },
  { nome: 'Suco Natural', categoria: 'bebidas', preco: 8 },
  { nome: 'Agua Mineral 500ml', categoria: 'bebidas', preco: 4 },
  { nome: 'Agua com Gas', categoria: 'bebidas', preco: 5 },
  { nome: 'Cerveja Lata', categoria: 'bebidas', preco: 6 },
  { nome: 'Cerveja Long Neck', categoria: 'bebidas', preco: 8 },
  { nome: 'Cerveja 600ml', categoria: 'bebidas', preco: 12 },
  { nome: 'Heineken Lata', categoria: 'bebidas', preco: 8 },
  { nome: 'Heineken Long Neck', categoria: 'bebidas', preco: 10 },
  { nome: 'Skol Lata', categoria: 'bebidas', preco: 5 },
  { nome: 'Brahma Lata', categoria: 'bebidas', preco: 5 },
  { nome: 'Agua de Coco', categoria: 'bebidas', preco: 7 },
  { nome: 'Energetico', categoria: 'bebidas', preco: 10 },
  // Acompanhamentos
  { nome: 'Farofa', categoria: 'acompanhamentos', preco: 8 },
  { nome: 'Vinagrete', categoria: 'acompanhamentos', preco: 6 },
  { nome: 'Arroz', categoria: 'acompanhamentos', preco: 8 },
  { nome: 'Baiao de Dois', categoria: 'acompanhamentos', preco: 12 },
  { nome: 'Mandioca Frita', categoria: 'acompanhamentos', preco: 15 },
  { nome: 'Batata Frita', categoria: 'acompanhamentos', preco: 15 },
  { nome: 'Pao de Alho', categoria: 'acompanhamentos', preco: 10 },
  { nome: 'Salada', categoria: 'acompanhamentos', preco: 10 },
  { nome: 'Macaxeira Cozida', categoria: 'acompanhamentos', preco: 10 },
  { nome: 'Feijao Tropeiro', categoria: 'acompanhamentos', preco: 12 },
  // Sobremesas
  { nome: 'Pudim', categoria: 'sobremesas', preco: 8 },
  { nome: 'Mousse de Maracuja', categoria: 'sobremesas', preco: 8 },
  { nome: 'Acai 300ml', categoria: 'sobremesas', preco: 12 },
  { nome: 'Acai 500ml', categoria: 'sobremesas', preco: 18 },
  { nome: 'Sorvete', categoria: 'sobremesas', preco: 6 },
  { nome: 'Petit Gateau', categoria: 'sobremesas', preco: 15 },
]

export function ProdutoModal({ open, onOpenChange, produto, onSaved }: ProdutoModalProps) {
  const { toast } = useToast()
  const isEdit = !!produto
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [nome, setNome] = useState('')
  const [preco, setPreco] = useState('')
  const [categoria, setCategoria] = useState('espetinhos')
  const [estoque, setEstoque] = useState('')
  const [estoqueMinimo, setEstoqueMinimo] = useState('5')
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)

  // Sugestoes
  const [showSugestoes, setShowSugestoes] = useState(false)
  const [sugestoesFiltradas, setSugestoesFiltradas] = useState(sugestoesProdutos)
  const sugestoesRef = useRef<HTMLDivElement>(null)

  // Preencher com dados do produto ao editar
  useEffect(() => {
    if (produto) {
      setNome(produto.nome)
      setPreco(String(produto.preco))
      setCategoria(produto.categoria)
      setEstoque(String(produto.estoque_atual || 0))
      setEstoqueMinimo(String(produto.estoque_minimo))
      setFotoUrl(produto.foto_url || null)
    } else {
      setNome('')
      setPreco('')
      setCategoria('espetinhos')
      setEstoque('')
      setEstoqueMinimo('5')
      setFotoUrl(null)
    }
    setShowSugestoes(false)
  }, [produto, open])

  // Filtrar sugestoes quando nome muda
  function handleNomeChange(valor: string) {
    setNome(valor)
    if (valor.trim().length > 0) {
      const termo = valor.toLowerCase()
      const filtradas = sugestoesProdutos.filter(s =>
        s.nome.toLowerCase().includes(termo)
      )
      setSugestoesFiltradas(filtradas)
      setShowSugestoes(filtradas.length > 0)
    } else {
      setSugestoesFiltradas(sugestoesProdutos)
      setShowSugestoes(false)
    }
  }

  // Selecionar sugestao
  function selecionarSugestao(sugestao: typeof sugestoesProdutos[0]) {
    setNome(sugestao.nome)
    setCategoria(sugestao.categoria)
    setPreco(String(sugestao.preco))
    setShowSugestoes(false)
  }

  // Fechar sugestoes ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sugestoesRef.current && !sugestoesRef.current.contains(e.target as Node)) {
        setShowSugestoes(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!nome.trim()) { toast('Informe o nome do produto', 'error'); return }
    if (!preco || parseFloat(preco) <= 0) { toast('Informe um preco valido', 'error'); return }
    if (!estoque || parseInt(estoque) < 0) { toast('Informe o estoque', 'error'); return }

    setLoading(true)
    try {
      const data = {
        nome: nome.trim(),
        preco: parseFloat(preco),
        categoria,
        estoque_atual: parseInt(estoque),
        estoque_minimo: parseInt(estoqueMinimo) || 5,
        controlar_estoque: true,
        ativo: true,
        foto_url: fotoUrl,
      }

      if (isEdit && produto) {
        await updateProduto(produto.id, data)
        toast('Produto atualizado!', 'success')
      } else {
        await createProduto(data)
        toast('Produto criado!', 'success')
      }
      onOpenChange(false)
      onSaved()
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!produto) return
    setDeleteLoading(true)
    try {
      await deleteProduto(produto.id)
      toast('Produto excluido!', 'success')
      setShowDeleteConfirm(false)
      onOpenChange(false)
      onSaved()
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title={isEdit ? 'Editar Produto' : 'Novo Produto'}
        description={isEdit ? 'Atualize as informacoes do produto' : 'Preencha os dados do novo produto'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Foto do produto */}
          <div className="flex justify-center">
            <ImageUpload
              value={fotoUrl}
              onChange={setFotoUrl}
              bucket="produtos"
              shape="square"
              size={100}
            />
          </div>

          {/* Nome com autocomplete */}
          <div className="relative" ref={sugestoesRef}>
            <Input
              label="Nome do Produto"
              value={nome}
              onChange={e => handleNomeChange(e.target.value)}
              onFocus={() => {
                if (!isEdit && nome.trim().length === 0) {
                  setSugestoesFiltradas(sugestoesProdutos)
                  setShowSugestoes(true)
                }
              }}
              placeholder="Ex: Espetinho de Picanha"
              autoFocus
            />
            {/* Dropdown de sugestoes */}
            {showSugestoes && sugestoesFiltradas.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-bg-card border border-bg-elevated rounded-xl shadow-xl max-h-48 overflow-y-auto">
                {sugestoesFiltradas.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selecionarSugestao(s)}
                    className="w-full text-left px-3 py-2 hover:bg-bg-elevated transition-colors flex items-center justify-between text-sm"
                  >
                    <span className="text-text-white">{s.nome}</span>
                    <span className="text-text-muted text-xs">
                      R$ {s.preco.toFixed(2)} · {categorias.find(c => c.value === s.categoria)?.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Preco (R$)"
              type="number"
              step="0.01"
              min="0.01"
              value={preco}
              onChange={e => setPreco(e.target.value)}
              placeholder="0.00"
            />
            <Select
              label="Categoria"
              options={categorias}
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Estoque"
              type="number"
              min="0"
              value={estoque}
              onChange={e => setEstoque(e.target.value)}
              placeholder="0"
            />
            <Input
              label="Estoque Minimo"
              type="number"
              min="0"
              value={estoqueMinimo}
              onChange={e => setEstoqueMinimo(e.target.value)}
              placeholder="5"
            />
          </div>

          <div className="flex gap-3 justify-between pt-2">
            {/* Botao excluir (so no modo edicao) */}
            {isEdit ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 size={16} />
                <span className="ml-1">Excluir</span>
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={loading}>
                {isEdit ? 'Salvar' : 'Criar Produto'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Dialog de confirmacao de exclusao */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Excluir Produto"
        description={`Tem certeza que deseja excluir "${produto?.nome}"? Esta acao nao pode ser desfeita.`}
        onConfirm={handleDelete}
        loading={deleteLoading}
        variant="danger"
        confirmText="Excluir"
        cancelText="Cancelar"
      />
    </>
  )
}
