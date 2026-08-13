async function main() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN || "";
  const from = process.env.TWILIO_FROM_NUMBER || "";
  const to = process.env.DEMO_SMS_TO || "";
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  async function send(label: string, fields: Record<string, string>) {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(fields),
      },
    );
    const data = (await res.json()) as Record<string, unknown>;
    console.log(
      JSON.stringify({
        label,
        status: res.status,
        code: data.code,
        message: data.message,
        sid: typeof data.sid === "string" ? `${data.sid.slice(0, 4)}…` : undefined,
      }),
    );
    return res.ok;
  }

  const templates = [
    "sms_order_confirmation",
    "sms_feedback_surveys",
    "sms_event_notifications",
    "sms_account_alerts",
  ];

  let ok = false;
  for (const body of templates) {
    ok =
      (await send(`${body}+from`, { To: to, From: from, Body: body })) || ok;
    if (ok) break;
  }
  if (!ok) {
    for (const body of templates) {
      ok = (await send(`${body}-nofrom`, { To: to, Body: body })) || ok;
      if (ok) break;
    }
  }
  process.exit(ok ? 0 : 1);
}

main();
