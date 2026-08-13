export type SmsResult = {
  ok: boolean;
  sid?: string;
  to: string;
  body: string;
  demo: boolean;
  error?: string;
  /** True when Body was a Twilio trial template name */
  usedTrialTemplate?: boolean;
};

export type SmsPurpose = "booking" | "feedback" | "generic";

/** Trial accounts must send these names as Body (not free text). */
export const TRIAL_SMS_TEMPLATES = {
  booking: "sms_order_confirmation",
  feedback: "sms_feedback_surveys",
  generic: "sms_event_notifications",
} as const;

type TwilioCreds = {
  accountSid: string;
  authUser: string;
  authPass: string;
  from: string;
};

function twilioCreds(): TwilioCreds | { error: string } | null {
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  if (!from) return null;

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() || "";
  const apiKeySid = process.env.TWILIO_API_KEY_SID?.trim() || "";
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET?.trim() || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() || "";

  if (!accountSid) return null;

  if (accountSid.startsWith("SK")) {
    return {
      error:
        "TWILIO_ACCOUNT_SID is an API Key (SK…). Put your Account SID (AC…) there, and either use TWILIO_AUTH_TOKEN (auth token) or set TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET.",
    };
  }

  if (!accountSid.startsWith("AC")) {
    return {
      error: "TWILIO_ACCOUNT_SID should start with AC (Account SID)",
    };
  }

  // Prefer classic Auth Token when present (most reliable for SMS).
  if (authToken && !authToken.startsWith("AC") && !authToken.startsWith("SK")) {
    return { accountSid, authUser: accountSid, authPass: authToken, from };
  }

  if (apiKeySid || apiKeySecret) {
    if (!apiKeySid.startsWith("SK") || !apiKeySecret) {
      return {
        error: "Set both TWILIO_API_KEY_SID (SK…) and TWILIO_API_KEY_SECRET",
      };
    }
    return { accountSid, authUser: apiKeySid, authPass: apiKeySecret, from };
  }

  if (!authToken) return null;

  return {
    error:
      "TWILIO_AUTH_TOKEN looks like a SID. Use the Auth Token from the Twilio console (or API key secret).",
  };
}

export function twilioConfigured() {
  const creds = twilioCreds();
  return Boolean(creds && !("error" in creds));
}

/** Prefer DEMO_SMS_TO so one real handset can demo every org. */
export function resolveSmsTo(employeePhone?: string | null): string | null {
  const override = process.env.DEMO_SMS_TO?.trim();
  if (override) return override;
  return employeePhone?.trim() || null;
}

export function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function forceTrialTemplates() {
  return /^(1|true|yes)$/i.test(process.env.TWILIO_TRIAL_TEMPLATES || "");
}

async function postTwilioMessage(
  creds: TwilioCreds,
  fields: Record<string, string>,
) {
  const auth = Buffer.from(`${creds.authUser}:${creds.authPass}`).toString(
    "base64",
  );
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(fields),
    },
  );
  const data = (await res.json()) as {
    sid?: string;
    message?: string;
    code?: number;
  };
  return { res, data };
}

export async function sendSms(input: {
  to: string;
  body: string;
  purpose?: SmsPurpose;
}): Promise<SmsResult> {
  const to = input.to.trim();
  const body = input.body.trim();
  const purpose = input.purpose ?? "generic";
  if (!to || !body) {
    return { ok: false, to, body, demo: true, error: "Missing to/body" };
  }

  const creds = twilioCreds();
  if (!creds) {
    console.info("[sms:demo]", { to, body, purpose });
    return { ok: true, to, body, demo: true, sid: `demo_${Date.now()}` };
  }
  if ("error" in creds) {
    return { ok: false, to, body, demo: false, error: creds.error };
  }

  const template = TRIAL_SMS_TEMPLATES[purpose];
  const attempts: Array<{ body: string; trial: boolean }> = forceTrialTemplates()
    ? [{ body: template, trial: true }]
    : [
        { body, trial: false },
        { body: template, trial: true },
      ];

  try {
    let lastError = "SMS failed";
    for (const attempt of attempts) {
      const { res, data } = await postTwilioMessage(creds, {
        To: to,
        From: creds.from,
        Body: attempt.body,
      });
      if (res.ok) {
        return {
          ok: true,
          to,
          body: attempt.body,
          demo: false,
          sid: data.sid,
          usedTrialTemplate: attempt.trial,
        };
      }
      lastError = data.message ?? `Twilio ${res.status}`;
      // 572006 = trial requires predefined template names as Body
      if (data.code === 572006 && !attempt.trial) continue;
      break;
    }
    return { ok: false, to, body, demo: false, error: lastError };
  } catch (err) {
    return {
      ok: false,
      to,
      body,
      demo: false,
      error: err instanceof Error ? err.message : "SMS failed",
    };
  }
}

export function bookingConfirmationSms(input: {
  name: string;
  route: string;
  dates: string;
  hotel: string;
  airline: string;
  confirmation?: string;
  tripUrl: string;
  totalLabel: string;
}) {
  return [
    `Expense Agent: you're booked, ${input.name.split(" ")[0]}.`,
    `${input.route} · ${input.dates}`,
    `${input.airline}${input.confirmation ? ` ${input.confirmation}` : ""} · ${input.hotel}`,
    `Total ${input.totalLabel}`,
    `Trip: ${input.tripUrl}`,
  ].join("\n");
}

export function feedbackRequestSms(input: {
  name: string;
  route: string;
  feedbackUrl: string;
}) {
  return [
    `Expense Agent: how was ${input.route}, ${input.name.split(" ")[0]}?`,
    `Rate flight/hotel and tell us if policy got in the way:`,
    input.feedbackUrl,
    `(Your answers update your travel profile + may suggest policy tweaks for your manager.)`,
  ].join("\n");
}
