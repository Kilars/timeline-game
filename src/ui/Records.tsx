// The records for everyone on the result screen (ADR 0010): the claim for the records a game beat,
// shown first, and the two records next to this game's own numbers, shown after the player's own best.

import { useId, useState, type FormEvent } from 'react'
import { MAX_NAME_LENGTH, normaliseName } from '../../api/src/names.ts'
import {
  atLimit,
  gameNumbers,
  RECORD_KINDS,
  standing,
  valueFor,
  type GameNumbers,
  type RecordsJson,
} from '../data/records.ts'
import type { ReadyRecords, RecordsState } from '../data/useRecords.ts'
import type { GameState } from '../game/index.ts'
import { browserStore } from './bestScore.ts'
import { loadName, saveName } from './playerName.ts'
import {
  beatenText,
  claimedValuesText,
  RECORD_NAMES,
  recordKeyText,
  recordValueText,
  saveFailedText,
  savedText,
  tiedText,
} from './text.ts'

/** The records at the game's target and precision, with this game's numbers beside them. */
export function Records({ game, state, onRetry }: { game: GameState; state: RecordsState; onRetry: () => void }) {
  const id = useId()
  if (state.status === 'off') return null
  const numbers = gameNumbers(game)

  return (
    <section className="tl-rekorder" aria-labelledby={`${id}-tittel`} aria-busy={state.status === 'loading'}>
      <div className="tl-rekorder__hode">
        <h2 id={`${id}-tittel`} className="tl-etikett">
          Rekorder for alle
        </h2>
        <p className="tl-rekorder__nokkel">{recordKeyText(numbers.target, numbers.precision)}</p>
      </div>
      {state.status === 'loading' && (
        <p className="tl-rekorder__melding" role="status">
          Henter rekordene …
        </p>
      )}
      {state.status === 'failed' && (
        <div className="tl-rekorder__feil">
          <p className="tl-rekorder__melding">Fikk ikke hentet rekordene.</p>
          <button type="button" className="tl-knapp tl-knapp--andre tl-rekorder__igjen" onClick={onRetry}>
            Prøv igjen
          </button>
        </div>
      )}
      {state.status === 'ready' && (
        <>
          <RecordList records={state.records} numbers={numbers} />
          {!state.eligible && (
            <p className="tl-rekorder__melding">Bare spill med de felles historiekortene alene kan sette rekord.</p>
          )}
          {state.eligible && <TieNote records={state.records} numbers={numbers} />}
        </>
      )}
    </section>
  )
}

function RecordList({ records, numbers }: { records: RecordsJson; numbers: GameNumbers }) {
  return (
    <dl className="tl-rekorder__liste">
      {RECORD_KINDS.map((kind) => {
        const record = records[kind]
        return (
          <div key={kind} className="tl-rekorder__rad">
            <dt className="tl-rekorder__navn">{RECORD_NAMES[kind]}</dt>
            <dd className="tl-rekorder__verdi">{record ? recordValueText(kind, record.value) : 'Ingen ennå'}</dd>
            <dd className="tl-rekorder__din">Du: {recordValueText(kind, valueFor(kind, numbers))}</dd>
            {record && <dd className="tl-rekorder__holder">{record.name}</dd>}
          </div>
        )
      })}
    </dl>
  )
}

/** Says so when the game tied a record, which keeps its holder. */
function TieNote({ records, numbers }: { records: RecordsJson; numbers: GameNumbers }) {
  const tied = RECORD_KINDS.filter((kind) => standing(kind, records[kind], numbers) === 'tied')
  if (tied.length === 0) return null
  const limit = tied.every((kind) => atLimit(kind, valueFor(kind, numbers), numbers.target))
  return <p className="tl-rekorder__melding">{tiedText(tied, limit)}</p>
}

/** What the game beat, the name field and "Lagre", and what saving came to. */
export function RecordClaim({
  game,
  state,
  onClaim,
}: {
  game: GameState
  state: ReadyRecords
  onClaim: (name: string) => void
}) {
  const id = useId()
  const [name, setName] = useState(() => loadName(browserStore()))
  const { claim } = state
  const clean = normaliseName(name)
  const numbers = gameNumbers(game)

  if (claim.status === 'saved') {
    return (
      <p className="tl-krav tl-krav__tekst" role="status">
        {savedText(claim.won, claim.lost)}
      </p>
    )
  }

  const saving = claim.status === 'saving'
  const invalid = name.trim() !== '' && clean === null

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (clean === null || saving) return
    saveName(browserStore(), clean)
    onClaim(clean)
  }

  return (
    <form className="tl-krav" onSubmit={submit} aria-labelledby={`${id}-tekst`}>
      <p id={`${id}-tekst`} className="tl-krav__tekst">
        {beatenText(state.beaten)}
      </p>
      <p className="tl-krav__tall">
        {claimedValuesText(state.beaten.map((kind) => ({ kind, value: valueFor(kind, numbers) })))}
      </p>
      <label htmlFor={`${id}-navn`} className="tl-krav__etikett">
        Navnet ditt
      </label>
      <div className="tl-krav__felt">
        <input
          id={`${id}-navn`}
          className="tl-krav__input"
          type="text"
          value={name}
          // Counted in UTF-16 units, so 20 emoji still fit; the 20 characters are checked in code.
          maxLength={MAX_NAME_LENGTH * 2}
          autoComplete="nickname"
          enterKeyHint="done"
          spellCheck={false}
          aria-describedby={`${id}-hint ${id}-feil`}
          aria-invalid={invalid || undefined}
          readOnly={saving}
          onChange={(event) => setName(event.target.value)}
        />
        <button type="submit" className="tl-knapp tl-krav__lagre" data-farge="last" disabled={clean === null || saving}>
          {saving ? 'Lagrer …' : 'Lagre'}
        </button>
      </div>
      <p id={`${id}-hint`} className="tl-krav__hint">
        Navnet vises for alle som spiller med disse innstillingene.
      </p>
      {/* Always in the page, so a screen reader hears what appears in it. */}
      <p id={`${id}-feil`} className="tl-krav__feil" role="alert">
        {claim.status === 'failed'
          ? saveFailedText(state.beaten.length, claim.refused)
          : invalid
            ? `Navnet kan ha opptil ${MAX_NAME_LENGTH} tegn, med minst én bokstav, og ingen usynlige tegn.`
            : ''}
      </p>
    </form>
  )
}
