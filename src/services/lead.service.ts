import { randomUUID } from 'crypto';
import { getDatabase } from '../db/connection';
import { AppError } from '../errors/app-error';
import { CreateLeadInput, Lead, LeadQueryFilter, LeadWithNotes, PaginatedResponse, UpdateLeadInput, AnalyticsResponse, AnalyticsTimeframe, TrendPoint } from '../types';

export class LeadService {
  public static listLeads(filters: LeadQueryFilter): PaginatedResponse<Lead> {
    const db = getDatabase();
    const page = Math.max(1, parseInt(String(filters.page || 1), 10));
    const limit = Math.max(1, parseInt(String(filters.limit || 10), 10));
    const { search, status } = filters;

    const conditions: string[] = [];
    const params: any[] = [];

    if (search && search.trim() !== '') {
      conditions.push('(name LIKE ? OR email LIKE ?)');
      const pattern = `%${search.trim()}%`;
      params.push(pattern, pattern);
    }

    if (status && status.trim() !== '') {
      conditions.push('status = ?');
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as count FROM leads ${whereClause}`;
    const totalRow = db.prepare(countSql).get(...params) as { count: number };
    const total = totalRow.count;

    const offset = (page - 1) * limit;
    const dataSql = `
      SELECT id, name, email, phone, status, createdAt, updatedAt
      FROM leads
      ${whereClause}
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `;

    const leads = db.prepare(dataSql).all(...params, limit, offset) as Lead[];
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: leads,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  public static getLeadById(id: string): LeadWithNotes {
    const db = getDatabase();
    const lead = db.prepare(`
      SELECT id, name, email, phone, status, createdAt, updatedAt
      FROM leads
      WHERE id = ?
    `).get(id) as Lead | undefined;

    if (!lead) {
      throw AppError.notFound(`Lead with ID '${id}' not found`);
    }

    const notes = db.prepare(`
      SELECT id, leadId, content, createdAt
      FROM notes
      WHERE leadId = ?
      ORDER BY createdAt DESC
    `).all(id) as LeadWithNotes['notes'];

    return {
      ...lead,
      notes
    };
  }

  public static createLead(input: CreateLeadInput): Lead {
    const db = getDatabase();
    const id = randomUUID();
    const now = new Date().toISOString();
    const status = input.status || 'new';

    db.prepare(`
      INSERT INTO leads (id, name, email, phone, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, input.name.trim(), input.email.trim(), input.phone.trim(), status, now, now);

    return {
      id,
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      status,
      createdAt: now,
      updatedAt: now
    };
  }

  public static updateLead(id: string, input: UpdateLeadInput): Lead {
    const db = getDatabase();
    // Verify lead exists
    const existing = db.prepare('SELECT id FROM leads WHERE id = ?').get(id);
    if (!existing) {
      throw AppError.notFound(`Lead with ID '${id}' not found`);
    }

    const fieldsToUpdate: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      fieldsToUpdate.push('name = ?');
      values.push(input.name.trim());
    }
    if (input.email !== undefined) {
      fieldsToUpdate.push('email = ?');
      values.push(input.email.trim());
    }
    if (input.phone !== undefined) {
      fieldsToUpdate.push('phone = ?');
      values.push(input.phone.trim());
    }
    if (input.status !== undefined) {
      fieldsToUpdate.push('status = ?');
      values.push(input.status);
    }

    const now = new Date().toISOString();
    fieldsToUpdate.push('updatedAt = ?');
    values.push(now);

    values.push(id);

    const updateSql = `
      UPDATE leads
      SET ${fieldsToUpdate.join(', ')}
      WHERE id = ?
    `;

    db.prepare(updateSql).run(...values);

    const updated = db.prepare(`
      SELECT id, name, email, phone, status, createdAt, updatedAt
      FROM leads
      WHERE id = ?
    `).get(id) as Lead;

    return updated;
  }

  public static deleteLead(id: string): void {
    const db = getDatabase();
    const existing = db.prepare('SELECT id FROM leads WHERE id = ?').get(id);
    if (!existing) {
      throw AppError.notFound(`Lead with ID '${id}' not found`);
    }

    db.prepare('DELETE FROM leads WHERE id = ?').run(id);
  }

  public static getStats(): {
    total: number;
    new: number;
    contacted: number;
    qualified: number;
    lost: number;
  } {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM leads
      GROUP BY status
    `).all() as Array<{ status: string; count: number }>;

    const stats = {
      total: 0,
      new: 0,
      contacted: 0,
      qualified: 0,
      lost: 0
    };

    for (const row of rows) {
      const key = row.status as keyof typeof stats;
      if (stats[key] !== undefined) {
        stats[key] = row.count;
      }
      stats.total += row.count;
    }

    return stats;
  }

  public static getAnalytics(timeframe: AnalyticsTimeframe = 'daily'): AnalyticsResponse {
    const db = getDatabase();

    const statusCounts = this.getStats();

    const notesCountRow = db.prepare('SELECT COUNT(*) as count FROM notes').get() as { count: number };
    const totalNotes = notesCountRow?.count || 0;

    const totalLeads = statusCounts.total;
    const conversionRate = totalLeads > 0 ? parseFloat(((statusCounts.qualified / totalLeads) * 100).toFixed(1)) : 0;
    const contactRate = totalLeads > 0 ? parseFloat((((statusCounts.contacted + statusCounts.qualified + statusCounts.lost) / totalLeads) * 100).toFixed(1)) : 0;
    const lossRate = totalLeads > 0 ? parseFloat(((statusCounts.lost / totalLeads) * 100).toFixed(1)) : 0;
    const avgNotesPerLead = totalLeads > 0 ? parseFloat((totalNotes / totalLeads).toFixed(1)) : 0;

    const allLeads = db.prepare('SELECT status, createdAt FROM leads ORDER BY createdAt ASC').all() as Array<{ status: string; createdAt: string }>;

    const now = new Date();
    const trends: TrendPoint[] = [];

    if (timeframe === 'daily') {
      const days = 14;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        const dateStr = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        trends.push({
          period: dateStr,
          label,
          total: 0,
          new: 0,
          contacted: 0,
          qualified: 0,
          lost: 0
        });
      }

      for (const lead of allLeads) {
        const leadDate = lead.createdAt.slice(0, 10);
        const point = trends.find(t => t.period === leadDate);
        if (point) {
          point.total++;
          if (lead.status in point) {
            (point as any)[lead.status]++;
          }
        }
      }
    } else if (timeframe === 'weekly') {
      const weeks = 8;
      for (let i = weeks - 1; i >= 0; i--) {
        const endDay = new Date(now.getTime() - i * 7 * 86400000);
        const startDay = new Date(endDay.getTime() - 6 * 86400000);
        const period = `W${i}`;
        const label = `${startDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        trends.push({
          period,
          label,
          total: 0,
          new: 0,
          contacted: 0,
          qualified: 0,
          lost: 0
        });
      }

      for (const lead of allLeads) {
        const leadTime = new Date(lead.createdAt).getTime();
        for (let i = 0; i < weeks; i++) {
          const revIndex = weeks - 1 - i;
          const endDayTime = new Date(now.getTime() - revIndex * 7 * 86400000).setHours(23, 59, 59, 999);
          const startDayTime = new Date(endDayTime - 7 * 86400000).getTime();
          if (leadTime >= startDayTime && leadTime <= endDayTime) {
            trends[i].total++;
            if (lead.status in trends[i]) {
              (trends[i] as any)[lead.status]++;
            }
            break;
          }
        }
      }
    } else {
      const months = 6;
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        trends.push({
          period,
          label,
          total: 0,
          new: 0,
          contacted: 0,
          qualified: 0,
          lost: 0
        });
      }

      for (const lead of allLeads) {
        const leadMonth = lead.createdAt.slice(0, 7);
        const point = trends.find(t => t.period === leadMonth);
        if (point) {
          point.total++;
          if (lead.status in point) {
            (point as any)[lead.status]++;
          }
        }
      }
    }

    const recentActivities = db.prepare(`
      SELECT n.id, n.leadId, l.name as leadName, n.content, n.createdAt
      FROM notes n
      JOIN leads l ON l.id = n.leadId
      ORDER BY n.createdAt DESC
      LIMIT 8
    `).all() as Array<{ id: string; leadId: string; leadName: string; content: string; createdAt: string }>;

    return {
      timeframe,
      metrics: {
        totalLeads,
        conversionRate,
        contactRate,
        lossRate,
        totalNotes,
        avgNotesPerLead
      },
      statusBreakdown: {
        new: statusCounts.new,
        contacted: statusCounts.contacted,
        qualified: statusCounts.qualified,
        lost: statusCounts.lost
      },
      trends,
      recentActivities
    };
  }
}
