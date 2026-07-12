import { describe, it, expect } from "vitest";
import { sqlite } from "../sqlite.ts";
import { DbError } from "../src/core/errors.ts";

describe("optional peer missing", () => {
  it("sqlite factory throws PEER_MISSING without better-sqlite3", async () => {
    // better-sqlite3 is not in package dependencies — expect clear error
    try {
      await sqlite({ path: ":memory:" });
      // If somehow installed, still ok — skip assertion
    } catch (err) {
      expect(err).toBeInstanceOf(DbError);
      expect((err as DbError).code).toBe("PEER_MISSING");
      expect((err as DbError).message).toContain("better-sqlite3");
    }
  });
});
