import { motion } from 'motion/react';
import { LogIn } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { cx, Logo, navigate } from '../components/ui';

/** Soft floating dots in the brand colors, shared by every public page. */
export function Particles() {
  const dots = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        left: `${(i * 41) % 100}%`,
        bottom: `${(i * 17) % 30}%`,
        delay: `${(i * 0.9) % 10}s`,
        dur: `${10 + ((i * 7) % 8)}s`,
        color: ['#1F6BFF', '#8B3DFF', '#FF2E93', '#00C77F'][i % 4],
      })),
    [],
  );
  return (
    <>
      {dots.map((d, i) => (
        <span key={i} className="particle" style={{ left: d.left, bottom: d.bottom, animationDelay: d.delay, animationDuration: d.dur, background: d.color, boxShadow: `0 0 10px ${d.color}` }} />
      ))}
    </>
  );
}

export function PublicHeader({ current }: { current?: string }) {
  void current;
  const go = (id: string) => navigate(id);
  return (
    <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-20">
      <div className="flex items-center justify-between gap-4 py-1">
        <button onClick={() => go('')} aria-label="USAII® home" className="shrink-0 rounded-xl transition hover:opacity-80">
          <Logo width={226} />
        </button>
        <button
          onClick={() => go('')}
          className="btn-shine flex items-center gap-2 rounded-full bg-gradient-to-r from-nblue via-npurple to-npink bg-[length:200%_100%] bg-left px-5 py-2.5 text-[15px] font-bold text-white shadow-lg shadow-npurple/25 transition-[background-position] duration-500 hover:bg-right"
        >
          <LogIn className="h-4 w-4" /> Sign In
        </button>
      </div>
    </motion.header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-14 border-t border-line pt-6 text-center text-xs text-ink-faint">
      <p>
        © {new Date().getFullYear()} United States Artificial Intelligence Institute (USAII®) · A member of ANSI and the Institute for Credentialing Excellence
      </p>
    </footer>
  );
}

/** Page wrapper: aurora, particles, header, content, footer. */
export default function PublicShell({ current, children, wide }: { current?: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div className="aurora">
        <span />
        <span />
        <span />
        <span />
      </div>
      <Particles />
      <div className={cx('relative z-10 mx-auto flex min-h-screen flex-col px-6 py-8', wide ? 'max-w-7xl' : 'max-w-6xl')}>
        <PublicHeader current={current} />
        <main className="flex-1">{children}</main>
        <PublicFooter />
      </div>
    </div>
  );
}
