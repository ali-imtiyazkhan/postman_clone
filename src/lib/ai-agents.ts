import { generateObject, generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const model = google('gemini-2.0-flash');

/**
 * Enhanced error handler for AI calls to provide better user feedback
 */
function handleAiError(error: any): string {
  console.error('AI Agent Error:', error);

  if (error?.statusCode === 429 || error?.message?.includes('quota')) {
    return 'Gemini API limit reached. Please wait a few seconds or check your quota at ai.google.dev.';
  }

  if (error?.statusCode === 404 || error?.message?.includes('not found')) {
    return 'The selected AI model is currently unavailable or unsupported for this API key.';
  }

  if (error?.message?.includes('API key')) {
    return 'Invalid or missing API key. Please check your .env file.';
  }

  return error instanceof Error ? error.message : 'An unexpected error occurred during AI analysis.';
}

export interface RequestSuggestionParams {
  workspaceName: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url?: string;
  description?: string;
}

export interface JsonBodyGenerationParams {
  prompt: string;
  method?: string;
  endpoint?: string;
  context?: string;
}

// Schema for request name suggestions
const RequestNameSchema = z.object({
  suggestions: z.array(
    z.object({
      name: z.string().describe('Suggested request name'),
      reasoning: z.string().describe('Brief explanation of why this name was chosen'),
      confidence: z.number().min(0).max(1).describe('Confidence score for this suggestion')
    })
  ).length(3).describe('Three different name suggestions ordered by relevance')
});


const JsonBodySchema = z.object({
  jsonBody: z.string().describe('Generated JSON body as a valid JSON string'),
  explanation: z.string().describe('Brief explanation of the generated structure'),
  suggestions: z.array(z.string()).describe('Alternative field suggestions or improvements')
});


const StructuredJsonBodySchema = z.object({
  jsonBody: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    data: z.any().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }).passthrough().describe('Generated JSON body structure'), // passthrough allows additional properties
  explanation: z.string().describe('Brief explanation of the generated structure'),
  suggestions: z.array(z.string()).describe('Alternative field suggestions or improvements')
});

const ResponseAuditSchema = z.object({
  vulnerabilities: z.array(z.object({
    type: z.string().describe('Type of vulnerability (e.g., Security, Performance, Logic)'),
    severity: z.enum(['Low', 'Medium', 'High', 'Critical']).describe('Severity level'),
    description: z.string().describe('Detailed description of the issue'),
    recommendation: z.string().describe('Step-by-step recommendation to fix')
  })).describe('List of potential vulnerabilities found'),
  bestPractices: z.array(z.string()).describe('List of general best practice improvements'),
  performance: z.array(z.string()).describe('Potential performance bottlenecks'),
  overallScore: z.number().min(0).max(100).describe('Overall security and quality score'),
  summary: z.string().describe('A concise summary of the audit findings')
});

export interface ResponseAuditParams {
  method: string;
  url: string;
  requestHeaders?: string;
  requestBody?: string;
  responseStatus: number;
  responseHeaders?: string;
  responseBody: string;
}

/**
 * Agent 1: Suggest Request Names
 * Generates meaningful request names based on workspace context and HTTP method
 */
export async function suggestRequestName({
  workspaceName,
  method,
  url,
  description
}: RequestSuggestionParams) {
  try {
    const prompt = `
You are an AI assistant helping developers name their API requests in a workspace called "${workspaceName}".

Context:
- HTTP Method: ${method}
- Workspace: ${workspaceName}
- URL: ${url || 'Not provided'}
- Description: ${description || 'Not provided'}

Generate 3 concise, descriptive request names that:
1. Reflect the HTTP method and purpose accurately.
2. Are highly relevant to the workspace context ("${workspaceName}").
3. Follow modern REST API naming conventions (e.g., camelCase or kebab-case as appropriate).
4. Are professional, clear, and easy for other developers to understand.
5. Are between 2-6 words long.
6. Avoid generic terms like "Request1" or "Test API".

Consider the workspace theme and the specific URL/Description provided to create names that feel like part of a well-organized API collection.
`;

    const result = await generateObject({
      model,
      schema: RequestNameSchema,
      prompt,
      temperature: 0.7,
    });

    return {
      success: true,
      data: result.object,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: handleAiError(error)
    };
  }
}

/**
 * Agent 2: Generate JSON Body
 * Creates JSON request bodies based on user prompts and context
 */
export async function generateJsonBody({
  prompt,
  method = 'POST',
  endpoint,
  context
}: JsonBodyGenerationParams) {
  try {
    const systemPrompt = `
You are an AI assistant that generates JSON request bodies for API calls.

Context:
- HTTP Method: ${method}
- Endpoint: ${endpoint || 'Not specified'}
- Additional Context: ${context || 'None'}

Guidelines:
1. Generate realistic, production-ready, well-structured JSON based on the user's request.
2. Use appropriate and varied data types (strings, numbers, booleans, arrays, objects).
3. Include reasonable, high-quality example values that make sense for a real-world application.
4. Follow common JSON and REST API conventions (proper nesting, camelCase keys).
5. Consider the HTTP method and endpoint when structuring the data (e.g., POST usually requires more fields than PATCH).
6. Ensure the JSON is practical, valid, and ready-to-use in an API client.
7. Include nested objects and arrays when they add value to the data structure.
8. Use descriptive and meaningful field names (avoid "field1", "data2").
9. Handle edge cases mentioned in the prompt (e.g., "include empty array if no users").

User Request: ${prompt}

IMPORTANT: Return the jsonBody as a valid JSON string that can be parsed with JSON.parse().
`;

    const result = await generateObject({
      model,
      schema: JsonBodySchema,
      prompt: systemPrompt,
      temperature: 0.3,
    });

    // Parse the JSON string back to an object for easier handling
    let parsedJsonBody;
    try {
      parsedJsonBody = JSON.parse(result.object.jsonBody);
    } catch (parseError) {
      // If parsing fails, return the string as-is
      parsedJsonBody = result.object.jsonBody;
    }

    return {
      success: true,
      data: {
        ...result.object,
        jsonBody: parsedJsonBody
      },
      error: null
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: handleAiError(error)
    };
  }
}

export async function generateSmartJsonBody({
  prompt,
  method = 'POST',
  endpoint,
  context,
  existingSchema
}: JsonBodyGenerationParams & { existingSchema?: Record<string, any> }) {
  try {
    const enhancedPrompt = `
You are an expert API developer creating JSON request bodies.

Request Details:
- HTTP Method: ${method}
- Endpoint: ${endpoint || 'Not specified'}
- User Prompt: ${prompt}
- Context: ${context || 'None provided'}
${existingSchema ? `- Reference Schema: ${JSON.stringify(existingSchema, null, 2)}` : ''}

Create a JSON body that:
1. Perfectly matches the user's intent from their prompt
2. Uses realistic, production-ready data
3. Follows industry standards and best practices
4. Includes appropriate validation-friendly values
5. Considers the HTTP method and endpoint context
6. Provides meaningful example data that developers can understand

Make it comprehensive but not overly complex.

IMPORTANT: Return the jsonBody as a valid JSON string that can be parsed with JSON.parse().
`;

    const result = await generateObject({
      model,
      schema: JsonBodySchema,
      prompt: enhancedPrompt,
      temperature: 0.4,
    });

    // Parse the JSON string back to an object for easier handling
    let parsedJsonBody;
    try {
      parsedJsonBody = JSON.parse(result.object.jsonBody);
    } catch (parseError) {
      // If parsing fails, return the string as-is
      parsedJsonBody = result.object.jsonBody;
    }

    return {
      success: true,
      data: {
        ...result.object,
        jsonBody: parsedJsonBody
      },
      error: null
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: handleAiError(error)
    };
  }
}

/**
 * Alternative function using structured schema (if you prefer type safety)
 */
export async function generateStructuredJsonBody({
  prompt,
  method = 'POST',
  endpoint,
  context
}: JsonBodyGenerationParams) {
  try {
    const systemPrompt = `
You are an AI assistant that generates JSON request bodies for API calls.

Context:
- HTTP Method: ${method}
- Endpoint: ${endpoint || 'Not specified'}
- Additional Context: ${context || 'None'}

Generate a realistic JSON structure based on the user's request. You can include any properties that make sense for the request, not just the predefined ones.

User Request: ${prompt}
`;

    const result = await generateObject({
      model,
      schema: StructuredJsonBodySchema,
      prompt: systemPrompt,
      temperature: 0.3,
    });

    return {
      success: true,
      data: result.object,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: handleAiError(error)
    };
  }
}

/**
 * Utility function to validate generated JSON
 */
export function validateGeneratedJson(jsonBody: Record<string, any>): {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const suggestions: string[] = [];

  try {
    // Basic validation
    JSON.stringify(jsonBody);

    // Check for empty objects
    if (Object.keys(jsonBody).length === 0) {
      errors.push('Generated JSON is empty');
    }

    // Check for null/undefined values
    const hasNullValues = JSON.stringify(jsonBody).includes('null');
    if (hasNullValues) {
      suggestions.push('Consider replacing null values with appropriate defaults');
    }

    // Check for meaningful property names
    const keys = Object.keys(jsonBody);
    const hasGenericKeys = keys.some(key =>
      ['data', 'value', 'item', 'field'].includes(key.toLowerCase())
    );

    if (hasGenericKeys) {
      suggestions.push('Consider using more specific property names');
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions
    };
  } catch (error) {
    errors.push('Invalid JSON structure');
    return {
      isValid: false,
      errors,
      suggestions
    };
  }
}

/**
 * Batch process multiple requests for name suggestions
 */
export async function batchSuggestRequestNames(
  requests: RequestSuggestionParams[]
): Promise<Array<{
  originalRequest: RequestSuggestionParams;
  suggestions: z.infer<typeof RequestNameSchema> | null;
  error: string | null;
}>> {
  const results = await Promise.allSettled(
    requests.map(request => suggestRequestName(request))
  );

  return results.map((result, index) => ({
    originalRequest: requests[index],
    suggestions: result.status === 'fulfilled' && result.value.success
      ? result.value.data
      : null,
    error: result.status === 'fulfilled'
      ? result.value.error
      : result.reason?.message || 'Unknown error'
  }));
}

/**
 * Agent 3: Response Auditor / AI Judge
 * Analyzes API responses for security, performance, and best practices.
 */
export async function auditResponse({
  method,
  url,
  requestHeaders,
  requestBody,
  responseStatus,
  responseHeaders,
  responseBody
}: ResponseAuditParams) {
  try {
    const prompt = `
You are an expert Security Engineer and API Auditor. Your task is to analyze the following API transaction and identify potential security vulnerabilities, performance issues, and best practice violations.

API Transaction:
- Method: ${method}
- URL: ${url}
- Request Headers: ${requestHeaders || 'None'}
- Request Body: ${requestBody || 'None'}
- Response Status: ${responseStatus}
- Response Headers: ${responseHeaders || 'None'}
- Response Body: ${responseBody}

Specific areas to check:
1. **Security**: 
   - Sensitive data exposure (PII, plain-text passwords, secrets, tokens).
   - SQL/NoSQL injection patterns in request or response.
   - Missing or insecure security headers (e.g., XSS Protection, Content-Security-Policy, HSTS).
   - Cross-Origin Resource Sharing (CORS) misconfigurations.
2. **Logic & Data Integrity**:
   - Inconsistent data types or structures.
   - Missing required fields according to common REST patterns.
   - Improper use of HTTP status codes (e.g., 200 OK for an error).
3. **Performance**:
   - Oversized response bodies (potential for pagination).
   - Missing compression (gzip/br).
   - Inefficient data structures (e.g., deeply nested objects where flat would work).
   - Lack of caching headers (Cache-Control, ETag).
4. **API Design/Best Practices**:
   - Following RESTful naming and structure.
   - Proper versioning in URL or headers.
   - Consistent error response formats.

Provide a comprehensive, professional audit report that helps developers build more secure and efficient APIs.
`;

    const result = await generateObject({
      model,
      schema: ResponseAuditSchema,
      prompt,
      temperature: 0.2,
    });

    return {
      success: true,
      data: result.object,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: handleAiError(error)
    };
  }
}

/**
 * Agent 4: WebSocket Message Analyzer
 * Analyzes individual WebSocket messages for patterns, security, and data structure.
 */
export async function analyzeWsMessage({
  type,
  data,
  url
}: {
  type: 'sent' | 'received';
  data: string;
  url: string;
}) {
  try {
    const prompt = `
You are an expert in Real-time Communications and WebSocket security. Analyze this single WebSocket message.

Context:
- URL: ${url}
- Direction: ${type === 'sent' ? 'Client -> Server (Sent)' : 'Server -> Client (Received)'}
- Message Data: ${data}

Your task:
1. **Identify the format**: Is it JSON, Binary, Plaintext, or a specific protocol (like Socket.io or GraphQL subscriptions)?
2. **Structure Analysis**: Describe the data structure and its likely purpose.
3. **Security Check**: Are there any sensitive fields or security risks in this message?
4. **Improvement Suggestions**: Suggest how this message could be optimized or made more secure.

Provide a concise but insightful analysis.
`;

    const WsAnalysisSchema = z.object({
      format: z.string().describe('Message format (e.g., JSON, YAML, Text)'),
      purpose: z.string().describe('Likely purpose of this message'),
      securityRisks: z.array(z.string()).describe('Potential security risks found'),
      insights: z.array(z.string()).describe('Key insights or optimization suggestions'),
      summary: z.string().describe('Brief summary of the analysis')
    });

    const result = await generateObject({
      model,
      schema: WsAnalysisSchema,
      prompt,
      temperature: 0.3,
    });

    return {
      success: true,
      data: result.object,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: handleAiError(error)
    };
  }
}
