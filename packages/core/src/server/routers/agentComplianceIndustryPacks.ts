/**
 * PHASE 5: Industry Pack API Router
 */

import { Router, Request, Response } from 'express';
import { getIndustryPack, getPacksForIndustry, INDUSTRY_PACKS } from '../../lib/agent/industryPacks';

export function createIndustryPackRouter() {
  const router = Router();

  // List all industry packs (summary)
  router.get('/industry-packs', (_req: Request, res: Response) => {
    const summaries = INDUSTRY_PACKS.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      targetIndustries: p.targetIndustries,
      controlCount: p.frameworks.reduce((sum, f) => sum + f.controls.length, 0),
    }));
    res.json({ data: summaries });
  });

  // Get full pack details
  router.get('/industry-packs/:id', (req: Request, res: Response) => {
    const pack = getIndustryPack(req.params.id);
    if (!pack) return res.status(404).json({ error: 'Pack not found', code: 'NOT_FOUND' });
    res.json({ data: pack });
  });

  // Find packs by industry
  router.get('/industry-packs/for/:industry', (req: Request, res: Response) => {
    const packs = getPacksForIndustry(req.params.industry);
    res.json({ data: packs });
  });

  return router;
}
