export const newsCoverSizeValues = ["PEQUENO", "MEDIO", "GRANDE", "COMPLETO"] as const;

export type NewsCoverSize = (typeof newsCoverSizeValues)[number];

export const defaultNewsCoverSize: NewsCoverSize = "MEDIO";

export const newsCoverSizeLabels: Record<NewsCoverSize, string> = {
  PEQUENO: "Pequena",
  MEDIO: "Média",
  GRANDE: "Grande",
  COMPLETO: "Maior / completa"
};

export function normalizeNewsCoverSize(value?: string | null): NewsCoverSize {
  return newsCoverSizeValues.includes(value as NewsCoverSize) ? (value as NewsCoverSize) : defaultNewsCoverSize;
}

export function getNewsCoverOuterClass(size: NewsCoverSize) {
  const classes: Record<NewsCoverSize, string> = {
    PEQUENO: "mx-auto w-full max-w-2xl",
    MEDIO: "mx-auto w-full max-w-3xl",
    GRANDE: "mx-auto w-full max-w-4xl",
    COMPLETO: "mx-auto w-full max-w-4xl"
  };

  return classes[size];
}

export function getNewsCoverFrameClass(size: NewsCoverSize) {
  const classes: Record<NewsCoverSize, string> = {
    PEQUENO: "flex min-h-44 items-center justify-center rounded-2xl bg-slate-100 p-2 dark:bg-slate-950 sm:min-h-52",
    MEDIO: "flex min-h-48 items-center justify-center rounded-2xl bg-slate-100 p-2 dark:bg-slate-950 sm:min-h-60",
    GRANDE: "flex min-h-52 items-center justify-center rounded-2xl bg-slate-100 p-2 dark:bg-slate-950 sm:min-h-72",
    COMPLETO: "flex min-h-56 items-center justify-center rounded-2xl bg-slate-100 p-2 dark:bg-slate-950 sm:min-h-80"
  };

  return classes[size];
}

export function getNewsCoverImageClass(size: NewsCoverSize) {
  const classes: Record<NewsCoverSize, string> = {
    PEQUENO: "h-auto max-h-[260px] w-auto max-w-full rounded-xl object-contain sm:max-h-[300px]",
    MEDIO: "h-auto max-h-[320px] w-auto max-w-full rounded-xl object-contain sm:max-h-[380px]",
    GRANDE: "h-auto max-h-[420px] w-auto max-w-full rounded-xl object-contain sm:max-h-[520px]",
    COMPLETO: "h-auto max-h-[520px] w-auto max-w-full rounded-xl object-contain sm:max-h-[680px]"
  };

  return classes[size];
}
