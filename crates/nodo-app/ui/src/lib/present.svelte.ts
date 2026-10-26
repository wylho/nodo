// Modo Apresentação (proposta aprovada pelo usuário): o mapa já é o roteiro. O percurso sai sozinho da ordem dos
// ramos (a mesma do Tab/Enter): o mapa inteiro, cada ramo, cada card, as notas soltas e o mapa inteiro de novo. A
// câmera voa de um passo ao outro e o que não é do passo esmaece; com "Revelar aos poucos", o que ainda não entrou
// fica escondido e cada ramo nasce no passo dele.

import type { Snapshot } from './api'
import { t } from '@wylho/atrio'
import { isCard } from './cardtext'

export type StepKind = 'overview' | 'branch' | 'card' | 'note'

export interface Step {
  kind: StepKind
  /** O tópico do passo (ramo ou card), ou a nota solta; nulo na visão geral. */
  id: number | null
  /** O que a câmera enquadra: tópicos e notas soltas. */
  frame: { nodes: number[]; notes: number[] }
  /** O que fica aceso; o resto esmaece. */
  focus: { nodes: number[]; notes: number[] }
  /** O que entra neste passo, no "Revelar aos poucos". */
  intro: { nodes: number[]; notes: number[] }
  /** Nome do passo (dica dos pontinhos e leitor de tela). */
  label: string
}

/** Um ramo grande ganha passos para os sub-ramos; num pequeno, o passo do ramo já mostra tudo de perto. */
const BIG_BRANCH = 8

/** O percurso automático de um mapa. Pré-ordem do snapshot: pai antes dos filhos, irmãos na ordem do mapa. */
export function buildSteps(s: Snapshot): Step[] {
  const nodes = s.nodes
  if (!nodes.length) return []
  const root = nodes.find((n) => n.parent === null) ?? nodes[0]
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const allNodes = nodes.map((n) => n.id)
  const allNotes = s.notes.map((f) => f.id)

  // O ramo inteiro de cada tópico (o que está à vista: filhos de recolhido não vêm no snapshot).
  const subtree = new Map<number, number[]>()
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]
    subtree.set(n.id, [n.id, ...n.child_ids.flatMap((c) => subtree.get(c) ?? [])])
  }
  const ancestors = (id: number) => {
    const out: number[] = []
    for (let p = byId.get(id)?.parent ?? null; p !== null; p = byId.get(p)?.parent ?? null) out.push(p)
    return out
  }
  const topOf = (id: number) => {
    let n = byId.get(id)
    while (n && n.depth > 1 && n.parent !== null) n = byId.get(n.parent)
    return n?.id ?? id
  }
  const steps: Step[] = [
    { kind: 'overview', id: null, frame: { nodes: allNodes, notes: allNotes }, focus: { nodes: allNodes, notes: allNotes }, intro: { nodes: [root.id], notes: [] }, label: root.text },
  ]
  for (const n of nodes) {
    if (n.id === root.id) continue
    const tree = subtree.get(n.id) ?? [n.id]
    const bigTop = (subtree.get(topOf(n.id))?.length ?? 0) > BIG_BRANCH
    if (n.depth === 1 || (n.child_ids.length > 0 && bigTop)) {
      steps.push({
        kind: 'branch',
        id: n.id,
        frame: { nodes: tree, notes: [] },
        focus: { nodes: [...tree, ...ancestors(n.id)], notes: [] },
        intro: { nodes: tree, notes: [] },
        label: n.text,
      })
    }
    if (isCard(n)) {
      steps.push({ kind: 'card', id: n.id, frame: { nodes: [n.id], notes: [] }, focus: { nodes: [n.id], notes: [] }, intro: { nodes: [n.id], notes: [] }, label: n.text })
    }
  }
  for (const f of s.notes) {
    steps.push({ kind: 'note', id: f.id, frame: { nodes: [], notes: [f.id] }, focus: { nodes: [], notes: [f.id] }, intro: { nodes: [], notes: [f.id] }, label: f.title || t('Nota solta') })
  }
  // Fecha voltando ao todo (num mapa de um tópico só, a abertura já é o fim).
  if (steps.length > 1) steps.push({ ...steps[0], intro: { nodes: allNodes, notes: allNotes } })
  else steps[0].intro = { nodes: allNodes, notes: allNotes }
  return steps
}

/** O que já entrou até o passo `i` (no "Revelar aos poucos"). */
export function revealedUntil(steps: Step[], i: number): { nodes: Set<number>; notes: Set<number> } {
  const nodes = new Set<number>()
  const notes = new Set<number>()
  for (const s of steps.slice(0, i + 1)) {
    for (const id of s.intro.nodes) nodes.add(id)
    for (const id of s.intro.notes) notes.add(id)
  }
  return { nodes, notes }
}

/** O passo para onde um clique num tópico leva: o card dele, senão o ramo dele, senão o ramo mais próximo acima. */
export function stepFor(steps: Step[], s: Snapshot, id: number, kind: 'node' | 'note' = 'node'): number {
  if (kind === 'note') return steps.findIndex((st) => st.kind === 'note' && st.id === id)
  const byId = new Map(s.nodes.map((n) => [n.id, n]))
  for (let cur: number | null = id; cur !== null; cur = byId.get(cur)?.parent ?? null) {
    const card = cur === id ? steps.findIndex((st) => st.kind === 'card' && st.id === cur) : -1
    if (card >= 0) return card
    const branch = steps.findIndex((st) => st.kind === 'branch' && st.id === cur)
    if (branch >= 0) return branch
  }
  return 0
}

const REVEAL_KEY = 'nodo.ui.presentReveal'

function readReveal(): boolean {
  try {
    return localStorage.getItem(REVEAL_KEY) === 'true'
  } catch {
    return false
  }
}

class Presenter {
  /** Apresentando agora. */
  on = $state(false)
  steps = $state<Step[]>([])
  index = $state(0)
  /** Visão geral momentânea (tecla O), sem sair do passo. */
  overview = $state(false)
  /** "Revelar aos poucos": o que ainda não entrou fica escondido (guardado no aparelho). */
  reveal = $state(readReveal())

  get step(): Step | null {
    return this.steps[this.index] ?? null
  }

  start(s: Snapshot, from = 0) {
    this.steps = buildSteps(s)
    if (!this.steps.length) return
    this.index = Math.max(0, Math.min(from, this.steps.length - 1))
    this.overview = false
    this.on = true
  }

  stop() {
    this.on = false
    this.overview = false
  }

  go(i: number) {
    this.index = Math.max(0, Math.min(i, this.steps.length - 1))
    this.overview = false
  }

  next() {
    if (this.overview) this.overview = false
    else this.go(this.index + 1)
  }

  prev() {
    if (this.overview) this.overview = false
    else this.go(this.index - 1)
  }

  toggleOverview() {
    this.overview = !this.overview
  }

  toggleReveal() {
    this.reveal = !this.reveal
    try {
      localStorage.setItem(REVEAL_KEY, String(this.reveal))
    } catch {
      // sem armazenamento: vale só agora
    }
  }

  /** O mapa mudou durante a apresentação (um agente salvou): refaz o percurso e fica no passo mais perto. */
  refresh(s: Snapshot) {
    if (!this.on) return
    const was = this.step
    this.steps = buildSteps(s)
    if (!this.steps.length) return this.stop()
    const same = was ? this.steps.findIndex((st) => st.kind === was.kind && st.id === was.id) : -1
    this.index = same >= 0 ? same : Math.min(this.index, this.steps.length - 1)
  }
}

export const present = new Presenter()
