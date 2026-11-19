// The name a player puts on a record (ADR 0010), remembered on the device so the field is filled in
// next time. Storage can be missing, full or blocked: every access is wrapped, and a name that cannot
// be read is no name.

import { normaliseName } from '../../api/src/names.ts'

export type NameStore = Pick<Storage, 'getItem' | 'setItem'>

export const NAME_KEY = 'tidslinje:navn'

/** The remembered name, or '' when there is none or it cannot be read. */
export function loadName(store: NameStore | null): string {
  try {
    return normaliseName(store?.getItem(NAME_KEY) ?? null) ?? ''
  } catch {
    return ''
  }
}

/** Remembers a name. Does nothing when storage is blocked or full. */
export function saveName(store: NameStore | null, name: string): void {
  try {
    store?.setItem(NAME_KEY, name)
  } catch {
    // The name is only forgotten.
  }
}
