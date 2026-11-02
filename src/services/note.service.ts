import { randomUUID } from 'crypto';
import { getDatabase } from '../db/connection';
import { AppError } from '../errors/app-error';
import { CreateNoteInput, Note } from '../types';

export class NoteService {
  public static getNotesByLeadId(leadId: string): Note[] {
    const db = getDatabase();

    const lead = db.prepare('SELECT id FROM leads WHERE id = ?').get(leadId);
    if (!lead) {
      throw AppError.notFound(`Lead with ID '${leadId}' not found`);
    }

    const notes = db.prepare(`
      SELECT id, leadId, content, createdAt
      FROM notes
      WHERE leadId = ?
      ORDER BY createdAt DESC
    `).all(leadId) as Note[];

    return notes;
  }

  public static addNote(leadId: string, input: CreateNoteInput): Note {
    const db = getDatabase();

    const lead = db.prepare('SELECT id FROM leads WHERE id = ?').get(leadId);
    if (!lead) {
      throw AppError.notFound(`Lead with ID '${leadId}' not found`);
    }

    const id = randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO notes (id, leadId, content, createdAt)
      VALUES (?, ?, ?, ?)
    `).run(id, leadId, input.content.trim(), createdAt);

    return {
      id,
      leadId,
      content: input.content.trim(),
      createdAt
    };
  }
}
