# **PRD.md — Accomplish (accomplish.today)**

## 1) Product Overview

**Name:** Accomplish (accomplish.today)
**Tagline:** *Remember what you did. Never struggle with performance reviews again.*

**Problem:**
People forget daily wins and scramble during performance reviews or resume updates.

**Solution:**
A simple daily work diary that captures accomplishments and **optionally** uses AI to help users articulate impact and generate review-ready content.

---

## 2) Goals (V1)

**Success Metrics**

* **Activation:** ≥ 70% submit first entry within 24 hours
* **Retention:** ≥ 40% log ≥ 3 entries in first week
* **Value Moment:** ≥ 60% rate "Generate Review" output as useful
* **NPS:** ≥ 40 after first month
* **AI Quality Proxy:** Track % of generated reviews that get edited vs used as-is

---

## 3) Guiding Principles

* One question, one box
* Instant save (AI cannot block saving)
* **AI is opt-in by default**
* Outputs are editable + exportable
* Ship fast, learn from real users

---

## 4) User Stories (V1)

As a user, I want to:

1. Log daily work quickly
2. See past entries
3. Get optional AI help framing impact
4. Generate performance review drafts
5. Receive a gentle daily reminder
6. **Quickly find when I worked on X** (justifies basic search in V1.1)

---

## 5) Scope & Phases

### **V1 — Core (Weeks 1–2)**

#### F1.1 Daily Entry

* Single question: **"What did you accomplish today?"**
* Expandable text box (min 3 rows, 5,000 char limit)
* Save disabled if empty
* Auto-save draft to localStorage every 30s
* Mobile responsive

**Multiple entries/day (FINAL V1 DECISION):**

* **One entry per day, editable anytime.**
* No timestamped append in V1.

#### F1.2 Past Entries

* Newest first list
* Date + 100-char preview
* Click to expand
* Edit + soft delete
* Pagination (20 per page)

---

### **V1.1 — AI + Reminders (Weeks 3–4)**

#### F2.1 AI Enhancement (opt-in)

Button after save: **"Enhance with AI."**

Split view:

* Left: original text
* Right: AI version (title + 2–3 bullets + tag)

Rules:

* 10s timeout
* Fallback if AI fails
* Store raw + AI separately
* User can switch anytime

#### Basic Search

* ILIKE search across raw text + AI titles

#### Email Reminders

* Default 6:30 PM local time
* Send only if no entry today
* Skip weekends (configurable)
* **Hourly batch cron (not per-user scheduling).**

---

### **V1.5 — Generators (Month 2)**

#### Review Generator

* Range: last 3/6 months or custom
* Requires ≥ 5 entries
* Outputs:

  * 3–5 paragraphs
  * 6–10 bullets
* Editable (Markdown textarea)
* Copy + download (.md, .docx)

**Cost rule:**
Do **not** send raw logs to the model.

1. Use stored AI enrichments first
2. Group summaries server-side
3. Send only grouped summaries to LLM

#### Resume Bullets

* 8–12 punchy bullets
* Export .txt, .md, .docx

---

### **V2 — Mobile (Month 3–4)**

* Push notification
* Quick entry screen
* View last 7 days
* Everything else deep-links to web

---

## 6) Data Model (Final)

### `entries`

* `id` UUID
* `user_id` TEXT
* `entry_date` DATE
* `raw_text` TEXT
* `created_at`, `updated_at`, `deleted_at`

### `entry_enrichments`

* `id` UUID
* `entry_id` UUID
* `ai_provider`, `ai_model`
* `ai_title`, `ai_bullets (JSONB)`, `ai_category`
* `version`, timestamps

### `generated_outputs`

* `id` UUID
* `user_id`
* `type` (review | resume)
* `range_start`, `range_end`
* `output_markdown` TEXT
* `input_snapshot (JSONB)`
* `created_at`

### `user_settings`

* `user_id`
* `email_reminders_enabled`
* `reminder_time`
* `reminder_timezone`
* `skip_weekends`

---

## 7) Polish Standards (V1 — QA requirements)

* All empty states have friendly copy + action
* All loading states explain what's happening
* Errors explain what went wrong + next step
* Touch targets ≥ 44px
* Keyboard shortcuts:

  * `⌘/Ctrl + Enter` = Save
  * `Esc` = Close modal

---

## 8) Monetization Hypothesis (not built yet)

**Free**

* Unlimited entries
* 30 AI enhancements/month
* 2 generators/month

**Pro — $8/month**

* Unlimited enhancements
* Unlimited generators
* Priority processing

Target conversion: **5–10%**

---

## 9) Launch Phases

### Private Alpha (10–20 users)

* Watch users live
* Fix UX issues
* Success gate: ≥ 60% create second entry

### Public Beta (100–200 users)

* Soft launch on Twitter/LinkedIn
* Post in 2–3 communities
* Track retention, time-to-value

### Public Launch (Product Hunt)

---

## 10) Kill Criteria

If **< 40%** create a second entry in week 1 → rethink product before adding features.
