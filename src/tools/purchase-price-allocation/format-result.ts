import type { PurchasePriceAllocationOutput } from "../../contracts/purchase-price-allocation.js";
import {
  formatClosingAttributionLine,
  formatSourceLine,
} from "../format-attribution.js";

const eur = new Intl.NumberFormat("en", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatPurchasePriceAllocationResult(
  result: PurchasePriceAllocationOutput,
): string {
  const applied = result.applied;
  const lines = [
    formatSourceLine(result.attribution),
    `AfaMax applies the ${applied.method} method, with a ${(applied.buildingShare * 100).toFixed(2)}% ` +
      `building share and a depreciation base of ${eur.format(applied.depreciationBase)}.`,
  ];

  const alternatives = result.methods
    .filter(
      (method) => method.method !== applied.method && method.buildingShare > 0,
    )
    .map(
      (method) =>
        `${method.method}: ${(method.buildingShare * 100).toFixed(2)}% building share, ` +
        `${eur.format(method.depreciationBase)} depreciation base`,
    );
  if (alternatives.length > 0) {
    lines.push(`Meaningful alternatives: ${alternatives.join("; ")}.`);
  }

  const skippedIncome = result.skipped.find(
    (entry) => entry.method === "income",
  );
  if (skippedIncome) {
    lines.push(
      "The income method was not calculated because monthlyNetColdRent was not provided.",
    );
  }

  for (const entry of result.degenerate) {
    lines.push(
      `The ${entry.method} method was unusable (${entry.reason}); it was not selected over a meaningful result.`,
    );
  }

  lines.push(
    `Asset-method defaults: standard level ${result.assetMethodDefaults.standardLevel}, ` +
      `regional factor ${result.assetMethodDefaults.regionalFactor.toFixed(1)}, market-adjustment factor ` +
      `${result.assetMethodDefaults.marketAdjustmentFactor.toFixed(1)}.`,
  );
  lines.push(result.disclaimer);
  lines.push(formatClosingAttributionLine(result.attribution));
  return lines.join("\n");
}
