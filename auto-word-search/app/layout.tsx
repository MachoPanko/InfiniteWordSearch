import type { Metadata } from "next";
import { LanguageProvider } from "@/components/LanguageProvider";
import { messages } from "../../i18n";
import AuthButton from "@/components/AuthButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "Free Word Search Generator - Auto Create Puzzles for Teachers, Seniors & More",
  description: "Generate unlimited word search puzzles instantly without manual word entry. Perfect for teachers, nursing homes, homeschoolers & events. Create themed or random puzzles in seconds. Print-ready and customizable.",
  keywords: [
    "word search generator",
    "free word search maker",
    "word search creator",
    "educational puzzles",
    "printable word search",
    "classroom activities",
    "senior activities",
    "nursing home puzzles",
    "cognitive exercises",
    "homeschool worksheets",
    "party games",
    "themed word puzzles",
    "AI word search",
    "bulk puzzle generator",
    "teaching resources"
  ],
  authors: [{ name: "InfiniteWordSearch" }],
  creator: "InfiniteWordSearch",
  publisher: "InfiniteWordSearch",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["zh_CN"],
    title: "Free Word Search Generator - Create Custom Puzzles Instantly",
    description: "Save hours! Generate unlimited themed word searches without typing words manually. Perfect for educators, caregivers, and event planners.",
    siteName: "Auto Word Search Generator",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Word Search Generator - Auto Create Custom Puzzles",
    description: "Generate unlimited word searches instantly. No manual word entry needed. Perfect for classrooms, nursing homes & events.",
  },
  alternates: {
    canonical: "/",
    languages: {
      'en': '/en',
      'zh': '/zh',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <LanguageProvider messages={messages}>
          <div className="min-h-screen flex flex-col">
            <header className="border-b border-gray-200 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-900">Word Search Generator</h1>
                <AuthButton />
              </div>
            </header>
            <main className="flex-1">
              {children}
            </main>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}