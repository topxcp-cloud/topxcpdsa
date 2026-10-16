import type { Metadata } from 'next';
// Load the original TOP-X design system before React-specific overrides.
import './legacy.css';
import './globals.css';
export const metadata: Metadata = {
  title: 'Top X Clubs | Show up. Solve problems. Become unstoppable.',
  description: 'Top X Clubs helps students build consistent coding habits, improve problem-solving skills, climb the leaderboard, and turn everyday practice into lasting progress.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.setAttribute('data-theme','light');document.documentElement.classList.remove('dark');`
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
