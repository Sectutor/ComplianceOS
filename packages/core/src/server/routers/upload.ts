import { Router } from 'express';
import { storagePut } from '../../storage';
import { logger } from '../../lib/logger';

export const uploadRouter = Router();

// SECURITY: Max file size (10MB in bytes)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// SECURITY: Allowed content types
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/json',
  'application/zip',
]);

uploadRouter.post('/', async (req: any, res) => {
    try {
        // Authentication check
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required for uploads' });
        }

        const { filename, data, contentType, folder = 'uploads' } = req.body;

        if (!filename || !data) {
            return res.status(400).json({ error: 'Missing filename or data' });
        }

        // SECURITY: Validate content type
        const detectedType = contentType || 'application/octet-stream';
        if (!ALLOWED_MIME_TYPES.has(detectedType) && detectedType !== 'application/octet-stream') {
            logger.warn({ message: '[Upload] Rejected disallowed content type', type: detectedType, user: req.user?.id });
            return res.status(400).json({ error: 'File type not allowed' });
        }

        // SECURITY: File size limit
        const buffer = Buffer.from(data, 'base64');
        if (buffer.length > MAX_FILE_SIZE) {
            logger.warn({ message: '[Upload] Rejected oversized file', size: buffer.length, max: MAX_FILE_SIZE });
            return res.status(413).json({ error: `File exceeds maximum size of ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB` });
        }

        // SECURITY: Path traversal prevention — only allow alphanumeric folder names
        if (!/^[a-zA-Z0-9_-]+$/.test(folder)) {
            logger.warn({ message: '[Upload] Rejected invalid folder path', folder, user: req.user?.id });
            return res.status(400).json({ error: 'Invalid folder path' });
        }

        // SECURITY: Sanitize filename — strip path separators and dangerous chars
        const safeFilename = filename
            .replace(/[/\\:*?"<>|]/g, '_')
            .replace(/\.\./g, '')
            .substring(0, 255); // Limit filename length
        const key = `${folder}/${Date.now()}-${safeFilename}`;

        // Upload
        const result = await storagePut(key, buffer, detectedType);

        res.json({
            success: true,
            url: result.url,
            key: result.key
        });
    } catch (error) {
        logger.error({ message: '[Upload] Upload failed' });
        // SECURITY: Don't leak error details to client
        res.status(500).json({ error: 'Upload failed' });
    }
});
