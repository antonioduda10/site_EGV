import "./globals.css";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ConsentBanner } from "@/components/consent-banner";
import { PageviewTracker } from "@/components/pageview-tracker";
import { db } from "@/lib/db";
import { buildBrandThemeVariables } from "@/lib/theme";
import { AuthSessionProvider } from "@/components/auth-session-provider";
import { PUBLIC_SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

const baseMetadata = {
  title: "Portal EGV — Escola Municipal Getúlio Vargas",
  description: "Portal institucional da Escola Municipal Getúlio Vargas",
  metadataBase: new URL(PUBLIC_SITE_URL)
};

const themeInitScript = `(() => {
  try {
    const key = "egv-theme";
    const saved = window.localStorage.getItem(key);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch {
    document.documentElement.classList.remove("dark");
  }
})();`;

export async function generateMetadata(): Promise<Metadata> {
  const config = await db.configuracaoSite.findFirst({ select: { logoUrl: true } }).catch(() => null);
  const iconUrl = config?.logoUrl?.trim() || undefined;

  return {
    ...baseMetadata,
    icons: iconUrl
      ? {
        icon: iconUrl,
        apple: iconUrl
      }
      : undefined
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const config = await db.configuracaoSite.findFirst({
    select: {
      menuJson: true,
      rodapeJson: true,
      logoUrl: true,
      corPrimaria: true,
      corSecundaria: true
    }
  }).catch(() => null);
  const menuLinks = config?.menuJson ? safeParse(config.menuJson) : undefined;
  const rodapeData = config?.rodapeJson ? safeParse(config.rodapeJson) : undefined;
  const logoUrl = config?.logoUrl ?? null;
  const bodyStyle = buildBrandThemeVariables(config?.corPrimaria, config?.corSecundaria) as CSSProperties;
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body style={bodyStyle} className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100" suppressHydrationWarning>
        <AuthSessionProvider>
          <a className="skip-link" href="#conteudo">
            Pular para o conteúdo
          </a>
          <Header menuLinks={menuLinks} logoUrl={logoUrl} />
          <main id="conteudo" tabIndex={-1} className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {children}
          </main>
          <Footer data={rodapeData} logoUrl={logoUrl} />
          <ConsentBanner />
          <PageviewTracker />
        </AuthSessionProvider>
      </body>
    </html>
  );
}

function safeParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}
