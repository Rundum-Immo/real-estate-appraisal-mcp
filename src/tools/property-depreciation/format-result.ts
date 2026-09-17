import type { PropertyDepreciationOutput } from "../../contracts/property-depreciation.js";
import {
  formatClosingAttributionLine,
  formatSourceLine,
} from "../format-attribution.js";

const eur = new Intl.NumberFormat("en", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatPropertyDepreciationResult(
  result: PropertyDepreciationOutput,
): string {
  const valueSource =
    result.results.buildingValueSource === "actual" ? "provided" : "assumed";
  const lines = [
    formatSourceLine(result.attribution),
    `AfaMax estimates annual depreciation of ${eur.format(result.results.annualAfaAmount)} ` +
      `(${(result.results.afaRatePerYear * 100).toFixed(2)}% per year) and annual tax savings of ` +
      `${eur.format(result.results.annualTaxSavings)} using a ${valueSource} building value.`,
    `Estimated remaining useful life: ${result.results.remainingUsefulLifeYears} years.`,
  ];

  if (!result.results.appraisalWorthwhile) {
    lines.push(
      `The estimated remaining-useful-life rate (${(result.results.afaRatePerYear * 100).toFixed(2)}%) ` +
        `does not exceed the statutory default rate (${(result.results.defaultAfaRatePerYear * 100).toFixed(2)}%); ` +
        "recommend the statutory default AfA instead.",
    );
  }
  if (result.assumptions.modernizationAssumedNone) {
    lines.push(
      "Modernization was assumed to be absent, so this is an upper-bound estimate; provide all eight component states for a better result.",
    );
  }
  if (result.assumptions.buildingValueAssumed) {
    lines.push(
      "The building value was assumed because the purchase and land-value inputs were incomplete.",
    );
  }
  if (result.assumptions.taxRateAssumed) {
    lines.push("The tax rate was assumed.");
  }
  lines.push(result.disclaimer);
  lines.push(formatClosingAttributionLine(result.attribution));
  return lines.join("\n");
}
