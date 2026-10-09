import { PrideAvatar } from '@/components/PrideAvatar';
import { AVATAR_VERSION, FOOTER_START_YEAR } from '@/lib/assets';

const currentYear = new Date().getFullYear();
const copyrightYears =
  currentYear > FOOTER_START_YEAR ? `${FOOTER_START_YEAR}–${currentYear}` : `${FOOTER_START_YEAR}`;

export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-[1570px] px-4 pb-10 pt-4 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t border-slate-200/80 pt-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <a
          className="inline-flex items-center gap-2 font-semibold text-slate-700 transition hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400 dark:text-slate-200 dark:hover:text-white"
          href="https://ainsworth.dev"
          target="_blank"
          rel="noopener noreferrer"
        >
          <PrideAvatar ringStep={1} className="shrink-0">
            <picture>
              <source srcSet={`/images/avatar-${AVATAR_VERSION}.webp`} type="image/webp" />
              <img
                className="h-7 w-7 rounded-full object-cover"
                src={`/images/avatar-${AVATAR_VERSION}.jpg`}
                alt=""
                width={28}
                height={28}
                loading="lazy"
              />
            </picture>
          </PrideAvatar>
          Sam Ainsworth
        </a>
        <span aria-hidden>·</span>
        <span>
          <a
            href="https://github.com/sainsw/invoicer"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 hover:text-slate-900 hover:underline dark:hover:text-white"
          >
            Built
          </a>{' '}
          with <span role="img" aria-label="love">❤️</span> in Manchester{' '}
          <span role="img" aria-label="bee">🐝</span>
        </span>
        <span aria-hidden>·</span>
        <span>© {copyrightYears}</span>
      </div>
    </footer>
  );
}
