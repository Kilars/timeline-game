import { useEffect, useState, type CSSProperties, type RefObject } from 'react'
import type { Precision } from '../game/index.ts'
import { dateParts, yearText } from './dates.ts'
import { prefersReducedMotion } from './dom.ts'
import { ArrowDownIcon, ArrowUpIcon, BackIcon, CheckIcon, LockIcon, OpenLockIcon, PlusIcon } from './icons.tsx'
import { timelineRows, type CardRow, type GapRow, type MarkerRow, type Session } from './session.ts'

interface TimelineProps {
  session: Session
  /** True while the lost cards slide out after a miss. */
  leaving: boolean
  /** The element that scrolls. The game screen moves it after a placement. */
  scroller: RefObject<HTMLDivElement | null>
  onSelect: (gap: number) => void
}

/** The vertical timeline, oldest at the top. It is the only part of the game screen that scrolls. */
export function Timeline({ session, leaving, scroller, onSelect }: TimelineProps) {
  const { phase, config } = session.game
  const more = useMore(scroller)

  function jump(to: 'top' | 'bottom') {
    const box = scroller.current
    if (!box) return
    box.scrollTo({
      top: to === 'top' ? 0 : box.scrollHeight,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }

  return (
    <main className="tl-linje">
      <div className="tl-linje__rull" ref={scroller}>
        <ol
          className="tl-linje__liste"
          aria-label="Tidslinje, eldst øverst"
          data-fase={phase}
          data-ut={leaving ? '' : undefined}
        >
          {timelineRows(session).map((row) => {
            if (row.kind === 'gap') return <Gap key={`gap-${row.gap}`} row={row} onSelect={onSelect} />
            if (row.kind === 'marker') return <Marker key="marker" row={row} />
            return <CardItem key={row.card.id} row={row} precision={config.precision} />
          })}
        </ol>
      </div>
      {more.above && <div className="tl-linje__uttoning" data-ende="topp" aria-hidden="true" />}
      {more.below && <div className="tl-linje__uttoning" data-ende="bunn" aria-hidden="true" />}
      {more.above && (
        <button type="button" className="tl-chip" data-ende="topp" onClick={() => jump('top')}>
          <span className="tl-chip__pille">
            <ArrowUpIcon size="s" />
            Eldre kort
          </span>
        </button>
      )}
      {more.below && (
        <button type="button" className="tl-chip" data-ende="bunn" onClick={() => jump('bottom')}>
          <span className="tl-chip__pille">
            <ArrowDownIcon size="s" />
            Nyere kort
          </span>
        </button>
      )}
    </main>
  )
}

function Gap({ row, onSelect }: { row: GapRow; onSelect: (gap: number) => void }) {
  return (
    <li className="tl-rad">
      <Rail node={row.chosen ? 'valgt' : null} />
      <button
        type="button"
        className="tl-apning"
        data-gap={row.gap}
        aria-pressed={row.chosen}
        aria-label={row.chosen ? `Valgt plass: ${row.text}` : `Legg kortet ${row.text}`}
        onClick={() => onSelect(row.gap)}
      >
        <span className="tl-apning__spor">
          {row.chosen ? (
            <>
              <ArrowUpIcon size="l" />
              Kortet legges her
            </>
          ) : (
            <PlusIcon size="s" />
          )}
        </span>
      </button>
    </li>
  )
}

function CardItem({ row, precision }: { row: CardRow; precision: Precision }) {
  const { card, state } = row
  const date = dateParts(card, precision)
  const style =
    row.lockStep === null ? undefined : ({ '--tl-nr': row.lockStep } as CSSProperties)

  if (row.opened) {
    return (
      <li className="tl-rad">
        <Rail node={state} late />
        <article
          className="tl-kort tl-kort--apen"
          data-state={state}
          data-vipp={row.tilt}
          data-kort={card.id}
          data-nylig=""
        >
          <div className="tl-kort__hode">
            <span className="tl-kort__ar tl-kort__ar--stor" data-avslort="">
              <span>{yearText(card)}</span>
            </span>
            <span className="tl-kort__dato">{date.rest}</span>
            <span className="tl-merke">
              <CheckIcon />
              Riktig
            </span>
          </div>
          <h2 className="tl-kort__tittel">{card.title}</h2>
          {card.description && <p className="tl-kort__beskrivelse">{card.description}</p>}
          {card.reveal && <p className="tl-kort__avsloring">{card.reveal}</p>}
          {state === 'last' ? (
            <p className="tl-kort__under tl-kort__under--ikon">
              <LockIcon size="s" />
              Låst
            </p>
          ) : (
            <p className="tl-kort__under tl-kort__under--ikon">
              <OpenLockIcon size="s" />
              På spill til du låser inn
            </p>
          )}
        </article>
      </li>
    )
  }

  const notes = [
    date.rest,
    state === 'spill' ? 'På spill' : null,
    row.missed ? 'Du la det her' : null,
    state === 'tapt' && !row.missed ? 'Ute av spillet' : null,
  ].filter((note) => note !== null)

  return (
    <li className="tl-rad">
      <Rail node={state} late={row.missed} />
      <div
        className="tl-kort"
        data-state={state}
        data-vipp={row.tilt}
        data-kort={card.id}
        data-bom={row.missed ? '' : undefined}
        data-nylig={row.missed ? '' : undefined}
        data-nylast={row.lockStep === null ? undefined : ''}
        style={style}
      >
        <span className="tl-kort__ar" data-avslort={row.missed ? '' : undefined}>
          <span className="tl-kort__tall">{date.year}</span>
          {date.era && <span className="tl-kort__era">{date.era}</span>}
        </span>
        <span className="tl-kort__midt">
          <span className="tl-kort__tittel">{card.title}</span>
          {notes.length > 0 && (
            // Keyed by state, so a new label fades in when the card's state changes.
            <span className="tl-kort__under" key={state}>
              {notes.join(' · ')}
            </span>
          )}
        </span>
        {state === 'last' && <LockIcon label="Låst" className="tl-kort__las" />}
        {state === 'spill' && <OpenLockIcon className="tl-kort__las" />}
        {state === 'tapt' && !row.missed && <BackIcon size="l" className="tl-kort__las" />}
      </div>
    </li>
  )
}

function Marker({ row }: { row: MarkerRow }) {
  const date = dateParts(row.card, 'year')
  return (
    <li className="tl-rad">
      <Rail node="valgt" late />
      <p className="tl-hjem">
        <span className="tl-kort__ar">
          <span className="tl-kort__tall">{date.year}</span>
          {date.era && <span className="tl-kort__era">{date.era}</span>}
        </span>
        <span>hører hjemme her</span>
      </p>
    </li>
  )
}

interface RailProps {
  node: 'last' | 'spill' | 'tapt' | 'valgt' | null
  /** The dot belongs to a reveal and shows with the outcome, not before. */
  late?: boolean
}

/** The piece of the line beside a row, with the row's dot when it has one. */
function Rail({ node, late = false }: RailProps) {
  return (
    <span className="tl-skinne" aria-hidden="true">
      {node && <span className="tl-node" data-state={node} data-sen={late ? '' : undefined} />}
    </span>
  )
}

/** Whether there is more of the timeline above or below what is on screen. */
function useMore(scroller: RefObject<HTMLDivElement | null>): { above: boolean; below: boolean } {
  const [more, setMore] = useState({ above: false, below: false })

  useEffect(() => {
    const box = scroller.current
    if (!box) return
    const slack = 8
    const measure = () => {
      // Measured from the list's own box, which a card in flight or a tilted card does not stretch.
      const list = box.firstElementChild
      const listBottom = list instanceof HTMLElement ? list.offsetTop + list.offsetHeight : 0
      const above = box.scrollTop > slack
      const below = listBottom - box.clientHeight - box.scrollTop > slack
      setMore((old) => (old.above === above && old.below === below ? old : { above, below }))
    }
    // The list changes height when cards and gaps come and go; the box when the tray does.
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    if (box.firstElementChild) observer.observe(box.firstElementChild)
    box.addEventListener('scroll', measure, { passive: true })
    return () => {
      observer.disconnect()
      box.removeEventListener('scroll', measure)
    }
  }, [scroller])

  return more
}
