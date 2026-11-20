// A blind playtest of the history deck, for a player that is not a person: an agent plays through a
// shell, one command per move, and sees a card's year only after placing it. See docs/CARDS.md.
//
//   node scripts/playtest.ts start <round> [--games 10] [--cards 15] [--seed 1]
//   node scripts/playtest.ts show
//   node scripts/playtest.ts place <gap> <sure|leaning|guess> "<why this gap>"
//   node scripts/playtest.ts note "<flag,flag>" "<comment>"
//   node scripts/playtest.ts report <round>
//
// A round deals cards no earlier round has shown first, so rounds work through the deck. Each game
// starts with one card on the line and deals --cards more; a card placed wrong still goes in at its
// right place, so the line keeps growing, as it would over a game in the app. After every placement
// the player notes the card before the next is shown. Everything is kept under artifacts/playtest/.
//
// The deck is artifacts/history/cards.json, written by api/history-import.ts.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { mkdir, writeFile, appendFile } from 'node:fs/promises'
import path from 'node:path'
import { type Card, correctGapsFor } from '../src/game/index.ts'
import { seedRng, shuffle } from '../src/game/rng.ts'

const ROOT = 'artifacts/playtest'
const DECK = 'artifacts/history/cards.json'
const CURRENT = path.join(ROOT, 'current.json')

export const FLAGS = {
  known: 'Most players would know roughly when this was',
  guessable: 'Not known, but the title or description gives a fair clue to the era',
  blind: 'No way to place it but a pure guess',
  'gives-away': 'The title or description gives the year away, or nearly',
  'ambiguous-date': 'People could fairly argue for another year (start or end, first or famous)',
  'unclear-text': 'The title or description is hard to understand or misleading',
  dull: 'Correct but not fun: nothing to talk about, too dry or too small',
  'too-narrow': 'Only a specialist or a fan would care',
  'death-or-birth': 'A death or birth card that is not an event in itself',
  great: 'A card worth more of: fun, fair, sparks talk',
} as const
type Flag = keyof typeof FLAGS
const CONFIDENCE = ['sure', 'leaning', 'guess'] as const
type Confidence = (typeof CONFIDENCE)[number]

interface DeckCard {
  id: string
  title: string
  description?: string
  year: number
  month?: number
  day?: number
  type?: string
  views?: number
}

interface Placement {
  round: string
  game: number
  turn: number
  id: string
  title: string
  description?: string
  year: number
  type?: string
  lineSize: number
  chosenGap: number
  correctGaps: number[]
  right: boolean
  confidence: Confidence
  why: string
  flags?: Flag[]
  comment?: string
}

interface State {
  round: string
  games: string[][] // card ids per game; the first is the start card
  game: number // index into games
  turn: number // index into the game's cards, from 1
  line: string[] // card ids on the line, oldest first
  awaitingNote: Placement | null
}

const deck: DeckCard[] = JSON.parse(readFileSync(DECK, 'utf8'))
const byId = new Map(deck.map((card) => [card.id, card]))

function asCard(card: DeckCard): Card {
  return { id: card.id, title: card.title, year: card.year, month: card.month, day: card.day, pool: 'history' }
}

function get(id: string): DeckCard {
  const card = byId.get(id)
  if (!card) throw new Error(`Card ${id} is not in ${DECK}; was the deck rebuilt mid-round?`)
  return card
}

function option(args: string[], name: string, fallback: number): number {
  const index = args.indexOf(name)
  if (index < 0) return fallback
  const value = Number(args[index + 1])
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} needs a whole number`)
  return value
}

function shownBefore(): Set<string> {
  const seen = new Set<string>()
  if (!existsSync(ROOT)) return seen
  for (const entry of readdirSync(ROOT, { withFileTypes: true })) {
    const log = path.join(ROOT, entry.name, 'log.jsonl')
    if (!entry.isDirectory() || !existsSync(log)) continue
    for (const line of readFileSync(log, 'utf8').split('\n').filter(Boolean)) {
      seen.add((JSON.parse(line) as Placement).id)
    }
  }
  return seen
}

function load(): State {
  if (!existsSync(CURRENT)) throw new Error('No round in play. Start one with: start <round>')
  return JSON.parse(readFileSync(CURRENT, 'utf8')) as State
}

async function save(state: State): Promise<void> {
  await writeFile(CURRENT, `${JSON.stringify(state, null, 2)}\n`)
}

function fmtYear(year: number): string {
  return year < 0 ? `${-year} f.Kr.` : String(year)
}

function show(state: State): void {
  if (state.awaitingNote) {
    console.log(`Note "${state.awaitingNote.title}" first: note "<flag,flag>" "<comment>"`)
    return
  }
  const cards = state.games[state.game] as string[]
  console.log(`Round ${state.round}, game ${state.game + 1} of ${state.games.length}, card ${state.turn} of ${cards.length - 1}`)
  console.log('\nThe line, oldest first:')
  state.line.forEach((id, i) => {
    console.log(`  gap ${i}`)
    const card = get(id)
    console.log(`        ${fmtYear(card.year)}  ${card.title}`)
  })
  console.log(`  gap ${state.line.length}`)
  const drawn = get(cards[state.turn] as string)
  console.log(`\nCard to place:\n  ${drawn.title}`)
  if (drawn.description) console.log(`  ${drawn.description}`)
  console.log('\nPlace it: place <gap> <sure|leaning|guess> "<why>"')
}

async function start(args: string[]): Promise<void> {
  const round = args[0]
  if (!round || !/^[\w-]+$/.test(round)) throw new Error('start needs a round name, such as 1')
  const dir = path.join(ROOT, round)
  if (existsSync(path.join(dir, 'log.jsonl'))) throw new Error(`Round ${round} has been played already`)
  const games = option(args, '--games', 10)
  const perGame = option(args, '--cards', 15) + 1
  const seen = shownBefore()
  // Cards no round has shown come first, each group in its own seeded order.
  const rng = seedRng(option(args, '--seed', 1))
  const fresh = shuffle(deck.filter((card) => !seen.has(card.id)), rng)
  const old = shuffle(deck.filter((card) => seen.has(card.id)), fresh.rng)
  const order = [...fresh.items, ...old.items].map((card) => card.id)
  if (order.length < games * perGame) throw new Error(`The deck has only ${order.length} cards`)
  const plan = Array.from({ length: games }, (_, g) => order.slice(g * perGame, (g + 1) * perGame))
  await mkdir(dir, { recursive: true })
  const state: State = { round, games: plan, game: 0, turn: 1, line: [plan[0]![0]!], awaitingNote: null }
  await save(state)
  console.log(`${fresh.items.length} cards not shown in any earlier round.`)
  show(state)
}

async function place(args: string[]): Promise<void> {
  const state = load()
  if (state.awaitingNote) return show(state)
  if (state.game >= state.games.length) throw new Error('The round is over')
  const gap = Number(args[0])
  const confidence = args[1] as Confidence
  const why = args[2]
  if (!Number.isInteger(gap) || gap < 0 || gap > state.line.length) throw new Error(`gap must be 0 to ${state.line.length}`)
  if (!CONFIDENCE.includes(confidence)) throw new Error(`confidence must be one of ${CONFIDENCE.join(', ')}`)
  if (!why) throw new Error('Say why you chose that gap')
  const cards = state.games[state.game] as string[]
  const drawn = get(cards[state.turn] as string)
  const line = state.line.map((id) => asCard(get(id)))
  const correct = correctGapsFor(line, asCard(drawn), 'year')
  const right = correct.includes(gap)
  const placement: Placement = {
    round: state.round,
    game: state.game + 1,
    turn: state.turn,
    id: drawn.id,
    title: drawn.title,
    description: drawn.description,
    year: drawn.year,
    type: drawn.type,
    lineSize: line.length,
    chosenGap: gap,
    correctGaps: correct,
    right,
    confidence,
    why,
  }
  state.line.splice(correct[0] as number, 0, drawn.id)
  state.awaitingNote = placement
  await save(state)
  console.log(`${right ? 'RIGHT' : 'WRONG'}: "${drawn.title}" is ${fmtYear(drawn.year)}${right ? '' : `; right gap ${correct.join(' or ')}`}.`)
  console.log('\nNow note the card: note "<flag,flag>" "<comment>"   (flags may be empty: "")')
  if (placement.game === 1 && placement.turn === 1) {
    for (const [flag, meaning] of Object.entries(FLAGS)) console.log(`  ${flag.padEnd(15)} ${meaning}`)
  } else {
    console.log(`  flags: ${Object.keys(FLAGS).join(', ')}`)
  }
}

async function note(args: string[]): Promise<void> {
  const state = load()
  const placement = state.awaitingNote
  if (!placement) throw new Error('Nothing to note: place the card first')
  const flags = (args[0] ?? '').split(',').map((f) => f.trim()).filter(Boolean)
  const unknown = flags.filter((f) => !(f in FLAGS))
  if (unknown.length) throw new Error(`Unknown flag ${unknown.join(', ')}; use ${Object.keys(FLAGS).join(', ')}`)
  placement.flags = flags as Flag[]
  placement.comment = args[1] ?? ''
  await appendFile(path.join(ROOT, state.round, 'log.jsonl'), `${JSON.stringify(placement)}\n`)
  state.awaitingNote = null
  state.turn += 1
  if (state.turn >= (state.games[state.game] as string[]).length) {
    const log = readLog(state.round).filter((p) => p.game === state.game + 1)
    console.log(`Game ${state.game + 1} done: ${log.filter((p) => p.right).length} of ${log.length} right.`)
    state.game += 1
    state.turn = 1
    if (state.game >= state.games.length) {
      await save(state)
      console.log(`Round ${state.round} is over. Write your summary now.`)
      return
    }
    state.line = [(state.games[state.game] as string[])[0] as string]
    console.log('')
  }
  await save(state)
  show(state)
}

function readLog(round: string): Placement[] {
  const file = path.join(ROOT, round, 'log.jsonl')
  if (!existsSync(file)) return []
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line) as Placement)
}

/** Groups Wikidata class ids and hand-written types into a few kinds a person can read. */
export function kindOf(card: { id: string; type?: string; title: string }): string {
  if (/ dør$| blir født$/.test(card.title)) return 'death or birth'
  const type = card.type ?? ''
  if (['oppfinnelse', 'oppdagelse'].includes(type)) return 'invention or discovery'
  if (type === 'verk') return 'work'
  if (type === 'bragd') return 'achievement'
  if (['hendelse', 'person', 'most read P585'].includes(type)) return 'event'
  if (type === 'Q198' || type === 'Q178561' || type === 'Q188055') return 'war or battle'
  if (type === 'Q484652' || type === 'Q1261499' || type === 'Q3199915') return 'organisation'
  return 'event'
}

function pct(n: number, of: number): string {
  return of ? `${Math.round((100 * n) / of)} %` : '–'
}

function eraOf(year: number): string {
  if (year < 0) return 'before year 0'
  if (year < 1500) return '0–1499'
  if (year < 1800) return '1500–1799'
  if (year < 1900) return '1800s'
  if (year < 1950) return '1900–1949'
  if (year < 2000) return '1950–1999'
  return '2000 on'
}

async function report(args: string[]): Promise<void> {
  const round = args[0]
  if (!round) throw new Error('report needs a round name')
  const log = readLog(round)
  if (!log.length) throw new Error(`Round ${round} has no placements`)
  const lines: string[] = [`# Playtest round ${round}`, '']
  const right = log.filter((p) => p.right).length
  lines.push(`${log.length} cards placed in ${new Set(log.map((p) => p.game)).size} games, ${right} right (${pct(right, log.length)}).`, '')

  lines.push('## Right by confidence', '', '| Confidence | Cards | Right |', '|---|---|---|')
  for (const c of CONFIDENCE) {
    const of = log.filter((p) => p.confidence === c)
    lines.push(`| ${c} | ${of.length} | ${pct(of.filter((p) => p.right).length, of.length)} |`)
  }
  const sureWrong = log.filter((p) => p.confidence === 'sure' && !p.right)
  lines.push('', 'Sure and wrong points at a misleading card or a date people know differently:', '')
  for (const p of sureWrong) lines.push(`- ${p.title} (${fmtYear(p.year)}): ${p.why}`)

  lines.push('', '## Flags', '', '| Flag | Cards |', '|---|---|')
  for (const flag of Object.keys(FLAGS) as Flag[]) {
    lines.push(`| ${flag} | ${log.filter((p) => p.flags?.includes(flag)).length} |`)
  }

  lines.push('', '## By kind (this round)', '', '| Kind | Cards | Right | Blind | Great |', '|---|---|---|---|---|')
  const kinds = [...new Set(log.map(kindOf))].sort()
  for (const kind of kinds) {
    const of = log.filter((p) => kindOf(p) === kind)
    const n = (flag: Flag) => of.filter((p) => p.flags?.includes(flag)).length
    lines.push(`| ${kind} | ${of.length} | ${pct(of.filter((p) => p.right).length, of.length)} | ${n('blind')} | ${n('great')} |`)
  }

  lines.push('', '## The whole deck', '', `${deck.length} cards.`, '', '| Kind | Cards | Share |', '|---|---|---|')
  const deckKinds = new Map<string, number>()
  for (const card of deck) deckKinds.set(kindOf(card), (deckKinds.get(kindOf(card)) ?? 0) + 1)
  for (const [kind, n] of [...deckKinds].sort((a, b) => b[1] - a[1])) lines.push(`| ${kind} | ${n} | ${pct(n, deck.length)} |`)
  lines.push('', '| Era | Cards | Share |', '|---|---|---|')
  const eras = ['before year 0', '0–1499', '1500–1799', '1800s', '1900–1949', '1950–1999', '2000 on']
  for (const era of eras) {
    const n = deck.filter((card) => eraOf(card.year) === era).length
    lines.push(`| ${era} | ${n} | ${pct(n, deck.length)} |`)
  }

  lines.push('', '## Every card', '', '| Card | Year | Kind | Right | Confidence | Flags | Comment |', '|---|---|---|---|---|---|---|')
  for (const p of log) {
    const cell = (s: string) => s.replace(/\|/g, '/').replace(/\n/g, ' ')
    lines.push(`| ${cell(p.title)} | ${fmtYear(p.year)} | ${kindOf(p)} | ${p.right ? 'yes' : 'no'} | ${p.confidence} | ${(p.flags ?? []).join(', ')} | ${cell(p.comment ?? '')} |`)
  }
  const out = path.join(ROOT, round, 'report.md')
  await writeFile(out, `${lines.join('\n')}\n`)
  console.log(`Wrote ${out}`)
}

const [command, ...args] = process.argv.slice(2)
const commands: Record<string, (args: string[]) => Promise<void>> = {
  start,
  place,
  note,
  show: async () => show(load()),
  report,
}
const run = command ? commands[command] : undefined
if (!run) {
  console.log('Commands: start <round>, show, place <gap> <sure|leaning|guess> "<why>", note "<flags>" "<comment>", report <round>')
  process.exit(1)
}
try {
  await run(args)
} catch (error) {
  console.error((error as Error).message)
  process.exit(1)
}
