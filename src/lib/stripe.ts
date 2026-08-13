/**
 * Stripe TEST MODE adapters.
 * ponytail: If STRIPE_SECRET_KEY is unset, MockStripeAdapter mirrors the same
 * authorize → capture flow so the live demo never depends on credentials.
 * Upgrade path: set STRIPE_SECRET_KEY (sk_test_...) to use TestStripeAdapter.
 */

export type PaymentAuthResult = {
  paymentIntentId: string;
  status: "requires_capture";
  testMode: true;
};

export type PaymentCaptureResult = {
  paymentIntentId: string;
  status: "succeeded";
  testMode: true;
};

export interface StripeAdapter {
  authorize(input: {
    amountCents: number;
    bookingAttemptId: string;
    description: string;
  }): Promise<PaymentAuthResult>;
  capture(paymentIntentId: string): Promise<PaymentCaptureResult>;
  cancel(paymentIntentId: string): Promise<void>;
}

export class MockStripeAdapter implements StripeAdapter {
  async authorize(input: {
    amountCents: number;
    bookingAttemptId: string;
    description: string;
  }): Promise<PaymentAuthResult> {
    void input.amountCents;
    void input.description;
    return {
      paymentIntentId: `pi_test_mock_${input.bookingAttemptId}`,
      status: "requires_capture",
      testMode: true,
    };
  }

  async capture(paymentIntentId: string): Promise<PaymentCaptureResult> {
    return {
      paymentIntentId,
      status: "succeeded",
      testMode: true,
    };
  }

  async cancel(_paymentIntentId: string): Promise<void> {
    void _paymentIntentId;
  }
}

export class TestStripeAdapter implements StripeAdapter {
  constructor(private secretKey: string) {}

  async authorize(input: {
    amountCents: number;
    bookingAttemptId: string;
    description: string;
  }): Promise<PaymentAuthResult> {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(this.secretKey);
    const pi = await stripe.paymentIntents.create(
      {
        amount: input.amountCents,
        currency: "usd",
        capture_method: "manual",
        payment_method: "pm_card_visa",
        confirm: true,
        description: input.description,
        metadata: { bookingAttemptId: input.bookingAttemptId },
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: "never",
        },
      },
      { idempotencyKey: `auth_${input.bookingAttemptId}` },
    );
    return {
      paymentIntentId: pi.id,
      status: "requires_capture",
      testMode: true,
    };
  }

  async capture(paymentIntentId: string): Promise<PaymentCaptureResult> {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(this.secretKey);
    const pi = await stripe.paymentIntents.capture(paymentIntentId);
    return {
      paymentIntentId: pi.id,
      status: "succeeded",
      testMode: true,
    };
  }

  async cancel(paymentIntentId: string): Promise<void> {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(this.secretKey);
    await stripe.paymentIntents.cancel(paymentIntentId);
  }
}

export function getStripeAdapter(): StripeAdapter {
  const key = process.env.STRIPE_SECRET_KEY;
  if (key?.startsWith("sk_test_")) {
    return new TestStripeAdapter(key);
  }
  return new MockStripeAdapter();
}
