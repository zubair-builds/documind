import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { StatementData } from '@/types';

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable not set");
}

const genAI = new GoogleGenerativeAI(API_KEY);

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


export const parseStatement = async (statementText: string): Promise<StatementData> => {
    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: statementSchema,
            },
        });

        const result = await model.generateContent(
            `Analyze the following credit card statement text and extract the required information in JSON format. The text is messy and may contain duplicates from multiple pages. Please consolidate it into a single, clean report. Identify payments by looking for descriptions like 'PAYMENT RECD.-THANK YOU' or amounts ending in 'CR'. For all transactions, ensure the amount is a positive number and use the 'type' field to distinguish between DEBIT and CREDIT.
            
            Statement Text:
            \`\`\`
            ${statementText}
            \`\`\`
            `
        );

        const response = result.response;
        const jsonText = response.text().trim();
        const parsedData = JSON.parse(jsonText);

        // Sort transactions by date
        parsedData.transactions.sort((a: { date: string }, b: { date: string }) => {
            try {
                const dateA = new Date(`2024 ${a.date}`); // Assuming current year for sorting
                const dateB = new Date(`2024 ${b.date}`);
                return dateA.getTime() - dateB.getTime();
            } catch (e) {
                return 0;
            }
        });
        
        return parsedData as StatementData;

    } catch (error) {
        console.error("Error parsing statement with Gemini API:", error);
        throw new Error("Failed to analyze the statement. The format might be unsupported or there was an API issue.");
    }
};
