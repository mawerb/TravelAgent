import { MongoClient, Db } from "mongodb";

const dbName = process.env.MONGODB_DB || "travel_agent";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _memoryMongoUri: string | undefined;
}

async function resolveUri(): Promise<string> {
  const configured = process.env.MONGODB_URI;
  if (configured) {
    try {
      const probe = new MongoClient(configured, {
        serverSelectionTimeoutMS: 1500,
      });
      await probe.connect();
      await probe.db("admin").command({ ping: 1 });
      await probe.close();
      return configured;
    } catch {
      if (process.env.DEMO_MODE !== "true") {
        throw new Error(
          `Cannot connect to MONGODB_URI (${configured}). Start MongoDB or set DEMO_MODE=true for the in-process demo server.`,
        );
      }
      // fall through to memory server
    }
  } else if (process.env.DEMO_MODE !== "true") {
    throw new Error(
      "MONGODB_URI is required. Set it in .env.local (this is a MongoDB sprint demo).",
    );
  }

  if (global._memoryMongoUri) return global._memoryMongoUri;

  // ponytail: Homebrew/Docker Mongo unavailable in this environment.
  // Ceiling: data is ephemeral per Node process. Upgrade path: real Atlas/local mongod via MONGODB_URI.
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const mongod = await MongoMemoryServer.create();
  global._memoryMongoUri = mongod.getUri();
  console.info(
    "[demo] Using MongoMemoryServer at",
    global._memoryMongoUri,
  );
  return global._memoryMongoUri;
}

async function getClientPromise(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = (async () => {
        const uri = await resolveUri();
        const client = new MongoClient(uri);
        return client.connect();
      })();
    }
    return global._mongoClientPromise;
  }
  const uri = await resolveUri();
  const client = new MongoClient(uri);
  return client.connect();
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(dbName);
}

export async function getClient(): Promise<MongoClient> {
  return getClientPromise();
}
