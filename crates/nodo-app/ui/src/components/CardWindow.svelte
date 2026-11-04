<script lang="ts">
  // A janela de um card ("Abrir em nova janela"): só o card do tópico ou da nota solta, na janela inteira, com os avisos
  // e as confirmações. Fechar o card fecha a janela; o tópico apagado (ou a aba fechada) também.
  import { onMount } from 'svelte'
  import { t } from '@wylho/atrio'
  import NodeNote from './NodeNote.svelte'
  import ConfirmDialog from './ConfirmDialog.svelte'
  import { doc } from '../lib/document.svelte'
  import { ui } from '../lib/ui.svelte'
  import { cardWindow, closeThisWindow } from '../lib/cardwindow'

  const target = cardWindow!.target
  const exists = $derived(target.kind === 'free' ? !!doc.freeNote(target.id) : !!doc.node(target.id))
  let seen = false

  onMount(() => void doc.load())

  $effect(() => {
    if (!doc.loaded) return
    if (exists) seen = true
    else void closeThisWindow()
  })

  // O título da janela é o do card.
  $effect(() => {
    const title = target.kind === 'free' ? doc.freeNote(target.id)?.title : doc.node(target.id)?.text
    if (!seen || !('__TAURI_INTERNALS__' in window)) return
    void import('@tauri-apps/api/window').then(({ getCurrentWindow }) => getCurrentWindow().setTitle(`${title?.trim() || t('Nota')} — Nodo`))
  })
</script>

{#if doc.loaded && exists}
  <NodeNote {target} windowed onclose={() => void closeThisWindow()} />
{/if}
<div class="toast" class:show={!!ui.toast} role="status" aria-live="polite"><span>{ui.toast}</span></div>
<ConfirmDialog />
