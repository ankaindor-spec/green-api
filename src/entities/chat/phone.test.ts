import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("strips spaces, dashes, parentheses, and one leading plus", () => {
    expect(normalizePhone(" +7 (999) 123-45-67 ")).toBe("79991234567");
    expect(normalizePhone("8-999-123-45-67")).toBe("89991234567");
    expect(normalizePhone("+79991234567")).toBe("79991234567");
  });

  it("accepts 8 to 15 digits and rejects everything else", () => {
    expect(normalizePhone("12345678")).toBe("12345678");
    expect(normalizePhone("123456789012345")).toBe("123456789012345");
    expect(normalizePhone("1234567")).toBeNull();
    expect(normalizePhone("1234567890123456")).toBeNull();
    expect(normalizePhone("7999a1234567")).toBeNull();
    expect(normalizePhone("++79991234567")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("079991234567")).toBeNull();
    expect(normalizePhone("+079991234567")).toBeNull();
  });
});
