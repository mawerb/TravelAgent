async function tryAuth(
  label: string,
  accountSid: string,
  user: string,
  pass: string,
  from: string,
  to: string,
) {
  const auth = Buffer.from(`${user}:${pass}`).toString("base64");
  const params = new URLSearchParams({
    To: to,
    From: from,
    Body: `[Expense Agent] Twilio ${label} check`,
  });
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
  const data = (await res.json()) as {
    sid?: string;
    message?: string;
    code?: number;
  };
  console.log(
    JSON.stringify({
      label,
      status: res.status,
      ok: res.ok,
      sid: data.sid ? `${String(data.sid).slice(0, 2)}…` : undefined,
      error: data.message || data.code || undefined,
    }),
  );
  return res.ok;
}

async function main() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN || "";
  const apiKey = process.env.TWILIO_API_KEY_SID || "";
  const apiSecret = process.env.TWILIO_API_KEY_SECRET || "";
  const from = process.env.TWILIO_FROM_NUMBER || "";
  const to = process.env.DEMO_SMS_TO || "";

  console.log({
    account: accountSid.slice(0, 2),
    tokenLen: authToken.length,
    apiKey: apiKey.slice(0, 2),
    secretLen: apiSecret.length,
    from: from.slice(0, 2),
    to: to ? `${to.slice(0, 2)}…${to.slice(-4)}` : null,
  });

  let ok = false;
  if (accountSid.startsWith("AC") && authToken) {
    ok =
      (await tryAuth(
        "classic-AC+token",
        accountSid,
        accountSid,
        authToken,
        from,
        to,
      )) || ok;
  }
  if (accountSid.startsWith("AC") && apiKey.startsWith("SK") && apiSecret) {
    ok =
      (await tryAuth(
        "apikey-SK+secret",
        accountSid,
        apiKey,
        apiSecret,
        from,
        to,
      )) || ok;
  }
  process.exit(ok ? 0 : 1);
}

main();
