import Link from "next/link";
import { t } from "@/lib/i18n";

export default function NotFound() {
  return (
    <main id="main-content" className="flex min-h-dvh items-center justify-center px-6" tabIndex={-1}>
      <div className="card w-full max-w-md p-6 text-center">
        <h1 className="text-lg font-medium tracking-tight sm:text-xl">{t("app.notFound.title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("app.notFound.body")}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href="/" className="btn btn-primary">
            {t("app.notFound.home")}
          </Link>
          <Link href="/studio" className="btn">
            {t("landing.nav.openStudio")}
          </Link>
        </div>
      </div>
    </main>
  );
}
