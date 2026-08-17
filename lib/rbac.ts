import { Permissions, Permission } from "./permissions";

type RoleName =
  | "Admin"
  | "Direção"
  | "Secretaria"
  | "Coordenação"
  | "Comunicação"
  | "Docente"
  | "Aluno"
  | "Responsável";

const rolePermissions: Record<RoleName, Permission[]> = {
  Admin: Object.values(Permissions),
  Direção: [
    Permissions.DASHBOARD_READ,
    Permissions.USERS_FORCE_LOGOUT,
    Permissions.NEWS_APPROVE,
    Permissions.NEWS_READ,
    Permissions.EVENTS_WRITE,
    Permissions.PAGES_WRITE,
    Permissions.BANNERS_WRITE,
    Permissions.CONFIG_WRITE,
    Permissions.DOCS_WRITE,
    Permissions.CONTACTS_READ,
    Permissions.REPORTS_READ
  ],
  Secretaria: [
    Permissions.DASHBOARD_READ,
    Permissions.DOCS_WRITE,
    Permissions.EVENTS_WRITE,
    Permissions.PAGES_WRITE,
    Permissions.BANNERS_WRITE,
    Permissions.CONFIG_WRITE,
    Permissions.CONTACTS_READ,
    Permissions.CONTACTS_WRITE
  ],
  Coordenação: [Permissions.DASHBOARD_READ, Permissions.NEWS_WRITE, Permissions.EVENTS_WRITE, Permissions.CONTACTS_READ],
  Comunicação: [Permissions.DASHBOARD_READ, Permissions.NEWS_WRITE, Permissions.NEWS_READ, Permissions.MEDIA_WRITE, Permissions.VIDEOS_WRITE],
  Docente: [Permissions.DASHBOARD_READ, Permissions.NEWS_READ],
  Aluno: [Permissions.DASHBOARD_READ, Permissions.NEWS_READ],
  Responsável: [Permissions.DASHBOARD_READ, Permissions.NEWS_READ]
};

export function getPermissionsForRoles(userRoles: RoleName[]) {
  return userRoles.flatMap((role) => rolePermissions[role] ?? []);
}

export function hasRole(userRoles: RoleName[], role: RoleName) {
  return userRoles.includes(role);
}

export function can(userRoles: RoleName[], permission: Permission, userPermissions: Permission[] = [], superAdmin = false) {
  if (superAdmin) return true;

  // Se houver permissões manuais salvas para o usuário, elas passam a ser autoritativas.
  // Sem permissões manuais, usamos as permissões herdadas dos perfis.
  if (userPermissions.length > 0) {
    return userPermissions.includes(permission);
  }

  return userRoles.some((role) => rolePermissions[role]?.includes(permission));
}
