export type HomeAlert = {
  titulo: string;
  descricao: string;
  href?: string;
  imagemUrl?: string;
  ativo?: boolean;
};

export type HomeAlertAnimationSpeed = "slow" | "normal" | "fast";

export type HomeDisplaySettings = {
  alertAnimationEnabled: boolean;
  alertAnimationSpeed: HomeAlertAnimationSpeed;
  bannerIntervalMs: number;
};

export const defaultHomeAlerts: HomeAlert[] = [];
export const defaultHomeDisplaySettings: HomeDisplaySettings = {
  alertAnimationEnabled: true,
  alertAnimationSpeed: "normal",
  bannerIntervalMs: 5000
};

export function parseHomeAlerts(value?: string | null): HomeAlert[] {
  if (!value) return defaultHomeAlerts;

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return cleanHomeAlerts(parsed);
    if (parsed && typeof parsed === "object") {
      const candidate = parsed as { alerts?: unknown; avisos?: unknown; itens?: unknown };
      return cleanHomeAlerts(candidate.alerts ?? candidate.avisos ?? candidate.itens);
    }
    return defaultHomeAlerts;
  } catch {
    return defaultHomeAlerts;
  }
}

export function parseHomeDisplaySettings(value?: string | null): HomeDisplaySettings {
  if (!value) return defaultHomeDisplaySettings;

  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return defaultHomeDisplaySettings;
    return cleanHomeDisplaySettings((parsed as { settings?: unknown; configuracao?: unknown }).settings ?? (parsed as { configuracao?: unknown }).configuracao);
  } catch {
    return defaultHomeDisplaySettings;
  }
}

export function serializeHomeAlertsConfig(alerts: unknown, settings: unknown) {
  return JSON.stringify({
    alerts: cleanHomeAlerts(alerts),
    settings: cleanHomeDisplaySettings(settings)
  });
}

export function cleanHomeAlerts(alerts: unknown): HomeAlert[] {
  if (!Array.isArray(alerts)) return defaultHomeAlerts;

  return alerts
    .map((item): HomeAlert | null => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Partial<HomeAlert>;
      const titulo = typeof candidate.titulo === "string" ? candidate.titulo.trim() : "";
      const descricao = typeof candidate.descricao === "string" ? candidate.descricao.trim() : "";
      const href = typeof candidate.href === "string" ? candidate.href.trim() : "";
      const imagemUrl = typeof candidate.imagemUrl === "string" ? candidate.imagemUrl.trim() : "";

      if (!titulo && !descricao) return null;

      return {
        titulo,
        descricao,
        href,
        imagemUrl,
        ativo: candidate.ativo !== false
      };
    })
    .filter((item): item is HomeAlert => item !== null);
}

export function cleanHomeDisplaySettings(settings: unknown): HomeDisplaySettings {
  if (!settings || typeof settings !== "object") return defaultHomeDisplaySettings;

  const candidate = settings as Partial<HomeDisplaySettings>;
  const speed = ["slow", "normal", "fast"].includes(String(candidate.alertAnimationSpeed))
    ? (candidate.alertAnimationSpeed as HomeAlertAnimationSpeed)
    : defaultHomeDisplaySettings.alertAnimationSpeed;

  return {
    alertAnimationEnabled:
      typeof candidate.alertAnimationEnabled === "boolean"
        ? candidate.alertAnimationEnabled
        : defaultHomeDisplaySettings.alertAnimationEnabled,
    alertAnimationSpeed: speed,
    bannerIntervalMs: clampBannerInterval(candidate.bannerIntervalMs)
  };
}

function clampBannerInterval(value: unknown) {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) return defaultHomeDisplaySettings.bannerIntervalMs;
  return Math.min(15000, Math.max(3000, Math.round(numericValue)));
}
