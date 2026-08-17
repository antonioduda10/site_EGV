import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { Permissions, type Permission } from "@/lib/permissions";
import { DashboardNavLink } from "@/components/dashboard/nav-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { DashboardSignOutButton } from "@/components/dashboard/signout-button";

type DashboardLink = {
  href: string;
  label: string;
  external?: boolean;
  permission?: Permission;
};

const baseLinks: DashboardLink[] = [
  { href: "/dashboard", label: "Visão geral", permission: Permissions.DASHBOARD_READ },
  { href: "/dashboard/noticias", label: "Notícias", permission: Permissions.NEWS_READ },
  { href: "/dashboard/eventos", label: "Eventos", permission: Permissions.EVENTS_WRITE },
  { href: "/dashboard/documentos", label: "Documentos", permission: Permissions.DOCS_WRITE },
  { href: "/dashboard/paginas", label: "Páginas", permission: Permissions.PAGES_WRITE },
  { href: "/dashboard/secretaria", label: "Secretaria", permission: Permissions.PAGES_WRITE },
  { href: "/dashboard/banners", label: "Banners", permission: Permissions.BANNERS_WRITE },
  { href: "/dashboard/galeria/fotos", label: "Galeria - Fotos", permission: Permissions.MEDIA_WRITE },
  { href: "/dashboard/galeria/videos", label: "Galeria - Vídeos", permission: Permissions.VIDEOS_WRITE },
  { href: "/dashboard/contatos", label: "Contatos", permission: Permissions.CONTACTS_READ },
  { href: "/dashboard/relatorios", label: "Relatórios", permission: Permissions.REPORTS_READ },
  { href: "/dashboard/config", label: "Configurações", permission: Permissions.CONFIG_WRITE }
];

export async function DashboardTopbar({ title }: { title: string }) {
  const session = await getServerSession(authOptions);
  const hasActiveSession = Boolean(session?.user?.id) && !session?.invalidated;
  const userLabel = session?.user?.name ?? session?.user?.email ?? "Usuário";
  const roles = hasActiveSession ? session?.user?.roles ?? [] : [];
  const permissions = hasActiveSession ? session?.user?.permissions ?? [] : [];
  const superAdmin = hasActiveSession ? session?.user?.superAdmin ?? false : false;
  const hasPermission = (permission: Permission) =>
    can(roles as never, permission as never, permissions as never, superAdmin);
  const showAdminMenu = hasPermission(Permissions.USERS_READ);
  const visibleLinks = baseLinks.filter((link) => !link.permission || hasPermission(link.permission));

  return (
    <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 px-4 py-4 backdrop-blur md:px-6 dark:border-slate-800 dark:bg-slate-950/95">
      <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
        <details className="relative lg:hidden">
          <summary className="list-none cursor-pointer rounded-md border border-slate-200 p-2 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800" aria-label="Abrir menu do painel">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </summary>
          <nav
            aria-label="Menu mobile do painel"
            className="fixed left-4 right-4 top-32 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            {showAdminMenu && (
              <div className="mb-2 space-y-1">
                <div className="px-2 pt-1 text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Administração</div>
                <DashboardNavLink href="/dashboard/usuarios" label="Usuários" compact />
              </div>
            )}

            <div className="space-y-1">
              {visibleLinks.map((link) => (
                <DashboardNavLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  external={link.external}
                  compact
                />
              ))}
            </div>
          </nav>
        </details>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle compact />
        {hasActiveSession && (
          <div className="hidden items-center gap-2 md:flex">
            <span className="text-xs text-slate-500 dark:text-slate-400">Logado: {userLabel}</span>
            {session?.user?.superAdmin && (
              <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white dark:bg-slate-100 dark:text-slate-900">
                Super Admin
              </span>
            )}
          </div>
        )}
        <DashboardSignOutButton />
      </div>
      </div>
    </div>
  );
}
