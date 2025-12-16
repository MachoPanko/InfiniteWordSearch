
'use client';

import { useTranslations } from 'next-intl';
import Preview from './Preview';

interface OptionsControlsProps {
  wordCount: number;
  setWordCount: (value: number) => void;
  numberOfCopies: number;
  setNumberOfCopies: (value: number) => void;
  isLoading: boolean;
  themeList: string;
}

export default function OptionsControls({
  wordCount,
  setWordCount,
  numberOfCopies,
  setNumberOfCopies,
  isLoading,
  themeList,
}: OptionsControlsProps) {
  const t = useTranslations('HomePage');

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">{t('optionsTitle')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="wordCount" className="text-gray-600">
            {t('wordCountLabel')}
          </label>
          <div className="flex items-center gap-4">
            <input
              id="wordCount"
              type="range"
              min="1"
              max="30"
              value={wordCount}
              onChange={(e) => setWordCount(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              disabled={isLoading}
            />
            <span className="font-bold text-lg text-blue-600 w-12 text-center">{wordCount}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="numberOfCopies" className="text-gray-600">
            {t('numberOfCopiesLabel')}
          </label>
          <div className="flex items-center gap-4">
            <input
              id="numberOfCopies"
              type="range"
              min="1"
              max="10"
              value={numberOfCopies}
              onChange={(e) => setNumberOfCopies(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              disabled={isLoading}
            />
            <span className="font-bold text-lg text-blue-600 w-12 text-center">{numberOfCopies}</span>
          </div>
        </div>
      </div>
      <Preview wordCount={wordCount} numberOfCopies={numberOfCopies} themeList={themeList} />
    </div>
  );
}
