import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://invoicer.ainsworth.dev';
const siteName = 'Simple Invoice Generator';
const siteDescription = 'Generate professional invoices in seconds and download them as PDFs—no backend required.';
const socialImage = `${siteUrl}/opengraph-image`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: '%s | Simple Invoice Generator',
  },
  description: siteDescription,
  keywords: ['invoice generator', 'PDF invoices', 'freelance invoicing', 'browser invoice builder'],
  applicationName: siteName,
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
      <body>{children}</body>
    </html>
  );
}
