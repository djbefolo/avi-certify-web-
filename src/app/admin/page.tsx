import { SuperAdminOperationsOS } from "@/components/admin/super-admin-operations-os";
import { verifyAdminGuardValue } from "@/lib/admin/admin-session-guard";
import { resolveAdminActorFromDecodedToken } from "@/lib/admin/admin-auth";
import type { AdminActor } from "@/lib/admin/admin-auth";
import { getAdminAuth } from "@/lib/firebase/admin";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function requireValidAdminPageSession(): Promise<AdminActor> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("avi_admin_session")?.value;
  const guardCookie = cookieStore.get("avi_admin_guard")?.value;
  const guard = await verifyAdminGuardValue(guardCookie);

  if (!sessionCookie || !guard) {
    redirect("/admin/login?next=/admin");
  }

  try {
    const decodedSession = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    const actor = await resolveAdminActorFromDecodedToken(decodedSession, "firebase-session");

    if (actor.uid !== guard.uid) {
      redirect("/admin/login?next=/admin");
    }

    return actor;
  } catch {
    redirect("/admin/login?next=/admin");
  }
}

export default async function AdminOperationsPage() {
  const actor = await requireValidAdminPageSession();

  return <SuperAdminOperationsOS adminRole={actor.role} adminEmail={actor.email} />;
}
