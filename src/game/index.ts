// The rules of the game as pure functions over plain data. See README.md in this folder.

export { compareCards, correctGapsFor } from './compare.ts'
export {
  DEFAULT_CONFIG,
  correctGaps,
  createGame,
  drawAnother,
  lockIn,
  nextTurn,
  placeCard,
  score,
} from './game.ts'
export type { GameOptions } from './game.ts'
export type {
  Card,
  GameConfig,
  GameState,
  Miss,
  Phase,
  Player,
  Pool,
  Precision,
  TimelineEntry,
} from './types.ts'
