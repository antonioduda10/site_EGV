type RGB = [number, number, number];

const DEFAULT_PRIMARY = "#1647d6";
const DEFAULT_SECONDARY = "#1439ad";

function clamp(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function normalizeHexColor(value?: string | null) {
  const input = (value ?? "").trim();
  if (!input) return null;
  const withHash = input.startsWith("#") ? input : `#${input}`;

  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
    const r = withHash[1];
    const g = withHash[2];
    const b = withHash[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) {
    return withHash.toLowerCase();
  }

  return null;
}

function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

function mix(color: RGB, target: RGB, amount: number): RGB {
  const ratio = Math.max(0, Math.min(1, amount));
  return [
    clamp(color[0] + (target[0] - color[0]) * ratio),
    clamp(color[1] + (target[1] - color[1]) * ratio),
    clamp(color[2] + (target[2] - color[2]) * ratio)
  ];
}

function toCssValue(rgb: RGB) {
  return `${rgb[0]} ${rgb[1]} ${rgb[2]}`;
}

export function buildBrandThemeVariables(corPrimaria?: string | null, corSecundaria?: string | null) {
  const primary = hexToRgb(normalizeHexColor(corPrimaria) ?? DEFAULT_PRIMARY);
  const secondary = hexToRgb(normalizeHexColor(corSecundaria) ?? DEFAULT_SECONDARY);
  const white: RGB = [255, 255, 255];
  const black: RGB = [0, 0, 0];

  const brand500 = mix(primary, white, 0.1);
  const brand700 = secondary;
  const brand800 = mix(brand700, black, 0.18);
  const brand900 = mix(brand700, black, 0.33);

  return {
    "--brand-50": toCssValue(mix(primary, white, 0.92)),
    "--brand-100": toCssValue(mix(primary, white, 0.82)),
    "--brand-200": toCssValue(mix(primary, white, 0.68)),
    "--brand-300": toCssValue(mix(primary, white, 0.48)),
    "--brand-400": toCssValue(mix(primary, white, 0.25)),
    "--brand-500": toCssValue(brand500),
    "--brand-600": toCssValue(primary),
    "--brand-700": toCssValue(brand700),
    "--brand-800": toCssValue(brand800),
    "--brand-900": toCssValue(brand900)
  } as const;
}
