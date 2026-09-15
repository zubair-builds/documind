import { LLMProvider } from './types';
import { GeminiProvider } from './gemini';
import { OpenAIProvider } from './openai';

let providerInstance: LLMProvider | null = null;

export const getProvider = (): LLMProvider => {
  if (providerInstance) {
    return providerInstance;
  }

  const providerType = process.env.LLM_PROVIDER || 'gemini';

  switch (providerType) {
    case 'openai':
      providerInstance = new OpenAIProvider();
      break;
    case 'gemini':
    default:
      providerInstance = new GeminiProvider();
      break;
  }

  return providerInstance;
};
