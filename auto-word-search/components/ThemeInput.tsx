
'use client';

import { useTranslations } from 'next-intl';

interface ThemeInputProps {
  themeList: string;
  setThemeList: (value: string) => void;
  numRandomThemes: number;
  setNumRandomThemes: (value: number) => void;
  handleRandomizeThemes: () => void;
  isLoading: boolean;
}

export default function ThemeInput({
  themeList,
  setThemeList,
  numRandomThemes,
  setNumRandomThemes,
  handleRandomizeThemes,
  isLoading,
}: ThemeInputProps) {
  const t = useTranslations('HomePage');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div>
        <label htmlFor="themeList" className="text-lg font-semibold text-gray-700 mb-2 block">
          {t('themeListTitle')}
        </label>
        <textarea
          id="themeList"
          value={themeList}
          onChange={(e) => setThemeList(e.target.value)}
          placeholder={t('themeListPlaceholder')}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
          rows={5}
          disabled={isLoading}
        />
      </div>
      <div className="flex flex-col justify-between bg-gray-100 p-4 rounded-md">
        <div>
          <label htmlFor="numRandomThemes" className="text-lg font-semibold text-gray-700 mb-2 block">
            {t('randomizeTitle')}
          </label>
          <div className="flex items-center gap-4 mb-4">
            <input
              id="numRandomThemes"
              type="range"
              min="1"
              max="20"
              value={numRandomThemes}
              onChange={(e) => setNumRandomThemes(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              disabled={isLoading}
            />
            <span className="font-bold text-lg text-blue-600 w-12 text-center">{numRandomThemes}</span>
          </div>
        </div>
        <button
          onClick={handleRandomizeThemes}
          disabled={isLoading}
          className="w-full px-6 py-2 bg-gray-600 text-white rounded-md font-semibold hover:bg-gray-700 disabled:bg-gray-400 transition-colors duration-300"
        >
          {isLoading ? t('generatingButton') : t('randomizeButton')}
        </button>
      </div>
    </div>
  );
}
