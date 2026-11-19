import { useId } from 'react'
import type { Precision } from '../game/index.ts'
import { LogoMark, MinusIcon, PlusIcon } from './icons.tsx'
import type { Settings } from './settings.ts'
import type { ThemeChoice } from './theme.ts'
import {
  canPlay,
  canStepTarget,
  cardsInPlay,
  isTicked,
  mixKind,
  MIX_STEP,
  stepTarget,
  targetFor,
  toggleDeck,
  type Deck,
} from './setup.ts'
import { mixText, precisionNote } from './text.ts'
import './start.css'

interface StartProps {
  decks: readonly Deck[]
  settings: Settings
  onChange: (next: Settings) => void
  /** Light, dark, or as the device is. Kept apart from the game settings (src/ui/theme.ts). */
  theme: ThemeChoice
  onThemeChange: (next: ThemeChoice) => void
  onStart: () => void
}

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'lys', label: 'Lys' },
  { value: 'mork', label: 'Mørk' },
]

const PRECISIONS: { value: Precision; label: string }[] = [
  { value: 'year', label: 'År' },
  { value: 'month', label: 'Måned' },
  { value: 'day', label: 'Dag' },
]

/** The start screen: which decks, how much of each kind, how many cards to win, how strict. */
export function Start({ decks, settings, onChange, theme, onThemeChange, onStart }: StartProps) {
  const id = useId()
  const cardCount = cardsInPlay(decks, settings).length
  const playable = canPlay(cardCount)
  const kind = mixKind(decks, settings)
  const target = targetFor(settings, cardCount)
  const mix = mixText(kind, settings.personalPercent)

  return (
    <main className="tl-start">
      <header className="tl-start__hode">
        <div className="tl-start__merke">
          <LogoMark />
          <h1 className="tl-start__tittel">Tidslinje</h1>
        </div>
        <p className="tl-start__ingress">Legg kortene i riktig rekkefølge. Lås inn før det glipper.</p>
      </header>

      <section className="tl-start__del">
        <h2 id={`${id}-kortstokker`} className="tl-etikett">
          Kortstokker
        </h2>
        <div role="group" aria-labelledby={`${id}-kortstokker`} className="tl-stokker">
          {decks.map((deck) => (
            <label key={deck.id} className="tl-stokk">
              <input
                type="checkbox"
                className="tl-stokk__kryss"
                checked={isTicked(settings, deck)}
                onChange={() => onChange(toggleDeck(settings, deck))}
              />
              <span className="tl-stokk__navn">{deck.name}</span>
              <span className="tl-stokk__type">{deck.visibility === 'public' ? 'Felles' : 'Privat'}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="tl-start__del tl-start__del--tett">
        <div className="tl-blanding__hode">
          <label htmlFor={`${id}-blanding`} className="tl-etikett">
            Blanding
          </label>
          <span className="tl-blanding__verdi" aria-hidden="true">
            {mix}
          </span>
        </div>
        <input
          id={`${id}-blanding`}
          className="tl-blanding"
          type="range"
          min={0}
          max={100}
          step={MIX_STEP}
          value={settings.personalPercent}
          aria-valuetext={mix}
          disabled={kind !== 'both'}
          onChange={(event) => onChange({ ...settings, personalPercent: Number(event.target.value) })}
        />
        <div className="tl-blanding__ender" aria-hidden="true">
          <span>Bare historie</span>
          <span>Bare personlige</span>
        </div>
      </section>

      <section className="tl-start__del tl-start__del--rad">
        <h2 id={`${id}-mal`} className="tl-etikett">
          Kort for å vinne
        </h2>
        <div role="group" aria-labelledby={`${id}-mal`} className="tl-teller">
          <button
            type="button"
            className="tl-teller__knapp"
            aria-label="Færre kort"
            disabled={!canStepTarget(settings, cardCount, -1)}
            onClick={() => onChange(stepTarget(settings, cardCount, -1))}
          >
            <MinusIcon size="xl" />
          </button>
          <output className="tl-teller__tall" aria-live="polite">
            {target}
          </output>
          <button
            type="button"
            className="tl-teller__knapp"
            aria-label="Flere kort"
            disabled={!canStepTarget(settings, cardCount, 1)}
            onClick={() => onChange(stepTarget(settings, cardCount, 1))}
          >
            <PlusIcon size="xl" />
          </button>
        </div>
      </section>

      <section className="tl-start__del">
        <h2 id={`${id}-noyaktighet`} className="tl-etikett">
          Nøyaktighet
        </h2>
        <div role="group" aria-labelledby={`${id}-noyaktighet`} className="tl-presisjon">
          {PRECISIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className="tl-presisjon__knapp"
              aria-pressed={settings.precision === value}
              onClick={() => onChange({ ...settings, precision: value })}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="tl-start__merknad">{precisionNote(settings.precision)}</p>
      </section>

      <section className="tl-start__del">
        <h2 id={`${id}-utseende`} className="tl-etikett">
          Utseende
        </h2>
        <div role="group" aria-labelledby={`${id}-utseende`} className="tl-presisjon">
          {THEMES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className="tl-presisjon__knapp"
              aria-pressed={theme === value}
              onClick={() => onThemeChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {theme === 'auto' && <p className="tl-start__merknad">Lys eller mørk, som på enheten.</p>}
      </section>

      <div className="tl-start__spill">
        {!playable && (
          <p className="tl-start__merknad" role="status">
            {kind === 'none' ? 'Kryss av minst én kortstokk.' : 'Det er for få kort å spille med.'}
          </p>
        )}
        <button
          type="button"
          className="tl-knapp tl-knapp--stor tl-start__knapp"
          data-farge="last"
          disabled={!playable}
          onClick={onStart}
        >
          Spill
        </button>
      </div>
    </main>
  )
}
