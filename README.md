# AutoWordSearchGenerator

A Next.js application that generates custom word search puzzles with AI-powered word lists. Users can enter any theme and the application will automatically generate a list of related words and create an interactive word search puzzle.

## Features

- 🎯 AI-powered word generation based on user themes
- 🎮 Interactive word search game with click-and-drag selection
- ✅ Word highlighting and validation
- 🔍 Show/hide solution feature
- 📱 Responsive design for all devices
- 🎨 Clean, modern UI with Tailwind CSS

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **OpenAI API** - AI word generation
- **React 19** - UI components

## Getting Started

### Prerequisites

- Node.js 18+ installed
- OpenAI API key (optional - get one at https://platform.openai.com/api-keys)
  - **Note**: The app includes fallback word lists and works without an API key for testing/demo purposes

### Installation

1. Clone the repository:
```bash
git clone https://github.com/MachoPanko/AutoWordSearchGenerator.git
cd AutoWordSearchGenerator
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. **(Optional)** Edit `.env` and add your OpenAI API key for AI-powered word generation:
```
OPENAI_API_KEY=your_actual_api_key_here
```
**Note**: The app works without an API key using built-in fallback word lists for themes like ocean, space, sports, animals, and food.

### Running the Application

Development mode:
```bash
npm run dev
```

Production build:
```bash
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Note**: No API key needed for testing - the app includes fallback word lists!

## How to Use

1. Enter a theme in the input field (e.g., "ocean animals", "space", "sports")
2. Click "Generate Puzzle" to create a new word search
3. Find words by clicking and dragging across letters (horizontal, vertical, or diagonal)
4. Click "Show Solution" to highlight all hidden words
5. Generate new puzzles with different themes anytime!

## Deployment

### Digital Ocean

This application can be easily deployed to Digital Ocean:

#### Option 1: App Platform

1. Push your code to GitHub
2. Go to [Digital Ocean App Platform](https://cloud.digitalocean.com/apps)
3. Create a new app and connect your GitHub repository
4. Add the `OPENAI_API_KEY` environment variable in the app settings
5. Deploy!

#### Option 2: Droplet

1. Create a droplet with Node.js
2. Clone the repository
3. Install dependencies and build: `npm install && npm run build`
4. Set up environment variables
5. Use PM2 or similar to run: `pm2 start npm --name "wordsearch" -- start`
6. Configure nginx as reverse proxy (optional)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key for AI word generation. Falls back to built-in word lists if not provided. | No |

## Project Structure

```
├── app/
│   ├── api/
│   │   └── generate-words/    # API route for LLM word generation
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main application page
├── components/
│   ├── WordSearchGrid.tsx     # Interactive puzzle grid
│   └── WordList.tsx           # Word list display
├── lib/
│   └── wordSearchGenerator.ts # Puzzle generation logic
└── public/                    # Static assets
```

## Word Search Algorithm

The puzzle generator:
- Places words horizontally, vertically, and diagonally
- Handles word overlapping intelligently
- Fills empty cells with random letters
- Supports grids up to 15x15
- Validates word placement before finalizing

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

