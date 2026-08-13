import { cookies } from "next/headers";
import type { Employee, Organization } from "@/types";
import {
  DEFAULT_DEMO_ORG_ID,
  DEMO_ORG_COOKIE,
  DEMO_ORGS,
  getDemoOrgDef,
  isDemoOrgId,
  ORG_MONGODB_ID,
  type DemoOrgDefinition,
} from "@/lib/demo-orgs";

/** @deprecated Prefer getActiveOrgId() — kept for seed/legacy Acme paths */
export const ORG_ACME_ID = ORG_MONGODB_ID;
export const EMP_ALEX_ID = "emp_mdb_alex";
export const VENUE_MDB_LOCAL_VEGAS = "venue_mdb_local_vegas";
export const CANDIDATE_VEGAS_HERO = "candidate_vegas_hero";
export const POLICY_ACME_ID = "policy_mongodb_2026";
export const LEDGER_ACME_ID = "ledger_mongodb";

export const DEMO_ORG: Organization = getDemoOrgDef(ORG_MONGODB_ID).organization;
export const DEMO_EMPLOYEE: Employee = getDemoOrgDef(ORG_MONGODB_ID).employee;

export async function getActiveOrgId(): Promise<string> {
  const jar = await cookies();
  const raw = jar.get(DEMO_ORG_COOKIE)?.value;
  if (raw && isDemoOrgId(raw)) return raw;
  return DEFAULT_DEMO_ORG_ID;
}

export async function getActiveDemoOrg(): Promise<DemoOrgDefinition> {
  return getDemoOrgDef(await getActiveOrgId());
}

export async function getDemoSession() {
  const def = await getActiveDemoOrg();
  return {
    organization: def.organization,
    employee: def.employee,
    policyId: def.policy._id,
    ledgerId: def.ledgerId,
    blurb: def.blurb,
  };
}

export function listDemoOrgs() {
  return DEMO_ORGS.map((o) => ({
    id: o.organization._id,
    name: o.organization.name,
    blurb: o.blurb,
  }));
}

export function greetingForNow(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
