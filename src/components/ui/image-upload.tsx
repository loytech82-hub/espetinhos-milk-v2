'use client'

import { useState, useRef } from 'react'
import { Camera, X, Loader2 } from 'lucide-react'
import { uploadImage, deleteImage } from '@/lib/supabase-helpers'

interface ImageUploadProps {
  value: string | null
  onChange: (url: string | null) => void
  bucket: string
  /** Formato do preview: quadrado ou circular */
  shape?: 'square' | 'circle'
  /** Tamanho do preview em pixels */
  size?: number
}

// Comprime imagem usando Canvas (max 800x800, qualidade 0.8)
async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const MAX = 800
      let { width, height } = img

      // Redimensionar se necessario
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width)
          width = MAX
        } else {
          width = Math.round((width * MAX) / height)
          height = MAX
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }))
          } else {
            resolve(file)
          }
        },
        'image/jpeg',
        0.8
      )
    }
    img.src = URL.createObjectURL(file)
  })
}

export function ImageUpload({ value, onChange, bucket, shape = 'square', size = 120 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      // Comprimir antes de enviar
      const compressed = await compressImage(file)
      const url = await uploadImage(bucket, compressed)
      onChange(url)
    } catch (err) {
      console.error('Erro ao enviar imagem:', err)
    } finally {
      setUploading(false)
      // Limpar input para permitir re-selecionar mesmo arquivo
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleRemove() {
    if (value) {
      try {
        await deleteImage(bucket, value)
      } catch {
        // Ignora erro ao deletar (pode ja nao existir)
      }
      onChange(null)
    }
  }

  const borderRadius = shape === 'circle' ? '9999px' : '16px'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Area de preview/clique */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-full overflow-hidden bg-bg-elevated border-2 border-dashed border-bg-placeholder hover:border-orange/50 transition-colors flex items-center justify-center cursor-pointer"
          style={{ borderRadius }}
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 text-orange animate-spin" />
          ) : value ? (
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
              style={{ borderRadius }}
            />
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Camera className="w-6 h-6 text-text-muted" />
              <span className="text-[10px] text-text-muted">Tirar foto</span>
            </div>
          )}
        </button>

        {/* Botao de remover */}
        {value && !uploading && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 w-6 h-6 bg-danger rounded-full flex items-center justify-center hover:bg-danger/80 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        )}
      </div>

      {/* Input invisivel com suporte a camera */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
