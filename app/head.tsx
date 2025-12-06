const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://invoicer.ainsworth.dev';

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Invoicer',
  url: siteUrl,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'Invoicer is a browser invoice builder that calculates weekday-only work blocks and exports polished PDFs instantly.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  creator: {
    '@type': 'Person',
    name: 'Sam Ainsworth',
    url: 'https://ainsworth.dev',
  },
};

export default function Head() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  );
}
