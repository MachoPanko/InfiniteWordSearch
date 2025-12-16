export type Direction = 'horizontal' | 'vertical' | 'diagonal';

export interface WordPlacement {
  word: string;
  startRow: number;
  startCol: number;
  direction: Direction;
}

export interface WordSearchPuzzle {
  grid: string[][];
  words: string[];
  placements: WordPlacement[];
  size: number;
}

const GRID_SIZE = 15;
const COMMON_CHINESE_CHARS = '的一是了我不人在他有这个上们来到大时地为子中你说生国年着就那和要你下前.';

export function generateWordSearch(words: string[], locale: string = 'en'): WordSearchPuzzle {
  // Filter and prepare words
  const cleanWords = words
    .map(w => w.toUpperCase().replace(/[^A-Z\u4e00-\u9fa5]/g, ''))
    .filter(w => w.length >= 2 && w.length <= GRID_SIZE);

  // Initialize empty grid
  const grid: string[][] = Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(''));

  const placements: WordPlacement[] = [];

  // Place each word
  for (const word of cleanWords) {
    let placed = false;
    let attempts = 0;
    const maxAttempts = 100;

    while (!placed && attempts < maxAttempts) {
      const direction: Direction = ['horizontal', 'vertical', 'diagonal'][
        Math.floor(Math.random() * 3)
      ] as Direction;

      const placement = tryPlaceWord(grid, word, direction);
      if (placement) {
        placements.push(placement);
        placeWordOnGrid(grid, placement);
        placed = true;
      }
      attempts++;
    }
  }

  // Fill empty cells with random letters
  fillEmptyCells(grid, locale);

  return {
    grid,
    words: cleanWords,
    placements,
    size: GRID_SIZE,
  };
}

function tryPlaceWord(
  grid: string[][],
  word: string,
  direction: Direction
): WordPlacement | null {
  const size = grid.length;
  let rowDir: number, colDir: number;

  // Determine direction vectors
  switch (direction) {
    case 'horizontal':
      rowDir = 0;
      colDir = 1;
      break;
    case 'vertical':
      rowDir = 1;
      colDir = 0;
      break;
    case 'diagonal':
      rowDir = 1;
      colDir = 1;
      break;
  }

  // Random starting position
  const maxRow = direction === 'horizontal' ? size : size - word.length;
  const maxCol = direction === 'vertical' ? size : size - word.length;

  const startRow = Math.floor(Math.random() * maxRow);
  const startCol = Math.floor(Math.random() * maxCol);

  // Check if word can be placed
  for (let i = 0; i < word.length; i++) {
    const row = startRow + i * rowDir;
    const col = startCol + i * colDir;

    if (row >= size || col >= size) return null;

    const cellValue = grid[row][col];
    if (cellValue !== '' && cellValue !== word[i]) {
      return null;
    }
  }

  return { word, startRow, startCol, direction };
}

function placeWordOnGrid(grid: string[][], placement: WordPlacement): void {
  const { word, startRow, startCol, direction } = placement;
  let rowDir = 0,
    colDir = 0;

  switch (direction) {
    case 'horizontal':
      colDir = 1;
      break;
    case 'vertical':
      rowDir = 1;
      break;
    case 'diagonal':
      rowDir = 1;
      colDir = 1;
      break;
  }

  for (let i = 0; i < word.length; i++) {
    const row = startRow + i * rowDir;
    const col = startCol + i * colDir;
    grid[row][col] = word[i];
  }
}

function fillEmptyCells(grid: string[][], locale: string): void {
  const letters = locale === 'zh' ? COMMON_CHINESE_CHARS : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      if (grid[i][j] === '') {
        grid[i][j] = letters[Math.floor(Math.random() * letters.length)];
      }
    }
  }
}
