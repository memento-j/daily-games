// Shape of public/data/downstream/NNNN.json, written by scripts/downstream/generate.py.
// Coordinates are [longitude, latitude] (GeoJSON order) everywhere.

export type LngLat = [number, number];

export type Drop = {
  pin: LngLat;
  answer: string;
  options: string[]; // four seas, answer included, already shuffled
  distanceKm: number;
  route: LngLat[]; // pin -> river mouth
  stages: number[]; // km along the route where the reveal pauses
  fact: string;
  difficulty: number; // 1 (easy) to 5 (surprising)
  seaLabels?: Record<string, LngLat>; // where to letter each option's name, near the pin
};

export type Puzzle = {
  puzzle: number;
  drops: Drop[]; // easiest first
};
