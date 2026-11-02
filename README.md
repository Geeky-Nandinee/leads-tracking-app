# Leads Tracking App

A web portal and REST API to manage sales leads and interaction notes, built with Node.js, Express, TypeScript, and SQLite.

---

## Quick Start

### 1. Install & Run
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open your browser at **http://localhost:3000**

---

## Features

- **Leads CRUD**: Manage leads (`id`, `name`, `email`, `phone`, `status`, `createdAt`).
- **Notes per Lead**: Add multiple timestamped notes linked by SQLite foreign keys (cascade on delete).
- **Web Portal**: Search by name/email, status filters, create lead modal, and lead detail drawer.
- **Analytics Dashboard**: Daily, weekly, and monthly trend graphs and conversion metrics.
- **Validation**: Strict email and field validation via Zod (returns 400 Bad Request).
- **Bonus Items**: Pagination, Basic Auth option, automated Jest tests, and Dockerfile.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Run development server with auto-reload |
| `npm test` | Run all 26 automated Jest tests |
| `npm run seed` | Populate database with sample leads |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production server |

---

## API Examples (cURL)

Base URL: `http://localhost:3000/api`

### 1. List Leads (with search, status filter & pagination)
```bash
curl "http://localhost:3000/api/leads?search=Sarah&status=qualified&page=1&limit=10"
```

### 2. Create Lead
```bash
curl -X POST "http://localhost:3000/api/leads" \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","phone":"+1 555 123 4567","status":"new"}'
```

### 3. Get Single Lead (with notes)
```bash
curl "http://localhost:3000/api/leads/<LEAD_ID>"
```

### 4. Update Lead Status
```bash
curl -X PATCH "http://localhost:3000/api/leads/<LEAD_ID>" \
  -H "Content-Type: application/json" \
  -d '{"status":"qualified"}'
```

### 5. Add Note to Lead
```bash
curl -X POST "http://localhost:3000/api/leads/<LEAD_ID>/notes" \
  -H "Content-Type: application/json" \
  -d '{"content":"Discussed pricing and contract terms."}'
```

### 6. Delete Lead
```bash
curl -X DELETE "http://localhost:3000/api/leads/<LEAD_ID>"
```

### 7. Pipeline Analytics (Daily, Weekly, Monthly)
```bash
curl "http://localhost:3000/api/leads/analytics?timeframe=daily"
```

---

## Docker

Run using Docker Compose:
```bash
docker-compose up --build
```

---

## Environment Variables (.env)

```env
PORT=3000
NODE_ENV=development
DB_PATH=./data/leads.db

# Optional Basic Auth
ENABLE_BASIC_AUTH=false
BASIC_AUTH_USER=admin
BASIC_AUTH_PASS=secret123
```
