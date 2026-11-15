// The few things the game screen does to the page by hand: read a timing from the theme, fly the
// placed card from the hand to its gap, and keep the timeline's scroll position sensible.

/** True when the device asks for less motion: nothing travels, flips or pops. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** A theme variable such as `--tl-ease-ut`, as written in theme.css. */
export function themeValue(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/** A theme timing such as `--tl-tid` in milliseconds. */
export function themeMs(name: string): number {
  const value = themeValue(name)
  const number = Number.parseFloat(value)
  if (Number.isNaN(number)) return 0
  return value.endsWith('ms') ? number : number * 1000
}

/**
 * Lets `element` travel from where `from` was to where it is now (the first step of the reveal).
 * It animates `translate`, so the tilt that a card's state sets with `transform` is left alone.
 */
export function flyFrom(element: HTMLElement, from: DOMRect): void {
  const to = element.getBoundingClientRect()
  element.animate(
    { translate: [`${from.left - to.left}px ${from.top - to.top}px`, '0px 0px'] },
    { duration: themeMs('--tl-tid-kort'), easing: themeValue('--tl-ease-ut') || 'ease-out' },
  )
}

/**
 * Scrolls `box` so that `element` sits in the middle. When `also` is given and both fit in the box
 * at once, the pair is put in the middle instead.
 */
export function centreInView(box: HTMLElement, element: HTMLElement, also?: HTMLElement | null): void {
  const view = box.getBoundingClientRect()
  let { top, bottom } = element.getBoundingClientRect()
  if (also) {
    const other = also.getBoundingClientRect()
    const pairTop = Math.min(top, other.top)
    const pairBottom = Math.max(bottom, other.bottom)
    if (pairBottom - pairTop <= view.height) {
      top = pairTop
      bottom = pairBottom
    }
  }
  box.scrollTop += (top + bottom) / 2 - (view.top + view.height / 2)
}

export interface Anchor {
  /** The card's id, as in its `data-kort` attribute. */
  id: string
  /** The card's distance from the top of the box. */
  top: number
}

/** Remembers where the card nearest the middle of `box` is, so the list can keep its position. */
export function captureAnchor(box: HTMLElement | null, selector: string): Anchor | null {
  if (!box) return null
  const view = box.getBoundingClientRect()
  const middle = view.top + view.height / 2
  let best: (Anchor & { distance: number }) | null = null
  for (const element of box.querySelectorAll<HTMLElement>(selector)) {
    const id = element.dataset.kort
    if (!id) continue
    const rect = element.getBoundingClientRect()
    const distance = Math.abs((rect.top + rect.bottom) / 2 - middle)
    if (!best || distance < best.distance) best = { id, top: rect.top - view.top, distance }
  }
  return best && { id: best.id, top: best.top }
}

/** Scrolls `box` so the remembered card is back where it was. */
export function restoreAnchor(box: HTMLElement, anchor: Anchor): void {
  const element = [...box.querySelectorAll<HTMLElement>('[data-kort]')].find(
    (candidate) => candidate.dataset.kort === anchor.id,
  )
  if (!element) return
  box.scrollTop += element.getBoundingClientRect().top - box.getBoundingClientRect().top - anchor.top
}

/** A theme length such as `--tl-uttoning` in pixels. */
export function themePx(name: string): number {
  const number = Number.parseFloat(themeValue(name))
  return Number.isNaN(number) ? 0 : number
}

/**
 * Scrolls `box` as little as needed for all of `element` to be inside it, clear of a band of
 * `inset` pixels at each end (where the fades and the chips sit). At the very end of the list the
 * scroll stops short of that, and the fade and chip there go away.
 */
export function keepInView(box: HTMLElement, element: HTMLElement, inset = 0): void {
  const view = box.getBoundingClientRect()
  const top = view.top + inset
  const bottom = view.bottom - inset
  const rect = element.getBoundingClientRect()
  if (rect.bottom > bottom) box.scrollTop += Math.min(rect.bottom - bottom, rect.top - top)
  else if (rect.top < top) box.scrollTop -= top - rect.top
}
