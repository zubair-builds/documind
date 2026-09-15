import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { LLMProvider, ChatMessage, ChatResponse, StatementResponse } from './types';
import { StatementData } from '@/types';

const modelVersion = "gemini-3.1-flash-lite";
const EMBEDDING_MODEL = "gemini-embedding-001";

const getApiKey = (): string => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error("GEMINI_API_KEY environment variable not set");
    }
    console.warn('[WARN] GEMINI_API_KEY is missing.');
    return 'development-key-not-for-use';
  }
  return apiKey;
};

const statementSchema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING, description: "Cardholder's full name." },
        statementDate: { type: SchemaType.STRING, description: "The date the statement was issued." },
        dueDate: { type: SchemaType.STRING, description: "The payment due date." },
        newBalance: { type: SchemaType.NUMBER, description: "Total new balance amount." },
        minimumPayment: { type: SchemaType.NUMBER, description: "Minimum payment due." },
        creditLimit: { type: SchemaType.NUMBER, description: "Total credit limit." },
      },
      required: ["name", "statementDate", "dueDate", "newBalance", "minimumPayment", "creditLimit"],
    },
    transactions: {
      type: SchemaType.ARRAY,
      description: "List of all transactions in the statement.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          date: { type: SchemaType.STRING, description: "Date of the transaction (e.g., '17 JUN')." },
          description: { type: SchemaType.STRING, description: "Description of the transaction." },
          amount: { type: SchemaType.NUMBER, description: "Transaction amount. Should be a positive number." },
          type: { type: SchemaType.STRING, description: "Type of transaction, either 'DEBIT' for purchases/fees or 'CREDIT' for payments.", enum: ['DEBIT', 'CREDIT'] },
          category: { type: SchemaType.STRING, description: "Categorize the transaction (e.g., 'Groceries', 'Utilities', 'Dining', 'Shopping', 'Travel', 'Payment', 'Fees', 'Other')." },
        },
        required: ["date", "description", "amount", "type", "category"],
      },
    },
  },
  required: ["summary", "transactions"],
};

export class GeminiProvider implements LLMProvider {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(getApiKey());
  }

  async chat(prompt: string, systemPrompt?: string, history?: ChatMessage[]): Promise<ChatResponse> {
    const model = this.genAI.getGenerativeModel({
      model: modelVersion,
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const mappedHistory = (history || []).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const chatSession = model.startChat({ history: mappedHistory });

    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    const startTime = Date.now();
    const result = await chatSession.sendMessage(fullPrompt);
    const endTime = Date.now();
    
    const usageMetadata = result.response.usageMetadata;
    const tokens = usageMetadata ? {
      promptTokens: usageMetadata.promptTokenCount || 0,
      completionTokens: usageMetadata.candidatesTokenCount || 0,
      totalTokens: usageMetadata.totalTokenCount || 0
    } : undefined;

    return {
      text: result.response.text(),
      tokens,
      latencyMs: endTime - startTime
    };
  }

  async embed(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  async analyzeStatement(text: string): Promise<StatementResponse> {
    const model = this.genAI.getGenerativeModel({
      model: modelVersion,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: statementSchema,
      },
    });

    const prompt = `Analyze the following credit card statement text and extract the required information in JSON format. The text is messy and may contain duplicates from multiple pages. Please consolidate it into a single, clean report. Identify payments by looking for descriptions like 'PAYMENT RECD.-THANK YOU' or amounts ending in 'CR'. For all transactions, ensure the amount is a positive number and use the 'type' field to distinguish between DEBIT and CREDIT.
            
Statement Text:
\`\`\`
${text}
\`\`\`
`;

    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const endTime = Date.now();

    const response = result.response;
    const jsonText = response.text().trim();
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
    
    const usageMetadata = result.response.usageMetadata;
    const tokens = usageMetadata ? {
      promptTokens: usageMetadata.promptTokenCount || 0,
      completionTokens: usageMetadata.candidatesTokenCount || 0,
      totalTokens: usageMetadata.totalTokenCount || 0
    } : undefined;

    return {
      data: parsedData,
      tokens,
      latencyMs: endTime - startTime
    };
  }
}
