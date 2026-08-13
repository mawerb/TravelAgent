async function main() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN || "";
  const from = process.env.TWILIO_FROM_NUMBER || "";
  const to = process.env.DEMO_SMS_TO || "";
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  async function send(label: string, fields: Record<string, string>) {
    const params = new URLSearchParams(fields);
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      },
    );
    const data = (await res.json()) as Record<string, unknown>;
    console.log(
      JSON.stringify(
        {
          label,
          status: res.status,
          code: data.code,
          message: data.message,
          more: data.more_info,
          sid: typeof data.sid === "string" ? data.sid.slice(0, 4) + "…" : undefined,
        },
        null,
        2,
      ),
    );
    return res.ok;
  }

  const bodies = [
    "Hello from Expense Agent",
    "Your verification code is 123456",
  ];

  let ok = false;
  for (const body of bodies) {
    ok =
      (await send(`body:${body.slice(0, 24)}`, {
        To: to,
        From: from,
        Body: body,
      })) || ok;
  }

  // Messaging Service if configured
  const ms = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  if (ms) {
    ok =
      (await send("messaging-service", {
        To: to,
        MessagingServiceSid: ms,
        Body: "Hello from Expense Agent via Messaging Service",
      })) || ok;
  }

  process.exit(ok ? 0 : 1);
}

main();
