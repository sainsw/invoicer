// Renders a formatted amount whose changed characters roll up into place. Each glyph is keyed by its
// position from the right plus its value, so only the characters that actually changed remount
// (and so animate); the units column stays put while the thousands roll.
export function RollingNumber({ value, className = '' }: { value: string; className?: string }) {
  const glyphs = value.split('');
  return (
    <p className={className}>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="inline-flex overflow-hidden pb-[0.08em]">
        {glyphs.map((glyph, index) => (
          <span key={`${glyphs.length - index}-${glyph}`} className="inline-block animate-digit-roll whitespace-pre">
            {glyph}
          </span>
        ))}
      </span>
    </p>
  );
}
