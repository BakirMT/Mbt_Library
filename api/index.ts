import type { Request, Response } from 'express';
import app from '../server.ts';

export default function handler(req: Request, res: Response) {
  // Ensure the request path starts with /api if Vercel rewrite forwarded a stripped path
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
}
