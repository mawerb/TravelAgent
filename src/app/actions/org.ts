"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DEMO_ORG_COOKIE, isDemoOrgId } from "@/lib/demo-orgs";

export async function setDemoOrgAction(orgId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isDemoOrgId(orgId)) {
    return { ok: false, error: "Unknown organization" };
  }
  const jar = await cookies();
  jar.set(DEMO_ORG_COOKIE, orgId, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
