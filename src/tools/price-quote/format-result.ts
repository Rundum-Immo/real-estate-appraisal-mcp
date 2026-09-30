import type { PriceQuoteOutput } from "../../contracts/price-quote.js";
import { formatSourceLine } from "../format-attribution.js";

const eur = new Intl.NumberFormat("en", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPriceQuoteResult(result: PriceQuoteOutput): string {
  const { price, surchargeTable } = result;
  const lines = [
    formatSourceLine(result.attribution),
    `${result.productLabel}: ${eur.format(price.totalPrice)} total, incl. ${price.vatRate}% German VAT ` +
      `(${eur.format(price.totalNetPrice)} net).`,
  ];

  const parts = [`base price ${eur.format(price.basePrice)}`];
  if (price.viewingSurcharge > 0) {
    parts.push(`inspection ${eur.format(price.viewingSurcharge)}`);
  }
  if (price.freeExpressPromotionApplied) {
    parts.push("express processing free of charge (promotion)");
  } else if (price.expressSurcharge > 0) {
    parts.push(`express processing ${eur.format(price.expressSurcharge)}`);
  }
  if (price.additionalUnitsPrice > 0) {
    parts.push(
      `additional flats ${eur.format(price.additionalUnitsPrice)} ` +
        `(${eur.format(price.additionalPricePerUnit)} per flat)`,
    );
  }
  lines.push(`Breakdown: ${parts.join(", ")}.`);

  lines.push(
    `Available options: exterior inspection +${eur.format(surchargeTable.exteriorViewing)}, ` +
      `on-site inspection +${eur.format(surchargeTable.interiorExteriorViewing)}, ` +
      `express +${eur.format(surchargeTable.express)}, ` +
      `each additional flat +${eur.format(surchargeTable.perAdditionalFlat)}.`,
  );
  lines.push(result.disclaimer);
  return lines.join("\n");
}
