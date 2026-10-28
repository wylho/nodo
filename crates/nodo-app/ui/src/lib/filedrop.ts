// Arquivos do computador soltos na janela (pedido do usuário: arrastar um .md não fazia nada). Com um card aberto, o
// arquivo é anexo dele (`NodeNote.svelte`); com o mapa à vista, os que o Nodo abre viram abas, como no Abrir.

/** O que o Abrir aceita: o mapa do Nodo, o do Minder, Markdown e OPML. */
export const MAP_EXTENSIONS = ['nodo', 'minder', 'md', 'markdown', 'txt', 'opml']

/** Os arquivos que o Nodo abre, na ordem em que vieram. */
export function openable(paths: string[]): string[] {
  return paths.filter((p) => MAP_EXTENSIONS.includes(p.split('.').pop()?.toLowerCase() ?? ''))
}
