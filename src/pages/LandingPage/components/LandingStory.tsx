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
        className="landing-workflow landing-container"
        id="how-it-works"
        aria-labelledby="workflow-title"
      >
        <div className="landing-section-heading">
          <p className="landing-eyebrow">FROM MAP TO GAME NIGHT</p>
          <h2 id="workflow-title">
            A little prep.
            <br />
            <span>A whole lot of atmosphere.</span>
          </h2>
        </div>
        <div className="landing-steps">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <article key={title}>
              <div className="landing-step-top">
                <Icon size={23} aria-hidden="true" />
                <span>0{index + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section
        className="landing-benefits landing-container"
        aria-label="Tools for your next encounter"
      >
        {benefits.map((benefit) => (
          <article className="landing-benefit" key={benefit.image}>
            <div className="landing-benefit-copy">
              <p className="landing-eyebrow">
                <span>{benefit.number}</span>
                {benefit.eyebrow}
              </p>
              <h2>{benefit.title}</h2>
              <p>{benefit.text}</p>
              {benefit.image === "workshop" ? (
                <Link
                  className="landing-text-link"
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
            <figure>
              <img
                src={`/landing/temple-${benefit.image}-1000.webp`}
                srcSet={`/landing/temple-${benefit.image}-600.webp 600w, /landing/temple-${benefit.image}-1000.webp 1000w`}
                sizes="(max-width: 760px) calc(100vw - 32px), 660px"
                width={1000}
                height={700}
                loading="lazy"
                alt={benefit.alt}
              />
              <figcaption>Lighting VTT · Example screenshot</figcaption>
            </figure>
          </article>
        ))}
      </section>
      <section
        className="landing-extras landing-container"
        aria-labelledby="extras-title"
      >
        <p className="landing-eyebrow">AT THE TABLE & BEYOND</p>
        <h2 id="extras-title">The details that keep play flowing.</h2>
        <div>
          {extras.map(({ icon: Icon, title, text }) => (
            <article key={title}>
              <Icon size={21} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section
        className="landing-faq landing-container"
        aria-labelledby="faq-title"
      >
        <div>
          <p className="landing-eyebrow">BEFORE YOU GATHER THE PARTY</p>
          <h2 id="faq-title">
            A few good
            <br />
            questions.
          </h2>
        </div>
        <div>
          {faqs.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <Plus size={18} aria-hidden="true" />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <section
        className="landing-closing landing-container"
        aria-labelledby="closing-title"
      >
        <img src="/lightling.svg" alt="" width={54} height={54} />
        <p className="landing-eyebrow">MAKE IT A NIGHT TO REMEMBER</p>
        <h2 id="closing-title">
          Your next encounter
          <br />
          starts with a map.
        </h2>
        <LandingAction placement="closing" />
        <p>Bring the party. We’ll bring a little light.</p>
      </section>
    </>
  );
}
export function LandingFooter() {
  return (
    <footer className="landing-footer landing-container">
      <Link className="landing-brand" to="/">
        <img src="/lightling.svg" alt="" width={24} height={24} />
        <span>Lighting VTT</span>
      </Link>
      <p>Made for the stories around your table.</p>
      <Link to="/effects">
        Explore effects
        <ArrowUpRight size={14} aria-hidden="true" />
      </Link>
    </footer>
  );
}
