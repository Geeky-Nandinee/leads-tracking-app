export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'lost';

export const VALID_LEAD_STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'lost'];

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  leadId: string;
  content: string;
  createdAt: string;
}

export interface LeadWithNotes extends Lead {
  notes: Note[];
}

export interface CreateLeadInput {
  name: string;
  email: string;
  phone: string;
  status?: LeadStatus;
}

export interface UpdateLeadInput {
  name?: string;
  email?: string;
  phone?: string;
  status?: LeadStatus;
}

export interface CreateNoteInput {
  content: string;
}

export interface LeadQueryFilter {
  search?: string;
  status?: LeadStatus;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export type AnalyticsTimeframe = 'daily' | 'weekly' | 'monthly';

export interface TrendPoint {
  period: string;
  label: string;
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  lost: number;
}

export interface AnalyticsResponse {
  timeframe: AnalyticsTimeframe;
  metrics: {
    totalLeads: number;
    conversionRate: number;
    contactRate: number;
    lossRate: number;
    totalNotes: number;
    avgNotesPerLead: number;
  };
  statusBreakdown: {
    new: number;
    contacted: number;
    qualified: number;
    lost: number;
  };
  trends: TrendPoint[];
  recentActivities: Array<{
    id: string;
    leadId: string;
    leadName: string;
    content: string;
    createdAt: string;
  }>;
}

