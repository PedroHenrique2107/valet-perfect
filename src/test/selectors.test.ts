import { describe, expect, it } from "vitest";
import { attendantsDb, vehiclesDb } from "@/data/mockDb";
import { filterAttendants, filterVehicles } from "@/lib/selectors";

describe("selectors", () => {
  it("filters vehicles by search and status", () => {
    const result = filterVehicles(vehiclesDb, "XYZ", "requested");
    expect(result).toHaveLength(1);
    expect(result[0].plate).toBe("XYZ-5678");
  });

  it("filters attendants by shift and name", () => {
    const result = filterAttendants(attendantsDb, "Rafael", "afternoon");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Rafael Santos");
  });
});
