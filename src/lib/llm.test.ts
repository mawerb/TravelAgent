import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isVegasDemoQuery } from "./llm";

describe("llm parse routing", () => {
  it("only treats MongoDB.local / Vegas Sep 22 as the demo script", () => {
    assert.equal(
      isVegasDemoQuery(
        "I need to attend MongoDB.local in Las Vegas Sep 22–25. Keep me close to the venue and I prefer United.",
      ),
      true,
    );
    assert.equal(isVegasDemoQuery("I prefer United for a Chicago trip"), false);
    assert.equal(isVegasDemoQuery("Customer visit in Austin next week"), false);
    assert.equal(isVegasDemoQuery("Keep me close to the venue"), false);
  });
});
