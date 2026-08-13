import type { Collection, Db, Document } from "mongodb";

/** String `_id` collections — demo uses stable string primary keys. */
export function col<T extends Document & { _id: string }>(
  db: Db,
  name: string,
): Collection<T> {
  return db.collection(name) as unknown as Collection<T>;
}
