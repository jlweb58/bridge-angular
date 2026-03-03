export const PLAYERS = ['NORTH', 'EAST', 'SOUTH', 'WEST'] as const;
export type Player = typeof PLAYERS[number];

export const PLAYER_PBN_CHAR: Record<Player, 'N' | 'E' | 'S' | 'W'> = {
  NORTH: 'N',
  EAST: 'E',
  SOUTH: 'S',
  WEST: 'W',
} as const;

/** Handy for dropdown labels if you ever want short names */
export const PLAYER_LABEL: Record<Player, string> = {
  NORTH: 'North',
  EAST: 'East',
  SOUTH: 'South',
  WEST: 'West',
} as const;
