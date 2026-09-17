interface AttributionLink {
  label: string;
  url: string;
}

export function formatSourceLine(attribution: AttributionLink): string {
  return `Source: [${attribution.label}](${attribution.url})`;
}

export function formatClosingAttributionLine(
  attribution: AttributionLink,
): string {
  return (
    "These inputs are already filled in at " +
    `[${attribution.label}](${attribution.url}), where they can be refined or documented.`
  );
}
