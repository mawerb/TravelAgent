import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MockStripeAdapter } from "./stripe";

describe("stripe mock adapter", () => {
  it("authorizes then captures in test mode", async () => {
    const stripe = new MockStripeAdapter();
    const auth = await stripe.authorize({
      amountCents: 108400,
      bookingAttemptId: "ba_test",
      description: "test",
    });
    assert.equal(auth.testMode, true);
    assert.equal(auth.status, "requires_capture");
    const cap = await stripe.capture(auth.paymentIntentId);
    assert.equal(cap.status, "succeeded");
  });
});
