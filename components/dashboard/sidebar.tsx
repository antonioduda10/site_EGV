import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { Permissions, type Permission } from "@/lib/permissions";
import { DashboardNavLink } from "@/components/dashboard/nav-link";

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

export async function DashboardSidebar() {
  const session = await getServerSession(authOptions);
  const hasActiveSession = Boolean(session?.user?.id) && !session?.invalidated;
  const links: DashboardLink[] = baseLinks;
  const roles = hasActiveSession ? session?.user?.roles ?? [] : [];
  const permissions = hasActiveSession ? session?.user?.permissions ?? [] : [];
  const superAdmin = hasActiveSession ? session?.user?.superAdmin ?? false : false;
  const hasPermission = (permission: Permission) =>
    can(roles as never, permission as never, permissions as never, superAdmin);

  const showAdminMenu = hasPermission(Permissions.USERS_READ);
  const visibleLinks = links.filter((link) => !link.permission || hasPermission(link.permission));
  return (
    <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-slate-200/70 bg-white/95 px-4 py-6 backdrop-blur lg:sticky lg:top-0 lg:block lg:h-screen dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mb-6 border-b border-slate-200 pb-4 dark:border-slate-800">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Painel Administrativo
        </p>
        <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">Portal EGV</p>
      </div>
      <nav className="space-y-4" aria-label="Menu do painel">
        {showAdminMenu && (
          <div className="space-y-1">
            <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Administração</div>
            <DashboardNavLink href="/dashboard/usuarios" label="Usuários" />
          </div>
        )}
        <div className="space-y-1">
          {visibleLinks.map((link) => (
            <DashboardNavLink
              key={link.href}
              href={link.href}
              label={link.label}
              external={link.external}
            />
          ))}
        </div>
      </nav>
    </aside>
  );
}
