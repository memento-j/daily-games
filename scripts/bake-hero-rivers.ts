// Bakes the decorative rivers of the /downstream hero world into a JSON file, so
// browsers don't spend ~0.3 s (1-2 s on phones) tracing them on every visit.
// The world is seeded, so the result never changes unless heroWorld.ts does.
// A unit test checks the file still matches; re-run after changing the world:
//
//   npm run bake:hero

import { writeFileSync } from "node:fs";
import { findRivers } from "../app/downstream/heroWorld.ts";
import { HERO_RIVER_COUNT, roundRiver } from "../app/downstream/heroRivers.ts";

const rivers = findRivers(HERO_RIVER_COUNT).map(roundRiver);
writeFileSync(new URL("../app/downstream/heroRivers.json", import.meta.url), JSON.stringify(rivers) + "\n");
console.log(`Baked ${rivers.length} rivers.`);
