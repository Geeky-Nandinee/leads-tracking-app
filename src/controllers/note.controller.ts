import { Request, Response, NextFunction } from 'express';
import { NoteService } from '../services/note.service';

export class NoteController {
  public static async getNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const notes = NoteService.getNotesByLeadId(id);
      res.status(200).json({
        success: true,
        data: notes
      });
    } catch (err) {
      next(err);
    }
  }

  public static async createNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const note = NoteService.addNote(id, req.body);
      res.status(201).json({
        success: true,
        data: note
      });
    } catch (err) {
      next(err);
    }
  }
}
