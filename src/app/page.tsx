import Link from "next/link";
import { t } from "@/lib/i18n";
import { MotionGate } from "@/components/ui/MotionGate";
import { RevealController } from "@/lib/motion";

const pillars = [
  {
    title: "Choose how you learn",
    body: "Pick a methodology — the default six-stage arc, Socratic, Feynman, retrieval practice, exam drill — or write your own steps.",
  },
  {
    title: "Give it a topic",
    body: "Renal physiology, Kalman filters, Ottoman tax policy. The engine decides how the workflow should begin for that subject.",
  },
  {
    title: "Learn stage by stage",
    body: "Each stage is generated only when you ask for it, with its own Q&A, its own sources, and a learning state that carries forward.",
  },
];

const facts = [
  ["Local-first", "Everything lives on your machine. No account, no cloud sync, nothing to log into."],
  ["Model independent", "OpenAI, OpenRouter, Anthropic, xAI, or any OpenAI-compatible endpoint you point it at."],
  ["Capability aware", "Vision, reasoning and tool controls appear only when the active model genuinely supports them."],
  ["Study document export", "Finish the sequence and take away clean Markdown, DOCX, PDF, HTML, TXT or a bundled archive."],
];

/* Presentation-only: a decorative preview of the default six-stage arc. */
const arc = [
  { label: "Diagnose", state: "done" },
  { label: "Teach", state: "done" },
  { label: "Question", state: "active" },
  { label: "Correct", state: "todo" },
  { label: "Drill", state: "todo" },
  { label: "Consolidate", state: "todo" },
] as const;

const assurances = ["No account", "No cloud sync", "Bring any model", "Export anytime"];

export default function LandingPage() {
  return (
    <main id="main-content" className="landing min-h-screen" tabIndex={-1}>
      <RevealController />
      <div className="landing-canvas" aria-hidden="true" />

      <a href="#main-content" className="skip-link">
        {t("app.skipToContent")}
      </a>

      {/* Navigation ---------------------------------------------------- */}
      <header className="site-nav glass">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-3.5">
          <Link href="/" className="brand">
            {t("app.brandFirst")}
            <em>{t("app.brandSecond")}</em>
          </Link>
          <span className="chip chip-on hidden sm:inline-flex">local-first</span>
          <nav className="ml-auto flex items-center gap-1" aria-label="Primary">
            <Link href="/studio" className="nav-link">
              {t("landing.nav.studio")}
            </Link>
            <Link href="/settings" className="nav-link">
              {t("landing.nav.settings")}
            </Link>
            <Link href="/studio" className="btn btn-primary btn-xs ml-1.5">
              {t("landing.nav.openStudio")}
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero ---------------------------------------------------------- */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-16 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:pb-24 lg:pt-24">
        <div>
          <span className="chip chip-on reveal">{t("landing.hero.badge")}</span>
          <h1 className="hero-title reveal reveal-d1 mt-6">
            Not a chat box.
            <br />
            <span className="text-gradient">A learning workflow that runs.</span>
          </h1>
          <p className="lede reveal reveal-d2 mt-6 max-w-xl">
            Learning Studio is a configurable teaching harness. You choose the methodology, hand it a subject, and it
            executes the stages one at a time — diagnosing, teaching, questioning, correcting, drilling and consolidating
            — while keeping every session on your own machine.
          </p>

          <div className="reveal reveal-d3 mt-9 flex flex-wrap items-center gap-3">
            <Link href="/studio" className="btn btn-primary px-5 py-3 text-small">
              {t("landing.hero.cta")}
            </Link>
            <Link href="/settings" className="btn px-5 py-3 text-small">
              {t("landing.hero.ctaSecondary")}
            </Link>
          </div>

          <ul className="reveal reveal-d4 mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
            {assurances.map((assurance) => (
              <li key={assurance} className="flex items-center gap-1.5">
                <span className="text-accent" aria-hidden="true">
                  ✓
                </span>
                {assurance}
              </li>
            ))}
          </ul>
        </div>

        {/* Decorative product preview — gated so its infinite loops pause offscreen */}
        <MotionGate className="reveal reveal-quick reveal-d5 lg:justify-self-end lg:w-full">
          <div className="card-elevated lift lift-strong showcase" aria-hidden="true">
            <div className="showcase-head">
              <span className="status-dot" />
              <span className="label">{t("landing.showcase.stageLabel")}</span>
              <span className="chip ml-auto">03 / 06</span>
            </div>
            <h2 className="panel-title mt-3.5">Questioning — retrieval check</h2>
            <div className="showcase-body">
              <div className="rail">
                {arc.map((node, index) => (
                  <div className="rail-node" data-state={node.state} key={node.label}>
                    <span className="rail-dot">{node.state === "done" ? "✓" : index + 1}</span>
                  </div>
                ))}
              </div>
              <div className="progress">
                <span className="progress-fill progress-fill-grow" />
              </div>
              <p className="rail-caption">{arc.map((node) => node.label.toLowerCase()).join(" · ")}</p>
              <div className="mock-bubble mock-bubble-user">
                Why does the loop of Henle need two limbs to concentrate urine?
              </div>
              <div className="mock-bubble mock-bubble-ai">
                <div className="mock-line skeleton w-[94%]" />
                <div className="mock-line skeleton mt-2 w-[78%]" />
                <div className="mock-line skeleton mt-2 w-[61%]" />
              </div>
            </div>
          </div>
        </MotionGate>
      </section>

      {/* Pillars ------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="section-rule">
          <span className="label">{t("landing.pillars.heading")}</span>
        </div>
        <h2 className="section-title reveal reveal-d6 mt-5 max-w-2xl">
          {t("landing.pillars.title")}
        </h2>

        <div className="reveal-stagger mt-8 grid gap-4 sm:grid-cols-3">
          {pillars.map((pillar, index) => (
            <article key={pillar.title} className="card lift panel" data-reveal>
              <div className="index-mark">0{index + 1}</div>
              <h3 className="panel-title mt-3">{pillar.title}</h3>
              <p className="panel-body mt-2">{pillar.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Facts --------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="section-rule">
          <span className="label">{t("landing.facts.heading")}</span>
        </div>

        <dl className="reveal-stagger mt-8 grid gap-4 sm:grid-cols-2">
          {facts.map(([term, description], index) => (
            <div key={term} className="card lift panel" data-reveal>
              <dt className="flex items-baseline gap-2.5">
                <span className="index-mark">0{index + 1}</span>
                <span className="panel-title">{term}</span>
              </dt>
              <dd className="panel-body mt-2.5">{description}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Closing call to action ---------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 pb-10 pt-16">
        <div className="card-elevated cta-band" data-reveal>
          <span className="chip chip-on">{t("landing.cta.badge")}</span>
          <h2 className="display-title mx-auto mt-5 max-w-2xl">{t("landing.cta.title")}</h2>
          <p className="lede mx-auto mt-4 max-w-xl">
            Nothing is queued up in advance. The engine opens the session with stage one, then waits for you to ask for
            the next one — with your questions staying attached to the stage you asked them in.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/studio" className="btn btn-primary px-5 py-3 text-small">
              {t("landing.hero.cta")}
            </Link>
            <Link href="/settings" className="btn px-5 py-3 text-small">
              {t("landing.hero.ctaSecondary")}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer -------------------------------------------------------- */}
      <footer className="site-footer">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-7">
          <span className="brand text-small">
            {t("app.brandFirst")}
            <em>{t("app.brandSecond")}</em>
          </span>
          <span>
            {t("landing.footer.storage")} <span className="font-mono">.data/studio.db</span>
          </span>
          <span className="ml-auto font-mono">{t("landing.footer.tagline")}</span>
        </div>
      </footer>
    </main>
  );
}
