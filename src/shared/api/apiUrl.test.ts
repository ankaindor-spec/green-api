import { describe, expect, it } from "vitest";
import { resolveApiUrl } from "./apiUrl";

describe("resolveApiUrl", () => {
  it("builds the host from the first four digits of idInstance", () => {
    expect(resolveApiUrl("4100000000", "")).toBe("https://4100.api.green-api.com");
    expect(resolveApiUrl("4100000000", "   ")).toBe("https://4100.api.green-api.com");
    expect(resolveApiUrl("1100123456", "")).toBe("https://1100.api.green-api.com");
  });

  it("uses an explicit https URL as origin plus path without a trailing slash", () => {
    expect(resolveApiUrl("4100000000", "https://4100.api.green-api.com/")).toBe(
      "https://4100.api.green-api.com",
    );
    expect(resolveApiUrl("4100000000", "https://example.com/custom/path/")).toBe(
      "https://example.com/custom/path",
    );
    expect(
      resolveApiUrl("4100000000", "https://example.com/custom/path/?ignored=1#hash"),
    ).toBe("https://example.com/custom/path");
    expect(resolveApiUrl("4100000000", "http://127.0.0.1:8787/")).toBe("http://127.0.0.1:8787");
    expect(resolveApiUrl("4100000000", "http://localhost:8787")).toBe("http://localhost:8787");
    expect(() => resolveApiUrl("4100000000", "http://example.com")).toThrow(/https/);
  });
});
