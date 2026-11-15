import { LogoMark } from './icons.tsx'
import './start.css'

interface LoadingProps {
  /** The decks could not be fetched. */
  failed: boolean
  onRetry: () => void
}

/** In front of the start screen while the decks are fetched, or when they could not be. */
export function Loading({ failed, onRetry }: LoadingProps) {
  return (
    <main className="tl-start">
      <header className="tl-start__hode">
        <div className="tl-start__merke">
          <LogoMark />
          <h1 className="tl-start__tittel">Tidslinje</h1>
        </div>
      </header>
      {failed ? (
        <section className="tl-start__del">
          <p role="alert">Fikk ikke hentet kortstokkene. Sjekk nettet og prøv igjen.</p>
          <button type="button" className="tl-knapp" data-farge="last" onClick={onRetry}>
            Prøv igjen
          </button>
        </section>
      ) : (
        <p className="tl-start__merknad" role="status">
          Henter kortstokkene …
        </p>
      )}
    </main>
  )
}
