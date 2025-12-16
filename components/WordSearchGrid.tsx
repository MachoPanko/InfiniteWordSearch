'use client';

import { useState } from 'react';
import type { WordSearchPuzzle } from '@/lib/wordSearchGenerator';

interface WordSearchGridProps {
  puzzle: WordSearchPuzzle;
  showSolution?: boolean;
  isPreview?: boolean;
}

export default function WordSearchGrid({ puzzle, showSolution = false, isPreview = false }: WordSearchGridProps) {
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);

  const getCellKey = (row: number, col: number) => `${row}-${col}`;

  const isCellInWord = (row: number, col: number): boolean => {
    if (!showSolution) return false;

    return puzzle.placements.some((placement) => {
      const { startRow, startCol, direction, word } = placement;
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
        const wordRow = startRow + i * rowDir;
        const wordCol = startCol + i * colDir;
        if (wordRow === row && wordCol === col) {
          return true;
        }
      }
      return false;
    });
  };

  const handleMouseDown = (row: number, col: number) => {
    if (showSolution || isPreview) return;
    setIsSelecting(true);
    setSelectionStart({ row, col });
    setSelectedCells(new Set([getCellKey(row, col)]));
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (!isSelecting || !selectionStart || showSolution || isPreview) return;

    const cells = getCellsInLine(selectionStart.row, selectionStart.col, row, col);
    setSelectedCells(new Set(cells.map((c) => getCellKey(c.row, c.col))));
  };

  const handleMouseUp = () => {
    if (!isSelecting || showSolution || isPreview) return;
    setIsSelecting(false);

    // Check if selection forms a word
    const selectedWord = Array.from(selectedCells)
      .sort()
      .map((key) => {
        const [row, col] = key.split('-').map(Number);
        return puzzle.grid[row][col];
      })
      .join('');

    if (puzzle.words.includes(selectedWord)) {
      setFoundWords(new Set([...foundWords, selectedWord]));
    }

    setSelectedCells(new Set());
    setSelectionStart(null);
  };

  const getCellsInLine = (
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number
  ): { row: number; col: number }[] => {
    const cells: { row: number; col: number }[] = [];
    const rowDiff = endRow - startRow;
    const colDiff = endCol - startCol;

    // Determine if it's a valid direction (horizontal, vertical, or diagonal)
    const isHorizontal = rowDiff === 0;
    const isVertical = colDiff === 0;
    const isDiagonal = Math.abs(rowDiff) === Math.abs(colDiff);

    if (!isHorizontal && !isVertical && !isDiagonal) {
      return [{ row: startRow, col: startCol }];
    }

    const steps = Math.max(Math.abs(rowDiff), Math.abs(colDiff));
    const rowStep = steps === 0 ? 0 : rowDiff / steps;
    const colStep = steps === 0 ? 0 : colDiff / steps;

    for (let i = 0; i <= steps; i++) {
      cells.push({
        row: startRow + Math.round(rowStep * i),
        col: startCol + Math.round(colStep * i),
      });
    }

    return cells;
  };

  const cellSize = isPreview ? 'w-6 h-6' : 'w-8 h-8 sm:w-10 sm:h-10';
  const textSize = isPreview ? 'text-xs' : 'text-sm sm:text-base';

  return (
    <div className="flex flex-col gap-4">
      <div
        className="inline-grid gap-[2px] select-none min-w-full"
        style={{
          gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))`,
        }}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (isSelecting) {
            setIsSelecting(false);
            setSelectedCells(new Set());
            setSelectionStart(null);
          }
        }}
      >
        {puzzle.grid.map((row, rowIndex) =>
          row.map((letter, colIndex) => {
            const cellKey = getCellKey(rowIndex, colIndex);
            const isSelected = selectedCells.has(cellKey);
            const isInSolution = isCellInWord(rowIndex, colIndex);

            return (
              <div
                key={cellKey}
                className={`
                  ${cellSize} flex items-center justify-center
                  font-bold ${textSize} border border-gray-300
                  ${isPreview ? 'cursor-default' : 'cursor-pointer'} transition-colors
                  ${isSelected ? 'bg-blue-300' : 'bg-white'}
                  ${isInSolution ? 'bg-yellow-200' : ''}
                  ${!isPreview ? 'hover:bg-gray-100' : ''}
                `}
                onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
              >
                {letter}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}