import { cn } from "@/lib/utils";
import { publicContainerStyles } from "@/lib/publicPageStyles";
import { landingEyebrowStyles, landingTextLinkStyles } from "../../styles";
import { ArrowDown, Monitor, Sparkles } from "lucide-react";
import { usePostHog } from "@posthog/react";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { LandingAction } from "../LandingAction";

export function HeroSection() {
  const posthog = usePostHog();
  return (
    <section
      className={cn(publicContainerStyles, "grid grid-cols-[minmax(0,1fr)_270px] items-end gap-[50px] pt-[76px] pb-[55px] max-[1000px]:grid-cols-[1fr_230px] max-[1000px]:gap-[25px] max-[760px]:grid-cols-1 max-[760px]:pt-12 max-[760px]:pb-[35px]")}
      aria-labelledby="hero-title"
    >
      <div>
        <p className={landingEyebrowStyles}>
          <span className="size-1.5 rounded-full bg-(--lp-accent)" />
          For DMs around a real table
        </p>
        <h1 id="hero-title" className="my-[22px] text-[clamp(54px,6.8vw,88px)] leading-[0.99] font-medium tracking-[-4.5px] max-[1000px]:tracking-[-3px] max-[760px]:text-[clamp(48px,10vw,70px)] max-[760px]:tracking-[-2.6px] max-[480px]:text-[clamp(42px,11vw,53px)] max-[480px]:tracking-[-2px]">
          Bring your
          <br />
          battlemap <span className="text-(--lp-accent)">to life.</span>
        </h1>
        <p className="max-w-[565px] text-[17px] leading-[1.7] text-(--lp-muted) max-[760px]:max-w-[530px] max-[760px]:text-[15px]">
          Turn your maps into atmospheric encounters with dynamic lighting,
          custom effects, and a dedicated player view for your TV table. All in
          your browser.
        </p>
        <div className="mt-[27px] flex flex-wrap items-center gap-[27px] max-[760px]:gap-5 max-[480px]:flex-col max-[480px]:items-stretch max-[480px]:gap-4">
          <LandingAction placement="hero" />
          <a
            className={cn(landingTextLinkStyles, "max-[760px]:text-[13px] max-[480px]:min-h-11 max-[480px]:justify-center")}
            href="#how-it-works"
            onClick={() =>
              posthog.capture(ANALYTICS_EVENTS.LandingCtaClicked, {
                placement: "hero",
                action: "how_it_works",
              })
            }
          >
            See how it works
            <ArrowDown size={16} aria-hidden="true" />
          </a>
        </div>
        <p className="mt-[15px] text-xs/[1.5] text-(--lp-muted)">
          Your map. Your table. A little more magic.
        </p>
      </div>
      <div className="mb-2.5 border-l border-(--lp-line) pb-2.5 pl-[30px] max-[760px]:hidden [&>div]:mt-[11px] [&>div]:flex [&>div]:items-center [&>div]:gap-2.5 [&>div]:text-xs/[1.5] [&>div]:text-(--lp-muted)" aria-hidden="true">
        <img src="/lightling.svg" alt="" width={68} height={68} className="mb-[21px]" />
        <p className="mb-[23px] text-[23px] leading-[1.4] tracking-[-0.5px]">
          Set the scene.
          <br />
          <span className="text-(--lp-muted)">Let the story happen.</span>
        </p>
        <div>
          <Monitor size={15} />
          Made for your TV table
        </div>
        <div>
          <Sparkles size={15} />
          Powered by your imagination
        </div>
      </div>
    </section>
  );
}
