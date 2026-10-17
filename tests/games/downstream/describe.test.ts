import { describe, expect, it } from "vitest";
import { describeStart, describeStop, direction, kmBetween, pointAlong, roughKm } from "../../../games/downstream/describe";
import type { LngLat } from "../../../games/downstream/types";

describe("kmBetween", () => {
  it("measures one degree of latitude as about 111 km", () => {
    expect(kmBetween([0, 0], [0, 1])).toBeCloseTo(111.2, 0);
  });
});

describe("direction", () => {
  it("names the eight compass points", () => {
    expect(direction([0, 0], [0, 5])).toBe("north");
    expect(direction([0, 0], [5, 0])).toBe("east");
    expect(direction([0, 0], [0, -5])).toBe("south");
    expect(direction([0, 0], [-5, 0])).toBe("west");
    expect(direction([0, 0], [5, 5])).toBe("northeast");
    expect(direction([0, 0], [-5, -5])).toBe("southwest");
  });
});

describe("roughKm", () => {
  it("rounds like people talk", () => {
    expect(roughKm(3)).toBe("10 km");
    expect(roughKm(84)).toBe("80 km");
    expect(roughKm(362)).toBe("350 km");
    expect(roughKm(1234)).toBe("1,200 km");
  });
});

describe("pointAlong", () => {
  const route: LngLat[] = [[0, 0], [0, 1], [0, 2]];
  it("walks along the route", () => {
    const p = pointAlong(route, kmBetween([0, 0], [0, 1]) * 1.5);
    expect(p[1]).toBeCloseTo(1.5, 5);
  });
  it("stops at the end", () => {
    expect(pointAlong(route, 99999)).toEqual([0, 2]);
  });
});

describe("announcements", () => {
  const drop = {
    pin: [0, 0] as LngLat,
    options: ["North Sea", "East Sea"],
    seaLabels: { "North Sea": [0, 3] as LngLat, "East Sea": [3, 0] as LngLat },
    route: [[0, 0], [0, -2]] as LngLat[],
  };
  it("says where each sea is", () => {
    expect(describeStart(drop)).toBe("Rain falls on land. The four seas: North Sea, about 350 km north; East Sea, about 350 km east.");
  });
  it("says where the water has got to", () => {
    expect(describeStop(drop, 111)).toBe("The water has flowed 100 km and is now 100 km south of where the rain fell.");
  });
});
