import { cn } from "@/lib/utils";
import { publicContainerStyles } from "@/lib/publicPageStyles";
import { landingEyebrowStyles, landingHeadingStyles, landingSubheadingStyles, landingTextLinkStyles } from "../styles";
import {
  ArrowUpRight,
  ImagePlus,
  Monitor,
  Sparkles,
  Swords,
  Users,
  Globe,
  Plus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { usePostHog } from "@posthog/react";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { LandingAction } from "./LandingAction";
import { PublicFooter } from "@/components/organisms/PublicFooter/PublicFooter";

const steps = [
  {
    icon: ImagePlus,
    title: "Bring your map",
    text: "Create a scene with a battlemap you already love. Your own images are the starting point.",
  },
  {
    icon: Sparkles,
    title: "Set the atmosphere",
    text: "Place lights, tune an effect, and save a preset for the moment the encounter changes.",
  },
  {
    icon: Monitor,
    title: "Open Player View",
    text: "Open the separate player window, move it onto your TV display, and gather around the table.",
  },
];
const benefits = [
  {
    number: "01",
    eyebrow: "LIGHT & REVEAL",
    title: "Shape the light.",
    text: "A torch at the entrance. A beam across the chamber. Place radial, conic, and line lights, adjust their intensity and reach, and use mirrors to redirect them.",
    image: "lights",
    alt: "Actual DM controls for adjusting the temple encounter’s lighting.",
  },
  {
    number: "02",
    eyebrow: "PREPARE THE MOMENT",
    title: "Change the scene’s mood.",
    text: "Save lighting setups as named presets. When the ritual begins or the party changes course, bring the next setup into play.",
    image: "presets",
    alt: "The temple scene with the application’s named lighting presets open.",
  },
  {
    number: "03",
    eyebrow: "THE EFFECT WORKSHOP",
    title: "Make the encounter your own.",
    text: "Bring lights, mirrors, and custom effects together in one workshop. Browse effects, tune their controls, and place them in your scene. Want to go further? Author programmable effects in the editor.",
    image: "workshop",
    alt: "The current Effect Workshop and a portal effect rendered in the temple encounter.",
  },
];
const extras = [
  {
    icon: Users,
    title: "A place for the party",
    text: "Add character and creature tokens with your own images.",
  },
  {
    icon: Swords,
    title: "Keep the turns moving",
    text: "Track initiative alongside the encounter.",
  },
  {
    icon: Globe,
    title: "Room for remote players",
    text: "Share an invite link so players can join in their browser.",
  },
];
const faqs = [
  [
    "Do I need to install anything?",
    "Lighting VTT runs in your browser. Create an account to build scenes and access your library; there is no separate tabletop app to install.",
  ],
  [
    "Can I use my own maps?",
    "Yes. Upload a map image when you create a scene, then add your lighting, tokens, and effects. Use maps you own or have permission to use. The temple shown here is an example encounter, not a bundled map library.",
  ],
  [
    "How do I put the map on my TV?",
    "Connect your TV as another display for your computer. From your scene, open Player View and move that separate browser window onto the TV. Keep the DM window on your own screen for editing and scene controls.",
  ],
  [
    "Can players join remotely?",
    "Yes. Generate an invite link from your scene and share it with your players. They can enter their name and character name to join from a browser; player sign-in is optional. Keep the DM session open while you play.",
  ],
];

export function LandingStory() {
  const posthog = usePostHog();
  return (
    <>
      <section
        className={cn(publicContainerStyles, "scroll-mt-[30px] pt-[110px] pb-[90px] max-[760px]:pt-[65px] max-[760px]:pb-[55px]")}
        id="how-it-works"
        aria-labelledby="workflow-title"
      >
        <div>
          <p className={landingEyebrowStyles}>FROM MAP TO GAME NIGHT</p>
          <h2 id="workflow-title" className={cn(landingHeadingStyles, "mt-[17px]")}>
            A little prep.
            <br />
            <span className="text-(--lp-muted)">A whole lot of atmosphere.</span>
          </h2>
        </div>
        <div className="mt-[45px] grid grid-cols-3 gap-[50px] max-[760px]:mt-7 max-[760px]:grid-cols-1 max-[760px]:gap-[22px]">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <article key={title}>
              <div className="flex items-center justify-between border-t border-(--lp-line) pt-[19px] pb-[25px] text-(--lp-accent) max-[760px]:pb-4">
                <Icon size={23} aria-hidden="true" />
                <span className="text-xs/[1.5] text-(--lp-muted)">0{index + 1}</span>
              </div>
              <h3 className={landingSubheadingStyles}>{title}</h3>
              <p className="text-sm/[1.5] leading-[1.8] text-(--lp-muted)">{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section
        className={publicContainerStyles}
        aria-label="Tools for your next encounter"
      >
        {benefits.map((benefit) => (
          <article className="group/benefit grid grid-cols-[1fr_1.5fr] items-center gap-[75px] border-t border-(--lp-line) py-[50px] even:grid-cols-[1.5fr_1fr] max-[1000px]:gap-[35px] max-[760px]:grid-cols-1 max-[760px]:gap-[26px] max-[760px]:py-[35px] max-[760px]:even:grid-cols-1" key={benefit.image}>
            <div className="group-even/benefit:order-2 max-[760px]:group-even/benefit:order-0">
              <p className={cn(landingEyebrowStyles, "gap-[17px]")}>
                <span>{benefit.number}</span>
                {benefit.eyebrow}
              </p>
              <h2 className={cn(landingHeadingStyles, "mt-[22px] max-[760px]:mt-3.5")}>{benefit.title}</h2>
              <p className="mt-[22px] text-[15px] leading-[1.8] text-(--lp-muted) max-[760px]:mt-3.5">{benefit.text}</p>
              {benefit.image === "workshop" ? (
                <Link
                  className={cn(landingTextLinkStyles, "mt-[26px] text-(--lp-accent)")}
                  to="/effects"
                  onClick={() =>
                    posthog.capture(ANALYTICS_EVENTS.LandingCtaClicked, {
                      placement: "workshop",
                      action: "explore_effects",
                    })
                  }
                >
                  Explore the effects library
                  <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
              ) : null}
            </div>
            <figure className="min-w-0 overflow-hidden rounded-lg border border-(--lp-line) bg-[#10120f]">
              <img
                src={`/landing/temple-${benefit.image}-1000.webp`}
                srcSet={`/landing/temple-${benefit.image}-600.webp 600w, /landing/temple-${benefit.image}-1000.webp 1000w`}
                sizes="(max-width: 760px) calc(100vw - 32px), 660px"
                width={1000}
                height={700}
                loading="lazy"
                alt={benefit.alt}
                className="block aspect-10/7 w-full object-cover"
              />
              <figcaption className="border-t border-[#35392e] px-4 py-3 text-[10px] tracking-[0.5px] text-[#a6ab9d]">Lighting VTT · Example screenshot</figcaption>
            </figure>
          </article>
        ))}
      </section>
      <section
        className={cn(publicContainerStyles, "mt-[50px] border-y border-(--lp-line) py-[65px] max-[760px]:mt-5 max-[760px]:py-10")}
        aria-labelledby="extras-title"
      >
        <p className={landingEyebrowStyles}>AT THE TABLE & BEYOND</p>
        <h2 id="extras-title" className={cn(landingHeadingStyles, "mt-[18px] text-[32px] leading-[1.13]")}>The details that keep play flowing.</h2>
        <div className="mt-[35px] grid grid-cols-3 gap-[50px] max-[760px]:grid-cols-1 max-[760px]:gap-7">
          {extras.map(({ icon: Icon, title, text }) => (
            <article key={title}>
              <Icon size={21} aria-hidden="true" className="mb-[17px] text-(--lp-accent) max-[760px]:mb-3" />
              <h3 className={landingSubheadingStyles}>{title}</h3>
              <p className="text-sm/[1.5] leading-[1.8] text-(--lp-muted)">{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section
        className={cn(publicContainerStyles, "grid grid-cols-[1fr_1.5fr] gap-[75px] py-[100px] max-[1000px]:gap-[35px] max-[760px]:grid-cols-1 max-[760px]:gap-[30px] max-[760px]:py-[60px]")}
        aria-labelledby="faq-title"
      >
        <div>
          <p className={landingEyebrowStyles}>BEFORE YOU GATHER THE PARTY</p>
          <h2 id="faq-title" className={cn(landingHeadingStyles, "mt-5 max-[760px]:[&_br]:hidden")}>
            A few good
            <br />
            questions.
          </h2>
        </div>
        <div>
          {faqs.map(([question, answer]) => (
            <details key={question} className="group/faq border-b border-(--lp-line) first:border-t">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-[22px] text-base/[1.5] [&::-webkit-details-marker]:hidden">
                {question}
                <Plus size={18} aria-hidden="true" className="shrink-0 text-(--lp-muted) transition-transform duration-[160ms] group-open/faq:rotate-45" />
              </summary>
              <p className="pr-[25px] pb-6 text-sm/[1.5] leading-[1.85] text-(--lp-muted)">{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <section
        className={cn(publicContainerStyles, "rounded-[10px] border border-(--lp-line) bg-(--lp-panel) px-6 py-[62px] text-center max-[760px]:py-10")}
        aria-labelledby="closing-title"
      >
        <img src="/lightling.svg" alt="" width={54} height={54} className="mx-auto mb-[22px]" />
        <p className={cn(landingEyebrowStyles, "justify-center")}>MAKE IT A NIGHT TO REMEMBER</p>
        <h2 id="closing-title" className={cn(landingHeadingStyles, "mt-[18px] mb-[27px] text-[clamp(36px,4.6vw,60px)] leading-[1.13]")}>
          Your next encounter
          <br />
          starts with a map.
        </h2>
        <LandingAction placement="closing" />
        <p className="mt-[17px] text-xs/[1.5] text-(--lp-muted)">Bring the party. We’ll bring a little light.</p>
      </section>
    </>
  );
}
export function LandingFooter() {
  return <PublicFooter />;
}
