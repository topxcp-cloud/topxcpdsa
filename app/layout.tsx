import type { Metadata } from 'next';
// Load the original TOP-X design system before React-specific overrides.
import './legacy.css';
import './globals.css';
export const metadata: Metadata = {
  title: 'Top X Club | Write Code. Build Consistency. Push Your Limits.',
  description: 'Top X Club is where curious minds become consistent problem solvers. Track your coding journey, challenge your friends, climb the leaderboard, and turn everyday practice into lasting progress.'
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
