import { describe, expect, it } from "vitest";
import { formatCurrencyBRL, formatDurationMinutes } from "@/lib/format";

describe("format helpers", () => {
  it("formats BRL currency", () => {
    expect(formatCurrencyBRL(4850)).toContain("4.850");
  });

  it("formats duration in minutes", () => {
    expect(formatDurationMinutes(156)).toBe("2h 36min");
  });
});
