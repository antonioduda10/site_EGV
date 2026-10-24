import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }
  if (session.invalidated || !session.user?.id) {
    if (session.invalidatedReason === "idle") redirect("/login?reason=session-expired");
    redirect("/login?reason=session-invalidated");
  }
  return session;
}
