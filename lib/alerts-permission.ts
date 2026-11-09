import { Permissions } from "./permissions";

type PermissionStore = {
  usuarioPermissao: {
    findMany(args: {
      where: { permissao: { in: string[] } };
      select: { usuarioId: true; permissao: true };
    }): Promise<{ usuarioId: string; permissao: string }[]>;
    createMany(args: {
      data: { usuarioId: string; permissao: string }[];
      skipDuplicates: true;
    }): Promise<{ count: number }>;
  };
};

export async function legacyAlertPermissionPlan(
  db: Pick<PermissionStore, "usuarioPermissao">,
) {
  const rows = await db.usuarioPermissao.findMany({
    where: {
      permissao: { in: [Permissions.CONFIG_WRITE, Permissions.ALERTS_WRITE] },
    },
    select: { usuarioId: true, permissao: true },
  });
  const alreadyGranted = new Set(
    rows
      .filter((row) => row.permissao === Permissions.ALERTS_WRITE)
      .map((row) => row.usuarioId),
  );
  return [
    ...new Set(
      rows
        .filter(
          (row) =>
            row.permissao === Permissions.CONFIG_WRITE &&
            !alreadyGranted.has(row.usuarioId),
        )
        .map((row) => row.usuarioId),
    ),
  ];
}

export async function grantLegacyAlertPermissions(db: PermissionStore) {
  const userIds = await legacyAlertPermissionPlan(db);
  if (!userIds.length) return { count: 0 };
  // Only explicit grants are extended: inserting into a role-only user's list would override their inherited permissions.
  return db.usuarioPermissao.createMany({
    data: userIds.map((usuarioId) => ({
      usuarioId,
      permissao: Permissions.ALERTS_WRITE,
    })),
    skipDuplicates: true,
  });
}
