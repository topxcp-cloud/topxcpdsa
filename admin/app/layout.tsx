import type { Metadata } from 'next';
import '../src/styles/admin.css';
import { AuthProvider } from '../src/hooks/useAuth';

export const metadata: Metadata = {
  title: 'TOP-X — Admin Control Center',
  description: 'Enterprise administration, member moderation, daily coding challenges, and platform analytics.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
