import { Router } from 'express';
import { storagePut } from '../../storage';
import { logger } from '../../lib/logger';
import { isUserAllowedForClient } from '../../db';

export const uploadRouter = Router();

uploadRouter.post('/', async (req: any, res) => {
    try {
        // Authentication check
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required for uploads' });
        }

        const { filename, data, contentType, folder = 'uploads', clientId } = req.body;

        if (!filename || !data) {
            return res.status(400).json({ error: 'Missing filename or data' });
        }

        // Folder validation - prevent path traversal
        if (typeof folder !== 'string' || folder.includes('..') || folder.startsWith('/') || folder.includes(':') || folder.includes('\\')) {
            return res.status(400).json({ error: 'Invalid folder path' });
        }

        // Determine destination folder with tenant scoping if clientId is provided
        let targetFolder = folder;
        if (clientId) {
            const parsedClientId = parseInt(String(clientId), 10);
            if (!isNaN(parsedClientId)) {
                // Validate client permission
                if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.role !== 'enterprise_admin') {
                    const hasAccess = await isUserAllowedForClient(req.user.id, parsedClientId);
                    if (!hasAccess) {
                        return res.status(403).json({ error: 'Forbidden: You do not have access to this client organization' });
                    }
                }
                const subfolder = folder === 'uploads' ? '' : `/${folder.replace(/^clients\/\d+\/?/, '')}`;
                targetFolder = `clients/${parsedClientId}${subfolder}`;
            }
        }

        // Decode base64
        const buffer = Buffer.from(data, 'base64');

        // File size limit: 20MB
        if (buffer.length > 20 * 1024 * 1024) {
            return res.status(413).json({ error: 'File size exceeds maximum limit of 20MB' });
        }

        // Sanitize filename and create path
        const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const key = `${targetFolder}/${Date.now()}-${safeFilename}`;

        // Upload
        const result = await storagePut(key, buffer, contentType || 'application/octet-stream');

        res.json({
            success: true,
            url: result.url,
            key: result.key
        });
    } catch (error) {
        logger.error('Upload failed:', error);
        const errorMsg = process.env.NODE_ENV === 'development'
            ? 'Upload failed: ' + (error as Error).message
            : 'Upload failed: Internal server error';
        res.status(500).json({ error: errorMsg });
    }
});
