import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  captureAnchor,
  centreInView,
  flyFrom,
  keepInView,
  prefersReducedMotion,
  restoreAnchor,
  themeMs,
  themePx,
  type Anchor,
} from './dom.ts'
import {
  confirmGap,
  drawMore,
  lockPending,
  selectGap,
  startNextTurn,
  type Session,
} from './session.ts'
import { Timeline } from './Timeline.tsx'
import { TopBar } from './TopBar.tsx'
import { Tray } from './Tray.tsx'
import './game.css'

interface GameProps {
  session: Session
  onChange: (next: Session) => void
  /** After a win, once the player has seen the last card: show the result. */
  onFinish: () => void
}

/** The game screen: top bar, the scrolling timeline, and the tray with the card in hand. */
export function Game({ session, onChange, onFinish }: GameProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const hand = useRef<HTMLDivElement>(null)
  /** Where the card in hand was when its placement was confirmed. */
  const handRect = useRef<DOMRect | null>(null)
  /** A card whose place on screen should survive the next change of the list. */
  const anchor = useRef<Anchor | null>(null)
  const leaveTimer = useRef<number | undefined>(undefined)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => () => window.clearTimeout(leaveTimer.current), [])

  // After a change, before the browser paints: bring the placed card to the middle and let it fly
  // in from the hand, or put the list back where it was.
  useLayoutEffect(() => {
    const box = scroller.current
    const { phase } = session.game
    if (box && (phase === 'deciding' || phase === 'miss' || phase === 'won')) {
      const placed = box.querySelector<HTMLElement>('[data-nylig]')
      if (placed && handRect.current) {
        centreInView(box, placed, box.querySelector<HTMLElement>('.tl-hjem'))
        if (!prefersReducedMotion()) flyFrom(placed, handRect.current)
      }
    } else if (box && anchor.current) {
      restoreAnchor(box, anchor.current)
    }
    handRect.current = null
    anchor.current = null
  }, [session])

  // A chosen gap grows, and the tray swaps its hint for the confirm button, so a gap near the end of
  // the line can slide under the tray. Keep it in view now and again once it has grown.
  const { selectedGap } = session
  useLayoutEffect(() => {
    const box = scroller.current
    if (!box || selectedGap === null) return
    const gap = box.querySelector<HTMLElement>(`button[data-gap="${selectedGap}"]`)
    if (!gap) return
    const inset = themePx('--tl-uttoning')
    keepInView(box, gap, inset)
    const grown = (event: TransitionEvent) => {
      if (event.target === gap && event.propertyName === 'height') keepInView(box, gap, inset)
    }
    gap.addEventListener('transitionend', grown)
    return () => gap.removeEventListener('transitionend', grown)
  }, [selectedGap])

  function confirm() {
    handRect.current = hand.current?.getBoundingClientRect() ?? null
    onChange(confirmGap(session))
  }

  function draw() {
    anchor.current = captureAnchor(scroller.current, '.tl-kort')
    onChange(drawMore(session))
  }

  function lock() {
    anchor.current = captureAnchor(scroller.current, '.tl-kort')
    onChange(lockPending(session))
  }

  function next() {
    if (leaving) return
    const go = () => {
      // Only the locked cards are still there on the next turn.
      anchor.current = captureAnchor(scroller.current, '.tl-kort[data-state="last"]')
      setLeaving(false)
      onChange(startNextTurn(session))
    }
    if (prefersReducedMotion()) {
      go()
      return
    }
    // The lost cards slide out first; see `[data-ut]` in game.css.
    setLeaving(true)
    leaveTimer.current = window.setTimeout(go, themeMs('--tl-tid'))
  }

  return (
    <div className="tl-spill">
      <TopBar game={session.game} />
      <Timeline
        session={session}
        leaving={leaving}
        scroller={scroller}
        onSelect={(gap) => onChange(selectGap(session, gap))}
      />
      <Tray
        session={session}
        leaving={leaving}
        hand={hand}
        onConfirm={confirm}
        onDraw={draw}
        onLock={lock}
        onNext={next}
        onFinish={onFinish}
      />
    </div>
  )
}
