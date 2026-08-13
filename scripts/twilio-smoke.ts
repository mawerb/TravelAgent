import {
  sendSms,
  resolveSmsTo,
  feedbackRequestSms,
  appBaseUrl,
} from "../src/lib/sms/twilio";

async function main() {
  const sid = process.env.TWILIO_ACCOUNT_SID || "";
  const from = process.env.TWILIO_FROM_NUMBER || "";
  const to = resolveSmsTo("+15555550100");

  console.log(
    "sid_kind",
    sid.startsWith("AC")
      ? "AccountSid(AC)"
      : sid.startsWith("SK")
        ? "ApiKey(SK)"
        : `other(${sid.slice(0, 2)})`,
  );
  console.log("from_present", Boolean(from));
  console.log("to", to ? `${to.slice(0, 2)}…${to.slice(-4)}` : null);

  if (!to) {
    console.log(JSON.stringify({ ok: false, error: "No DEMO_SMS_TO / phone" }));
    process.exit(1);
  }

  const booking = await sendSms({
    to,
    purpose: "booking",
    body: [
      "Expense Agent booking confirmation test",
      `${appBaseUrl()}/trips/test`,
    ].join("\n"),
  });

  const feedback = await sendSms({
    to,
    purpose: "feedback",
    body: feedbackRequestSms({
      name: "Alex Morgan",
      route: "SFO → LAS",
      feedbackUrl: `${appBaseUrl()}/trips/test#feedback`,
    }),
  });

  console.log(
    JSON.stringify(
      {
        booking: {
          ok: booking.ok,
          demo: booking.demo,
          trialTemplate: booking.usedTrialTemplate,
          sid: booking.sid ? `${booking.sid.slice(0, 2)}…` : undefined,
          error: booking.error,
        },
        feedback: {
          ok: feedback.ok,
          demo: feedback.demo,
          trialTemplate: feedback.usedTrialTemplate,
          sid: feedback.sid ? `${feedback.sid.slice(0, 2)}…` : undefined,
          error: feedback.error,
        },
      },
      null,
      2,
    ),
  );
  process.exit(booking.ok && feedback.ok ? 0 : 1);
}

main();
