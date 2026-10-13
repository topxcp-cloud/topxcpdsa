import type { Metadata } from 'next';
// Load the original TOP-X design system before React-specific overrides.
import './legacy.css';
import './globals.css';
export const metadata: Metadata = {
  title: 'My Topics Club | Write Code. Build Consistency. Push Your Limits.',
  description: 'My Topics Club is where curious minds become consistent problem solvers. Track your coding journey, challenge your friends, climb the leaderboard, and turn everyday practice into lasting progress.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('topx-theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);if(t==='dark')document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}catch(e){}})();`
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
