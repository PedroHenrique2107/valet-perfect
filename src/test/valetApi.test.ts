import { describe, expect, it } from "vitest";
import { valetApi } from "@/services/valetApi";

describe("valetApi", () => {
  it("returns an array from the Supabase service layer", async () => {
    const vehicles = await valetApi.getVehicles();
    expect(Array.isArray(vehicles)).toBe(true);
  });
});
