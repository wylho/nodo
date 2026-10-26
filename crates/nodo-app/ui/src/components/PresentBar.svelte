<script lang="ts">
  // A barra da apresentação, embaixo e no meio: voltar, os passos, avançar, revelar aos poucos, visão geral e sair.
  // Some sozinha quando o mouse para (quem assiste vê só o mapa) e volta ao mexer.
  import { ChevronLeft, ChevronRight, Layers, Maximize, X } from '@lucide/svelte'
  import { t } from '@wylho/atrio'
  import { present } from '../lib/present.svelte'
  import { stopPresentation } from '../lib/presenting'

  let awake = $state(true)
  let timer = 0

  function wake() {
    awake = true
    clearTimeout(timer)
    timer = window.setTimeout(() => (awake = false), 2600)
  }

  $effect(() => {
    wake()
    return () => clearTimeout(timer)
  })

  // Muitos passos não cabem como pontinhos: aí vale o número.
  const dots = $derived(present.steps.length <= 24)
</script>

<svelte:window onpointermove={wake} onpointerdown={wake} />

<div class="present-bar" class:asleep={!awake} role="toolbar" tabindex="-1" aria-label={t('Apresentação')} onpointerdown={(e) => e.stopPropagation()}>
  <button class="pb-btn" aria-label={t('Voltar')} title="{t('Voltar')} (←)" disabled={present.index === 0 && !present.overview} onclick={() => present.prev()}><ChevronLeft size={20} /></button>
  {#if dots}
    <div class="pb-dots" role="tablist" aria-label={t('Passos')}>
      {#each present.steps as s, i (i)}
        <button class="pb-dot" class:on={i === present.index} role="tab" aria-selected={i === present.index} aria-label={t('Passo {n}: {nome}', { n: i + 1, nome: s.kind === 'overview' ? t('Mapa inteiro') : s.label })} title={s.kind === 'overview' ? t('Mapa inteiro') : s.label} onclick={() => present.go(i)}></button>
      {/each}
    </div>
  {:else}
    <span class="pb-count">{present.index + 1} / {present.steps.length}</span>
  {/if}
  <button class="pb-btn" aria-label={t('Avançar')} title="{t('Avançar')} (→)" disabled={present.index === present.steps.length - 1 && !present.overview} onclick={() => present.next()}><ChevronRight size={20} /></button>
  <span class="pb-sep"></span>
  <button class="pb-btn" class:on={present.reveal} aria-pressed={present.reveal} aria-label={t('Revelar aos poucos')} title="{t('Revelar aos poucos')} (R)" onclick={() => present.toggleReveal()}><Layers size={18} /></button>
  <button class="pb-btn" class:on={present.overview} aria-pressed={present.overview} aria-label={t('Visão geral')} title="{t('Visão geral')} (O)" onclick={() => present.toggleOverview()}><Maximize size={18} /></button>
  <button class="pb-btn" aria-label={t('Sair da apresentação')} title="{t('Sair da apresentação')} (Esc)" onclick={stopPresentation}><X size={19} /></button>
</div>
<p class="sr-only" aria-live="polite">{present.overview ? t('Mapa inteiro') : present.step?.kind === 'overview' ? t('Mapa inteiro') : present.step?.label}</p>
