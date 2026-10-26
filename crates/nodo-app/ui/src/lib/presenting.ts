// Entrar e sair da apresentação: fecha o que é da edição (card aberto, campo, grupo), monta o percurso e põe a janela
// em tela cheia; ao sair, devolve a janela como estava.

import { doc } from './document.svelte'
import { hasHost } from './api'
import { notes } from './notes.svelte'
import { present, stepFor } from './present.svelte'

/** A janela já estava em tela cheia antes: ao sair da apresentação, continua. */
let wasFullscreen = false

async function setFullscreen(on: boolean) {
  try {
    if (hasHost) {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      const w = getCurrentWindow()
      if (on) wasFullscreen = await w.isFullscreen()
      if (!wasFullscreen) await w.setFullscreen(on)
      return
    }
    if (on) {
      wasFullscreen = !!document.fullscreenElement
      if (!wasFullscreen) await document.documentElement.requestFullscreen?.()
    } else if (!wasFullscreen && document.fullscreenElement) await document.exitFullscreen()
  } catch {
    // sem tela cheia (prévia num quadro, permissão negada): apresenta na janela mesmo
  }
}

/** Apresenta o mapa aberto, do começo ou a partir de um tópico. */
export async function startPresentation(from?: number) {
  if (!doc.hasDocument || present.on) return
  if (doc.editing) await doc.commitEdit()
  notes.close()
  notes.closeFree()
  doc.clearGroup()
  present.start(doc.snapshot)
  if (from !== undefined) present.go(stepFor(present.steps, doc.snapshot, from))
  void setFullscreen(true)
}

export function stopPresentation() {
  if (!present.on) return
  present.stop()
  void setFullscreen(false)
}

// Na prévia, sair da tela cheia pelo navegador (Esc) também encerra a apresentação.
if (typeof document !== 'undefined') {
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && present.on && !wasFullscreen) {
      wasFullscreen = true
      stopPresentation()
      wasFullscreen = false
    }
  })
}
