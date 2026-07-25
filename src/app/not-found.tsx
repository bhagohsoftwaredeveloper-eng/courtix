import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className="shell flex flex-col items-center py-28 text-center">
        <p className="eyebrow mb-6">Error 404</p>
        <h1 className="mb-4 text-[clamp(36px,6vw,64px)] leading-[0.98]">
          Out of <span className="text-ball-yellow">bounds.</span>
        </h1>
        <p className="mb-10 max-w-[420px] text-[15px] leading-relaxed text-muted">
          That page doesn’t exist — the court may have been delisted, or the link is wrong. Try the
          directory instead.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/courts" className="btn btn-solid">
            Browse courts
          </Link>
          <Link href="/" className="btn btn-ghost">
            Back home
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
