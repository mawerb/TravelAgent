import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bookingConfirmationSms,
  feedbackRequestSms,
  resolveSmsTo,
} from "./twilio";

describe("sms copy", () => {
  it("builds booking confirmation", () => {
    const body = bookingConfirmationSms({
      name: "Alex Morgan",
      route: "SFO → LAS",
      dates: "2026-09-22 → 2026-09-25",
      hotel: "Hilton",
      airline: "United",
      confirmation: "UA7X92L",
      tripUrl: "http://localhost:3000/trips/book_1",
      totalLabel: "$1,084",
    });
    assert.match(body, /you're booked, Alex/);
    assert.match(body, /UA7X92L/);
  });

  it("builds feedback request", () => {
    const body = feedbackRequestSms({
      name: "Jordan Lee",
      route: "LGB → LAS",
      feedbackUrl: "http://localhost:3000/trips/book_1#feedback",
    });
    assert.match(body, /how was LGB → LAS/);
    assert.match(body, /#feedback/);
  });

  it("DEMO_SMS_TO overrides employee phone", () => {
    const prev = process.env.DEMO_SMS_TO;
    process.env.DEMO_SMS_TO = "+15551234567";
    assert.equal(resolveSmsTo("+19999999999"), "+15551234567");
    if (prev === undefined) delete process.env.DEMO_SMS_TO;
    else process.env.DEMO_SMS_TO = prev;
  });

  it("rejects SK value stuffed into TWILIO_ACCOUNT_SID", async () => {
    const prev = {
      sid: process.env.TWILIO_ACCOUNT_SID,
      token: process.env.TWILIO_AUTH_TOKEN,
      from: process.env.TWILIO_FROM_NUMBER,
      api: process.env.TWILIO_API_KEY_SID,
      secret: process.env.TWILIO_API_KEY_SECRET,
    };
    process.env.TWILIO_ACCOUNT_SID = "SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    process.env.TWILIO_AUTH_TOKEN = "deadbeef";
    process.env.TWILIO_FROM_NUMBER = "+15551234567";
    delete process.env.TWILIO_API_KEY_SID;
    delete process.env.TWILIO_API_KEY_SECRET;
    const { sendSms } = await import("./twilio");
    const result = await sendSms({ to: "+15557654321", body: "hi" });
    assert.equal(result.ok, false);
    assert.match(result.error ?? "", /Account SID \(AC/);
    if (prev.sid === undefined) delete process.env.TWILIO_ACCOUNT_SID;
    else process.env.TWILIO_ACCOUNT_SID = prev.sid;
    if (prev.token === undefined) delete process.env.TWILIO_AUTH_TOKEN;
    else process.env.TWILIO_AUTH_TOKEN = prev.token;
    if (prev.from === undefined) delete process.env.TWILIO_FROM_NUMBER;
    else process.env.TWILIO_FROM_NUMBER = prev.from;
    if (prev.api === undefined) delete process.env.TWILIO_API_KEY_SID;
    else process.env.TWILIO_API_KEY_SID = prev.api;
    if (prev.secret === undefined) delete process.env.TWILIO_API_KEY_SECRET;
    else process.env.TWILIO_API_KEY_SECRET = prev.secret;
  });
});
