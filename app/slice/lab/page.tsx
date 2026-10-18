// /slice/lab: a throwaway prototype of a 3D Slice board (three.js), kept apart from
// the real game until it proves itself. Not linked from anywhere, not indexed.

import type { Metadata } from "next";
import LabGame from "./LabGame";

export const metadata: Metadata = {
  title: "Slice lab",
  robots: { index: false },
};

export default function SliceLabPage() {
  return <LabGame />;
}
