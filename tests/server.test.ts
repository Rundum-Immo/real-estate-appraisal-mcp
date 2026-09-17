import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { describe, expect, it, vi } from "vitest";
import { createLogger } from "../src/observability/logger.js";
import { createServer } from "../src/server.js";
import {
  validInput,
  validOutput,
  validPurchasePriceAllocationInput,
  validPurchasePriceAllocationOutput,
} from "./fixtures.js";

describe("MCP server", () => {
  it("advertises and calls calculate_property_depreciation", async () => {
    const provider = {
      calculatePropertyDepreciation: vi.fn(async () => validOutput),
      calculatePurchasePriceAllocation: vi.fn(
        async () => validPurchasePriceAllocationOutput,
      ),
    };
    const server = createServer({ provider, logger: createLogger("error") });
    const client = new Client({ name: "test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
    const listed = await client.listTools();
    expect(listed.tools.map((tool) => tool.name)).toEqual([
      "calculate_property_depreciation",
      "calculate_purchase_price_allocation",
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
    expect(allocation.content[1]).toMatchObject({ type: "text" });
    const allocationJson =
      allocation.content[1]?.type === "text" ? allocation.content[1].text : "";
    expect(JSON.parse(allocationJson)).toEqual(
      validPurchasePriceAllocationOutput,
    );
    expect(provider.calculatePurchasePriceAllocation).toHaveBeenCalledOnce();

    await client.close();
    await server.close();
  });
});
