// "Abrir em nova janela": o card de um tópico ou de uma nota solta numa janela só dele, ao lado do mapa (pedido do
// usuário). A janela carrega a interface com `?card=node-<id>&tab=<aba>` e mostra só o card; os comandos dela levam a
// aba (`tab`), então ela continua no mapa certo mesmo que a janela principal mude de aba. O que muda numa janela avisa
// as outras (`map-changed`), que leem o mapa de novo.
import type { NoteRef } from './notes.svelte'

const host = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

function parse(): { target: NoteRef; tab: number } | null {
  const q = new URLSearchParams(location.search)
  const m = /^(node|free)-(\d+)$/.exec(q.get('card') ?? '')
  const tab = Number(q.get('tab'))
  return m && Number.isInteger(tab) ? { target: { kind: m[1] as NoteRef['kind'], id: Number(m[2]) }, tab } : null
}

/** Esta janela é a de um card: o card e a aba dele. */
export const cardWindow = parse()

/** Só no app do computador (a prévia do navegador não divide o mapa entre janelas), e não de dentro de uma janela de card. */
export const canOpenWindows = host && !cardWindow && !new URLSearchParams(location.search).has('preview')

/** Abre o card numa janela nova (ou traz para a frente a que já está aberta com ele). */
export async function openCardWindow(target: NoteRef, tab: number, title: string) {
  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
  const label = `card-${tab}-${target.kind}-${target.id}`
  const open = await WebviewWindow.getByLabel(label)
  if (open) return void open.setFocus()
  new WebviewWindow(label, {
    url: `index.html?card=${target.kind}-${target.id}&tab=${tab}`,
    title: title.trim() || 'Nodo',
    width: 760,
    height: 900,
    minWidth: 360,
    minHeight: 420,
  })
}

/** Fecha esta janela (a do card). */
export async function closeThisWindow() {
  if (!host) return window.close()
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  await getCurrentWindow().close()
}

/** Avisa as outras janelas que o mapa mudou (elas leem de novo). */
export async function announceChange() {
  if (!host) return
  const [{ emit }, { getCurrentWebviewWindow }] = await Promise.all([import('@tauri-apps/api/event'), import('@tauri-apps/api/webviewWindow')])
  await emit('map-changed', { from: getCurrentWebviewWindow().label })
}

/** Quando outra janela mudar o mapa. Devolve como parar de escutar. */
export async function onOtherWindowChange(fn: () => void): Promise<() => void> {
  if (!host) return () => {}
  const [{ listen }, { getCurrentWebviewWindow }] = await Promise.all([import('@tauri-apps/api/event'), import('@tauri-apps/api/webviewWindow')])
  const me = getCurrentWebviewWindow().label
  return listen<{ from: string }>('map-changed', (e) => e.payload.from !== me && fn())
}
