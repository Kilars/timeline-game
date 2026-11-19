// Light or dark: the player's choice on the start screen, remembered on the device. "Auto" follows
// the device, as the app did before there was a choice. The choice is set on <html> as
// `data-tema="lys"` or `data-tema="mork"` (none for auto), and src/theme.css picks the colours by it.
// index.html sets it from storage before the first paint, so a chosen look never flashes the other.

export type ThemeChoice = 'auto' | 'lys' | 'mork'

export type ThemeStore = Pick<Storage, 'getItem' | 'setItem'>

/** Read as a plain string by the script in index.html too: keep the two in step. */
export const THEME_KEY = 'tidslinje:tema'

/** The remembered choice, or auto when there is none or storage cannot be read. */
export function loadTheme(store: ThemeStore | null): ThemeChoice {
  try {
    const value = store?.getItem(THEME_KEY)
    return value === 'lys' || value === 'mork' ? value : 'auto'
  } catch {
    return 'auto'
  }
}

/** Remembers the choice. Does nothing when storage is blocked or full. */
export function saveTheme(store: ThemeStore | null, choice: ThemeChoice): void {
  try {
    store?.setItem(THEME_KEY, choice)
  } catch {
    // The choice holds until the page is closed.
  }
}

/** Shows the choice: sets or clears `data-tema` on the page's root element. */
export function applyTheme(choice: ThemeChoice, root: HTMLElement = document.documentElement): void {
  if (choice === 'auto') delete root.dataset.tema
  else root.dataset.tema = choice
}
