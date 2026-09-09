import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/atoms/ThemeToggle";
import { PublicFooter } from "@/components/organisms/PublicFooter/PublicFooter";
import { publicContainerStyles, publicPageStyles } from "@/lib/publicPageStyles";
import { cn } from "@/lib/utils";
import { legalDocuments } from "./documents";

const documentLinkStyles = "border-l-2 border-transparent px-3.5 py-2.5 text-(--lp-muted) aria-[current=page]:border-(--lp-accent) aria-[current=page]:bg-(--lp-panel) aria-[current=page]:text-(--lp-text)";

export function LegalPage({ document: documentType }: { document: keyof typeof legalDocuments }) {
  const policy = legalDocuments[documentType];
  const { hash } = useLocation();

  useEffect(() => {
    const section = document.getElementById(hash.slice(1));
    if (section) section.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [documentType, hash]);

  return (
    <div className={publicPageStyles}>
      <title>{`${policy.title} | Lighting VTT`}</title>
      <a href="#legal-main" className="fixed top-2 left-2 z-100 -translate-y-[150%] bg-(--lp-text) p-3 text-(--lp-bg) focus:translate-y-0">Skip to content</a>
      <header className="border-b border-(--lp-line)">
        <div className={cn(publicContainerStyles, "flex min-h-[86px] items-center justify-between gap-4 max-[760px]:min-h-[74px] max-[760px]:flex-wrap max-[760px]:gap-2 max-[760px]:py-3")}>
          <Link to="/" className="inline-flex shrink-0 items-center gap-2.5 text-[21px] font-semibold tracking-[-0.6px] max-[760px]:gap-[7px] max-[760px]:text-[17px]" aria-label="Lighting VTT home">
            <img src="/lightling.svg" alt="" width={32} height={32} className="max-[760px]:size-[27px]" />
            <span>Lighting <span className="font-normal text-(--lp-muted)">VTT</span></span>
          </Link>
          <div className="flex items-center gap-5 text-sm max-[1000px]:gap-2.5 max-[760px]:gap-1 [&>button]:bg-transparent [&>button]:p-2 [&>button]:text-(--lp-muted) [&>button]:shadow-none">
            <Link to="/" className="flex items-center gap-3 text-sm hover:text-(--lp-accent) max-[760px]:gap-1.5 max-[760px]:text-xs"><ArrowLeft size={16} aria-hidden="true" /> Back to home</Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="legal-main" className={cn(publicContainerStyles, "grid grid-cols-[230px_minmax(0,720px)] items-start justify-between gap-16 pt-[68px] pb-24 max-[1000px]:grid-cols-[190px_minmax(0,1fr)] max-[1000px]:gap-9 max-[760px]:grid-cols-1 max-[760px]:gap-8 max-[760px]:pt-8 max-[760px]:pb-14")} tabIndex={-1}>
        <aside className="sticky top-8 max-[760px]:static">
          <p className="text-[11px] leading-[1.5] font-medium tracking-[1.8px] text-(--lp-accent) uppercase">THE GROUND RULES</p>
          <nav aria-label="Legal documents" className="mt-6 mb-9 grid gap-1 max-[760px]:mt-4 max-[760px]:mb-0 max-[760px]:flex max-[760px]:flex-wrap">
            <Link to="/privacy" className={documentLinkStyles} aria-current={documentType === "privacy" ? "page" : undefined}>Privacy policy</Link>
            <Link to="/terms" className={documentLinkStyles} aria-current={documentType === "terms" ? "page" : undefined}>Terms &amp; conditions</Link>
          </nav>
          <nav aria-label="On this page" className="grid gap-3.5 text-sm text-(--lp-muted) max-[760px]:hidden">
            <p className="mb-1 font-medium text-(--lp-text)">On this page</p>
            {policy.sections.map((section, index) => (
              <a key={section.id} href={`#${section.id}`} className="flex items-baseline gap-3 hover:text-(--lp-accent)"><span className="text-xs text-(--lp-accent) tabular-nums">{String(index + 1).padStart(2, "0")}</span>{section.title}</a>
            ))}
          </nav>
        </aside>
        <article className="[&_a]:text-(--lp-accent) [&_a]:underline [&_a]:underline-offset-3 [&_li]:wrap-anywhere [&_li]:leading-[1.8] [&_li]:text-(--lp-muted) [&_li+li]:mt-[9px] [&_section_p]:wrap-anywhere [&_section_p]:leading-[1.8] [&_section_p]:text-(--lp-muted) [&_section_p+p]:mt-3.5 [&_strong]:font-medium [&_strong]:text-(--lp-text) [&_ul]:mt-3.5 [&_ul]:list-disc [&_ul]:pl-[22px]">
          <header>
            <p className="text-[13px] text-(--lp-muted)">Last updated <time dateTime="2026-09-09">September 9, 2026</time></p>
            <h1 className="mt-[18px] mb-6 text-[clamp(38px,5vw,62px)] leading-[1.08] font-semibold tracking-[-0.045em]">{policy.title}</h1>
            <p className="text-[19px] leading-[1.65] text-(--lp-muted) max-[760px]:text-[17px]">{policy.introduction}</p>
          </header>
          {policy.sections.map((section, index) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="mt-9 scroll-mt-6 border-t border-(--lp-line) pt-7">
              <h2 id={`${section.id}-title`} className="mb-4 flex items-baseline gap-3.5 text-[23px] font-medium tracking-[-0.025em]"><span className="text-xs text-(--lp-accent) tabular-nums">{String(index + 1).padStart(2, "0")}</span>{section.title}</h2>
              {section.content}
            </section>
          ))}
        </article>
      </main>
      <PublicFooter className="border-t border-(--lp-line)" />
    </div>
  );
}
