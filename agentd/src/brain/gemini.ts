import {
  FunctionCallingMode,
  GoogleGenerativeAI,
  type Content,
  type FunctionDeclaration,
} from '@google/generative-ai';
import { geminiNameToToolId } from './toolParser.js';

export interface GeminiToolCall {
  toolId: string;
  args: Record<string, unknown>;
}

export interface GeminiResponse {
  text?: string;
  toolCalls?: GeminiToolCall[];
  content?: Content;
  finishReason: 'stop' | 'tool_use' | 'max_tokens' | 'error';
}

export class GeminiClient {
  constructor(
    private apiKey: string,
    private modelId = 'gemini-2.5-flash',
  ) {}

  async callWithTools(
    systemPrompt: string,
    userMessage: string,
    tools: FunctionDeclaration[],
    history: Content[] = [],
  ): Promise<GeminiResponse> {
    if (!this.apiKey) {
      return { finishReason: 'error', text: 'GEMINI_API_KEY nao configurada.' };
    }

    try {
      const client = new GoogleGenerativeAI(this.apiKey);
      // Gemini 2.0+ e 2.5+ exigem apiVersion 'v1beta'; modelos 1.x funcionam em ambos.
      const needsBeta = /^gemini-2\.|^gemini-exp/.test(this.modelId);
      const requestOptions = needsBeta ? { apiVersion: 'v1beta' as const } : undefined;
      const model = client.getGenerativeModel(
        { model: this.modelId, systemInstruction: systemPrompt },
        requestOptions,
      );

      const contents = history.length > 0
        ? history
        : [{ role: 'user', parts: [{ text: userMessage }] } satisfies Content];

      const result = await model.generateContent({
        contents,
        tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
        toolConfig: tools.length > 0
          ? { functionCallingConfig: { mode: FunctionCallingMode.AUTO } }
          : undefined,
      });

      const response = result.response;
      const candidate = response.candidates?.[0];
      const finish = candidate?.finishReason;
      const functionCalls = response.functionCalls?.() ?? [];
      const toolCalls = functionCalls.map((call) => ({
        toolId: geminiNameToToolId(call.name, tools),
        args: (call.args ?? {}) as Record<string, unknown>,
      }));

      if (toolCalls.length > 0) {
        return {
          finishReason: 'tool_use',
          toolCalls,
          content: candidate?.content,
        };
      }

      if (finish === 'MAX_TOKENS') {
        return {
          finishReason: 'max_tokens',
          text: safeText(response),
          content: candidate?.content,
        };
      }

      return {
        finishReason: 'stop',
        text: safeText(response),
        content: candidate?.content,
      };
    } catch (err) {
      return {
        finishReason: 'error',
        text: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

function safeText(response: { text: () => string }): string {
  try {
    return response.text();
  } catch {
    return '';
  }
}

