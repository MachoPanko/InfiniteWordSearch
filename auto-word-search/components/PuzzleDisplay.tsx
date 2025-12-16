
'use client';

import { useTranslations } from 'next-intl';
import WordSearchGrid from './WordSearchGrid';
import WordList from './WordList';
import type { WordSearchPuzzle } from '@/lib/wordSearchGenerator';
import { useEffect, useState } from 'react';

interface PuzzleDisplayProps {
  puzzles: WordSearchPuzzle[];
  showSolution: boolean;
  setShowSolution: (value: boolean) => void;
  isGenerated: boolean;
}

export default function PuzzleDisplay({ puzzles, showSolution, setShowSolution, isGenerated }: PuzzleDisplayProps) {
  const t = useTranslations('HomePage');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isGenerated) {
      const timer = setTimeout(() => setVisible(true), 100);
      return () => clearTimeout(timer);
    }
  }, [isGenerated]);

  useEffect(() => {
    setVisible(false);
  }, [puzzles]);

  if (puzzles.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-8 mt-8 transition-all duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="flex justify-center gap-4 print:hidden">
        <button
          onClick={() => setShowSolution(!showSolution)}
          className="px-6 py-2 bg-blue-500 text-white rounded-md font-semibold hover:bg-blue-600 transition-colors duration-300"
        >
          {showSolution ? t('hideSolutionButton') : t('showSolutionButton')}
        </button>
        <button
          onClick={() => window.print()}
          className="px-6 py-2 bg-gray-600 text-white rounded-md font-semibold hover:bg-gray-700 transition-colors duration-300"
        >
          {t('printButton')}
        </button>
      </div>

      {puzzles.map((puzzle, index) => (
        <div key={index} className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center page-break">
          <WordSearchGrid puzzle={puzzle} showSolution={showSolution} />
          <WordList words={puzzle.words} title={t('wordListTitle')} />
        </div>
      ))}
    </div>
  );
}
