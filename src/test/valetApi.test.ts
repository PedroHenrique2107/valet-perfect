import { describe, expect, it } from "vitest";
import { valetApi } from "@/services/valetApi";

describe("valetApi", () => {
  it("returns vehicles from fake backend", async () => {
    const vehicles = await valetApi.getVehicles();
    expect(vehicles.length).toBeGreaterThan(0);
    expect(vehicles[0]).toHaveProperty("plate");
  });
});
