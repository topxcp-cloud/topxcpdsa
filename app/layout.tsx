import type { Metadata } from 'next';
// Load the original TOP-X design system before React-specific overrides.
import '../styles/legacy.css';
import './globals.css';
export const metadata: Metadata = { title: 'TOP-X | Code. Compete. Conquer.', description: 'Unified competitive programming platform for practice, progress and contests.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
 return <html lang="en"><body>{children}</body></html>;
}
