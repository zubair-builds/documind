import OpenAI from 'openai';
import { LLMProvider, ChatMessage, ChatResponse, StatementResponse } from './types';

const chatModel = "gpt-4o-mini";
const embeddingModel = "text-embedding-3-small";

const getApiKey = (): string => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error("OPENAI_API_KEY environment variable not set");
    }
    console.warn('[WARN] OPENAI_API_KEY is missing.');
    return 'development-key-not-for-use';
  }
  return apiKey;
};

// Simplified JSON schema for OpenAI Structured Outputs
const statementSchema = {
  type: "object",
  properties: {
    summary: {
      type: "object",
      properties: {
        name: { type: "string", description: "Cardholder's full name." },
        statementDate: { type: "string", description: "The date the statement was issued." },
        dueDate: { type: "string", description: "The payment due date." },
        newBalance: { type: "number", description: "Total new balance amount." },
        minimumPayment: { type: "number", description: "Minimum payment due." },
        creditLimit: { type: "number", description: "Total credit limit." },
      },
      required: ["name", "statementDate", "dueDate", "newBalance", "minimumPayment", "creditLimit"],
      additionalProperties: false
    },
    transactions: {
      type: "array",
      description: "List of all transactions in the statement.",
      items: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date of the transaction (e.g., '17 JUN')." },
          description: { type: "string", description: "Description of the transaction." },
          amount: { type: "number", description: "Transaction amount. Should be a positive number." },
          type: { type: "string", description: "Type of transaction, either 'DEBIT' for purchases/fees or 'CREDIT' for payments." },
          category: { type: "string", description: "Categorize the transaction (e.g., 'Groceries', 'Utilities', 'Dining', 'Shopping', 'Travel', 'Payment', 'Fees', 'Other')." },
        },
        required: ["date", "description", "amount", "type", "category"],
        additionalProperties: false
      },
    },
  },
  required: ["summary", "transactions"],
  additionalProperties: false
};

export class OpenAIProvider implements LLMProvider {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: getApiKey() });
  }

  async chat(prompt: string, systemPrompt?: string, history?: ChatMessage[]): Promise<ChatResponse> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    if (history) {
      messages.push(...history as OpenAI.Chat.ChatCompletionMessageParam[]);
    }
    
    messages.push({ role: 'user', content: prompt });

    const startTime = Date.now();
    const result = await this.openai.chat.completions.create({
      model: chatModel,
      messages,
      response_format: { type: "json_object" }
    });
    const endTime = Date.now();
    
    const usage = result.usage;
    const tokens = usage ? {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens
    } : undefined;

    return {
      text: result.choices[0].message.content || "",
      tokens,
      latencyMs: endTime - startTime
    };
  }

  async embed(text: string): Promise<number[]> {
    const result = await this.openai.embeddings.create({
      model: embeddingModel,
      input: text
    });
    return result.data[0].embedding;
  }

  async analyzeStatement(text: string): Promise<StatementResponse> {
    const prompt = `Analyze the following credit card statement text and extract the required information in JSON format. The text is messy and may contain duplicates from multiple pages. Please consolidate it into a single, clean report. Identify payments by looking for descriptions like 'PAYMENT RECD.-THANK YOU' or amounts ending in 'CR'. For all transactions, ensure the amount is a positive number and use the 'type' field to distinguish between DEBIT and CREDIT.
            
Statement Text:
\`\`\`
${text}
\`\`\`
`;

    const startTime = Date.now();
    const result = await this.openai.chat.completions.create({
      model: chatModel,
      messages: [{ role: 'user', content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "statement",
          schema: statementSchema,
          strict: true
        }
      }
    });
    const endTime = Date.now();

    const jsonText = result.choices[0].message.content || "{}";
    const parsedData = JSON.parse(jsonText);

    if (parsedData.transactions) {
      parsedData.transactions.sort((a: any, b: any) => {
        try {
          const dateA = new Date(`2024 ${a.date}`);
          const dateB = new Date(`2024 ${b.date}`);
          return dateA.getTime() - dateB.getTime();
        } catch (e) {
          return 0;
        }
      });
    }
    
    const usage = result.usage;
    const tokens = usage ? {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens
    } : undefined;

    return {
      data: parsedData,
      tokens,
      latencyMs: endTime - startTime
    };
  }
}
