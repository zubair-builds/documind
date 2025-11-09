# Security Documentation

## Overview

PDF Assist implements multiple layers of security to protect user data and prevent abuse.

## Security Features

### 1. File Type Validation

**Client-Side:**
- HTML5 `accept` attribute restricts file picker to PDF files
- JavaScript validates MIME type before upload

**Server-Side:**
- Validates file extension (`.pdf`)
- Validates MIME type (`application/pdf`)
- Double validation ensures bypass attempts are caught

### 2. File Size Limits

**Configurable Limits:**
- Default: 10MB maximum file size
- Prevents denial-of-service attacks
- Configurable via `MAX_FILE_SIZE_MB` environment variable

**Implementation:**
```typescript
const maxFileSize = getMaxFileSize();
if (file.size > maxFileSize) {
  return error response
}
```

### 3. Secure File Storage

**Isolation:**
- Files stored in `/temp` directory (NOT in `/public`)
- Temp directory is outside web root
- No HTTP access to temp files

**Access Control:**
- Middleware blocks all requests to `/temp/*`
- Returns 403 Forbidden for any temp directory access
- Additional header configuration prevents indexing

### 4. Automatic File Cleanup

**Immediate Deletion:**
- Files deleted immediately after processing
- Cleanup happens even on errors
- No files persist on server

**Implementation:**
```typescript
try {
  // Process file
  return response;
} finally {
  // Always clean up
  await deleteTempFiles([inputPath, outputPath]);
}
```

### 5. Password Security

**Transmission:**
- Passwords sent via HTTPS in production
- Never logged or persisted
- Only used for PDF decryption

**Processing:**
- Passwords processed only in memory
- Immediately discarded after use
- No password caching

### 6. Error Handling

**Information Disclosure Prevention:**
- Generic error messages to users
- Detailed errors only in server logs
- No stack traces exposed to clients

**Example:**
```typescript
catch (error) {
  console.error(error); // Server log only
  return { error: 'Failed to unlock PDF' }; // Generic message
}
```

## Security Checklist

- [x] File type validation (client + server)
- [x] File size limits (configurable)
- [x] Secure temp directory (not in /public)
- [x] Middleware blocking temp directory access
- [x] Automatic file cleanup
- [x] Password security (no logging/storage)
- [x] Error handling (no information leakage)
- [x] HTTPS in production (recommended)
- [x] No file persistence
- [x] Input sanitization

## Best Practices for Deployment

### 1. Environment Variables

Always set in production:
```env
MAX_FILE_SIZE_MB=10
TEMP_DIR=./temp
NODE_ENV=production
```

### 2. HTTPS

- Always use HTTPS in production
- Passwords and files transmitted securely
- Use services like Vercel, Netlify, or configure SSL

### 3. Rate Limiting

Consider adding rate limiting to prevent abuse:
- Per IP address
- Per time window
- Recommended: 10 requests per minute

### 4. Monitoring

Monitor for:
- Unusual file upload patterns
- Failed unlock attempts
- Disk space usage
- API response times

### 5. System Requirements

Ensure production environment has:
- qpdf installed and in PATH
- Write permissions for temp directory
- Sufficient disk space for temp files
- Regular cleanup of orphaned files (if any)

## Known Limitations

1. **Password Strength**: No validation of password strength (by design - we don't know the PDF's password policy)
2. **File Type Detection**: Relies on MIME type which can be spoofed (mitigated by qpdf/pdf-lib which will fail on non-PDFs)
3. **Concurrent Uploads**: No rate limiting by default (should be added in production)

## Reporting Security Issues

If you discover a security vulnerability, please email security@example.com (update with actual email).

Do NOT open public issues for security vulnerabilities.

## Security Audit History

- Initial release: All security features implemented
- No known vulnerabilities

## Compliance

This application:
- Does not store user data
- Does not track users
- Processes files transiently
- Deletes all data immediately

Suitable for:
- GDPR compliance (no data retention)
- Privacy-focused use cases
- Confidential document processing

