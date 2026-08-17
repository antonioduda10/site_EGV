import Link from "next/link";
import type { ReactNode } from "react";

type HeroTone = "brand" | "emerald" | "amber";
type HeroIcon = "news" | "calendar" | "documents" | "gallery" | "contact" | "school" | "photo" | "video" | "team";

type HeroAction = {
  href: string;
  label: string;
  external?: boolean;
  variant?: "primary" | "secondary";
};

type HeroStat = {
  label: string;
  value: string | number;
  hint?: string;
};

type PublicPageHeroProps = {
  eyebrow: string;
  title: string;
  description?: string | null;
  icon?: HeroIcon;
  tone?: HeroTone;
  maxWidth?: "6xl" | "7xl";
  backLink?: {
    href: string;
    label: string;
  };
  actions?: HeroAction[];
  stats?: HeroStat[];
  aside?: ReactNode;
  contentCard?: boolean;
  contentCardAccent?: boolean;
};

const toneClasses = {
  brand: {
    background:
      "from-brand-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-brand-900/30",
    eyebrow: "text-brand-700 dark:text-brand-300",
    primary: "bg-brand-600 text-white hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400",
    secondary:
      "border-brand-200 bg-white text-brand-700 hover:border-brand-300 hover:bg-brand-50 dark:border-brand-700 dark:bg-slate-900 dark:text-brand-200 dark:hover:bg-brand-900/30",
    stat: "text-brand-700 dark:text-brand-300"
  },
  emerald: {
    background:
      "from-emerald-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-emerald-950/40",
    eyebrow: "text-emerald-700 dark:text-emerald-300",
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400",
    secondary:
      "border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-emerald-900/30",
    stat: "text-emerald-700 dark:text-emerald-300"
  },
  amber: {
    background:
      "from-amber-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-amber-950/30",
    eyebrow: "text-amber-700 dark:text-amber-300",
    primary: "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300",
    secondary:
      "border-amber-200 bg-white text-amber-700 hover:border-amber-300 hover:bg-amber-50 dark:border-amber-700 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-amber-900/30",
    stat: "text-amber-700 dark:text-amber-300"
  }
};

export function PublicPageHero({
  eyebrow,
  title,
  description,
  tone = "brand",
  maxWidth = "6xl",
  backLink,
  actions,
  stats,
  aside,
  contentCard = false,
  contentCardAccent = false
}: PublicPageHeroProps) {
  const colors = toneClasses[tone];
  const widthClass = maxWidth === "7xl" ? "max-w-7xl" : "max-w-6xl";
  const hasAside = Boolean(aside) || Boolean(stats?.length);

  return (
    <section className={`relative overflow-hidden border-b border-slate-200 bg-gradient-to-br ${colors.background} dark:border-slate-800`}>
      <div className={`mx-auto ${widthClass} px-4 py-9 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}>
        {backLink && (
          <Link
            href={backLink.href}
            className="mb-6 inline-flex min-h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white/85 px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <span aria-hidden="true">←</span>
            {backLink.label}
          </Link>
        )}

        <div className={`grid gap-6 ${hasAside ? "lg:grid-cols-[1fr_360px] lg:items-stretch" : ""}`}>
          <div
            className={
              contentCard
                ? `relative flex h-full min-w-0 flex-col justify-center overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-5 shadow-sm shadow-slate-200/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/75 dark:shadow-black/20 sm:p-6 ${
                    contentCardAccent ? "pr-10 sm:pr-12" : ""
                  }`
                : "min-w-0"
            }
          >
            {contentCard && contentCardAccent && (
              <span
                className="absolute inset-y-0 right-0 w-5 bg-brand-700 dark:bg-brand-500 sm:w-6"
                aria-hidden="true"
              />
            )}
            <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${colors.eyebrow}`}>
              {eyebrow}
            </p>
            <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-tight tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            {description && (
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
                {description}
              </p>
            )}
            {actions && actions.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-3">
                {actions.map((action) => (
                  <Link
                    key={`${action.href}-${action.label}`}
                    href={action.href}
                    target={action.external ? "_blank" : undefined}
                    rel={action.external ? "noreferrer" : undefined}
                    className={`inline-flex min-h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold shadow-sm transition ${
                      action.variant === "secondary" ? `border ${colors.secondary}` : colors.primary
                    }`}
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {hasAside && (
            <aside className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-sm shadow-slate-200/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/75 dark:shadow-black/20">
              {aside ?? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {stats?.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:from-slate-950 dark:to-slate-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className={`text-3xl font-bold leading-none ${colors.stat}`}>{stat.value}</p>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                          Total
                        </span>
                      </div>
                      <p className="mt-3 inline-flex rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-100">{stat.label}</p>
                      {stat.hint && <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{stat.hint}</p>}
                    </div>
                  ))}
                </div>
              )}
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
