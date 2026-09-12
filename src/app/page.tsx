import Link from "next/link";

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
    <main className="landing min-h-screen">
      <div className="landing-canvas" aria-hidden="true" />

      {/* Navigation ---------------------------------------------------- */}
      <header className="site-nav glass">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-3.5">
          <Link href="/" className="brand">
            Learning<em>Studio</em>
          </Link>
          <span className="chip chip-on hidden sm:inline-flex">local-first</span>
          <nav className="ml-auto flex items-center gap-1">
            <Link href="/studio" className="nav-link">
              Studio
            </Link>
            <Link href="/settings" className="nav-link">
              Settings
            </Link>
            <Link href="/studio" className="btn btn-primary btn-xs ml-1.5">
              Open studio
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero ---------------------------------------------------------- */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-16 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:pb-24 lg:pt-24">
        <div>
          <span className="chip chip-on reveal">Learning engine · local-first</span>
          <h1 className="hero-title reveal mt-6" style={{ animationDelay: "70ms" }}>
            Not a chat box.
            <br />
            <span className="text-gradient">A learning workflow that runs.</span>
          </h1>
          <p className="lede reveal mt-6 max-w-xl" style={{ animationDelay: "140ms" }}>
            Learning Studio is a configurable teaching harness. You choose the methodology, hand it a subject, and it
            executes the stages one at a time — diagnosing, teaching, questioning, correcting, drilling and consolidating
            — while keeping every session on your own machine.
          </p>

          <div className="reveal mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: "210ms" }}>
            <Link href="/studio" className="btn btn-primary px-5 py-3 text-sm">
              Enter the Studio →
            </Link>
            <Link href="/settings" className="btn px-5 py-3 text-sm">
              Configure providers
            </Link>
          </div>

          <ul
            className="reveal mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted"
            style={{ animationDelay: "280ms" }}
          >
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

        {/* Decorative product preview */}
        <div className="reveal reveal-quick lg:justify-self-end lg:w-full" style={{ animationDelay: "170ms" }}>
          <div className="card-elevated lift lift-strong showcase" aria-hidden="true">
            <div className="showcase-head">
              <span className="status-dot" />
              <span className="label">Stage in progress</span>
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
                <div className="mock-line skeleton" style={{ width: "94%" }} />
                <div className="mock-line skeleton mt-2" style={{ width: "78%" }} />
                <div className="mock-line skeleton mt-2" style={{ width: "61%" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars ------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="section-rule">
          <span className="label">How it runs</span>
        </div>
        <h2 className="section-title reveal mt-5 max-w-2xl" style={{ animationDelay: "60ms" }}>
          Pick a method, name a subject, work through it.
        </h2>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {pillars.map((pillar, index) => (
            <article
              key={pillar.title}
              className="card lift panel reveal"
              style={{ animationDelay: `${120 + index * 70}ms` }}
            >
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
          <span className="label">Why it holds up</span>
        </div>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          {facts.map(([term, description], index) => (
            <div key={term} className="card lift panel reveal" style={{ animationDelay: `${80 + index * 70}ms` }}>
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
        <div className="card-elevated cta-band reveal">
          <span className="chip chip-on">start where you are</span>
          <h2 className="display-title mx-auto mt-5 max-w-2xl">The first stage is generated the moment you begin.</h2>
          <p className="lede mx-auto mt-4 max-w-xl">
            Nothing is queued up in advance. The engine opens the session with stage one, then waits for you to ask for
            the next one — with your questions staying attached to the stage you asked them in.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/studio" className="btn btn-primary px-5 py-3 text-sm">
              Enter the Studio →
            </Link>
            <Link href="/settings" className="btn px-5 py-3 text-sm">
              Configure providers
            </Link>
          </div>
        </div>
      </section>

      {/* Footer -------------------------------------------------------- */}
      <footer className="site-footer">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-7">
          <span className="brand text-sm">
            Learning<em>Studio</em>
          </span>
          <span>
            Every session stays on this machine — <span className="font-mono">.data/studio.db</span>
          </span>
          <span className="ml-auto font-mono">local-first · model-independent</span>
        </div>
      </footer>
    </main>
  );
}
