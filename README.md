# PDF Assist

A Next.js application that securely unlocks password-protected PDF files server-side and returns the unlocked PDF to the user.

## Features

- 🔒 **Secure PDF Unlocking**: Server-side PDF decryption using password with node-qpdf2
- 📄 **Text Preview**: Extract and preview text from the first few pages before downloading
- 💾 **Smart Download**: Download unlocked PDFs via secure temporary URLs
- 🗑️ **Automatic Cleanup**: Uploaded and processed files are deleted after 5 minutes or download
- 📁 **Secure Storage**: Files are stored in a temp folder (not publicly accessible)
- ✅ **File Validation**: Validates file type and size before processing
- 🎨 **Modern UI**: Beautiful drag-and-drop interface with loading states
- 🌙 **Dark Mode**: Supports both light and dark themes

## Tech Stack

- **Next.js 14+** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **node-qpdf2** for PDF unlocking (requires qpdf installed)
- **pdf-parse** for text extraction from PDFs
- **React** for UI components

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
   Copy `.env.example` to `.env.local` and adjust values if needed:
   ```bash
   cp .env.example .env.local
   ```

   Default configuration:
   ```env
   MAX_FILE_SIZE_MB=10
   TEMP_DIR=./temp
   PDF_PREVIEW_PAGES=3
   TEMP_FILE_TIMEOUT=300
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

### Production

Build and start the production server:

```bash
npm run build
npm start
```

## How It Works

1. **Upload**: User uploads a password-protected PDF via drag-and-drop or file picker
2. **Validate**: File type and size are validated on both client and server
3. **Store**: File is temporarily stored in a secure temp folder (not in /public)
4. **Unlock**: PDF is decrypted using node-qpdf2
5. **Extract**: Text is extracted from the first N pages (configurable, default 3)
6. **Preview**: User sees the extracted text content in a scrollable preview
7. **Download**: User can download the full unlocked PDF via a secure temporary URL
8. **Cleanup**: Files are automatically deleted after download or 5-minute timeout

## Project Structure

```
pdfAssist/
├── app/
│   ├── api/
│   │   ├── unlock-pdf/
│   │   │   └── route.ts          # API endpoint for PDF unlocking & text extraction
│   │   └── download-pdf/
│   │       └── [id]/
│   │           └── route.ts      # API endpoint for downloading by ID
│   ├── page.tsx                  # Main upload UI with text preview
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── lib/
│   ├── pdf-unlocker.ts           # PDF unlocking logic using node-qpdf2
│   ├── text-extractor.ts         # Text extraction using pdf-parse
│   └── file-utils.ts             # Temp file management with download IDs
├── temp/                         # Secure temp folder (gitignored)
├── public/                       # Static assets
├── .env.example                  # Environment variables template
├── .env.local                    # Local environment variables (gitignored)
├── middleware.ts                 # Security middleware
├── next.config.js                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies
```

## API Endpoint

### POST /api/unlock-pdf

Unlocks a password-protected PDF file and returns text preview with download URL.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `file`: PDF file (max size configurable via `MAX_FILE_SIZE_MB`)
  - `password`: String - Password to unlock the PDF

**Response:**
- Success (200):
  - Content-Type: `application/json`
  - Body:
    ```json
    {
      "success": true,
      "text": "Extracted text content...",
      "totalPages": 10,
      "extractedPages": 3,
      "downloadId": "uuid",
      "downloadUrl": "/api/download-pdf/uuid",
      "filename": "unlocked-document.pdf"
    }
    ```
- Error (400/500):
  - Content-Type: `application/json`
  - Body: `{ "error": "Error message" }`

**Example using curl:**

```bash
curl -X POST http://localhost:3000/api/unlock-pdf \
  -F "file=@/path/to/locked.pdf" \
  -F "password=yourpassword"
```

### GET /api/download-pdf/[id]

Downloads an unlocked PDF by its download ID.

**Response:**
- Success (200):
  - Content-Type: `application/pdf`
  - Body: Unlocked PDF file (binary)
  - File is deleted after download
- Error (404/500):
  - Content-Type: `application/json`
  - Body: `{ "error": "Error message" }`

**Example:**

```bash
curl http://localhost:3000/api/download-pdf/your-download-id \
  --output unlocked.pdf
```

## Security Features

### File Type Validation
- Only PDF files are accepted
- Validates both file extension and MIME type
- Client-side and server-side validation

### File Size Limits
- Configurable maximum file size (default: 10MB)
- Prevents denial-of-service attacks

### Secure File Storage
- Files stored in `/temp` directory (not `/public`)
- Temp directory is gitignored
- Files are never accessible via HTTP

### Automatic Cleanup
- Files are deleted immediately after processing
- Cleanup happens even if errors occur
- No files are left on the server

### Password Protection
- Passwords are only used server-side
- Never logged or stored
- Transmitted securely over HTTPS in production

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MAX_FILE_SIZE_MB` | Maximum file size in megabytes | `10` |
| `TEMP_DIR` | Directory for temporary files | `./temp` |
| `PDF_PREVIEW_PAGES` | Number of pages to extract text from | `3` |
| `TEMP_FILE_TIMEOUT` | Seconds before auto-cleanup of temp files | `300` (5 min) |

### PDF Unlocking Method

The application uses **node-qpdf2** for PDF decryption:

- Fast and robust
- Handles most PDF encryption types
- Requires qpdf to be installed on the system
- Industry-standard tool for PDF manipulation

If decryption fails, an error is returned to the user with a message to verify the password.

## Development

### Adding New Features

1. **File utilities**: Add to `lib/file-utils.ts`
2. **PDF processing**: Modify `lib/pdf-unlocker.ts`
3. **API logic**: Update `app/api/unlock-pdf/route.ts`
4. **UI changes**: Edit `app/page.tsx`

### Running Tests

```bash
npm run lint
npm run build
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

**Note**: Ensure qpdf is available in your deployment environment. Vercel supports it by default.

### Other Platforms

Ensure your deployment environment has:
- Node.js 18+
- qpdf installed system-wide
- Write permissions for the temp directory

## Troubleshooting

### "QPDF failed" Error

- **Cause**: qpdf not installed or not in PATH
- **Solution**: Install qpdf using your package manager

### "Failed to unlock PDF with all available methods"

- **Cause**: Incorrect password or unsupported encryption
- **Solution**: Verify the password is correct

### File Size Limit Exceeded

- **Cause**: File larger than `MAX_FILE_SIZE_MB`
- **Solution**: Increase the limit in `.env.local`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this project for any purpose.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

Built with ❤️ using Next.js, TypeScript, and Tailwind CSS

