import request from 'supertest';
import app from '../src/app';
import { getDatabase, closeDatabase } from '../src/db/connection';
import { seedDatabase } from '../src/db/seed';
import { config } from '../src/config';

describe('Leads & Notes API Test Suite', () => {
  beforeAll(() => {
    // Force in-memory or fresh test seed
    getDatabase();
    seedDatabase(true);
  });

  afterAll(() => {
    closeDatabase();
  });

  describe('GET /api/health', () => {
    it('should return 200 ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('GET /api/leads', () => {
    it('should return paginated list of leads', async () => {
      const res = await request(app).get('/api/leads');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBeGreaterThan(0);
    });

    it('should filter leads by search term', async () => {
      const res = await request(app).get('/api/leads?search=Connor');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].name).toContain('Connor');
    });

    it('should filter leads by status', async () => {
      const res = await request(app).get('/api/leads?status=qualified');
      expect(res.status).toBe(200);
      expect(res.body.data.every((lead: any) => lead.status === 'qualified')).toBe(true);
    });

    it('should paginate results with page and limit', async () => {
      const res = await request(app).get('/api/leads?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.page).toBe(1);
    });
  });

  describe('POST /api/leads (Validation & Creation)', () => {
    it('should create a new lead successfully', async () => {
      const newLead = {
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        phone: '+1 555 123 4567',
        status: 'new'
      };

      const res = await request(app)
        .post('/api/leads')
        .send(newLead);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.email).toBe(newLead.email);
      expect(res.body.data.status).toBe('new');
    });

    it('should return 400 Bad Request when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/leads')
        .send({
          email: 'missing.name@example.com'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Validation failed');
    });

    it('should return 400 Bad Request on invalid email format', async () => {
      const res = await request(app)
        .post('/api/leads')
        .send({
          name: 'Invalid Email Person',
          email: 'not-an-email',
          phone: '1234567890'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body.details)).toContain('Invalid email');
    });

    it('should return 400 Bad Request on invalid status enum', async () => {
      const res = await request(app)
        .post('/api/leads')
        .send({
          name: 'Invalid Status Person',
          email: 'valid@example.com',
          phone: '1234567890',
          status: 'unknown_status'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/leads/:id', () => {
    let testLeadId: string;

    beforeAll(async () => {
      const createRes = await request(app).post('/api/leads').send({
        name: 'Target Lead',
        email: 'target@example.com',
        phone: '555-0000',
        status: 'contacted'
      });
      testLeadId = createRes.body.data.id;
    });

    it('should return lead with its notes', async () => {
      const res = await request(app).get(`/api/leads/${testLeadId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testLeadId);
      expect(Array.isArray(res.body.data.notes)).toBe(true);
    });

    it('should return 404 Not Found for non-existent lead ID', async () => {
      const res = await request(app).get('/api/leads/non-existent-uuid-12345');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/leads/:id', () => {
    let testLeadId: string;

    beforeAll(async () => {
      const createRes = await request(app).post('/api/leads').send({
        name: 'Patch Target',
        email: 'patch@example.com',
        phone: '555-1111',
        status: 'new'
      });
      testLeadId = createRes.body.data.id;
    });

    it('should update lead status and fields successfully', async () => {
      const res = await request(app)
        .patch(`/api/leads/${testLeadId}`)
        .send({
          status: 'qualified',
          phone: '555-9999'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('qualified');
      expect(res.body.data.phone).toBe('555-9999');
    });

    it('should return 404 when patching non-existent lead', async () => {
      const res = await request(app)
        .patch('/api/leads/non-existent-id')
        .send({ status: 'lost' });

      expect(res.status).toBe(404);
    });

    it('should return 400 if empty update payload is provided', async () => {
      const res = await request(app)
        .patch(`/api/leads/${testLeadId}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('Notes Endpoints: GET & POST /api/leads/:id/notes', () => {
    let testLeadId: string;

    beforeAll(async () => {
      const createRes = await request(app).post('/api/leads').send({
        name: 'Notes Lead',
        email: 'notes.lead@example.com',
        phone: '555-2222',
        status: 'new'
      });
      testLeadId = createRes.body.data.id;
    });

    it('should add a note to a lead', async () => {
      const res = await request(app)
        .post(`/api/leads/${testLeadId}/notes`)
        .send({ content: 'Discussed project scope and budget expectations.' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.leadId).toBe(testLeadId);
      expect(res.body.data.content).toBe('Discussed project scope and budget expectations.');
    });

    it('should return 400 when adding empty note content', async () => {
      const res = await request(app)
        .post(`/api/leads/${testLeadId}/notes`)
        .send({ content: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 when adding note to non-existent lead', async () => {
      const res = await request(app)
        .post('/api/leads/fake-lead-id/notes')
        .send({ content: 'Valid note content' });

      expect(res.status).toBe(404);
    });

    it('should fetch all notes for a lead in chronological order', async () => {
      await request(app)
        .post(`/api/leads/${testLeadId}/notes`)
        .send({ content: 'Second note added later' });

      const res = await request(app).get(`/api/leads/${testLeadId}/notes`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].content).toBe('Second note added later');
    });
  });

  describe('DELETE /api/leads/:id (Cascade Deletion)', () => {
    it('should delete a lead and cascade delete its associated notes', async () => {
      // Create lead
      const createLeadRes = await request(app).post('/api/leads').send({
        name: 'To Delete',
        email: 'delete.me@example.com',
        phone: '555-3333'
      });
      const leadId = createLeadRes.body.data.id;

      // Add note
      await request(app)
        .post(`/api/leads/${leadId}/notes`)
        .send({ content: 'Note will be cascade deleted' });

      // Delete lead
      const deleteRes = await request(app).delete(`/api/leads/${leadId}`);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // Verify lead is gone
      const getLeadRes = await request(app).get(`/api/leads/${leadId}`);
      expect(getLeadRes.status).toBe(404);

      // Verify notes are also gone (cascade)
      const getNotesRes = await request(app).get(`/api/leads/${leadId}/notes`);
      expect(getNotesRes.status).toBe(404);
    });

    it('should return 404 when deleting already deleted lead', async () => {
      const res = await request(app).delete('/api/leads/non-existent-lead');
      expect(res.status).toBe(404);
    });
  });

  describe('Bonus: Basic Auth Middleware', () => {
    it('should allow requests when basic auth is disabled', async () => {
      config.basicAuth.enabled = false;
      const res = await request(app).get('/api/leads');
      expect(res.status).toBe(200);
    });

    it('should enforce 401 when basic auth is enabled without credentials', async () => {
      config.basicAuth.enabled = true;
      const res = await request(app).get('/api/leads');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should allow access with valid Basic Auth header', async () => {
      config.basicAuth.enabled = true;
      const credentials = Buffer.from('admin:secret123').toString('base64');
      const res = await request(app)
        .get('/api/leads')
        .set('Authorization', `Basic ${credentials}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Restore
      config.basicAuth.enabled = false;
    });
  });

  describe('Analytics Endpoint: GET /api/leads/analytics', () => {
    it('should return daily analytics with metrics and trends', async () => {
      const res = await request(app).get('/api/leads/analytics?timeframe=daily');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.timeframe).toBe('daily');
      expect(res.body.data.metrics).toBeDefined();
      expect(res.body.data.metrics.totalLeads).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.trends)).toBe(true);
      expect(res.body.data.trends.length).toBe(14);
      expect(Array.isArray(res.body.data.recentActivities)).toBe(true);
    });

    it('should return weekly analytics with 8 weekly intervals', async () => {
      const res = await request(app).get('/api/leads/analytics?timeframe=weekly');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.timeframe).toBe('weekly');
      expect(res.body.data.trends.length).toBe(8);
    });

    it('should return monthly analytics with 6 monthly intervals', async () => {
      const res = await request(app).get('/api/leads/analytics?timeframe=monthly');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.timeframe).toBe('monthly');
      expect(res.body.data.trends.length).toBe(6);
    });
  });
});

