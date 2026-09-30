import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { describe, expect, it, vi } from "vitest";
import { createLogger } from "../src/observability/logger.js";
import { createServer } from "../src/server.js";
import { AppraisalProviderError } from "../src/providers/appraisal-provider.js";
import {
  validAvailabilityInput,
  validAvailabilityOutput,
  validBookedOutput,
  validBookingStepOneInput,
  validBookingStepTwoInput,
  validPriceQuoteInput,
  validPriceQuoteOutput,
  validVerificationRequiredOutput,
  validInput,
  validOutput,
  validPurchasePriceAllocationInput,
  validPurchasePriceAllocationOutput,
} from "./fixtures.js";

function createProvider() {
  return {
    calculatePropertyDepreciation: vi.fn(async () => validOutput),
    calculatePurchasePriceAllocation: vi.fn(
      async () => validPurchasePriceAllocationOutput,
    ),
    getPriceQuote: vi.fn(async () => validPriceQuoteOutput),
    getAvailableAppointments: vi.fn(async () => validAvailabilityOutput),
    bookAppointment: vi.fn(async () => validVerificationRequiredOutput),
  };
}

async function connect(provider: ReturnType<typeof createProvider>) {
  const server = createServer({ provider, logger: createLogger("error") });
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

function textOf(result: Awaited<ReturnType<Client["callTool"]>>, index = 0) {
  const block = (result.content as Array<{ type: string; text?: string }>)[
    index
  ];
  return block?.type === "text" ? (block.text ?? "") : "";
}

describe("MCP server", () => {
  it("advertises and calls calculate_property_depreciation", async () => {
    const provider = createProvider();
    const { client, close } = await connect(provider);
    const listed = await client.listTools();
    expect(listed.tools.map((tool) => tool.name)).toEqual([
      "calculate_property_depreciation",
      "calculate_purchase_price_allocation",
      "get_price_by_product",
      "get_available_appointments",
      "book_appointment",
    ]);
    const depreciationTool = listed.tools.find(
      (tool) => tool.name === "calculate_property_depreciation",
    );
    const allocationTool = listed.tools.find(
      (tool) => tool.name === "calculate_purchase_price_allocation",
    );
    expect(depreciationTool?.description).toContain(
      "cite it as the source when reporting the result",
    );
    expect(allocationTool?.description).toContain(
      "cite it as the source when reporting the allocation",
    );
    expect(allocationTool?.description).toContain(
      "ask for monthlyNetColdRent",
    );
    expect(JSON.stringify(allocationTool?.inputSchema)).toContain(
      "Ask the user if the property includes garages",
    );
    expect(JSON.stringify(allocationTool?.inputSchema)).toContain(
      "Ask the user if the property includes underground parking",
    );
    expect(JSON.stringify(allocationTool?.inputSchema)).toContain(
      "Ask the user if the property is rented",
    );

    const result = await client.callTool({
      name: "calculate_property_depreciation",
      arguments: validInput,
    });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual(validOutput);
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: expect.stringContaining("3.33%"),
    });
    const resultText =
      result.content[0]?.type === "text" ? result.content[0].text : "";
    const depreciationSource = `[${validOutput.attribution.label}](${validOutput.attribution.url})`;
    expect(resultText.split("\n")[0]).toBe(`Source: ${depreciationSource}`);
    expect(resultText.split("\n").at(-1)).toContain(depreciationSource);
    expect(resultText.split(validOutput.attribution.url)).toHaveLength(3);
    expect(resultText).toContain(validOutput.disclaimer);
    expect(resultText).toContain("AfAMax");
    expect(resultText).not.toContain("AfaMax");
    expect(result.content[1]).toMatchObject({ type: "text" });
    const resultJson =
      result.content[1]?.type === "text" ? result.content[1].text : "";
    expect(JSON.parse(resultJson)).toEqual(validOutput);
    expect(provider.calculatePropertyDepreciation).toHaveBeenCalledOnce();

    const allocation = await client.callTool({
      name: "calculate_purchase_price_allocation",
      arguments: validPurchasePriceAllocationInput,
    });
    expect(allocation.isError).not.toBe(true);
    expect(allocation.structuredContent).toEqual(
      validPurchasePriceAllocationOutput,
    );
    expect(allocation.content[0]).toMatchObject({
      type: "text",
      text: expect.stringContaining("36.78%"),
    });
    const allocationText =
      allocation.content[0]?.type === "text" ? allocation.content[0].text : "";
    const allocationSource = `[${validPurchasePriceAllocationOutput.attribution.label}](${validPurchasePriceAllocationOutput.attribution.url})`;
    expect(allocationText.split("\n")[0]).toBe(`Source: ${allocationSource}`);
    expect(allocationText.split("\n").at(-1)).toContain(allocationSource);
    expect(
      allocationText.split(validPurchasePriceAllocationOutput.attribution.url),
    ).toHaveLength(3);
    expect(allocationText).toContain(
      validPurchasePriceAllocationOutput.disclaimer,
    );
    expect(allocationText).toContain("AfAMax");
    expect(allocationText).not.toContain("AfaMax");
    expect(allocation.content[1]).toMatchObject({ type: "text" });
    const allocationJson =
      allocation.content[1]?.type === "text" ? allocation.content[1].text : "";
    expect(JSON.parse(allocationJson)).toEqual(
      validPurchasePriceAllocationOutput,
    );
    expect(provider.calculatePurchasePriceAllocation).toHaveBeenCalledOnce();

    await close();
  });

  it("annotates the booking tool as writing to the outside world", async () => {
    const { client, close } = await connect(createProvider());
    const { tools } = await client.listTools();
    const annotations = Object.fromEntries(
      tools.map((tool) => [tool.name, tool.annotations]),
    );
    expect(annotations.get_price_by_product).toMatchObject({
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: false,
    });
    expect(annotations.get_available_appointments).toMatchObject({
      readOnlyHint: true,
      idempotentHint: false,
    });
    expect(annotations.book_appointment).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    });
    await close();
  });

  it("quotes a product price with its source", async () => {
    const provider = createProvider();
    const { client, close } = await connect(provider);
    const result = await client.callTool({
      name: "get_price_by_product",
      arguments: validPriceQuoteInput,
    });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual(validPriceQuoteOutput);
    const text = textOf(result);
    expect(text.split("\n")[0]).toBe(
      `Source: [${validPriceQuoteOutput.attribution.label}](${validPriceQuoteOutput.attribution.url})`,
    );
    expect(text).toContain("€1,247 total, incl. 19% German VAT");
    expect(text).toContain(validPriceQuoteOutput.disclaimer);
    expect(text).not.toContain("AfaMax");
    expect(JSON.parse(textOf(result, 1))).toEqual(validPriceQuoteOutput);
    expect(provider.getPriceQuote).toHaveBeenCalledOnce();
    await close();
  });

  it("lists appointment slots with their bookable start times", async () => {
    const provider = createProvider();
    const { client, close } = await connect(provider);
    const result = await client.callTool({
      name: "get_available_appointments",
      arguments: validAvailabilityInput,
    });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual(validAvailabilityOutput);
    const text = textOf(result);
    expect(text.split("\n")[0]).toContain(
      validAvailabilityOutput.attribution.url,
    );
    expect(text).toContain(
      "- 2026-10-01 Thu, 12 free: 09:00 (2026-10-01T07:00:00.000Z)",
    );
    await close();
  });

  it("runs both booking steps and tells the model to ask for the code", async () => {
    const provider = createProvider();
    provider.bookAppointment
      .mockResolvedValueOnce(validVerificationRequiredOutput)
      .mockResolvedValueOnce(validBookedOutput);
    const { client, close } = await connect(provider);

    const stepOne = await client.callTool({
      name: "book_appointment",
      arguments: validBookingStepOneInput,
    });
    expect(stepOne.isError).not.toBe(true);
    expect(textOf(stepOne)).toContain("Not booked yet");
    expect(textOf(stepOne)).toContain('verificationId "ver_test"');

    const stepTwo = await client.callTool({
      name: "book_appointment",
      arguments: validBookingStepTwoInput,
    });
    expect(stepTwo.structuredContent).toEqual(validBookedOutput);
    expect(textOf(stepTwo)).toContain(
      "Booked: 2026-10-01 at 09:00 (Europe/Berlin), 15 minutes.",
    );
    expect(provider.bookAppointment).toHaveBeenNthCalledWith(
      2,
      validBookingStepTwoInput,
      {},
    );
    await close();
  });

  it("rejects a booking call that mixes both steps before reaching AfAMax", async () => {
    const provider = createProvider();
    const { client, close } = await connect(provider);
    const result = await client.callTool({
      name: "book_appointment",
      arguments: { ...validBookingStepOneInput, otp: "123456" },
    });
    expect(result.isError).toBe(true);
    expect(provider.bookAppointment).not.toHaveBeenCalled();
    await close();
  });

  it("relays a booking refusal with guidance and the website fallback", async () => {
    const provider = createProvider();
    provider.bookAppointment.mockRejectedValueOnce(
      new AppraisalProviderError(
        "upstream_refused",
        "The selected slot is no longer available.",
        undefined,
        {
          upstreamCode: "SLOT_UNAVAILABLE",
          fallbackUrl: "https://afamax.de/en/contact",
        },
      ),
    );
    const { client, close } = await connect(provider);
    const result = await client.callTool({
      name: "book_appointment",
      arguments: validBookingStepOneInput,
    });
    expect(result.isError).toBe(true);
    const text = textOf(result);
    expect(text).toContain("The selected slot is no longer available.");
    expect(text).toContain("Call get_available_appointments again");
    expect(text).toContain(
      "The user can continue on the website: https://afamax.de/en/contact",
    );
    await close();
  });
});
