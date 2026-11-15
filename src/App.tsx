import { useState } from 'react'
import { fixtureCards } from './fixtures/cards.ts'
import { browserStore, recordScore, type ScoreResult } from './ui/bestScore.ts'
import { Game } from './ui/Game.tsx'
import { Result } from './ui/Result.tsx'
import { nextSeed, randomSeed, seedFromSearch } from './ui/seed.ts'
import { startSession, type Session } from './ui/session.ts'

/**
 * Opening the app starts a game straight away, with the default settings, on the bundled fixture
 * deck. `?seed=<integer>` in the address fixes the game; without it the seed is picked by chance.
 */
export function App() {
  const [seed, setSeed] = useState(() => seedFromSearch(window.location.search) ?? randomSeed())
  const [session, setSession] = useState(() => startSession(fixtureCards, seed))
  const [result, setResult] = useState<ScoreResult | null>(null)
  /** The player has seen the winning card and asked for the result. */
  const [finished, setFinished] = useState(false)
  const { game } = session

  function change(next: Session) {
    if (next.game.phase === 'won' && game.phase !== 'won') {
      setResult(recordScore(browserStore(), next.game.config.target, next.game.player.turnsUsed))
    }
    setSession(next)
  }

  function playAgain() {
    // A new seed, or the same game would be played again.
    const newSeed = nextSeed(seed)
    setSeed(newSeed)
    setSession(startSession(fixtureCards, newSeed))
    setResult(null)
    setFinished(false)
  }

  if ((game.phase === 'won' && finished) || game.phase === 'exhausted') {
    return <Result game={game} result={game.phase === 'won' ? result : null} onPlayAgain={playAgain} />
  }
  return <Game session={session} onChange={change} onFinish={() => setFinished(true)} />
}
