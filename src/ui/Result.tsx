import type { GameState } from '../game/index.ts'
import type { ScoreResult } from './bestScore.ts'
import { resultNote, turnsText } from './text.ts'
import { Pips } from './TopBar.tsx'
import './result.css'

interface ResultProps {
  game: GameState
  /** How the game compares with the best score. Null when the game ended without a win. */
  result: ScoreResult | null
  /** A new game with the same settings. */
  onPlayAgain: () => void
  /** Back to the start screen to change the settings. */
  onToStart: () => void
}

/** The end of a game: the score and the best score after a win, a short message when the cards ran out. */
export function Result({ game, result, onPlayAgain, onToStart }: ResultProps) {
  const { target } = game.config
  const turns = game.player.turnsUsed
  const placed = game.player.timeline.length

  return (
    <main className="tl-resultat">
      {result ? (
        <>
          <header className="tl-resultat__hode">
            <h1 className="tl-resultat__tittel">{target} kort på tidslinjen</h1>
            <Pips locked={placed} pending={0} target={target} large />
          </header>
          <section className="tl-resultat__kort">
            <p className="tl-etikett">Du brukte</p>
            <p className="tl-resultat__tall">{turns}</p>
            <p className="tl-resultat__enhet">{turns === 1 ? 'runde' : 'runder'}</p>
          </section>
          <dl className="tl-resultat__liste">
            <div className="tl-resultat__rad">
              <dt>Din rekord</dt>
              <dd>{turnsText(result.best)}</dd>
            </div>
            <div className="tl-resultat__rad">
              <dt>Dette spillet</dt>
              <dd>{turnsText(turns)}</dd>
            </div>
          </dl>
          <p className="tl-resultat__merknad" data-rekord={result.isNewBest ? '' : undefined}>
            {resultNote(result, turns)}
          </p>
        </>
      ) : (
        <>
          <header className="tl-resultat__hode">
            <h1 className="tl-resultat__tittel">Bunken er tom</h1>
            <Pips locked={placed} pending={0} target={target} large />
          </header>
          <p className="tl-resultat__merknad">
            Det er ikke flere kort å trekke. Du fikk {placed} av {target} kort på tidslinjen på{' '}
            {turnsText(turns)}.
          </p>
        </>
      )}
      <div className="tl-resultat__knapper">
        <button type="button" className="tl-knapp tl-knapp--stor" data-farge="last" onClick={onPlayAgain}>
          Spill igjen
        </button>
        <button type="button" className="tl-knapp tl-knapp--andre" onClick={onToStart}>
          Til start
        </button>
      </div>
    </main>
  )
}
