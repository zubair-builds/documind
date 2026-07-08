# DocuMind

A Next.js application that securely unlocks password-protected PDF files server-side, extracts text, and allows you to chat with your PDFs using an AI assistant powered by Google Gemini.

## Features

- 🔒 **Secure PDF Unlocking**: Server-side PDF decryption using password with node-qpdf2
- 🤖 **AI Chat (RAG)**: Chat with your PDF documents! Ask questions and get answers based on the document's content using Google Gemini.
- 📊 **Financial Statement Analysis**: Use Gemini's massive context window to exhaustively extract, summarize, and categorize credit card transactions from messy bank statements.
- ⏱️ **Performance Metrics**: Real-time tracking of AI response times and token usage directly in the chat UI.
- 👤 **User Authentication**: Secure signup and login using NextAuth.
- 📄 **Text Extraction**: Extract text from PDFs and chunk it for vector embeddings.
- 🔍 **Vector Search**: In-memory cosine similarity search backed by standard MongoDB (no expensive vector DB required!).
- 💾 **Smart Download**: Download unlocked PDFs via secure temporary URLs.
- ✅ **File Validation**: Validates file type and size before processing.
- 🎨 **Modern UI**: Beautiful drag-and-drop interface with loading states and dark mode.

## Tech Stack

- **Next.js 14+** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **MongoDB & Mongoose** for storing users, PDF metadata, text chunks, statement analytics, and vector embeddings
- **Google Generative AI (Gemini)** for embeddings and chat (`gemini-3.1-flash-lite` and `gemini-2.5-flash` for data extraction)
- **NextAuth.js** for authentication
- **node-qpdf2** for PDF unlocking (requires qpdf installed)
- **pdf-parse** for text extraction from PDFs

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd pdfAssist
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Copy `.env.example` to `.env.local` and adjust values:
   ```bash
   cp .env.example .env.local
   ```

   Required variables in `.env.local`:
   ```env
   # Storage and Uploads
   MAX_FILE_SIZE_MB=10
   TEMP_DIR=./temp
   PDF_PREVIEW_PAGES=3
   TEMP_FILE_TIMEOUT=300

   # Database
   MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/pdf-assist

   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret_here

   # Security
   ENCRYPTION_KEY=your_32_character_encryption_key_here
   JWT_SECRET=your_jwt_secret_here

   # AI integration
   GEMINI_API_KEY=your_google_gemini_api_key_here
   ```

4. **Install qpdf** (required for node-qpdf2):
   - **macOS**: `brew install qpdf`
   - **Ubuntu/Debian**: `sudo apt-get install qpdf`
   - **Windows**: Download from [qpdf.sourceforge.io](https://qpdf.sourceforge.io/)

## Usage

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

1. **Authentication**: Users sign up and log in to manage their PDFs securely.
2. **Upload & Unlock**: Users upload locked PDFs and provide a password. The PDF is decrypted using node-qpdf2.
3. **Chunking & Embeddings**: The text is extracted via pdf-parse, chunked into smaller segments, and sent to Gemini to generate vector embeddings.
4. **Storage**: PDF metadata, chunks, and embeddings are saved in standard MongoDB.
5. **Statement Analysis**: For bank statements, the entire document is analyzed by Gemini to extract structured transaction data, categories, and totals.
6. **AI Chat (RAG)**: When a user asks a question, the app generates an embedding for the query, performs an in-memory cosine similarity search against the document's chunks, and sends the most relevant chunks to Gemini to generate an answer.
7. **Download**: Users can download the fully unlocked PDF.

## Deployment

### Render (Recommended for Full-Stack)

When deploying to Render (or other platforms with ephemeral storage), you must be aware of how uploaded files are stored:

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
