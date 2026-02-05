# Accomplish - API Specification

## Base URL
```
Production: https://accomplish.today/api
Development: http://localhost:3000/api
```

## Authentication
All endpoints require Clerk authentication. The `user_id` is extracted from the session.

---

## Entries

### List Entries
```http
GET /entries?page=1&limit=20
```

**Response:**
```json
{
  "entries": [
    {
      "id": "uuid",
      "entry_date": "2026-02-05",
      "raw_text": "Completed the API spec...",
      "created_at": "2026-02-05T10:00:00Z",
      "updated_at": "2026-02-05T10:00:00Z",
      "enrichment": {
        "ai_title": "API Documentation",
        "ai_bullets": ["Wrote API spec", "Defined schemas"],
        "ai_category": "Documentation"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "hasMore": true
  }
}
```

---

### Get Entry by Date
```http
GET /entries/2026-02-05
```

**Response:**
```json
{
  "id": "uuid",
  "entry_date": "2026-02-05",
  "raw_text": "Completed the API spec...",
  "created_at": "2026-02-05T10:00:00Z",
  "updated_at": "2026-02-05T10:00:00Z",
  "enrichment": null
}
```

**404 Response:**
```json
{
  "error": "No entry found for this date"
}
```

---

### Create/Update Today's Entry
```http
POST /entries
Content-Type: application/json

{
  "raw_text": "Completed the API spec for Accomplish app..."
}
```

**Response (201 Created or 200 OK):**
```json
{
  "id": "uuid",
  "entry_date": "2026-02-05",
  "raw_text": "Completed the API spec...",
  "created_at": "2026-02-05T10:00:00Z",
  "updated_at": "2026-02-05T10:00:00Z"
}
```

**Validation Error (400):**
```json
{
  "error": "Validation failed",
  "details": {
    "raw_text": "Required, max 5000 characters"
  }
}
```

---

### Update Entry
```http
PATCH /entries/:id
Content-Type: application/json

{
  "raw_text": "Updated accomplishment text..."
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "entry_date": "2026-02-05",
  "raw_text": "Updated accomplishment text...",
  "updated_at": "2026-02-05T11:00:00Z"
}
```

---

### Delete Entry (Soft)
```http
DELETE /entries/:id
```

**Response (200):**
```json
{
  "message": "Entry deleted",
  "id": "uuid"
}
```

---

## AI Enhancement (V1.1)

### Enhance Entry
```http
POST /ai/enhance
Content-Type: application/json

{
  "entry_id": "uuid"
}
```

**Response (200):**
```json
{
  "id": "enrichment-uuid",
  "entry_id": "uuid",
  "ai_provider": "anthropic",
  "ai_model": "claude-3-haiku",
  "ai_title": "API Documentation Sprint",
  "ai_bullets": [
    "Completed comprehensive API specification",
    "Defined all CRUD endpoints for entries",
    "Documented authentication flow"
  ],
  "ai_category": "Documentation"
}
```

**Timeout Error (504):**
```json
{
  "error": "AI enhancement timed out",
  "fallback": true
}
```

---

## Generate (V1.5)

### Generate Performance Review
```http
POST /generate/review
Content-Type: application/json

{
  "range_start": "2025-09-01",
  "range_end": "2026-02-05"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "type": "review",
  "range_start": "2025-09-01",
  "range_end": "2026-02-05",
  "output_markdown": "## Performance Review\n\n### Key Accomplishments\n...",
  "entry_count": 45
}
```

**Validation Error (400):**
```json
{
  "error": "Minimum 5 entries required",
  "entry_count": 3
}
```

---

### Generate Resume Bullets
```http
POST /generate/resume
Content-Type: application/json

{
  "range_start": "2025-01-01",
  "range_end": "2026-02-05"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "type": "resume",
  "range_start": "2025-01-01",
  "range_end": "2026-02-05",
  "output_markdown": "- Led development of...\n- Implemented...",
  "bullet_count": 10
}
```

---

## User Settings

### Get Settings
```http
GET /settings
```

**Response (200):**
```json
{
  "email_reminders_enabled": true,
  "reminder_time": "18:30",
  "reminder_timezone": "Asia/Kolkata",
  "skip_weekends": true
}
```

---

### Update Settings
```http
PATCH /settings
Content-Type: application/json

{
  "email_reminders_enabled": true,
  "reminder_time": "19:00",
  "skip_weekends": false
}
```

**Response (200):**
```json
{
  "email_reminders_enabled": true,
  "reminder_time": "19:00",
  "reminder_timezone": "Asia/Kolkata",
  "skip_weekends": false,
  "updated_at": "2026-02-05T12:00:00Z"
}
```

---

## Cron (Internal)

### Send Reminders
```http
POST /cron/reminders
Authorization: Bearer ${CRON_SECRET}
```

**Response (200):**
```json
{
  "sent": 42,
  "skipped": 15,
  "errors": 0
}
```

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid request body |
| 401 | UNAUTHORIZED | Missing or invalid auth |
| 403 | FORBIDDEN | Access denied |
| 404 | NOT_FOUND | Resource not found |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |
| 504 | TIMEOUT | AI/external service timeout |
