import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { BuiltWithLove } from '@/components/BuiltWith';
import { Footer } from '@/components/Footer';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
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
    <html lang="en" className={jakarta.variable}>
      <body className="bg-[#f7f7fb] text-slate-900 antialiased dark:bg-[#0b1020] dark:text-slate-100">
        <div className="relative min-h-screen">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[320px] bg-gradient-to-b from-brand-200/40 via-white/50 to-transparent blur-3xl dark:from-brand-400/10 dark:via-white/10" />
          <div className="relative flex min-h-screen flex-col">
            {children}
            <BuiltWithLove />
            <Footer />
          </div>
        </div>
      </body>
    </html>
  );
}
