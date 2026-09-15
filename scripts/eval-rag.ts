import fs from 'fs';
import path from 'path';
import connectDB from '../lib/mongodb';
import PdfChunk from '../models/PdfChunk';
import { getProvider } from '../lib/llm';
import { cosineSimilarity } from '../lib/rag-utils';
import { writeTrace } from '../lib/tracing';
import mongoose from 'mongoose';

// Load .env.local manually to avoid 'dotenv' dependency
try {
  const envFile = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#]+?)=(.+)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = process.env[key] || value;
    }
  });
} catch (e) {
  // Ignore if file doesn't exist
}

interface EvalQA {
  question: string;
  expected_answer: string;
  expected_keywords: string[];
  must_cite: boolean;
}

async function runEval() {
  console.log('Connecting to database...');
  await connectDB();
  
  const evalPath = path.join(process.cwd(), 'evals/statements.json');
  const evals: EvalQA[] = JSON.parse(fs.readFileSync(evalPath, 'utf8'));
  
  console.log(`Loaded ${evals.length} eval cases.`);
  
  const provider = getProvider();
  console.log(`Using provider: ${process.env.LLM_PROVIDER || 'gemini'}`);
  
  let hits = 0;
  let answerCoverageHits = 0;
  let totalLatency = 0;
  let totalTokens = 0;
  let totalTokenCount = 0;
  let totalChunksRetrieved = 0;
  
  const failures: any[] = [];
  
  // To avoid evaluating on an empty DB, check if there are any chunks
  const allChunks = await PdfChunk.find().lean();
  if (allChunks.length === 0) {
    console.warn("WARNING: No chunks found in the database. Retrieval will fail. Please upload a PDF first.");
  }
  
  for (const [index, qa] of evals.entries()) {
    console.log(`\nEvaluating ${index + 1}/${evals.length}: ${qa.question}`);
    
    // 1. Embed question
    const qEmbedding = await provider.embed(qa.question);
    
    // 2. Retrieve top-k chunks
    const scoredChunks = allChunks.map((chunk: any) => ({
      text: chunk.text,
      filename: 'Eval Document',
      score: cosineSimilarity(qEmbedding, chunk.embedding)
    }));
    
    scoredChunks.sort((a, b) => b.score - a.score);
    const topChunks = scoredChunks.slice(0, 4);
    
    // 3. Score retrieval: hit@k if any gold keyword is in a retrieved chunk
    let retrievalHit = false;
    for (const chunk of topChunks) {
      if (qa.expected_keywords.some(kw => chunk.text.toLowerCase().includes(kw.toLowerCase()))) {
        retrievalHit = true;
        break;
      }
    }
    
    if (retrievalHit) {
      hits++;
    }
    
    // 4. Generate answer
    const context = topChunks.map(c => `[Source: ${c.filename}]\n${c.text}`).join('\n\n---\n\n');
    const prompt = `You are a helpful assistant. Answer the user's question based ONLY on the following context extracted from documents. If you cannot find the answer in the context, say "I couldn't find the answer in the document(s)."
    
CONTEXT:
${context}

QUESTION:
${qa.question}`;
    
    const response = await provider.chat(prompt, "You are a financial document assistant.");
    const answerText = response.text.toLowerCase();
    
    // 5. Score answer: keyword coverage
    let coveredKeywords = 0;
    for (const kw of qa.expected_keywords) {
      if (answerText.includes(kw.toLowerCase())) {
        coveredKeywords++;
      }
    }
    const coverage = qa.expected_keywords.length > 0 ? (coveredKeywords / qa.expected_keywords.length) : 1;
    
    if (coverage >= 0.7) {
      answerCoverageHits++;
    } else {
      const missing = qa.expected_keywords.filter(kw => !answerText.includes(kw.toLowerCase()));
      failures.push({
        question: qa.question,
        missing_keywords: missing,
        retrieval_hit: retrievalHit,
        coverage
      });
    }
    
    totalLatency += response.latencyMs;
    if (response.tokens) {
      totalTokens += response.tokens.totalTokens || 0;
      totalTokenCount++;
    }
    
    // Write trace to Mongo
    await writeTrace({
      endpoint: '/scripts/eval-rag',
      prompt,
      chunks: topChunks,
      latencyMs: response.latencyMs,
      tokens: response.tokens,
      userId: 'eval-system'
    });
  }
  
  const hitAtKRate = hits / evals.length;
  const coverageRate = answerCoverageHits / evals.length;
  const meanLatency = totalLatency / evals.length;
  const meanTokens = totalTokenCount > 0 ? (totalTokens / totalTokenCount) : 0;
  
  console.log('\n=============================================');
  console.log('                EVALUATION RESULTS            ');
  console.log('=============================================');
  console.log(`Total Cases:       ${evals.length}`);
  console.log(`Hit@4 Rate:        ${(hitAtKRate * 100).toFixed(2)}% (Target: >= 80%)`);
  console.log(`Answer Coverage:   ${(coverageRate * 100).toFixed(2)}% (Target: >= 70%)`);
  console.log(`Mean Latency:      ${meanLatency.toFixed(2)} ms`);
  console.log(`Mean Tokens:       ${meanTokens.toFixed(2)}`);
  
  if (hitAtKRate >= 0.8 && coverageRate >= 0.7) {
    console.log('\n✅ RUN PASSED (GREEN)');
  } else {
    console.log('\n❌ RUN FAILED (RED)');
  }
  
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach((f, i) => {
      console.log(`${i + 1}. Q: ${f.question}`);
      console.log(`   Missing keywords: ${f.missing_keywords.join(', ')}`);
      console.log(`   Retrieval successful: ${f.retrieval_hit ? 'Yes' : 'No'}`);
    });
  }
  
  // Save run results
  const runResults = {
    timestamp: new Date().toISOString(),
    provider: process.env.LLM_PROVIDER || 'gemini',
    metrics: {
      total_cases: evals.length,
      hit_at_k: hitAtKRate,
      answer_coverage: coverageRate,
      mean_latency_ms: meanLatency,
      mean_tokens: meanTokens
    },
    passed: hitAtKRate >= 0.8 && coverageRate >= 0.7,
    failures
  };
  
  fs.writeFileSync(path.join(process.cwd(), 'evals/last-run.json'), JSON.stringify(runResults, null, 2));
  console.log('\nResults saved to evals/last-run.json');
  
  mongoose.connection.close();
}

runEval().catch(err => {
  console.error("Eval failed:", err);
  process.exit(1);
});
