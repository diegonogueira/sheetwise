import { useLayoutEffect, useRef } from 'react'
import { Glyph, Renderer } from 'vexflow'
import type { Alter } from '../../core/pitch'

/**
 * O acidente desenhado com o MESMO glifo que vai para a pauta (a fonte musical do VexFlow),
 * e não com o caractere ♭/♮/♯ da fonte da interface.
 *
 * Duas razões. A primeira é fidelidade: o botão mostra exatamente o sinal que o aluno vê
 * escrito. A segunda é alinhamento: cada símbolo Unicode desses cai numa fonte de fallback
 * diferente, com métrica própria, e centralizar a CAIXA DE TEXTO não centraliza a tinta —
 * era por isso que os três apareciam em alturas diferentes dentro dos botões. Aqui o
 * `viewBox` é recortado na caixa exata do traço, então centralizar o SVG centraliza o
 * desenho, sempre.
 */
const CODE: Record<Alter, string> = {
  [-1]: 'accidentalFlat',
  0: 'accidentalNatural',
  1: 'accidentalSharp',
}

/** Tela folgada para desenhar antes do recorte; o glifo cabe com sobra. */
const CANVAS = 120

interface Props {
  alter: Alter
  /** corpo do glifo (ponto do VexFlow) — mantém a proporção real entre ♭, ♮ e ♯ */
  point: number
}

export function AccidentalGlyph({ alter, point }: Props) {
  // <div> porque é o que o Renderer do VexFlow aceita como alvo
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ''

    const renderer = new Renderer(el, Renderer.Backends.SVG)
    renderer.resize(CANVAS, CANVAS)
    Glyph.renderGlyph(renderer.getContext(), CANVAS / 2, CANVAS / 2, point, CODE[alter])

    const svg = el.querySelector('svg')
    const ink = svg?.querySelector('path')?.getBBox()
    if (!svg || !ink) return
    svg.setAttribute('class', 'accidental-glyph')
    svg.setAttribute('viewBox', `${ink.x} ${ink.y} ${ink.width} ${ink.height}`)
    svg.setAttribute('width', String(ink.width))
    svg.setAttribute('height', String(ink.height))
    // o VexFlow grava largura/altura da tela num style inline, que vence os atributos
    svg.style.width = `${ink.width}px`
    svg.style.height = `${ink.height}px`

    return () => {
      el.innerHTML = ''
    }
  }, [alter, point])

  return <div ref={ref} aria-hidden />
}
