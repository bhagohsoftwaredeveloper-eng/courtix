import Link from "next/link";

export interface LegalSection {
  heading: string;
  /** What this section has to cover once real text replaces the placeholder. */
  covers: string;
}

/**
 * Shell for the three policy pages.
 *
 * The sections below are an outline, not a policy. Courtix takes payments and
 * handles personal data, so these documents are binding and belong to a
 * lawyer — the banner stays until a reviewed version replaces the outline.
 */
export function LegalPage({
  title,
  eyebrow,
  intro,
  sections,
}: {
  title: string;
  eyebrow: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div className="shell flex max-w-[760px] flex-col py-20">
      <p className="eyebrow mb-4">{eyebrow}</p>
      <h1 className="mb-3 text-[clamp(30px,4.5vw,42px)] leading-[1.05]">{title}</h1>
      <p className="mb-8 text-sm leading-relaxed text-muted">{intro}</p>

      <div className="mb-10 rounded-[12px] border border-board-red/40 bg-board-red/10 px-5 py-4">
        <p className="mb-1.5 font-sans text-[13px] font-extrabold normal-case tracking-normal text-[#ff9370]">
          Draft outline — not a policy yet
        </p>
        <p className="text-[12.5px] leading-relaxed text-muted">
          This page lists the sections the document needs; it contains no policy text. Courtix
          processes payments and personal data under the Philippines&apos; Data Privacy Act of 2012,
          so the wording has to be written or reviewed by a lawyer before launch. Replace each
          section below with the reviewed text.
        </p>
      </div>

      <ol className="flex flex-col gap-7">
        {sections.map((section, i) => (
          <li key={section.heading}>
            <h2 className="mb-1.5 font-sans text-[17px] font-extrabold normal-case tracking-normal">
              <span className="mr-2 font-mono text-[13px] text-muted">
                {String(i + 1).padStart(2, "0")}
              </span>
              {section.heading}
            </h2>
            <p className="text-[13.5px] leading-relaxed text-muted">{section.covers}</p>
          </li>
        ))}
      </ol>

      <p className="mt-12 border-t border-line-white/8 pt-6 text-[12.5px] leading-relaxed text-muted">
        Questions about this document?{" "}
        <Link href="/contact" className="font-bold text-ball-yellow">
          Contact us
        </Link>{" "}
        or{" "}
        <Link href="/report-issue" className="font-bold text-ball-yellow">
          report an issue
        </Link>
        .
      </p>
    </div>
  );
}
