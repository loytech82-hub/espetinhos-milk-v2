'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('SW registrado:', reg.scope)
        })
        .catch((err) => {
          console.error('Erro SW:', err)
        })
    }

    // Detectar iOS (Safari nao tem beforeinstallprompt)
    const ua = navigator.userAgent
    const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOS(isiOS)

    // Verificar se ja esta instalado como PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone)

    if (isStandalone) return // Ja instalado, nao mostrar banner

    // Verificar se usuario ja dispensou o banner
    const dismissed = localStorage.getItem('pwa-banner-dismissed')
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10)
      // Mostrar novamente apos 7 dias
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return
    }

    // Android/Chrome: capturar evento de instalacao
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS: mostrar guia manual apos 3 segundos
    if (isiOS && !isStandalone) {
      const timer = setTimeout(() => setShowBanner(true), 3000)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('beforeinstallprompt', handler)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Instalar no Android/Chrome
  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
    }
    setDeferredPrompt(null)
  }

  // Dispensar banner
  function handleDismiss() {
    setShowBanner(false)
    setShowIOSGuide(false)
    localStorage.setItem('pwa-banner-dismissed', String(Date.now()))
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[70] lg:bottom-6 lg:left-auto lg:right-6 lg:w-80">
      <div className="bg-bg-card border border-border rounded-2xl p-4 shadow-xl shadow-black/40">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-orange/20 rounded-xl flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-orange" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-white">Instalar App</p>
            <p className="text-xs text-text-muted mt-0.5">
              {isIOS
                ? 'Adicione a tela inicial para acesso rapido'
                : 'Instale o app para acesso rapido e offline'
              }
            </p>
          </div>
          <button
            type="button"
            title="Fechar"
            onClick={handleDismiss}
            className="text-text-muted hover:text-text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Botao para Android/Chrome */}
        {deferredPrompt && (
          <button
            type="button"
            onClick={handleInstall}
            className="w-full mt-3 h-10 bg-orange text-text-dark text-sm font-semibold rounded-xl hover:bg-orange-hover transition-colors cursor-pointer"
          >
            Instalar Agora
          </button>
        )}

        {/* Guia para iOS */}
        {isIOS && !deferredPrompt && (
          <>
            {!showIOSGuide ? (
              <button
                type="button"
                onClick={() => setShowIOSGuide(true)}
                className="w-full mt-3 h-10 bg-orange text-text-dark text-sm font-semibold rounded-xl hover:bg-orange-hover transition-colors cursor-pointer"
              >
                Como Instalar
              </button>
            ) : (
              <div className="mt-3 space-y-2 text-xs text-text-muted">
                <p className="font-medium text-text-white">No Safari:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Toque no botao <span className="text-orange">Compartilhar</span> (quadrado com seta)</li>
                  <li>Role ate <span className="text-orange">Adicionar a Tela Inicio</span></li>
                  <li>Toque em <span className="text-orange">Adicionar</span></li>
                </ol>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
