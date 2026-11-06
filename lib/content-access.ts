import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { can } from "./rbac";
import type { Permission } from "./permissions";

export async function hasContentPermission(...permissions: Permission[]) {
  const session = await getServerSession(authOptions);
  if (!session || session.invalidated || !session.user?.id) return false;
  return permissions.some((permission) => can((session.user.roles ?? []) as Parameters<typeof can>[0], permission, (session.user.permissions ?? []) as Permission[], session.user.superAdmin));
}

export const contentHeaders = { "Cache-Control": "private, no-store" };
