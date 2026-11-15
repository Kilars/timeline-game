import type { GameState } from '../game/index.ts'
import { pendingCount } from './session.ts'
import { progressText } from './text.ts'

/** Always on screen: the turn number and how far the player is from the target. */
export function TopBar({ game }: { game: GameState }) {
  const pending = pendingCount(game)
  const placed = game.player.timeline.length
  return (
    <header className="tl-topp">
      <h1 className="tl-topp__merke">Tidslinje</h1>
      <div className="tl-topp__status">
        <p className="tl-runde">
          <span className="tl-etikett">Runde</span>{' '}
          <span className="tl-runde__tall">{game.player.turnsUsed}</span>
        </p>
        <div className="tl-framdrift" data-fase={game.phase}>
          <p className="tl-framdrift__tekst">
            <span className="tl-framdrift__tall">{placed}</span> av {game.config.target} kort
          </p>
          <Pips locked={placed - pending} pending={pending} target={game.config.target} />
        </div>
      </div>
    </header>
  )
}

interface PipsProps {
  locked: number
  pending: number
  target: number
  large?: boolean
}

/** One pip a card: locked, pending this turn, or still to win. */
export function Pips({ locked, pending, target, large = false }: PipsProps) {
  return (
    <div
      className="tl-pipper"
      data-stor={large ? '' : undefined}
      role="img"
      aria-label={progressText(locked, pending, target)}
    >
      {Array.from({ length: target }, (_, index) => (
        <span
          key={index}
          className="tl-pip"
          data-state={index < locked ? 'last' : index < locked + pending ? 'spill' : 'tom'}
        />
      ))}
    </div>
  )
}
