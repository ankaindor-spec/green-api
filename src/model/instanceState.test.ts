import { describe, expect, it } from "vitest";
import { describeInstanceState } from "./instanceState";

describe("describeInstanceState", () => {
  it("opens the chat only for authorized", () => {
    expect(describeInstanceState("authorized").allowed).toBe(true);
    expect(describeInstanceState("notAuthorized").allowed).toBe(false);
    expect(describeInstanceState("blocked").allowed).toBe(false);
    expect(describeInstanceState("suspended").message).toMatch(/временные ограничения/);
    expect(describeInstanceState("starting").message).toMatch(/5 минут/);
    expect(describeInstanceState("pendingPassword").message).toMatch(/парол/i);
    expect(describeInstanceState("notAuthorized").message).toMatch(/код/);
  });

  it("shows an unknown state as-is and says the chat is closed", () => {
    const message = describeInstanceState("yellow").message;
    expect(message).toContain("yellow");
    expect(message).toContain("Чат закрыт");
  });
});
