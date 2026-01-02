'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { generateWordSearch } from '@/lib/wordSearchGenerator';
import WordSearchForm from '@/components/WordSearchForm';
import PuzzleDisplay from '@/components/PuzzleDisplay';
import CreditsPurchaseModal from '@/components/CreditsPurchaseModal';
import type { WordSearchPuzzle } from '@/lib/wordSearchGenerator';
import { useLanguage } from '@/components/LanguageProvider';

export default function Home() {
  const t = useTranslations('HomePage');
  const { locale, setLocale } = useLanguage();

  const [themeList, setThemeList] = useState('');
  const [wordCount, setWordCount] = useState(10);
  const [numberOfCopies, setNumberOfCopies] = useState(1);
  const [puzzles, setPuzzles] = useState<WordSearchPuzzle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSolution, setShowSolution] = useState(false);
  const [numRandomThemes, setNumRandomThemes] = useState(1);
  const [isGenerated, setIsGenerated] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  const handleGeneratePuzzle = async () => {
    if (!themeList.trim()) {
      setError(t('enterThemeError'));
      return;
    }

    setIsLoading(true);
    setError('');
    setPuzzles([]);
    setShowSolution(false);
    setIsGenerated(false);

    const themes = themeList.split('\n').filter(t => t.trim() !== '');

    try {
      const response = await fetch('/api/generate-words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          themes,
          locale,
          count: wordCount,
          copies: numberOfCopies,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('defaultError'));
      }

      const data = await response.json();
      const newPuzzles = data.words.map((wordList: string[]) => generateWordSearch(wordList, locale));
      setPuzzles(newPuzzles);
      setIsGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('defaultError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRandomizeThemes = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/random-themes?count=${numRandomThemes}&locale=${locale}`);
      if (!response.ok) {
        throw new Error(t('defaultError'));
      }
      const data = await response.json();
      setThemeList(data.themes.join('\n'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('defaultError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocaleChange = () => {
    const newLocale = locale === 'en' ? 'zh' : 'en';
    setLocale(newLocale);
  };

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <header className="relative text-center mb-8">
          <div className="absolute top-0 right-0 flex gap-2">
            {/** biome-ignore lint/a11y/useButtonType: <explanation> */}
            <button
              onClick={() => setShowCreditsModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 font-semibold transition-colors duration-300"
            >
              💳 Buy Credits
            </button>
            {/** biome-ignore lint/a11y/useButtonType: <explanation> */}
            <button
              onClick={handleLocaleChange}
              className="bg-gray-200 text-gray-800 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 hover:bg-gray-300"
            >
              {locale === 'en' ? '文' : 'En'}
            </button>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3">
            {t('title')}
          </h1>
          <p className="text-blue-600 text-xl font-semibold mb-4">
            {t('subtitle')}
          </p>
          <div className="max-w-3xl mx-auto bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
            <p className="text-gray-700 text-base leading-relaxed">
              {t('valueProposition')}
            </p>
          </div>
        </header>

        <main>
          <WordSearchForm
            themeList={themeList}
            setThemeList={setThemeList}
            wordCount={wordCount}
            setWordCount={setWordCount}
            numberOfCopies={numberOfCopies}
            setNumberOfCopies={setNumberOfCopies}
            numRandomThemes={numRandomThemes}
            setNumRandomThemes={setNumRandomThemes}
            handleGeneratePuzzle={handleGeneratePuzzle}
            handleRandomizeThemes={handleRandomizeThemes}
            isLoading={isLoading}
            error={error}
          />

          <PuzzleDisplay
            puzzles={puzzles}
            showSolution={showSolution}
            setShowSolution={setShowSolution}
            isGenerated={isGenerated}
          />

          {puzzles.length === 0 && !isLoading && (
            <div className="text-center text-gray-500 py-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg mt-8 border-2 border-gray-200">
              <h2 className="text-3xl font-bold mb-6 text-gray-800">{t('welcomeTitle')}</h2>
              <div className="max-w-2xl mx-auto text-left px-8">
                <ul className="space-y-3 mb-6">
                  <li className="text-lg text-gray-700 flex items-start">
                    <span className="mr-3">{t('benefit1')}</span>
                  </li>
                  <li className="text-lg text-gray-700 flex items-start">
                    <span className="mr-3">{t('benefit2')}</span>
                  </li>
                  <li className="text-lg text-gray-700 flex items-start">
                    <span className="mr-3">{t('benefit3')}</span>
                  </li>
                  <li className="text-lg text-gray-700 flex items-start">
                    <span className="mr-3">{t('benefit4')}</span>
                  </li>
                  <li className="text-lg text-gray-700 flex items-start">
                    <span className="mr-3">{t('benefit5')}</span>
                  </li>
                </ul>
                <p className="text-base text-center font-semibold text-blue-600">{t('initialPrompt')}</p>
              </div>
            </div>
          )}
        </main>

        {/* SEO-Rich Use Cases Section */}
        <section className="mt-16 border-t-2 border-gray-200 pt-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              {t('useCasesTitle')}
            </h2>
            <p className="text-gray-600 text-lg">
              {t('useCasesSubtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <article className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold text-blue-700 mb-3 flex items-center">
                <span className="mr-2">📚</span> {t('useCase1Title')}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {t('useCase1Desc')}
              </p>
            </article>

            <article className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold text-purple-700 mb-3 flex items-center">
                <span className="mr-2">🏥</span> {t('useCase2Title')}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {t('useCase2Desc')}
              </p>
            </article>

            <article className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold text-green-700 mb-3 flex items-center">
                <span className="mr-2">👨‍👩‍👧‍👦</span> {t('useCase3Title')}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {t('useCase3Desc')}
              </p>
            </article>

            <article className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold text-pink-700 mb-3 flex items-center">
                <span className="mr-2">🎉</span> {t('useCase4Title')}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {t('useCase4Desc')}
              </p>
            </article>

            <article className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold text-teal-700 mb-3 flex items-center">
                <span className="mr-2">🧠</span> {t('useCase5Title')}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {t('useCase5Desc')}
              </p>
            </article>

            <article className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold text-indigo-700 mb-3 flex items-center">
                <span className="mr-2">💼</span> {t('useCase6Title')}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {t('useCase6Desc')}
              </p>
            </article>
          </div>

          {/* Why Better Section */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              {t('whyBetterTitle')}
            </h3>
            <ul className="space-y-4 max-w-3xl mx-auto">
              <li className="flex items-start text-gray-800">
                <span className="text-red-600 font-bold mr-3 mt-1">✗</span>
                <span className="flex-1">{t('whyBetterPoint1')}</span>
              </li>
              <li className="flex items-start text-gray-800">
                <span className="text-green-600 font-bold mr-3 mt-1">✓</span>
                <span className="flex-1 font-semibold">{t('whyBetterPoint2')}</span>
              </li>
              <li className="flex items-start text-gray-800">
                <span className="text-green-600 font-bold mr-3 mt-1">✓</span>
                <span className="flex-1 font-semibold">{t('whyBetterPoint3')}</span>
              </li>
              <li className="flex items-start text-gray-800">
                <span className="text-green-600 font-bold mr-3 mt-1">✓</span>
                <span className="flex-1 font-semibold">{t('whyBetterPoint4')}</span>
              </li>
              <li className="flex items-start text-gray-800">
                <span className="text-green-600 font-bold mr-3 mt-1">✓</span>
                <span className="flex-1 font-semibold">{t('whyBetterPoint5')}</span>
              </li>
            </ul>
          </div>
        </section>
      </div>

      <CreditsPurchaseModal
        isOpen={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
      />
    </div>
  );
}