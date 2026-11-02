import { Router } from 'express';
import { LeadController } from '../controllers/lead.controller';
import { NoteController } from '../controllers/note.controller';
import { validate } from '../middleware/validate';
import {
  createLeadSchema,
  createNoteSchema,
  leadIdParamSchema,
  leadQuerySchema,
  updateLeadSchema
} from '../schemas/lead.schema';

const router = Router();

// Stats & Analytics
router.get('/stats', LeadController.getStats);
router.get('/analytics', LeadController.getAnalytics);

// Leads CRUD
router.get('/', validate(leadQuerySchema, 'query'), LeadController.list);
router.post('/', validate(createLeadSchema, 'body'), LeadController.create);
router.get('/:id', validate(leadIdParamSchema, 'params'), LeadController.getById);
router.patch(
  '/:id',
  validate(leadIdParamSchema, 'params'),
  validate(updateLeadSchema, 'body'),
  LeadController.update
);
router.delete('/:id', validate(leadIdParamSchema, 'params'), LeadController.delete);

// Notes per lead
router.get('/:id/notes', validate(leadIdParamSchema, 'params'), NoteController.getNotes);
router.post(
  '/:id/notes',
  validate(leadIdParamSchema, 'params'),
  validate(createNoteSchema, 'body'),
  NoteController.createNote
);

export default router;
