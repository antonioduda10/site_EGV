import Link from "next/link";
import { HeaderMenuLink } from "@/components/header-menu-link";
import { HeaderSessionControls } from "@/components/header-session-controls";

const defaultLinks = [
  { href: "/", label: "Início" },
  { href: "/noticias", label: "Notícias" },
  { href: "/eventos", label: "Eventos" },
  { href: "/documentos", label: "Documentos" },
  { href: "/p/escola", label: "Escola" },
  { href: "/contato", label: "Contato" }
];

type LinkItem = { href: string; label: string; newTab?: boolean };

export function Header({ menuLinks, logoUrl }: { menuLinks?: LinkItem[]; logoUrl?: string | null }) {
  const links = menuLinks?.length ? menuLinks : defaultLinks;
  const resolvedLogo = logoUrl?.trim() || "";
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          {resolvedLogo ? (
            <img
              src={resolvedLogo}
              alt="Logo da Escola Municipal Getúlio Vargas"
              loading="eager"
              decoding="async"
              className="h-10 w-10 rounded-full bg-white object-contain shadow-md"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-base font-bold text-white shadow-md">
              EGV
            </div>
          )}
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Escola Municipal</p>
            <p className="font-bold text-slate-900 dark:text-slate-100">Getúlio Vargas</p>
          </div>
        </Link>
        <HeaderSessionControls links={links} />
      </div>
      <div className="hidden border-t border-brand-500/30 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-700 shadow-md shadow-brand-900/20 md:block">
        <nav aria-label="Navegação principal" className="mx-auto max-w-7xl px-4 py-1.5">
            <ul className="hidden items-center justify-center gap-2 text-sm font-semibold text-white md:flex md:flex-wrap">
            {links.map((link) => (
              <li key={link.href}>
                <HeaderMenuLink link={link} inline />
              </li>
            ))}
            </ul>
        </nav>
      </div>
    </header>
  );
}
