import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const sync = () => setMatches(mql.matches)
    sync()
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [query])

  return matches
}

/**
 * Celular deitado: paisagem E pouca altura. Não dá para olhar só a largura — desktop
 * também é paisagem, e lá sobra altura. O layout compacto encolhe a pauta e põe o
 * resultado ao lado do botão para tudo caber numa tela.
 */
export function useShortLandscape(): boolean {
  return useMediaQuery('(orientation: landscape) and (max-height: 500px)')
}
