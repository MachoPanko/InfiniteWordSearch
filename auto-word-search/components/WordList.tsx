'use client';

interface WordListProps {
  words: string[];
  foundWords?: Set<string>;
  title: string;
  isPreview?: boolean;
}

export default function WordList({ words, foundWords = new Set(), title, isPreview = false }: WordListProps) {
  const gridCols = isPreview ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

  return (
    <div className={`${isPreview ? '' : 'bg-white p-6 rounded-lg shadow-md w-full'}`}>
      <h2 className={`text-xl font-bold mb-4 ${isPreview ? 'hidden' : ''}`}>{title}</h2>
      <div className={`grid ${gridCols} gap-2 word-list-grid`}>
        {words.map((word, index) => {
          const isFound = foundWords.has(word);
          return (
            <div
              key={`${word}-${index}`}
              className={`
                px-3 py-2 rounded text-sm font-medium
                ${isFound ? 'bg-green-100 text-green-800 line-through' : 'bg-gray-100 text-gray-800'}
              `}
            >
              {word}
            </div>
          );
        })}
      </div>
    </div>
  );
}
