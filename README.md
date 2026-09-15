# Statement RAG

Next.js API + web UI for locked bank-statement PDFs: unlock, extract, embed, chat (RAG), and structured spend analysis.

This is the backend for [statement-tracker](https://github.com/zubair-builds/statement-tracker) (Expo). The mobile app has no RAG — it calls these routes.

Suggested repo name: `statement-rag`.

## What it does

- Unlock password-protected PDFs (`qpdf` / `node-qpdf2`)
- Extract text (`pdf-parse`), chunk it, embed with Gemini
- Store chunks + embeddings in MongoDB; retrieve with in-memory cosine similarity
- Chat over a document (RAG)
- Statement analysis: transactions, categories, totals via Gemini
- Auth (NextAuth + JWT) so the Expo client can use the same API

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 14 App Router, TypeScript, Tailwind |
| Data | MongoDB + Mongoose |
| AI | Gemini embeddings + chat (`lib/geminiService.ts`, `lib/rag-utils.ts`) |
| PDF | qpdf, pdf-parse |
| Auth | NextAuth, JWT (`lib/api-auth.ts`) |

## Setup

Needs Node 18+, MongoDB, [qpdf](https://qpdf.sourceforge.io/), and a Gemini key.

```bash
git clone https://github.com/zubair-builds/pdf_assist.git
cd pdf_assist
cp .env.example .env.local
# MONGODB_URI, NEXTAUTH_SECRET, NEXTAUTH_URL, GEMINI_API_KEY, ENCRYPTION_KEY
npm install
npm run dev
```

Web UI: [http://localhost:3000](http://localhost:3000). Point the Expo app at the same origin with `EXPO_PUBLIC_API_URL`.

Routes the client uses include `/api/auth/*`, `/api/unlock-pdf`, `/api/pdfs/*`, `/api/statements/*`, `/api/analytics/*`, `/api/passwords`.

Do not commit `.env.local`, uploaded PDFs, or statement passwords. Rotate Gemini / NextAuth secrets if this repo was ever shared with a live key.

## Pairing

```text
statement-tracker (Expo)  --REST-->  this repo (Next.js + RAG + Mongo)
```

## Author

[Syed Zubair Haider](https://github.com/zubair-builds) · [LinkedIn](https://www.linkedin.com/in/syed-zubair-haider/)

## Deployment

1. **Environment Variables**: Make sure to add all the environment variables (`MONGODB_URI`, `GEMINI_API_KEY`, `NEXTAUTH_SECRET`, etc.) to your Render Web Service.
2. **⚠️ Persistent Disk (Critical)**: By default, this app saves uploaded PDFs to the local file system (e.g., `data/uploads/`). Render uses an **ephemeral file system**, meaning uploaded files will be deleted on every deploy or restart.
   - **Solution**: Go to your Render Dashboard -> Your Web Service -> **Disks**. Add a persistent disk (e.g., mounted at `/var/data`). Then, update the upload path in `app/api/pdfs/upload/route.ts` to point to `/var/data/uploads`.
   - **Alternative**: Modify the upload logic to save files directly to AWS S3, Cloudinary, or Vercel Blob.

### Vercel

If deploying to Vercel, ensure:
1. `qpdf` is available in your deployment environment (Vercel supports it by default for some runtimes).
2. You migrate file uploads from the local filesystem to Vercel Blob or AWS S3, as Vercel is completely serverless and cannot store files persistently on disk.

## Security Features

- **Authentication**: JWT-based session management with NextAuth.
- **In-Memory Vector Search**: Does not require syncing data to a third-party vector database; your document chunks stay within your MongoDB database.
- **File Type & Size Validation**: Prevents malicious uploads and DoS attacks.
- **Password Protection**: PDF passwords are only used server-side and are never logged or stored.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this project for any purpose.

## How I evaluate RAG

DocuMind is not “I called Gemini.” Chat and statement analysis go through a
provider interface (`lib/llm`) selected by `LLM_PROVIDER` (`gemini` | `openai`).
Every answer writes a trace (`models/Trace.ts`): prompt, retrieved chunks,
provider/model, latency, token counts.

### Eval set

`evals/statements.json` — 20 questions a user would ask of an ingested
bank statement (period total, largest debit, merchant, category mix),
each with an expected answer and keywords that must appear.

### Scoring

```bash
npm run eval:rag
```

The script:

1. Embeds the question with the active provider.
2. Retrieves top-k chunks (same cosine path as `/api/chat`).
3. Scores **retrieval**: hit@k if any gold keyword is in a retrieved chunk.
4. Scores **answer**: token overlap / keyword coverage vs the expected answer.
5. Prints pass rate, mean latency, mean tokens. Failures list the missing keywords.

A run is “green” when retrieval hit@k ≥ 0.8 and answer keyword coverage ≥ 0.7
on this set. Traces from the run land in Mongo `traces` so a bad answer is
debuggable (wrong chunk vs wrong generation).

That is the production shape: swap the model without rewriting the route,
measure retrieval separately from generation, keep a paper trail.
