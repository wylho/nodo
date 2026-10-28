// O card na área de transferência com o que o Atrio leva desde a versão 2: lembrete, status e os arquivos dos anexos
// (copiar um tópico com foto e colar no Ideario traz a foto; o contrário também).
import { attachCardFiles, importCardFiles, t, tn, writeCards, type ClipCard } from '@wylho/atrio'
import { attachments, type CardFields } from './api'

/** Os bytes de um anexo do mapa, para irem junto com o card. */
const fetchAttachment = (hash: string) =>
  fetch(attachments.url(hash)).then((r) => (r.ok ? r.blob() : null), () => null)

/** O card cita algum anexo (foto, arquivo, gravação)? */
export const citesFiles = (cards: ClipCard[]) => cards.some((c) => c.markdown.includes('ideario://att/'))

/** Copia os cards com os arquivos dos anexos, até o limite do Atrio. Devolve os nomes que ficaram de fora. */
export async function copyCards(cards: ClipCard[]): Promise<string[]> {
  let skipped: string[] = []
  await writeCards(
    attachCardFiles(cards, fetchAttachment).then((out) => {
      skipped = out.skipped
      return out.cards
    }),
  )
  return skipped
}

/** O aviso depois de copiar: quantos, e o que ficou de fora por ser grande demais. */
export function copiedMessage(count: number, skipped: string[] = []): string {
  const done = tn(count, 'Copiado como card', 'Copiados {n} cards')
  return skipped.length ? `${done}. ${t('Ficaram de fora: {nomes}', { nomes: skipped.join(', ') })}` : done
}

/** Ao colar: os arquivos que vieram junto entram no mapa e o texto passa a citar o hash que o núcleo deu a eles. */
export const withImportedFiles = (card: ClipCard) => importCardFiles(card, (file, name) => attachments.importFile(file, name))

/** Os campos do card colado como o núcleo guarda no tópico (etiquetas, emoji, lembrete, status). */
export function cardFieldsOf(card: ClipCard): CardFields {
  return {
    emoji: card.emoji ?? null,
    tags: card.tags ?? [],
    reminder_at: card.reminderAt ?? null,
    reminder_repeat: card.reminderRepeat ?? null,
    reminder_done: !!card.reminderDone,
    reminder_doing: !!card.reminderDoing,
    status_on: !!card.statusOn,
  }
}
