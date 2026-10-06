// Golden prompt ids (d01, i01, n01 …) reveal the category, so the router sees opaque ids in a
// stable shuffled order instead. Both the export and the score script derive the same mapping.
import { createHash } from "node:crypto";

export function opaqueIds(ids: readonly string[]): Map<string, string> {
  const hash = (id: string) => createHash("sha256").update(id).digest("hex");
  const shuffled = [...ids].sort((a, b) => hash(a).localeCompare(hash(b)));
  return new Map(
    shuffled.map((id, index) => [id, `q${String(index + 1).padStart(2, "0")}`]),
  );
}
