import type { McpServer } from '@modelcontextprotocol/server';
import { propertyDepreciationInputSchema, propertyDepreciationOutputSchema } from '../../contracts/property-depreciation.js';
import { AppraisalProviderError, type AppraisalProvider, type AppraisalRequestContext } from '../../providers/appraisal-provider.js';
import type { Logger } from '../../observability/logger.js';
import { formatPropertyDepreciationResult } from './format-result.js';

const description = `Calculate an indicative German real-estate depreciation (AfA) estimate through AfaMax.

Use this for residential German property, including remaining useful life, annual/monthly AfA, statutory comparison, and estimated tax savings. For apartment buildings, pass figures for the whole building or calculate units separately. Ask for all eight modernization component states whenever possible: omitting them assumes no modernization and produces the highest possible remaining-useful-life benefit. The result is non-binding and does not replace tax or legal advice.`;

export function registerPropertyDepreciationTool(
  server: McpServer,
  provider: AppraisalProvider,
  requestContext: AppraisalRequestContext,
  logger: Logger,
): void {
  server.registerTool(
    'calculate_property_depreciation',
    {
      title: 'Calculate German property depreciation',
      description,
      inputSchema: propertyDepreciationInputSchema,
      outputSchema: propertyDepreciationOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => {
      try {
        const output = await provider.calculatePropertyDepreciation(input, requestContext);
        return {
          content: [
            { type: 'text', text: formatPropertyDepreciationResult(output) },
            { type: 'text', text: JSON.stringify(output) },
          ],
          structuredContent: output,
        };
      } catch (error) {
        if (error instanceof AppraisalProviderError) {
          logger.warn('property_depreciation_failed', { code: error.code });
          const retry = error.retryAfterSeconds ? ` Try again in about ${error.retryAfterSeconds} seconds.` : '';
          return { isError: true, content: [{ type: 'text', text: `${error.message}${retry}` }] };
        }
        logger.error('property_depreciation_failed', { code: 'unexpected' });
        return {
          isError: true,
          content: [{ type: 'text', text: 'The property depreciation calculation failed unexpectedly. Please try again.' }],
        };
      }
    },
  );
}
