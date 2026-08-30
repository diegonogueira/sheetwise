import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

/**
 * Ajusta a status bar nativa ao layout. Na PAISAGEM curta (celular deitado, o layout
 * compacto) ela some, para a pauta usar a tela inteira. No RETRATO ela aparece e o
 * conteúdo é empurrado para baixo dela, nunca coberto. No navegador é no-op.
 */
export async function syncStatusBar(landscape: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    if (landscape) {
      await StatusBar.hide()
    } else {
      await StatusBar.show()
      await StatusBar.setOverlaysWebView({ overlay: false })
      await StatusBar.setStyle({ style: Style.Light }) // ícones escuros p/ o tema claro
      await StatusBar.setBackgroundColor({ color: '#fafaf9' }) // --color-bg
    }
  } catch {
    // plugin ausente ou sem suporte na plataforma: o app funciona sem isso
  }
}
