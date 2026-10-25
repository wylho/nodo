<script lang="ts">
  // Abas dos mapas abertos, no canto de cima do mapa (pedido do usuário: dentro da área do mapa, sem mexer na barra
  // de cima). Mesmo desenho flutuante da barra de zoom. Clique troca; × ou o botão do meio fecha (pergunta se há algo
  // por salvar); + abre uma aba em branco com a tela inicial (Novo mapa, Abrir e os recentes).
  import { Plus, X } from '@lucide/svelte'
  import { t as tr } from '@wylho/atrio'
  import { doc } from '../lib/document.svelte'

  const mod = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+'
</script>

{#if doc.tabs.length}
  <!-- Na aba em branco a tela inicial cobre o mapa, e as abas ficam por cima dela (`over`). -->
  <div class="map-tabs" class:over={!doc.hasDocument} role="tablist" tabindex="-1" aria-label={tr('Mapas abertos')} onpointerdown={(e) => e.stopPropagation()} ondblclick={(e) => e.stopPropagation()}>
    {#each doc.tabs as t (t.id)}
      {@const on = t.id === doc.snapshot.active}
      {@const name = doc.tabName(t)}
      <div class="map-tab" class:on title={t.path ?? name}>
        <button
          class="map-tab-name"
          role="tab"
          aria-selected={on}
          onclick={() => void doc.switchTab(t.id)}
          onauxclick={(e) => e.button === 1 && void doc.closeTab(t.id)}
        >{name}{#if t.dirty && !on}<i class="map-tab-dirty" aria-label={tr('não salvo')}></i>{/if}</button>
        <!-- Na aba da frente o × fica ao lado do nome (com o ponto de não salvo no lugar dele até passar o mouse, como
             no VS Code); nas outras ele só aparece ao passar o mouse, por cima da borda, e o espaço entre elas não muda. -->
        <span class="map-tab-slot">
          {#if t.dirty && on}<i class="map-tab-dirty" aria-label={tr('não salvo')}></i>{/if}
          <button class="map-tab-close" aria-label={tr('Fechar {nome}', { nome: name })} title="{tr('Fechar')} ({mod}W)" onclick={() => void doc.closeTab(t.id)}><X size={12} strokeWidth={2.4} /></button>
        </span>
      </div>
    {/each}
    <button class="map-tab-new" aria-label={tr('Nova aba')} title="{tr('Nova aba')} ({mod}T)" onclick={() => void doc.newTab()}><Plus size={16} /></button>
  </div>
{/if}
