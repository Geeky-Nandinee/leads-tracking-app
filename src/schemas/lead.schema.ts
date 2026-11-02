import { z } from 'zod';

export const LeadStatusEnum = z.enum(['new', 'contacted', 'qualified', 'lost']);

export const createLeadSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address format'),
  phone: z.string().trim().min(1, 'Phone is required').max(30, 'Phone cannot exceed 30 characters'),
  status: LeadStatusEnum.default('new')
});

export const updateLeadSchema = z.object({
  name: z.string().trim().min(1, 'Name cannot be empty').max(100, 'Name cannot exceed 100 characters').optional(),
  email: z.string().trim().email('Invalid email address format').optional(),
  phone: z.string().trim().min(1, 'Phone cannot be empty').max(30, 'Phone cannot exceed 30 characters').optional(),
  status: LeadStatusEnum.optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided to update'
});

export const leadQuerySchema = z.object({
  search: z.string().optional(),
  status: z.union([LeadStatusEnum, z.literal('')]).optional(),
  page: z.preprocess((val) => (val ? parseInt(String(val), 10) : 1), z.number().int().positive().default(1)),
  limit: z.preprocess((val) => (val ? parseInt(String(val), 10) : 10), z.number().int().positive().max(100).default(10))
});

export const createNoteSchema = z.object({
  content: z.string().trim().min(1, 'Note content is required').max(2000, 'Note content cannot exceed 2000 characters')
});

export const leadIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Lead ID is required')
});
