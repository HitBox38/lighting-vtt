import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/atoms/ThemeToggle";
import { PublicFooter } from "@/components/organisms/PublicFooter/PublicFooter";
import { publicContainerStyles, publicPageStyles } from "@/lib/publicPageStyles";
import { cn } from "@/lib/utils";

export function NotFoundPage() {
  return (
    <div className={cn(publicPageStyles, "flex min-h-dvh flex-col")}>
      <title>Page not found | Lighting VTT</title>
      <meta name="robots" content="noindex" />
      <a href="#not-found-main" className="fixed top-2 left-2 z-100 -translate-y-[150%] bg-(--lp-text) p-3 text-(--lp-bg) focus:translate-y-0">Skip to content</a>
      <header className="border-b border-(--lp-line)">
        <div className={cn(publicContainerStyles, "flex min-h-20 items-center justify-between gap-4")}>
          <Link to="/" aria-label="Lighting VTT home" className="inline-flex items-center gap-2.5 text-xl font-semibold tracking-[-0.6px]">
            <img src="/lightling.svg" alt="" width={32} height={32} />
            <span>Lighting <span className="font-normal text-(--lp-muted)">VTT</span></span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main id="not-found-main" tabIndex={-1} className={cn(publicContainerStyles, "grid flex-1 items-center gap-12 py-16 md:grid-cols-2 md:gap-16 md:py-24")}>
        <div>
          <p className="mb-6 flex items-center gap-3 text-xs font-medium tracking-[0.16em] text-(--lp-accent) uppercase">
            <span className="h-px w-8 bg-current" aria-hidden="true" />404 · Page not found
          </p>
          <h1 className="max-w-lg text-[clamp(44px,5.5vw,72px)] leading-[1.04] font-medium tracking-[-0.045em]">
            You’ve wandered <span className="text-(--lp-accent)">off the map.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-(--lp-muted)">
            Even the best adventurers take a wrong turn. This page may have moved, or the link might be incorrect.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-5">
            <Link to="/" className="inline-flex min-h-11 items-center justify-center gap-2.5 rounded-md bg-[#ffb547] px-5 py-3 text-sm font-medium text-[#252621] hover:bg-[#ffc36b]">
              <ArrowLeft size={16} aria-hidden="true" />Back to home
            </Link>
            <Link to="/library" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:text-(--lp-accent)">
              Open scene library<ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div aria-hidden="true" className="relative mx-auto aspect-square w-full max-w-[440px] overflow-hidden rounded-full border border-(--lp-line) bg-(--lp-panel)">
          <svg viewBox="0 0 440 440" fill="none" className="absolute inset-0 size-full text-(--lp-line)">
            <path d="M0 60H440M0 100H440M0 140H440M0 180H440M0 220H440M0 260H440M0 300H440M0 340H440M0 380H440M60 0V440M100 0V440M140 0V440M180 0V440M220 0V440M260 0V440M300 0V440M340 0V440M380 0V440" stroke="currentColor" />
            <path d="M40 300H100V220H160V140H240V100H300V40M280 440V340H360V260H440" stroke="currentColor" strokeWidth="4" />
            <path d="M100 340H180V300H220V220H300V180" stroke="var(--lp-accent)" strokeWidth="2" strokeDasharray="5 8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="100" cy="340" r="5" fill="var(--lp-accent)" />
            <circle cx="300" cy="160" r="30" fill="var(--lp-bg)" stroke="var(--lp-accent)" />
            <path d="m300 140 7 20-7 20-7-20Z" fill="var(--lp-accent)" />
          </svg>
          <div className="absolute top-[18%] left-[15%] text-[clamp(80px,12vw,128px)] leading-none font-medium tracking-[-0.08em] text-(--lp-text)">404</div>
          <p className="absolute right-[16%] bottom-[14%] bg-(--lp-panel) px-2 py-1 text-[10px] font-medium tracking-[0.18em] text-(--lp-muted) uppercase">Uncharted territory</p>
        </div>
      </main>

      <PublicFooter className="border-t border-(--lp-line)" />
    </div>
  );
}
