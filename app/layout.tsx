import type { Metadata, Viewport } from 'next';
// Load the original TOP-X design system before React-specific overrides.
import './legacy.css';
import './globals.css';
import ScrollProgressBar from '@/components/shell/ScrollProgressBar';
import PwaRegister from '@/components/pwa/PwaRegister';
import CustomCursor from '@/components/shell/CustomCursor';
import TopxPreloader from '@/components/shell/TopxPreloader';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#ff7a1a'
};

export const metadata: Metadata = {
  title: 'Top-X | Show up. Solve problems. Become unstoppable.',
  description: 'Top-X helps students build consistent coding habits, improve problem-solving skills, climb the leaderboard, and turn everyday practice into lasting progress.',
  manifest: '/manifest.json?v=7',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Top-X'
  },
  icons: {
    icon: [
      { url: '/favicon.ico?v=7', sizes: 'any' },
      { url: '/icons/icon.svg?v=7', type: 'image/svg+xml' },
      { url: '/icons/favicon-32x32.png?v=6', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16x16.png?v=6', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-192.png?v=6', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png?v=6', sizes: '512x512', type: 'image/png' }
    ],
    shortcut: '/favicon.ico?v=7',
    apple: [
      { url: '/icons/apple-touch-icon.png?v=7', sizes: '180x180', type: 'image/png' }
    ]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico?v=7" sizes="any" />
        <link rel="icon" href="/icons/icon.svg?v=7" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.ico?v=7" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=7" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Space+Grotesk:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* PWA & Mobile Meta Tags */}
        <link rel="manifest" href="/manifest.json?v=7" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=7" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Top-X" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#ff7a1a" />
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.setAttribute('data-theme','light');document.documentElement.classList.remove('dark');`
          }}
        />
      </head>
      <body>
        <TopxPreloader />
        <CustomCursor />
        <PwaRegister />
        <ScrollProgressBar />
        {children}
      </body>
    </html>
  );
}
