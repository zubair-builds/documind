# DocuMind RAG Evaluation Harness

This directory contains the evaluation set and output results for the DocuMind RAG application.

## How to Run

```bash
npm run eval:rag
```

Make sure your environment variables are set in `.env.local`:
- `LLM_PROVIDER`: `gemini` or `openai`
- `GEMINI_API_KEY` or `OPENAI_API_KEY` (depending on the provider)

## Evaluation Process

The evaluation script (`scripts/eval-rag.ts`) performs the following steps for each question in `statements.json`:
1. **Embeds** the question using the active provider's embedding model.
2. **Retrieves** the top-4 chunks from the database using cosine similarity.
3. **Scores Retrieval**: Calculates hit@k by checking if any retrieved chunk contains the expected keywords.
4. **Generates Answer**: Prompts the LLM provider to answer the question using the retrieved chunks as context.
5. **Scores Answer**: Calculates answer coverage based on how many expected keywords are present in the final generated answer.

All results and metrics (latency, tokens) are written to the MongoDB `traces` collection for debugging and paper trail.

## Pass Criteria

A run is considered "Green" (Passing) when:
- **Hit@k** $\ge$ 0.8 (80% of the time, the required facts are retrieved)
- **Answer Coverage** $\ge$ 0.7 (70% of the required facts make it into the final answers)

## Output

Results are logged to the console and saved locally to `evals/last-run.json` so you can view metrics without rerunning the evaluations.
