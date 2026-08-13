import type { Employee, Organization } from "@/types";

export const ORG_ACME_ID = "org_acme";
export const EMP_ALEX_ID = "emp_alex";
export const VENUE_MDB_LOCAL_VEGAS = "venue_mdb_local_vegas";
export const CANDIDATE_VEGAS_HERO = "candidate_vegas_hero";
export const POLICY_ACME_ID = "policy_acme_2026";
export const LEDGER_ACME_ID = "ledger_acme";

export const DEMO_ORG: Organization = {
  _id: ORG_ACME_ID,
  name: "Acme Technologies",
  paymentMethod: {
    brand: "visa",
    last4: "4242",
    label: "Acme Corporate Travel",
    testMode: true,
  },
};

export const DEMO_EMPLOYEE: Employee = {
  _id: EMP_ALEX_ID,
  organizationId: ORG_ACME_ID,
  name: "Alex Morgan",
  title: "Senior Software Engineer",
  city: "San Francisco, CA",
  homeAirport: "SFO",
  email: "alex.morgan@acme.tech",
};

export function getDemoSession() {
  return {
    organization: DEMO_ORG,
    employee: DEMO_EMPLOYEE,
  };
}

export function greetingForNow(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
