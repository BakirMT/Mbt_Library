import type { Request, Response } from 'express';
import app from '../server.ts';

export default async function handler(req: Request, res: Response) {
  try {
    // Ensure the request path starts with /api if Vercel rewrite forwarded a stripped path
    if (req.url && !req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
    return await app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Function Error]:', err);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({
        error: err?.message || 'A server error occurred while processing the request.',
      });
    }
  }
}
