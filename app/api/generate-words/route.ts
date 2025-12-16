import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Fallback word lists for testing/demo purposes
const FALLBACK_WORDS: Record<string, string[]> = {
  ocean: ['WHALE', 'DOLPHIN', 'SHARK', 'CORAL', 'OCTOPUS', 'FISH', 'WAVE', 'BEACH', 'SAND', 'SHELL', 'STARFISH', 'SEAHORSE'],
  space: ['PLANET', 'STAR', 'MOON', 'ROCKET', 'GALAXY', 'COMET', 'ASTEROID', 'ORBIT', 'MARS', 'JUPITER', 'NEBULA', 'SATURN'],
  sports: ['SOCCER', 'TENNIS', 'BASKETBALL', 'HOCKEY', 'BASEBALL', 'GOLF', 'SWIMMING', 'RUNNING', 'CYCLING', 'BOXING', 'FOOTBALL', 'CRICKET'],
  animals: ['LION', 'TIGER', 'ELEPHANT', 'GIRAFFE', 'ZEBRA', 'MONKEY', 'BEAR', 'WOLF', 'DEER', 'RABBIT', 'EAGLE', 'LEOPARD'],
  food: ['PIZZA', 'BURGER', 'PASTA', 'SALAD', 'CHICKEN', 'RICE', 'BREAD', 'CHEESE', 'FRUIT', 'VEGETABLE', 'SOUP', 'SANDWICH'],
};

const FALLBACK_THEMES = [
  "Fruits", "Colors", "Animals", "Countries", "Sports", "Vegetables", "Jobs", "Clothing", "Body Parts", "Family Members", "Musical Instruments", "Weather", "Shapes", "Feelings", "Transportation", "School Subjects", "Kitchen Items", "Furniture", "Buildings", "Insects"
];

function getFallbackWords(theme: string, count: number): string[] {
  const lowerTheme = theme.toLowerCase();

  for (const [key, words] of Object.entries(FALLBACK_WORDS)) {
    if (lowerTheme.includes(key) || key.includes(lowerTheme)) {
      return words.slice(0, count);
    }
  }

  // If no specific theme matches, pick a random word list from FALLBACK_WORDS
  const randomTheme = Object.keys(FALLBACK_WORDS)[Math.floor(Math.random() * Object.keys(FALLBACK_WORDS).length)];
  return FALLBACK_WORDS[randomTheme].slice(0, count);
}

async function generateWordsForTheme(theme: string, count: number, locale: string): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === 'test-key' || apiKey.startsWith('sk-test') || !apiKey.startsWith('sk-')) {
    console.log('Using fallback words for theme:', theme);
    return getFallbackWords(theme, count);
  }

  try {
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    let systemPrompt = `You are a helpful assistant that generates word lists for word search puzzles. Generate exactly ${count} words related to the given theme. Words should be 3-12 letters long, appropriate for all ages, and closely related to the theme. Return ONLY the words, one per line, with no numbering, bullets, or additional text.`;
    if (locale === 'zh') {
      systemPrompt += ' You must reply in Chinese.';
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Generate a list of words related to: ${theme}`,
        },
      ],
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      console.log('OpenAI returned no content, using fallback');
      return getFallbackWords(theme, count);
    }

    const words = response
      .split('\n')
      .map((line) => line.trim())
      .filter((word) => word.length > 0 && /^[a-zA-Z\u4e00-\u9fa5]+$/.test(word))
      .slice(0, count);

    if (words.length < 5) {
      console.log('Not enough words from OpenAI, using fallback');
      return getFallbackWords(theme, count);
    }

    return words;
  } catch (openaiError) {
    console.log('OpenAI error, using fallback:', openaiError);
    return getFallbackWords(theme, count);
  }
}

export async function POST(request: Request) {
  try {
    const { themes = [], locale = 'en', count = 10, copies = 1 } = await request.json();

    if (!themes.length) {
      return NextResponse.json(
        { error: 'Themes are required' },
        { status: 400 }
      );
    }

    const themesToProcess: string[] = [];
    for (let i = 0; i < copies; i++) {
      if (i < themes.length) {
        themesToProcess.push(themes[i]);
      } else if (FALLBACK_THEMES.length > 0) {
        themesToProcess.push(FALLBACK_THEMES[Math.floor(Math.random() * FALLBACK_THEMES.length)]);
      } else if (themes.length > 0) {
        themesToProcess.push(themes[i % themes.length]);
      } else {
        break; 
      }
    }

    const wordPromises = themesToProcess.map(theme => generateWordsForTheme(theme, count, locale));
    const words = await Promise.all(wordPromises);

    return NextResponse.json({ words });

  } catch (error) {
    console.error('Error generating words:', error);
    return NextResponse.json(
      { error: 'Failed to generate words' },
      { status: 500 }
    );
  }
}
