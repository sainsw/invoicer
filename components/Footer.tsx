import { PrideAvatar } from '@/components/PrideAvatar';
import { AVATAR_VERSION, FOOTER_START_YEAR } from '@/lib/assets';

const currentYear = new Date().getFullYear();
const copyrightYears =
  currentYear > FOOTER_START_YEAR ? `${FOOTER_START_YEAR} - ${currentYear}` : `${FOOTER_START_YEAR}`;

export function Footer() {
  return (
    <footer className="relative mt-6 pb-12">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-800" />
      <div className="relative mx-auto flex max-w-[1570px] flex-col items-center gap-4 px-4 pt-8 sm:px-6 lg:px-8">
        <a
          className="transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400"
          aria-label="Visit ainsworth.dev"
          href="https://ainsworth.dev"
          target="_blank"
          rel="noopener noreferrer"
        >
          <PrideAvatar className="bg-white/80 p-1.5 dark:bg-slate-900/80">
            <picture>
              <source srcSet={`/images/avatar-${AVATAR_VERSION}.webp`} type="image/webp" />
              <img
                className="h-16 w-16 rounded-full bg-left-bottom object-cover sm:h-20 sm:w-20"
                src={`/images/avatar-${AVATAR_VERSION}.jpg`}
                alt="Sam Ainsworth"
                width={80}
                height={80}
                loading="lazy"
              />
            </picture>
          </PrideAvatar>
        </a>
        <p className="text-base font-semibold text-slate-900 dark:text-white">Sam Ainsworth</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          © {copyrightYears}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
