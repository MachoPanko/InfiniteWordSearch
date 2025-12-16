
'use client';

import { useTranslations } from 'next-intl';
import ThemeInput from './ThemeInput';
import OptionsControls from './OptionsControls';

interface WordSearchFormProps {
  themeList: string;
  setThemeList: (value: string) => void;
  wordCount: number;
  setWordCount: (value: number) => void;
  numberOfCopies: number;
  setNumberOfCopies: (value: number) => void;
  numRandomThemes: number;
  setNumRandomThemes: (value: number) => void;
  handleGeneratePuzzle: () => void;
  handleRandomizeThemes: () => void;
  isLoading: boolean;
  error: string;
}

export default function WordSearchForm({
  themeList,
  setThemeList,
  wordCount,
  setWordCount,
  numberOfCopies,
  setNumberOfCopies,
  numRandomThemes,
  setNumRandomThemes,
  handleGeneratePuzzle,
  handleRandomizeThemes,
  isLoading,
  error,
}: WordSearchFormProps) {
  const t = useTranslations('HomePage');

  return (
    <div className="bg-gray-50 rounded-lg p-6 mb-8">
      <ThemeInput
        themeList={themeList}
        setThemeList={setThemeList}
        numRandomThemes={numRandomThemes}
        setNumRandomThemes={setNumRandomThemes}
        handleRandomizeThemes={handleRandomizeThemes}
        isLoading={isLoading}
      />
      <OptionsControls
        wordCount={wordCount}
        setWordCount={setWordCount}
        numberOfCopies={numberOfCopies}
        setNumberOfCopies={setNumberOfCopies}
        isLoading={isLoading}
        themeList={themeList}
      />
      <button
        onClick={handleGeneratePuzzle}
        disabled={isLoading}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-md font-semibold text-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors duration-300"
      >
        {isLoading ? t('generatingButton') : t('generateButton')}
      </button>
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
