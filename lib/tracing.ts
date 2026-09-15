import Trace from '@/models/Trace';
import connectDB from '@/lib/mongodb';

export interface TraceData {
  endpoint: string;
  provider?: string;
  prompt: string;
  chunks?: any[];
  latencyMs: number;
  tokens?: any;
  pdfId?: string;
  userId: string;
}

export async function writeTrace(data: TraceData) {
  try {
    await connectDB();
    
    // Resolve provider from environment if not explicitly passed
    const provider = data.provider || process.env.LLM_PROVIDER || 'gemini';

    await Trace.create({
      ...data,
      provider,
    });
    
    // TODO: Add Langfuse integration here in a future phase
  } catch (error) {
    console.error("Failed to write trace:", error);
    // We don't throw here to avoid failing the main request if tracing fails
  }
}
