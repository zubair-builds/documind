export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatResponse {
  text: string;
  tokens?: TokenUsage;
  latencyMs: number;
}

export interface StatementResponse {
  data: any;
  tokens?: TokenUsage;
  latencyMs: number;
}

export interface LLMProvider {
  /**
   * Generates a chat response.
   */
  chat(prompt: string, systemPrompt?: string, history?: ChatMessage[]): Promise<ChatResponse>;
  
  /**
   * Generates embeddings for a given text.
   */
  embed(text: string): Promise<number[]>;
  
  /**
   * Analyzes a statement and extracts structured JSON.
   */
  analyzeStatement(text: string): Promise<StatementResponse>;
}
