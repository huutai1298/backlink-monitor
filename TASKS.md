# TASKS - Step by Step Build Plan

Read this file before starting to code any part of the system.
Follow the order: Phase 1 to 8.

---

## PHASE 1 - Project Setup

### Backend
- [ ] Create backend folder structure
- [ ] Setup Python 3.11 virtual environment
- [ ] Install dependencies: fastapi, uvicorn, sqlalchemy, alembic, mysql-connector-python, curl_cffi, apscheduler, python-telegram-bot, openpyxl, python-jose, bcrypt, python-dotenv
- [ ] Create .env file with all required environment variables
- [ ] Create requirements.txt
- [ ] Setup MySQL connection with SQLAlchemy
- [ ] Create database.py (engine, session, Base)

### Frontend
- [ ] Create React + Vite project
- [ ] Install TailwindCSS, Zustand, Axios, React Router
- [ ] Setup folder structure
- [ ] Create Axios instance with interceptor (auto attach JWT token)
- [ ] Setup Zustand auth store

---

## PHASE 2 - Database

### Models (SQLAlchemy)
- [ ] Model: Customers
  - id, name, telegram_group_id, telegram_group_url, note, is_active, created_at, updated_at

- [ ] Model: Websites
  - id, domain, price_monthly, category, note, is_active, is_dead, dead_since, created_at, updated_at

- [ ] Model: Backlinks
  - id, customer_id (FK), website_id (FK)
  - source_href (full URL containing the backlink e.g. https://example.com/post-123)
  - anchor_text, target_url
  - date_placed (auto = today), date_payment (auto = today + 1 month)
  - status: pending / live / lost / expired / inactive
  - last_checked, last_live_at, lost_at, inactive_notified_at
  - created_at, updated_at

- [ ] Model: BlacklistedLinks
  - id, source_url, href, anchor_text, is_active, created_at, updated_at

- [ ] Model: NotificationLogs
  - id
  - backlink_id (nullable FK)
  - website_id (nullable FK)
  - customer_id (nullable FK)
  - type: lost / live / inactive_still_live / website_die / website_alive
  - message, sent_at, created_at

### Indexes
- [ ] idx_website_id
- [ ] idx_customer_id
- [ ] idx_status
- [ ] idx_customer_status (customer_id, status) composite
- [ ] idx_date_payment
- [ ] idx_is_dead
- [ ] FULLTEXT idx_domain_ft (domain)

### Migration
- [ ] Setup Alembic
- [ ] Create first migration (create 5 tables + indexes)
- [ ] Run migration

---

## PHASE 3 - Backend API

### Auth
- [ ] POST /api/auth/login - return JWT access + refresh token
- [ ] POST /api/auth/refresh - refresh token
- [ ] JWT middleware for all routes except /login

### Customers
- [ ] GET /api/customers (list + filter)
- [ ] POST /api/customers
- [ ] PUT /api/customers/{id}
- [ ] DELETE /api/customers/{id}
- [ ] PATCH /api/customers/{id}/deactivate

### Websites
- [ ] GET /api/websites (list + filter)
- [ ] PUT /api/websites/{id}
- [ ] DELETE /api/websites/{id}
- [ ] POST /api/websites/{id}/crawl (manual crawl single domain)

### Backlinks
- [ ] GET /api/backlinks (filter: customer_id, status, domain, keyword)
- [ ] POST /api/backlinks/bulk (add multiple backlinks at once)
- [ ] PUT /api/backlinks/{id} (editable: customer_id, price, date_payment only)
- [ ] PATCH /api/backlinks/{id}/inactive
- [ ] PATCH /api/backlinks/{id}/expired
- [ ] DELETE /api/backlinks/{id}

### Crawl
- [ ] POST /api/crawl - crawl 1 domain, return 3 groups:
  - Group 1: New links (not in DB, not blacklisted)
  - Group 2: Already in DB (with status + customer info)
  - Group 3: Blacklisted links
- [ ] POST /api/crawl/all - crawl all domains (manual trigger from Dashboard)

### Blacklist
- [ ] GET /api/blacklist
- [ ] POST /api/blacklist (add href to blacklist)
- [ ] PATCH /api/blacklist/{id}/restore (remove from blacklist, reappear in crawl UI)

### Logs
- [ ] GET /api/logs (filter: customer_id, type, date_from, date_to)

### Dashboard
- [ ] GET /api/dashboard/stats - total live / lost / pending / expired / monthly revenue
- [ ] GET /api/dashboard/expiring - links expiring within 7 days
- [ ] GET /api/dashboard/inactive-alive - inactive links still found by crawler
- [ ] GET /api/dashboard/dead-websites - websites currently dead

---

## PHASE 4 - Crawler Engine

### crawler.py
- [ ] Use curl_cffi impersonate Chrome124
- [ ] Extract all external href links from page
- [ ] Skip internal links (same domain)
- [ ] Skip relative links
- [ ] Retry 3 times on network error
- [ ] Timeout 30 seconds per request

### status_updater.py
- [ ] For each domain in DB:
  - Crawl FAILED (website dead):
    - Set websites.is_dead = True, dead_since = now
    - Keep all backlink statuses UNCHANGED (do NOT set to lost)
    - Send internal notification: website dead
  - Crawl SUCCESS:
    - If previously is_dead = True, set is_dead = False
    - Send internal notification: website alive again
    - For each backlink of this domain:
      - source_href FOUND in crawled links: status = live, last_live_at = now
      - source_href NOT found:
        - pending: keep pending (no notification)
        - live: change to lost, lost_at = now, notify internal + customer
        - lost: keep lost (do NOT re-notify)
        - inactive + link still found: notify internal every 24h (link not removed)
        - expired: notify internal only if status changes

### scheduler.py
- [ ] APScheduler: run crawl_all() every 60 minutes
- [ ] Crawl one domain at a time (batch = 1)

---

## PHASE 5 - Telegram Bot

### Commands
- [ ] /info - return Group ID + group name
- [ ] /check:
  - If INTERNAL_GROUP_ID: show all backlinks overview + total monthly revenue
  - If customer group: show only their backlinks overview
- [ ] /check [keyword]:
  - If INTERNAL_GROUP_ID: search all backlinks + show price
  - If customer group: search only their backlinks, no price shown
  - Links belonging to other customers: return "No results found!"

### notifier.py
- [ ] send_internal(message) - send to INTERNAL_GROUP_ID
- [ ] send_customer(customer_id, message) - send to customer telegram_group_id
- [ ] Message formats:
  - lost: domain list + total affected revenue (internal) / domain list only (customer)
  - live: domain list + total recovered revenue (internal) / domain list only (customer)
  - inactive_still_live: domain + anchor + expiry date + hint to renew
  - website_die: domain list + HTTP error code
  - website_alive: domain list

---

## PHASE 6 - Frontend UI

### Design System
- [ ] Colors: sidebar #0f172a, bg #f8fafc, primary #6366f1, success #22c55e, danger #ef4444, warning #f97316
- [ ] Font: Inter
- [ ] Layout: Sidebar + Main content area

### Pages
- [ ] /login - login form, store JWT in localStorage
- [ ] / (Dashboard):
  - 5 stat cards: Live / Lost / Pending / Expired / Monthly Revenue
  - Button: Crawl All Now + progress bar
  - Table: Links expiring within 7 days
  - Table: Inactive links still alive
  - Table: Dead websites
- [ ] /backlinks:
  - Filters: Customer / Status / Domain / Search keyword
  - Table with pagination (20 per page)
  - Row actions: Edit / Set Inactive / Set Expired / Delete
  - Edit modal: Customer (editable), Price (editable), Payment Date (editable), Domain (readonly), Anchor (readonly)
- [ ] /crawl:
  - Input domain URL, click Crawl, show loading
  - Results in 3 boxes:
    - New Links (checkboxes + Select All button)
    - Already in DB (with status + customer name)
    - Blacklisted
  - Add group flow: tick checkboxes, click Add Group, modal opens, select customer per link, Save, links move to Already in DB box
  - Each new link has a Blacklist button
- [ ] /websites:
  - Table: Domain / Price / Category / Note / Status / is_dead
  - Actions: Edit / Crawl (single domain) / Delete
  - NO Add button (websites are auto-created during crawl)
- [ ] /customers:
  - Table: Name / Group URL / Link Count / Status
  - Add/Edit modal: Name / Telegram Group ID / Telegram Group URL / Note
  - Actions: Edit / Deactivate / Delete
- [ ] /blacklist:
  - Table: Domain / Href / Anchor / Date Added
  - Action: Restore - link immediately reappears in crawl UI new links box
- [ ] /logs:
  - Filters: Customer / Type / Date From / Date To
  - Table with pagination (20 per page)

---

## PHASE 7 - Docker and Deploy

- [ ] Dockerfile for backend
- [ ] Dockerfile for frontend
- [ ] docker-compose.yml (services: backend, frontend, mysql, nginx)
- [ ] nginx.conf (proxy /api to backend, / to frontend)
- [ ] SSL via Let's Encrypt
- [ ] Deploy to Ubuntu EC2

---

## PHASE 8 - Future Features

- [ ] Telegram notification: remind customer 7 days before payment expiry
- [ ] Full bot commands for customers
- [ ] /report command: generate Excel report for customers