import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Invoicer social preview';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          background:
            'radial-gradient(circle at 25% 20%, rgba(129, 140, 248, 0.28), transparent 35%), radial-gradient(circle at 80% 10%, rgba(94, 234, 212, 0.3), transparent 30%), radial-gradient(circle at 60% 70%, rgba(248, 180, 2, 0.25), transparent 32%), #0f172a',
          color: '#e2e8f0',
          fontFamily: '"Inter", "Segoe UI", sans-serif',
        }}
      >
        <div style={{ fontSize: 32, opacity: 0.7, letterSpacing: 3 }}>
          invoicer.ainsworth.dev
        </div>

        <div style={{ display: 'grid', gap: 24 }}>
          <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: -2 }}>Invoicer</div>
          <div style={{ fontSize: 36, maxWidth: 900, lineHeight: 1.4 }}>
            Build polished PDF invoices in your browser with weekday-aware totals and saved defaults.
          </div>
          <div style={{ display: 'flex', gap: 32, fontSize: 26, opacity: 0.9 }}>
            <div>📄 PDF export</div>
            <div>🗓️ Weekday math</div>
            <div>💳 Saved details</div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
