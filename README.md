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
