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

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <div className="animate-rise">
        <span className="chip chip-on">Learning engine · local-first</span>
        <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-[1.08] tracking-tight sm:text-6xl">
          Not a chat box.
          <br />
          <span className="text-accent">A learning workflow that runs.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted">
          Learning Studio is a configurable teaching harness. You choose the methodology, hand it a subject, and it
          executes the stages one at a time — diagnosing, teaching, questioning, correcting, drilling and consolidating
          — while keeping every session on your own machine.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link href="/studio" className="btn btn-primary px-5 py-2.5 text-sm">
            Enter the Studio →
          </Link>
          <Link href="/settings" className="btn px-5 py-2.5 text-sm">
            Configure providers
          </Link>
        </div>
      </div>

      <div className="mt-16 grid gap-4 sm:grid-cols-3">
        {pillars.map((pillar, index) => (
          <div key={pillar.title} className="card animate-rise p-5" style={{ animationDelay: `${index * 70}ms` }}>
            <div className="text-xs font-semibold tracking-widest text-accent">0{index + 1}</div>
            <h2 className="mt-2 font-serif text-lg">{pillar.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{pillar.body}</p>
          </div>
        ))}
      </div>

      <dl className="mt-12 grid gap-x-10 gap-y-5 border-t border-line pt-8 sm:grid-cols-2">
        {facts.map(([term, description]) => (
          <div key={term}>
            <dt className="label">{term}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-muted">{description}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
