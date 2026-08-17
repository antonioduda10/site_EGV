import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { can } from "./rbac";
import type { Permission } from "./permissions";

export async function requirePermission(permission: Permission) {
  const session = await getServerSession(authOptions);
  if (!session || session.invalidated || !session.user?.id) {
    return { allowed: false, session: null } as const;
  }
  const roles = session.user.roles as string[];
  const permissions = session.user.permissions as Permission[];
  const superAdmin = session.user.superAdmin as boolean;
  const allowed = can(roles as never, permission, permissions, superAdmin);
  return { allowed, session } as const;
}
