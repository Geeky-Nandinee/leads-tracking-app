import { Request, Response, NextFunction } from 'express';
import { LeadService } from '../services/lead.service';

export class LeadController {
  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = LeadService.listLeads(req.query as any);
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const lead = LeadService.getLeadById(id);
      res.status(200).json({
        success: true,
        data: lead
      });
    } catch (err) {
      next(err);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const created = LeadService.createLead(req.body);
      res.status(201).json({
        success: true,
        data: created
      });
    } catch (err) {
      next(err);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const updated = LeadService.updateLead(id, req.body);
      res.status(200).json({
        success: true,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      LeadService.deleteLead(id);
      res.status(200).json({
        success: true,
        message: 'Lead deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = LeadService.getStats();
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const timeframe = (req.query.timeframe as any) || 'daily';
      const analytics = LeadService.getAnalytics(timeframe);
      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (err) {
      next(err);
    }
  }
}

