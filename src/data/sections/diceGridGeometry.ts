/**
 * Shared geometry and ink for the 6 x 6 possibility grid used across the
 * probability lesson. One source of truth so every figure lines up.
 */

export const CELL = 46;
export const GRID_COLUMNS = 6;
export const GRID_SIZE = CELL * GRID_COLUMNS; // 276

export const GRID_X = 96;
export const GRID_Y = 96;

export const VIEW_WIDTH = 560;

/** Ink palette (FIGURE_DESIGN_LANGUAGE.md) */
export const INK = "#334155";
export const INK_STRUCTURE = "#64748B";
export const INK_QUIET = "#CBD5E1";
export const PAPER_FILL = "#F1F5F9";

export const TEAL = "#62D0AD";
export const INDIGO = "#8E90F5";
export const AMBER = "#F7B23B";

/** Cell index (0..35) from a (teal, indigo) pair, both 1..6. */
export const cellIndex = (teal: number, indigo: number): number =>
    (teal - 1) * GRID_COLUMNS + (indigo - 1);

/** (teal, indigo) pair from a cell index. */
export const cellPair = (index: number): [number, number] => [
    Math.floor(index / GRID_COLUMNS) + 1,
    (index % GRID_COLUMNS) + 1,
];

/** Top-left corner of a cell, given the grid origin. */
export const cellX = (indigo: number, originX = GRID_X): number =>
    originX + (indigo - 1) * CELL;
export const cellY = (teal: number, originY = GRID_Y): number =>
    originY + (teal - 1) * CELL;

/** Centre of a cell. */
export const cellCentreX = (indigo: number, originX = GRID_X): number =>
    cellX(indigo, originX) + CELL / 2;
export const cellCentreY = (teal: number, originY = GRID_Y): number =>
    cellY(teal, originY) + CELL / 2;

export const DIE_FACES = [1, 2, 3, 4, 5, 6];

/** All 36 cell indices. */
export const ALL_CELLS = Array.from({ length: 36 }, (_, i) => i);
