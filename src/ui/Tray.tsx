import type { RefObject } from 'react'
import { gapShortText, whenText } from './dates.ts'
import { OpenLockIcon } from './icons.tsx'
import { canDrawMore, pendingCount, type Session } from './session.ts'
import { lostText, riskText } from './text.ts'

interface TrayProps {
  session: Session
  /** True while the lost cards slide out after a miss. */
  leaving: boolean
  /** The card in hand. The game screen flies the placed card from where this one was. */
  hand: RefObject<HTMLDivElement | null>
  onConfirm: () => void
  onDraw: () => void
  onLock: () => void
  onNext: () => void
  onFinish: () => void
}

/**
 * The tray under the timeline (beside it on a wide screen). It never scrolls, so the drawn card
 * and the button for the next step are always within reach.
 */
export function Tray({ session, leaving, hand, onConfirm, onDraw, onLock, onNext, onFinish }: TrayProps) {
  const { game, selectedGap } = session
  const pending = pendingCount(game)

  if (game.phase === 'deciding') {
    const drawable = canDrawMore(game)
    return (
      <footer className="tl-brett" aria-live="polite">
        <div className="tl-brett__innhold" data-etter-vending="" key={`deciding-${pending}`}>
          <div className="tl-brett__tekst">
            <h2 className="tl-brett__tittel">{pending} kort på spill</h2>
            <p className="tl-brett__merknad">
              {drawable ? riskText(pending) : 'Det er ikke flere kort å trekke.'}
            </p>
          </div>
          <div className="tl-valg" data-ett={drawable ? undefined : ''}>
            {drawable && (
              <button type="button" className="tl-knapp tl-knapp--valg" data-farge="spill" onClick={onDraw}>
                <span className="tl-knapp__tittel">Trekk et kort til</span>
                <span className="tl-knapp__under">Risiker {pending} kort</span>
              </button>
            )}
            <button type="button" className="tl-knapp tl-knapp--valg" data-farge="last" onClick={onLock}>
              <span className="tl-knapp__tittel">Lås inn</span>
              <span className="tl-knapp__under">Sikre {pending} kort</span>
            </button>
          </div>
        </div>
      </footer>
    )
  }

  if (game.phase === 'won') {
    return (
      <footer className="tl-brett" aria-live="polite">
        <div className="tl-brett__innhold" data-etter-vending="" key="won">
          <div className="tl-brett__tekst">
            <h2 className="tl-brett__tittel">Alle {game.config.target} kort er på plass</h2>
            <p className="tl-brett__merknad">Tidslinjen er full.</p>
          </div>
          <button type="button" className="tl-knapp" data-farge="last" onClick={onFinish}>
            Se resultatet
          </button>
        </div>
      </footer>
    )
  }

  if (game.phase === 'miss' && game.miss) {
    const { card, lostCards } = game.miss
    return (
      <footer className="tl-brett" aria-live="polite">
        <div className="tl-brett__innhold" data-etter-vending="" key="miss">
          <div className="tl-brett__tekst">
            <h2 className="tl-brett__tittel">Ikke denne gangen</h2>
            <p className="tl-brett__fasit">
              {card.title} var <strong>{whenText(card, game.config.precision)}</strong>.
              {card.reveal && ` ${card.reveal}`}
            </p>
            <p className="tl-brett__tap">{lostText(lostCards.map((lost) => lost.title))}</p>
          </div>
          <button type="button" className="tl-knapp" data-farge="last" disabled={leaving} onClick={onNext}>
            Neste runde
          </button>
        </div>
      </footer>
    )
  }

  if (game.phase !== 'placing' || !game.drawn) return null
  const cards = game.player.timeline.map((entry) => entry.card)
  return (
    <footer className="tl-brett">
      <div className="tl-brett__innhold" key={`placing-${game.drawn.id}`}>
        <div className="tl-brett__hode">
          <h2 className="tl-etikett">På hånden</h2>
          {selectedGap === null ? (
            <p className="tl-brett__plass">Når skjedde dette?</p>
          ) : (
            <p className="tl-brett__plass" data-valgt="">
              Valgt plass: {gapShortText(cards, selectedGap, game.config.precision)}
            </p>
          )}
        </div>
        <div className="tl-kort" data-state="hand" ref={hand}>
          <span className="tl-kort__sporsmal" aria-hidden="true">
            ?
          </span>
          <p className="tl-kort__tittel">{game.drawn.title}</p>
        </div>
        {selectedGap === null ? (
          <p className="tl-brett__hint">Trykk på en åpning i tidslinjen</p>
        ) : (
          <button type="button" className="tl-knapp" data-farge="last" onClick={onConfirm}>
            Bekreft
          </button>
        )}
        {pending > 0 && (
          <p className="tl-brett__spill">
            <OpenLockIcon size="s" />
            {pending} kort på spill denne runden
          </p>
        )}
      </div>
    </footer>
  )
}
