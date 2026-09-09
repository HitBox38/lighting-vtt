import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/atoms/ThemeToggle";
import { LandingFooter } from "@/pages/LandingPage/components/LandingStory";
import { legalDocuments } from "./documents";
import "@/pages/LandingPage/landing.css";
import "./legal.css";

export function LegalPage({ document: documentType }: { document: keyof typeof legalDocuments }) {
  const policy = legalDocuments[documentType];
  const { hash } = useLocation();

  useEffect(() => {
    const section = document.getElementById(hash.slice(1));
    if (section) section.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [documentType, hash]);

  return (
    <div className="landing-page legal-page">
      <title>{`${policy.title} | Lighting VTT`}</title>
      <a href="#legal-main" className="landing-skip">Skip to content</a>
      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <Link to="/" className="landing-brand" aria-label="Lighting VTT home">
            <img src="/lightling.svg" alt="" width={32} height={32} />
            <span>Lighting <span className="landing-brand-suffix">VTT</span></span>
          </Link>
          <div className="landing-nav">
            <Link to="/" className="legal-back"><ArrowLeft size={16} aria-hidden="true" /> Back to home</Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="legal-main" className="landing-container legal-layout" tabIndex={-1}>
        <aside className="legal-sidebar">
          <p className="landing-eyebrow">THE GROUND RULES</p>
          <nav aria-label="Legal documents" className="legal-documents">
            <Link to="/privacy" aria-current={documentType === "privacy" ? "page" : undefined}>Privacy policy</Link>
            <Link to="/terms" aria-current={documentType === "terms" ? "page" : undefined}>Terms &amp; conditions</Link>
          </nav>
          <nav aria-label="On this page" className="legal-contents">
            <p>On this page</p>
            {policy.sections.map((section, index) => (
              <a key={section.id} href={`#${section.id}`}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</a>
            ))}
          </nav>
        </aside>
        <article className="legal-article">
          <header className="legal-heading">
            <p className="legal-date">Last updated <time dateTime="2026-09-09">September 9, 2026</time></p>
            <h1>{policy.title}</h1>
            <p>{policy.introduction}</p>
          </header>
          {policy.sections.map((section, index) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
              <h2 id={`${section.id}-title`}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</h2>
              {section.content}
            </section>
          ))}
        </article>
      </main>
      <LandingFooter />
    </div>
  );
}
