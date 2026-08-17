const SUPER_ADMIN_EMAIL = "admin@egv.edu.br";

export function isProtectedSuperAdmin(user: { superAdmin?: boolean; email?: string | null }) {
  if (!user) return false;
  return Boolean(user.superAdmin) || (user.email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL;
}
