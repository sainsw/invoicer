import type { Metadata } from 'next';
import { Red_Hat_Display, Red_Hat_Mono, Red_Hat_Text } from 'next/font/google';
import { Footer } from '@/components/Footer';
import './globals.css';

// One matched family: Display for headings and the total, Text for everything else, Mono for figures.
const display = Red_Hat_Display({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const sans = Red_Hat_Text({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = Red_Hat_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://invoicer.ainsworth.dev';
const siteName = 'Invoicer';
const siteDescription =
  'Invoicer lets you generate professional invoices in seconds and download them as PDFs—no backend required.';
const socialImage = `${siteUrl}/opengraph-image`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: '%s | Invoicer',
  },
  description: siteDescription,
  keywords: ['invoice generator', 'PDF invoices', 'freelance invoicing', 'browser invoice builder'],
  applicationName: siteName,
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  alternates: { canonical: siteUrl },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName,
    title: siteName,
    description: siteDescription,
    images: [
      {
        url: socialImage,
        width: 1200,
        height: 630,
        alt: `${siteName} preview`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteName,
    description: siteDescription,
    images: [socialImage],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="bg-paper text-ink antialiased">
        <div className="relative z-[1] flex min-h-screen flex-col">
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}
