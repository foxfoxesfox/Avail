import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "./auth.ts";

test("safeNext keeps same-site paths only", () => {
  assert.equal(safeNext("/s/abc123"), "/s/abc123");
  assert.equal(safeNext("/s/abc/manage"), "/s/abc/manage");
  for (const bad of [null, "", "//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)", "/s/../x", "/a?b=c"]) {
    assert.equal(safeNext(bad), "/", String(bad));
  }
});
