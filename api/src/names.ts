// The name on a record (ADR 0010), shown to everyone who plays at that target and precision.
// Shared by the API, which decides, and the client, which checks a name before it is sent.

export const MAX_NAME_LENGTH = 20

/**
 * Characters that are not seen: control, format, private-use and unassigned characters, and the
 * default-ignorable ones such as Hangul fillers. Tab and line breaks are only white space.
 */
const HIDDEN = /[^\P{C}\t\n\r]|\p{Default_Ignorable_Code_Point}/u

/**
 * The invisible characters a name may still hold, because emoji are made of them: a zero-width
 * joiner between two emoji, as in 👩‍💻, and the variation selectors in ❤️ and the like. A joiner
 * between letters is refused: "Ka\u200dri" would look like "Kari".
 */
const ALLOWED_HIDDEN =
  /(?<=\p{Extended_Pictographic}|\p{Emoji_Modifier}|\u{fe0f})\u{200d}(?=\p{Extended_Pictographic})|[\u{fe00}-\u{fe0f}]/gu

/** At least one letter, digit or emoji: a name that looks blank is no name. */
const SEEN = /[\p{L}\p{N}\p{Extended_Pictographic}]/u

/** A mark with no character under it, or a pile of marks that draws over the lines around it. */
const STRAY_MARKS = /^\p{M}|\p{M}{4,}/u

/**
 * A name fit to show to everyone: in Unicode normal form C, trimmed, with every run of white space
 * made one space, and 1 to 20 characters counted as code points. Null for anything else: a name with
 * hidden characters (zero-width, direction overrides, fillers), with no letter, digit or emoji, or
 * with stray or piled-up combining marks.
 */
export function normaliseName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const nfc = raw.normalize('NFC')
  if (HIDDEN.test(nfc.replace(ALLOWED_HIDDEN, ''))) return null
  const name = nfc.replace(/\s+/gu, ' ').trim()
  // Marks are counted with every letter taken apart, so "á" is a letter and one mark.
  if (!SEEN.test(name) || STRAY_MARKS.test(name.normalize('NFD'))) return null
  const length = [...name].length
  return length >= 1 && length <= MAX_NAME_LENGTH ? name : null
}
