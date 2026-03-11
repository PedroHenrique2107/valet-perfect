import type { ParkingSpot } from "@/types/valet";

const SPECIAL_SECTION_NAMES = ["VIP", "ELETRICO", "CADEIRANTE"] as const;

export function isSpecialSection(section: string) {
  return SPECIAL_SECTION_NAMES.includes(section as (typeof SPECIAL_SECTION_NAMES)[number]);
}

export function getGlobalSectionOrder(spots: ParkingSpot[]) {
  const orderedSpots = [...spots].sort((left, right) => {
    if (left.floor !== right.floor) return left.floor - right.floor;
    return (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
  });

  return orderedSpots.reduce<string[]>((acc, spot) => {
    if (!acc.includes(spot.section)) {
      acc.push(spot.section);
    }
    return acc;
  }, []);
}

export function sortSectionsByOrder(sections: string[], globalOrder: string[]) {
  return [...sections].sort((left, right) => {
    const leftIndex = globalOrder.indexOf(left);
    const rightIndex = globalOrder.indexOf(right);

    if (leftIndex === -1 && rightIndex === -1) {
      return left.localeCompare(right);
    }
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  });
}

export function getDefaultRegularSection(globalOrder: string[]) {
  return globalOrder.find((section) => !isSpecialSection(section)) ?? "A";
}

export function getRegularSectionOrder(spots: ParkingSpot[]) {
  const regularSections = getGlobalSectionOrder(spots).filter((section) => !isSpecialSection(section));
  return regularSections.length > 0 ? regularSections : ["A"];
}

export function buildSequentialSectionNames(count: number, existingRegularOrder: string[]) {
  const names: string[] = [];
  const base = existingRegularOrder.length > 0 ? existingRegularOrder : ["A"];

  for (let index = 0; index < count; index += 1) {
    if (base[index]) {
      names.push(base[index]);
      continue;
    }

    names.push(String.fromCharCode("A".charCodeAt(0) + index));
  }

  return names;
}
