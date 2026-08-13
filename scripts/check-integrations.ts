import { MongoClient } from "mongodb";
import Stripe from "stripe";

const results: Record<string, string> = {};

async function checkMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    results.mongodb = "MISSING MONGODB_URI";
    return;
  }
  if (uri.includes("<") || uri.includes("PASSWORD") || uri.includes("<db_password>")) {
    results.mongodb = "FAIL · URI still has a password placeholder";
    return;
  }
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const dbName = process.env.MONGODB_DB || "travel_agent";
    await client.db(dbName).command({ ping: 1 });
    const cols = await client.db(dbName).listCollections().toArray();
    results.mongodb = `OK · db=${dbName} · collections=${cols.length}`;
  } catch (e) {
    results.mongodb = `FAIL · ${e instanceof Error ? e.message : String(e)}`;
  } finally {
    await client.close().catch(() => undefined);
  }
}

async function checkStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    results.stripe = "MISSING STRIPE_SECRET_KEY";
    return;
  }
  if (!key.startsWith("sk_test_")) {
    results.stripe = "FAIL · key is not sk_test_ (TEST MODE required)";
    return;
  }
  try {
    const stripe = new Stripe(key);
    const bal = await stripe.balance.retrieve();
    results.stripe = `OK · TEST MODE · livemode=${bal.livemode === true}`;
  } catch (e) {
    results.stripe = `FAIL · ${e instanceof Error ? e.message : String(e)}`;
  }
}

async function checkOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  const base = process.env.OPENAI_BASE_URL;
  if (!key || !base) {
    results.openai = `MISSING · key=${Boolean(key)} base=${Boolean(base)}`;
    return;
  }
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/models`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) {
      results.openai = `OK · HTTP ${res.status}`;
    } else {
      const body = (await res.text()).slice(0, 160);
      results.openai = `FAIL · HTTP ${res.status} · ${body}`;
    }
  } catch (e) {
    results.openai = `FAIL · ${e instanceof Error ? e.message : String(e)}`;
  }
}

async function main() {
  await Promise.all([checkMongo(), checkStripe(), checkOpenAI()]);
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
