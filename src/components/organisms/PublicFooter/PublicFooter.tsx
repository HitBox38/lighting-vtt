import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { CookieSettingsDialog } from "@/components/organisms/CookieConsent/CookieConsent";
import { cn } from "@/lib/utils";

export function PublicFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("mx-auto flex w-[min(1200px,calc(100%-80px))] flex-wrap items-center justify-between gap-[25px] py-[45px] max-[760px]:w-[calc(100%-32px)] max-[760px]:gap-5 max-[760px]:py-[30px]", className)}>
      <Link className="inline-flex shrink-0 items-center gap-2.5 text-base font-semibold tracking-[-0.6px] max-[760px]:gap-[7px]" to="/">
        <img src="/lightling.svg" alt="" width={24} height={24} className="max-[760px]:size-[27px]" />
        <span>Lighting VTT</span>
      </Link>
      <p className="text-xs text-(--lp-muted) max-[760px]:order-3 max-[760px]:w-full">Made for the stories around your table.</p>
      <nav className="flex flex-wrap gap-x-5 gap-y-3 text-xs text-(--lp-muted) [&_a]:flex [&_a]:items-center [&_a]:gap-[7px] [&_a:hover]:text-(--lp-text)" aria-label="Footer navigation">
        <CookieSettingsDialog />
        <Link to="/privacy">Privacy policy</Link>
        <Link to="/terms">Terms &amp; conditions</Link>
        <Link to="/effects">Explore effects<ArrowUpRight size={14} aria-hidden="true" /></Link>
      </nav>
    </footer>
  );
}
