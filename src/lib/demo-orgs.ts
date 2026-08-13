import type { Employee, Organization, TravelPolicy } from "@/types";
import { dollarsToCents } from "@/lib/money";
import { POLICY_PDF_PATH } from "@/lib/links";

export const DEMO_ORG_COOKIE = "demo_org_id";

export const ORG_SASE_ID = "org_sase_csulb";
export const ORG_KLOOB_ID = "org_kloob";
export const ORG_MONGODB_ID = "org_mongodb";
export const ORG_UNICEF_ID = "org_unicef";
export const ORG_USGOV_ID = "org_usgov";

export type DemoOrgDefinition = {
  organization: Organization;
  employee: Employee;
  policy: TravelPolicy;
  ledgerId: string;
  /** Short label for the switcher */
  blurb: string;
  /** One-screen narrative of how this org travels */
  policyTrope: string;
  manager: { name: string; title: string };
};

function payment(
  last4: Organization["paymentMethod"]["last4"],
  label: string,
): Organization["paymentMethod"] {
  return { brand: "visa", last4, label, testMode: true };
}

function nowIso() {
  return "2026-01-15T00:00:00.000Z";
}

/** Five demo organizations with intentionally different travel policies. */
export const DEMO_ORGS: DemoOrgDefinition[] = [
  {
    blurb: "Student chapter · CSULB — tight budgets",
    policyTrope:
      "Student-chapter money: economy on almost every hop, ~$110–$130 nights, and anything splashy goes to the chapter advisor before it books.",
    manager: { name: "Priya Nair", title: "Chapter Advisor" },
    organization: {
      _id: ORG_SASE_ID,
      name: "SASE CSULB",
      paymentMethod: payment("1111", "SASE CSULB Chapter Card"),
    },
    employee: {
      _id: "emp_sase_jordan",
      organizationId: ORG_SASE_ID,
      name: "Jordan Lee",
      title: "Chapter Treasurer",
      city: "Long Beach, CA",
      homeAirport: "LGB",
      email: "jordan.lee@sase.csulb.edu",
      phone: "+15551001001",
    },
    ledgerId: "ledger_sase",
    policy: {
      _id: "policy_sase_2026",
      organizationId: ORG_SASE_ID,
      status: "active",
      source: "SASE_CSULB_Travel_Guidelines_2026.pdf",
      sourceUrl: POLICY_PDF_PATH,
      rules: {
        flights: {
          economyUnderHours: 12,
          premiumEconomyOverHours: 12,
          businessRequiresVpApproval: true,
          preferredAirlines: ["Southwest", "Alaska"],
          refundableRequired: false,
        },
        hotels: {
          standardMaxCents: dollarsToCents(120),
          cityCapsCents: {
            seattle: dollarsToCents(120),
            "las vegas": dollarsToCents(110),
            "long beach": dollarsToCents(100),
            "los angeles": dollarsToCents(130),
          },
          conferenceExceedPercent: 5,
          conferenceRadiusMiles: 3,
        },
        transportation: {
          ridesharePermitted: true,
          rentalRequiresJustification: true,
        },
        approval: {
          managerApprovalAboveCents: dollarsToCents(800),
          outOfPolicyRequiresJustification: true,
        },
      },
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  },
  {
    blurb: "Startup · lean travel, flexible radius",
    policyTrope:
      "Startup lean: United/JetBlue preferred, lodging around $220–$300, flexible venue radius, founders only step in above $2,000.",
    manager: { name: "Mia Chen", title: "CEO" },
    organization: {
      _id: ORG_KLOOB_ID,
      name: "Kloob",
      paymentMethod: payment("2222", "Kloob Operating"),
    },
    employee: {
      _id: "emp_kloob_sam",
      organizationId: ORG_KLOOB_ID,
      name: "Sam Okonkwo",
      title: "Founding Engineer",
      city: "San Francisco, CA",
      homeAirport: "SFO",
      email: "sam@kloob.com",
      phone: "+15551001002",
    },
    ledgerId: "ledger_kloob",
    policy: {
      _id: "policy_kloob_2026",
      organizationId: ORG_KLOOB_ID,
      status: "active",
      source: "Kloob_Travel_Policy_2026.pdf",
      sourceUrl: POLICY_PDF_PATH,
      rules: {
        flights: {
          economyUnderHours: 5,
          premiumEconomyOverHours: 5,
          businessRequiresVpApproval: true,
          preferredAirlines: ["United", "JetBlue"],
          refundableRequired: false,
        },
        hotels: {
          standardMaxCents: dollarsToCents(220),
          cityCapsCents: {
            "san francisco": dollarsToCents(280),
            "new york": dollarsToCents(300),
            "las vegas": dollarsToCents(240),
            seattle: dollarsToCents(230),
          },
          conferenceExceedPercent: 20,
          conferenceRadiusMiles: 2,
        },
        transportation: {
          ridesharePermitted: true,
          rentalRequiresJustification: false,
        },
        approval: {
          managerApprovalAboveCents: dollarsToCents(2000),
          outOfPolicyRequiresJustification: true,
        },
      },
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  },
  {
    blurb: "Enterprise tech · conference-aware",
    policyTrope:
      "Enterprise conference playbook: stay within 1 mile of the venue, United/Delta preferred, 15% hotel bump for events, manager above $2,500.",
    manager: { name: "Chris Delgado", title: "Engineering Manager" },
    organization: {
      _id: ORG_MONGODB_ID,
      name: "MongoDB",
      paymentMethod: payment("4242", "MongoDB Corporate Travel"),
    },
    employee: {
      _id: "emp_mdb_alex",
      organizationId: ORG_MONGODB_ID,
      name: "Alex Morgan",
      title: "Senior Software Engineer",
      city: "San Francisco, CA",
      homeAirport: "SFO",
      email: "alex.morgan@mongodb.com",
      phone: "+15551001003",
    },
    ledgerId: "ledger_mongodb",
    policy: {
      _id: "policy_mongodb_2026",
      organizationId: ORG_MONGODB_ID,
      status: "active",
      source: "MongoDB_Travel_Policy_2026.pdf",
      sourceUrl: POLICY_PDF_PATH,
      rules: {
        flights: {
          economyUnderHours: 6,
          premiumEconomyOverHours: 6,
          businessRequiresVpApproval: true,
          preferredAirlines: ["United", "Delta"],
          refundableRequired: false,
        },
        hotels: {
          standardMaxCents: dollarsToCents(250),
          cityCapsCents: {
            "san francisco": dollarsToCents(250),
            "new york": dollarsToCents(350),
            "las vegas": dollarsToCents(300),
            seattle: dollarsToCents(260),
          },
          conferenceExceedPercent: 15,
          conferenceRadiusMiles: 1,
        },
        transportation: {
          ridesharePermitted: true,
          rentalRequiresJustification: true,
        },
        approval: {
          managerApprovalAboveCents: dollarsToCents(2500),
          outOfPolicyRequiresJustification: true,
        },
      },
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  },
  {
    blurb: "UN body · economy-first, modest lodging",
    policyTrope:
      "Duty travel: refundable economy preferred under 8 hours, modest lodging (~$170–$220), programme chief signs off above $1,500.",
    manager: { name: "Elena Vargas", title: "Chief of Programme" },
    organization: {
      _id: ORG_UNICEF_ID,
      name: "UNICEF",
      paymentMethod: payment("3333", "UNICEF Duty Travel"),
    },
    employee: {
      _id: "emp_unicef_amira",
      organizationId: ORG_UNICEF_ID,
      name: "Amira Hassan",
      title: "Programme Specialist",
      city: "New York, NY",
      homeAirport: "JFK",
      email: "amira.hassan@unicef.org",
      phone: "+15551001004",
    },
    ledgerId: "ledger_unicef",
    policy: {
      _id: "policy_unicef_2026",
      organizationId: ORG_UNICEF_ID,
      status: "active",
      source: "UNICEF_Duty_Travel_Policy_2026.pdf",
      sourceUrl: POLICY_PDF_PATH,
      rules: {
        flights: {
          economyUnderHours: 8,
          premiumEconomyOverHours: 8,
          businessRequiresVpApproval: true,
          preferredAirlines: ["United", "Air France", "Lufthansa"],
          refundableRequired: true,
        },
        hotels: {
          standardMaxCents: dollarsToCents(180),
          cityCapsCents: {
            "new york": dollarsToCents(220),
            geneva: dollarsToCents(210),
            "las vegas": dollarsToCents(170),
            seattle: dollarsToCents(180),
          },
          conferenceExceedPercent: 10,
          conferenceRadiusMiles: 2,
        },
        transportation: {
          ridesharePermitted: true,
          rentalRequiresJustification: true,
        },
        approval: {
          managerApprovalAboveCents: dollarsToCents(1500),
          outOfPolicyRequiresJustification: true,
        },
      },
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  },
  {
    blurb: "US Government · GSA-style caps, strict cabin",
    policyTrope:
      "GSA-style CONUS: coach under 14 hours, city lodging caps with no conference bump, SmartPay only, authorizing official above $1,000.",
    manager: { name: "Capt. Dana Ruiz", title: "Authorizing Official" },
    organization: {
      _id: ORG_USGOV_ID,
      name: "US Government",
      paymentMethod: payment("5555", "GSA SmartPay Travel"),
    },
    employee: {
      _id: "emp_usgov_taylor",
      organizationId: ORG_USGOV_ID,
      name: "Taylor Brooks",
      title: "Program Analyst",
      city: "Washington, DC",
      homeAirport: "DCA",
      email: "taylor.brooks@agency.gov",
      phone: "+15551001005",
    },
    ledgerId: "ledger_usgov",
    policy: {
      _id: "policy_usgov_2026",
      organizationId: ORG_USGOV_ID,
      status: "active",
      source: "GSA_FTR_Travel_Policy_2026.pdf",
      sourceUrl: POLICY_PDF_PATH,
      rules: {
        flights: {
          economyUnderHours: 14,
          premiumEconomyOverHours: 14,
          businessRequiresVpApproval: true,
          preferredAirlines: ["United", "American", "Delta"],
          refundableRequired: false,
        },
        hotels: {
          // Rough CONUS per-diem style caps for the demo
          standardMaxCents: dollarsToCents(166),
          cityCapsCents: {
            "washington": dollarsToCents(258),
            "new york": dollarsToCents(340),
            "san francisco": dollarsToCents(310),
            "las vegas": dollarsToCents(160),
            seattle: dollarsToCents(230),
          },
          conferenceExceedPercent: 0,
          conferenceRadiusMiles: 5,
        },
        transportation: {
          ridesharePermitted: true,
          rentalRequiresJustification: true,
        },
        approval: {
          managerApprovalAboveCents: dollarsToCents(1000),
          outOfPolicyRequiresJustification: true,
        },
      },
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  },
];

export const DEFAULT_DEMO_ORG_ID = ORG_MONGODB_ID;

export function getDemoOrgDef(orgId: string | undefined | null): DemoOrgDefinition {
  return (
    DEMO_ORGS.find((o) => o.organization._id === orgId) ??
    DEMO_ORGS.find((o) => o.organization._id === DEFAULT_DEMO_ORG_ID)!
  );
}

export function isDemoOrgId(orgId: string): boolean {
  return DEMO_ORGS.some((o) => o.organization._id === orgId);
}
