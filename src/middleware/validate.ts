import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../errors/app-error';

export function validate(schema: ZodSchema<any>, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      if (source === 'query') {
        // Express 5 req.query has only a getter, mutate properties instead of reassigning
        for (const key of Object.keys(req.query)) {
          delete (req.query as any)[key];
        }
        Object.assign(req.query, parsed);
      } else {
        req[source] = parsed;
      }
      next();
    } catch (err: any) {
      if (err instanceof ZodError || err?.name === 'ZodError') {
        const issues = err.issues || err.errors || [];
        const errorMessages = issues.map((e: any) => ({
          field: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''),
          message: e.message
        }));
        return next(AppError.badRequest('Validation failed', errorMessages));
      }
      next(err);
    }
  };
}
