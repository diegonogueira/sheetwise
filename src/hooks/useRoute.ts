import { useCallback, useEffect, useState } from 'react'
import type { Module } from '../core/module'
import { moduleFromPath, pathForModule } from '../lib/routes'

/**
 * Roteamento mínimo via History API: a URL é a fonte da verdade do módulo ativo.
 * Suporta deep-link, voltar/avançar do navegador e canoniza a URL inicial
 * (ex.: "/" → o caminho do módulo padrão) sem poluir o histórico.
 */
export function useRoute(): [Module, (m: Module) => void] {
  const [module, setModule] = useState<Module>(() => moduleFromPath(window.location.pathname))

  useEffect(() => {
    // canoniza a URL inicial sem criar entrada no histórico
    const canonical = pathForModule(moduleFromPath(window.location.pathname))
    if (window.location.pathname !== canonical) {
      window.history.replaceState(null, '', canonical)
    }
    // acompanha voltar/avançar do navegador
    const sync = () => setModule(moduleFromPath(window.location.pathname))
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  const navigate = useCallback((next: Module) => {
    const path = pathForModule(next)
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path)
    }
    setModule(next)
  }, [])

  return [module, navigate]
}
