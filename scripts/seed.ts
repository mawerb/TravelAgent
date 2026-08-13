import { seedDemoData } from "../src/lib/db/seed";

async function main() {
  const result = await seedDemoData();
  console.log("Seed complete:", result);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
