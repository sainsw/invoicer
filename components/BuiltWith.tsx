export function BuiltWithLove() {
  return (
    <p className="mx-auto max-w-[1570px] px-4 pb-4 pt-10 text-center text-sm text-slate-600 dark:text-slate-400 sm:px-6 lg:px-8">
      <a
        href="https://github.com/sainsw/invoicer"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-slate-900 underline-offset-4 hover:text-brand-700 hover:underline dark:text-white"
      >
        Built
      </a>{' '}
      with{' '}
      <span role="img" aria-label="love">
        ❤️
      </span>{' '}
      in Manchester, UK{' '}
      <span role="img" aria-label="bee">
        🐝
      </span>
      <span role="img" aria-label="United Kingdom flag" className="ml-1">
        🇬🇧
      </span>
    </p>
  );
}
