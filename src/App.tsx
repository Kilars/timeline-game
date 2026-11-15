import { useState } from 'react'
import { apiUrlFrom } from './data/api.ts'
import { useDecks } from './data/useDecks.ts'
import { browserStore, recordScore, type ScoreResult } from './ui/bestScore.ts'
import { Game } from './ui/Game.tsx'
import { Loading } from './ui/Loading.tsx'
import { Result } from './ui/Result.tsx'
import { nextSeed, randomSeed, seedFromSearch } from './ui/seed.ts'
import { startSession, type Session } from './ui/session.ts'
import { loadSettings, saveSettings, type Settings } from './ui/settings.ts'
import { gameSetup } from './ui/setup.ts'
import { Start } from './ui/Start.tsx'

/** The API the decks come from, set at build time. Without one, the bundled fixture decks are played. */
const apiUrl = apiUrlFrom(import.meta.env.VITE_API_URL)

/**
 * Opens on the start screen with the choices remembered from last time. `?seed=<integer>` in the
 * address fixes the first game; every game after it, and every game without it, gets a seed by chance.
 */
export function App() {
  const { state: decksState, retry } = useDecks(apiUrl)
  const [settings, setSettings] = useState(() => loadSettings(browserStore()))
  /** The seed of the next game. */
  const [seed, setSeed] = useState(() => seedFromSearch(window.location.search) ?? randomSeed())
  /** The game in progress or just ended. Null on the start screen. */
  const [session, setSession] = useState<Session | null>(null)
  const [result, setResult] = useState<ScoreResult | null>(null)
  /** The player has seen the winning card and asked for the result. */
  const [finished, setFinished] = useState(false)

  function changeSettings(next: Settings) {
    setSettings(next)
    saveSettings(browserStore(), next)
  }

  /** Starts a game with the current settings. Also "Spill igjen": the settings are the same. */
  function start() {
    if (decksState.status !== 'ready') return
    const setup = gameSetup(decksState.decks, settings, seed)
    if (!setup) return
    // A new seed for the game after this one, or the same game would be played again.
    setSeed(nextSeed(seed))
    setSession(startSession(setup.cards, setup.options))
    setResult(null)
    setFinished(false)
    window.scrollTo(0, 0)
  }

  function toStart() {
    setSession(null)
    setResult(null)
    setFinished(false)
    window.scrollTo(0, 0)
  }

  if (!session) {
    if (decksState.status !== 'ready') {
      return <Loading failed={decksState.status === 'failed'} onRetry={retry} />
    }
    return <Start decks={decksState.decks} settings={settings} onChange={changeSettings} onStart={start} />
  }

  const { game } = session

  function change(next: Session) {
    if (next.game.phase === 'won' && game.phase !== 'won') {
      setResult(recordScore(browserStore(), next.game.config.target, next.game.player.turnsUsed))
    }
    setSession(next)
  }

  if ((game.phase === 'won' && finished) || game.phase === 'exhausted') {
    return (
      <Result
        game={game}
        result={game.phase === 'won' ? result : null}
        onPlayAgain={start}
        onToStart={toStart}
      />
    )
  }
  return <Game session={session} onChange={change} onFinish={() => setFinished(true)} />
}
