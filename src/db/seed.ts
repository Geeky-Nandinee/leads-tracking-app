import { randomUUID } from 'crypto';
import { getDatabase } from './connection';
import { LeadStatus } from '../types';

export function seedDatabase(force: boolean = false): void {
  const db = getDatabase();

  const countRow = db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number };

  if (countRow.count > 0 && !force) {
    console.log(`[Seed] Database already contains ${countRow.count} leads. Skipping seed.`);
    return;
  }

  if (force) {
    db.exec('DELETE FROM notes; DELETE FROM leads;');
  }

  const sampleLeads: Array<{
    name: string;
    email: string;
    phone: string;
    status: LeadStatus;
    notes: string[];
    daysAgo: number;
  }> = [
    {
      name: 'Sarah Connor',
      email: 'sarah.connor@cyberdyne.io',
      phone: '+1 (555) 234-5678',
      status: 'qualified',
      notes: [
        'Initial discovery call completed. Very interested in our enterprise plan.',
        'Sent technical architecture brief and pricing tiers.',
        'Scheduled follow-up demo for next Tuesday.'
      ],
      daysAgo: 10
    },
    {
      name: 'Alexander Wright',
      email: 'a.wright@novatech.com',
      phone: '+1 (555) 987-6543',
      status: 'new',
      notes: [
        'Inbound inquiry via landing page contact form.'
      ],
      daysAgo: 2
    },
    {
      name: 'Elena Rostova',
      email: 'elena@solaris-energy.de',
      phone: '+49 30 1234567',
      status: 'contacted',
      notes: [
        'Reached out via email with product deck.',
        'Followed up on LinkedIn. Awaiting feedback from their CTO.'
      ],
      daysAgo: 5
    },
    {
      name: 'Marcus Chen',
      email: 'marcus.chen@apexlogistics.com',
      phone: '+1 (555) 456-7890',
      status: 'qualified',
      notes: [
        'Budget approved for Q3 rollout.',
        'Security compliance review questionnaire received and submitted.'
      ],
      daysAgo: 14
    },
    {
      name: 'Jessica Miller',
      email: 'jmiller@horizonventures.co',
      phone: '+1 (555) 345-6789',
      status: 'lost',
      notes: [
        'Budget postponed to next fiscal year. Keep in nurture list.',
        'Sent invitation to our quarterly product webinar.'
      ],
      daysAgo: 25
    },
    {
      name: 'David Patel',
      email: 'david.patel@cloudscale.net',
      phone: '+44 20 7946 0912',
      status: 'new',
      notes: [
        'Downloaded whitepaper on API integration best practices.'
      ],
      daysAgo: 1
    },
    {
      name: 'Aisha Al-Mansoor',
      email: 'aisha@gulfcapital.ae',
      phone: '+971 4 321 4567',
      status: 'contacted',
      notes: [
        'Introductory call conducted with sales representative.',
        'Requested customized quotation for 50 team seats.'
      ],
      daysAgo: 7
    }
  ];

  const insertLead = db.prepare(`
    INSERT INTO leads (id, name, email, phone, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertNote = db.prepare(`
    INSERT INTO notes (id, leadId, content, createdAt)
    VALUES (?, ?, ?, ?)
  `);

  const now = Date.now();

  const transaction = db.transaction(() => {
    for (const leadData of sampleLeads) {
      const leadId = randomUUID();
      const createdAt = new Date(now - leadData.daysAgo * 86400000).toISOString();
      const updatedAt = createdAt;

      insertLead.run(leadId, leadData.name, leadData.email, leadData.phone, leadData.status, createdAt, updatedAt);

      let noteOffsetMinutes = 30;
      for (const noteContent of leadData.notes) {
        const noteId = randomUUID();
        const noteCreatedAt = new Date(new Date(createdAt).getTime() + noteOffsetMinutes * 60000).toISOString();
        insertNote.run(noteId, leadId, noteContent, noteCreatedAt);
        noteOffsetMinutes += 120;
      }
    }
  });

  transaction();
  console.log(`[Seed] Successfully seeded ${sampleLeads.length} sample leads and related notes.`);
}

// Allow running directly via ts-node / node
if (require.main === module) {
  seedDatabase(true);
}
