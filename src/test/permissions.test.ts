import { describe, expect, it } from "vitest";
import { hasPermission } from "@/auth/permissions";

describe("permissions", () => {
  it("allows admin to view financial page", () => {
    expect(hasPermission("admin", "view_financial")).toBe(true);
  });

  it("blocks attendant from viewing financial page", () => {
    expect(hasPermission("attendant", "view_financial")).toBe(false);
  });
});
