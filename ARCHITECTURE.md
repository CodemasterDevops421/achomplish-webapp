# Accomplish - Technical Architecture

## Stack Overview

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| **UI Components** | shadcn/ui |
| **Authentication** | Clerk |
| **Database** | Neon Postgres + Drizzle ORM |
| **AI** | Anthropic Claude API (OpenAI fallback) |
| **Email** | Resend |
| **Analytics** | PostHog |
| **Error Tracking** | Sentry |
| **Hosting** | Vercel |

---

## Directory Structure

```
src/
├── app/
│   ├── (auth)/           # Auth pages (Clerk)
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (dashboard)/      # Protected routes
│   │   ├── page.tsx      # Daily entry (home)
│   │   ├── entries/      # Past entries
│   │   ├── review/       # Review generator (V1.5)
│   │   └── settings/     # User settings
│   ├── api/
│   │   ├── entries/      # CRUD endpoints
│   │   ├── ai/           # AI enhancement
│   │   ├── generate/     # Review/resume generator
│   │   └── cron/         # Email reminders
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/               # shadcn components
│   ├── entry-form.tsx
│   ├── entry-list.tsx
│   ├── entry-card.tsx
│   └── ...
├── lib/
│   ├── db/
│   │   ├── schema.ts     # Drizzle schema
│   │   ├── index.ts      # DB connection
│   │   └── queries.ts    # Reusable queries
│   ├── ai/
│   │   ├── enhance.ts    # AI enhancement logic
│   │   └── generate.ts   # Review/resume generation
│   ├── email/
│   │   └── reminder.ts   # Email templates
│   └── utils.ts
└── types/
    └── index.ts          # Shared types
```

---

## Database Schema

### `entries`
```sql
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  entry_date DATE NOT NULL,
  raw_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(user_id, entry_date)
);
```

### `entry_enrichments`
```sql
CREATE TABLE entry_enrichments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES entries(id) ON DELETE CASCADE,
  ai_provider TEXT NOT NULL,
  ai_model TEXT NOT NULL,
  ai_title TEXT,
  ai_bullets JSONB,
  ai_category TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `generated_outputs`
```sql
CREATE TABLE generated_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('review', 'resume')),
  range_start DATE NOT NULL,
  range_end DATE NOT NULL,
  output_markdown TEXT NOT NULL,
  input_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `user_settings`
```sql
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY,
  email_reminders_enabled BOOLEAN DEFAULT true,
  reminder_time TIME DEFAULT '18:30',
  reminder_timezone TEXT DEFAULT 'UTC',
  skip_weekends BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## API Routes

### Entries
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/entries` | List entries (paginated) |
| GET | `/api/entries/[date]` | Get entry for specific date |
| POST | `/api/entries` | Create/update today's entry |
| PATCH | `/api/entries/[id]` | Update entry |
| DELETE | `/api/entries/[id]` | Soft delete entry |

### AI (V1.1)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/enhance` | Enhance entry with AI |

### Generate (V1.5)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate/review` | Generate performance review |
| POST | `/api/generate/resume` | Generate resume bullets |

### Cron (V1.1)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cron/reminders` | Send reminder emails (hourly) |

---

## Key Design Decisions

### 1. One Entry Per Day
- Unique constraint on `(user_id, entry_date)`
- Upsert logic: if entry exists for today, update it
- Uses user's local timezone (stored in settings)

### 2. AI is Non-Blocking
- Entry saves immediately to DB
- AI enhancement is a separate, optional action
- 10s timeout with graceful fallback

### 3. Cost-Optimized Generation
- Review generator uses `entry_enrichments` (not raw text)
- Groups summaries server-side before sending to LLM
- Reduces token usage by ~80%

### 4. Soft Delete
- `deleted_at` timestamp instead of hard delete
- Can restore entries if needed
- Excluded from queries by default

---

## Security

- All routes protected by Clerk middleware
- User can only access their own data (`user_id` from session)
- API keys stored in environment variables
- CRON_SECRET protects cron endpoints
