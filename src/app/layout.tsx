import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import { OfflineBanner } from './match/_shell/OfflineBanner';
import { PwaRegister } from './match/_shell/PwaRegister';
import { SystemDemoBar } from '@/components/demo/SystemDemoBar';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

// Only Hindi readers need this: skip the preload so Latin-only visitors don't pay for it.
const notoDevanagari = Noto_Sans_Devanagari({
  variable: '--font-devanagari',
  subsets: ['devanagari'],
  weight: ['400', '600', '700'],
  display: 'swap',
  preload: false,
});

const TITLE = 'Pulse: Har ball ka matlab, tumhari team ke liye';
const DESCRIPTION =
  'A second-screen cricket fantasy companion. Pulse follows the match ball by ball and explains, in Hinglish, Hindi or English, what each ball did to your fantasy team. An explainer, not betting advice. 18+.';

export const metadata: Metadata = {
  title: { default: TITLE, template: '%s | Pulse' },
  description: DESCRIPTION,
  applicationName: 'Pulse',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icons/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: { capable: true, title: 'Pulse', statusBarStyle: 'black-translucent' },
  openGraph: {
    type: 'website',
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'Pulse',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Pulse: what every ball did to your fantasy team' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/og.png'] },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#020617',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${notoDevanagari.variable} dark`}>
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans antialiased selection:bg-red-600 selection:text-white">
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <OfflineBanner />
        <SystemDemoBar />
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
