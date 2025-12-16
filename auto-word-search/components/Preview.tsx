
'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { type WordSearchPuzzle, generateWordSearch } from '@/lib/wordSearchGenerator';
import WordSearchGrid from './WordSearchGrid';
import WordList from './WordList';

interface PreviewProps {
  wordCount: number;
  numberOfCopies: number;
  themeList: string;
}

const fallbackWords = [
  'apple',
  'banana',
  'cherry',
  'date',
  'elderberry',
  'fig',
  'grape',
  'honeydew',
  'kiwi',
  'lemon',
  'mango',
  'nectarine',
  'orange',
  'papaya',
  'quince',
  'raspberry',
  'strawberry',
  'tangerine',
  'ugli',
  'vanilla',
  'watermelon',
  'xigua',
  'yuzu',
  'zucchini',
];

export default function Preview({ wordCount, numberOfCopies, themeList }: PreviewProps) {
  const t = useTranslations('HomePage');
  const [puzzle, setPuzzle] = useState<WordSearchPuzzle | null>(null);

  useEffect(() => {
    const themes = themeList.split('\n').filter(t => t.trim() !== '');
    const words = themes.length > 0 ? themes : fallbackWords;
    const puzzle = generateWordSearch(words.slice(0, wordCount), 'en');
    setPuzzle(puzzle);
  }, [wordCount, themeList]);

  return (
    <div className="bg-gray-100 rounded-lg shadow-inner p-6 mt-8">
      <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">{t('previewTitle')}</h3>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 flex flex-col items-center">
          <p className="text-lg font-semibold text-gray-700 mb-3">{t('puzzlePreviewSize')}</p>
          <div className="w-full max-w-md mx-auto p-4 bg-white rounded-xl shadow-lg">
            {puzzle && <WordSearchGrid puzzle={puzzle} showSolution={false} isPreview={true} />}
          </div>
        </div>

        <div className="flex flex-col items-center w-full">
          <div className="w-full">
            <p className="text-lg font-semibold text-gray-700 mb-3 text-center">{t('wordListTitle')}</p>
            <div className="w-full h-48 overflow-y-auto border-2 border-gray-200 bg-white shadow-md rounded-xl p-4">
              {puzzle && <WordList words={puzzle.words} title="" isPreview={true} />}
            </div>
          </div>

          <div className="w-full mt-8">
            <p className="text-lg font-semibold text-gray-700 mb-3 text-center">{t('copiesCount')}</p>
            <div className="flex items-center justify-center flex-wrap gap-3 max-w-sm mx-auto">
              {Array.from({ length: Math.min(numberOfCopies, 5) }).map((_, i) => (
                <div key={i} className="w-16 h-24 bg-white border-2 border-gray-300 rounded-lg shadow-sm transform transition-transform hover:scale-105" />
              ))}
              {numberOfCopies > 5 && (
                <div className="text-gray-600 font-bold text-xl">+{numberOfCopies - 5}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
