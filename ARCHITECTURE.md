# ARCHITECTURE - Complete System Reference

This file is the single source of truth for the entire Backlink Monitor system.
Read this file every time before making any changes or continuing development.

---

## 1. SYSTEM OVERVIEW

A backlink monitoring system that:
- Automatically crawls websites every 60 minutes to check if purchased backlinks still exist
- Sends Telegram notifications to internal team and customers when links go lost or come back
- Provides a web admin UI for managing backlinks, customers, websites, crawl results
- Has a Telegram bot for quick status checks

---

## 2. TECH STACK

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI, SQLAlchemy, Alembic |
| Database | MySQL 8.0 |
| Crawler | curl_cffi (impersonate Chrome124) |
| Scheduler | APScheduler |
| Telegram Bot | python-telegram-bot |
| Excel Export | openpyxl |
| Frontend | React + Vite, TailwindCSS, Zustand, Axios |
| Auth | JWT (access + refresh token), bcrypt |
| Deploy | Ubuntu EC2, Nginx, Uvicorn, SSL Let's Encrypt |
| Container | Docker + docker-compose |

---

## 3. FOLDER STRUCTURE

```
backlink-monitor/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── database.py              # SQLAlchemy engine, session, Base
│   ├── models/
│   │   ├── customer.py
│   │   ├── website.py
│   │   ├── backlink.py
│   │   ├── blacklisted_link.py
│   │   └── notification_log.py
│   ├── schemas/                 # Pydantic request/response schemas
│   │   ├── customer.py
│   │   ├── website.py
│   │   ├── backlink.py
│   │   ├── blacklist.py
│   │   └── log.py
│   ├── routers/                 # FastAPI route handlers
│   │   ├── auth.py
│   │   ├── customers.py
│   │   ├── websites.py
│   │   ├── backlinks.py
│   │   ├── crawl.py
│   │   ├── blacklist.py
│   │   ├── logs.py
│   │   └── dashboard.py
│   ├── services/
│   │   ├── crawler.py           # curl_cffi crawl logic
│   │   ├── status_updater.py    # backlink status update logic
│   │   ├── scheduler.py         # APScheduler setup
│   │   ├── notifier.py          # Telegram send functions
│   │   └── bot.py               # Telegram bot commands
│   ├── middleware/
│   │   └── auth.py              # JWT verify middleware
│   ├── alembic/                 # DB migrations
│   ├── .env
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── api/
│   │   │   └── axios.js         # Axios instance + interceptor
│   │   ├── store/
│   │   │   └── authStore.js     # Zustand auth store
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Backlinks.jsx
│   │   │   ├── Crawl.jsx
│   │   │   ├── Websites.jsx
│   │   │   ├── Customers.jsx
│   │   │   ├── Blacklist.jsx
│   │   │   └── Logs.jsx
│   │   └── components/
│   │       ├── Sidebar.jsx
│   │       ├── StatCard.jsx
│   │       ├── Table.jsx
│   │       ├── Modal.jsx
│   │       └── Pagination.jsx
│   ├── index.html
│   └── vite.config.js
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
├── README.md
├── TASKS.md
└── ARCHITECTURE.md
```

---

## 4. DATABASE SCHEMA

### Table: customers
```
id                  INT PRIMARY KEY AUTO_INCREMENT
name                VARCHAR(255) NOT NULL
telegram_group_id   VARCHAR(100)           -- bot sends notifications here
telegram_group_url  VARCHAR(255)           -- admin reference only
note                TEXT
is_active           BOOLEAN DEFAULT TRUE
created_at          DATETIME DEFAULT NOW()
updated_at          DATETIME ON UPDATE NOW()
```

### Table: websites
```
id                  INT PRIMARY KEY AUTO_INCREMENT
domain              VARCHAR(255) NOT NULL UNIQUE  -- e.g. example.com (no https)
price_monthly       DECIMAL(15,2) DEFAULT 0       -- price per month for this domain
category            VARCHAR(100)                  -- Blog / Forum / News / etc
note                TEXT
is_active           BOOLEAN DEFAULT TRUE
is_dead             BOOLEAN DEFAULT FALSE          -- TRUE when crawl fails
dead_since          DATETIME NULL                 -- when it first went dead
created_at          DATETIME DEFAULT NOW()
updated_at          DATETIME ON UPDATE NOW()
```

### Table: backlinks
```
id                    INT PRIMARY KEY AUTO_INCREMENT
customer_id           INT NOT NULL FK -> customers.id
website_id            INT NOT NULL FK -> websites.id
source_href           VARCHAR(2048) NOT NULL  -- FULL URL where backlink lives
                                              -- e.g. https://example.com/post-123
anchor_text           VARCHAR(500)            -- the anchor text of the link
target_url            VARCHAR(2048)           -- URL that the backlink points to
date_placed           DATE DEFAULT TODAY      -- auto set to today on create
date_payment          DATE DEFAULT TODAY+1M   -- auto = today + 1 month, admin can edit
status                ENUM(pending,live,lost,expired,inactive) DEFAULT pending
last_checked          DATETIME NULL           -- last time crawler checked
last_live_at          DATETIME NULL           -- last time link was confirmed live
lost_at               DATETIME NULL           -- when link first went lost
inactive_notified_at  DATETIME NULL           -- last "inactive still live" alert sent
created_at            DATETIME DEFAULT NOW()
updated_at            DATETIME ON UPDATE NOW()
```

### Table: blacklisted_links
```
id            INT PRIMARY KEY AUTO_INCREMENT
source_url    VARCHAR(255) NOT NULL   -- domain being crawled e.g. example.com
href          VARCHAR(2048) NOT NULL  -- full href that is blacklisted
anchor_text   VARCHAR(500)
is_active     BOOLEAN DEFAULT TRUE    -- FALSE = restored (shows again in crawl UI)
created_at    DATETIME DEFAULT NOW()
updated_at    DATETIME ON UPDATE NOW()
```

### Table: notification_logs
```
id            INT PRIMARY KEY AUTO_INCREMENT
backlink_id   INT NULL FK -> backlinks.id
website_id    INT NULL FK -> websites.id
customer_id   INT NULL FK -> customers.id
type          ENUM(lost, live, inactive_still_live, website_die, website_alive)
message       TEXT                   -- full message that was sent
sent_at       DATETIME DEFAULT NOW()
created_at    DATETIME DEFAULT NOW()
```

### Indexes
```sql
INDEX idx_website_id        ON backlinks(website_id)
INDEX idx_customer_id       ON backlinks(customer_id)
INDEX idx_status            ON backlinks(status)
INDEX idx_customer_status   ON backlinks(customer_id, status)
INDEX idx_date_payment      ON backlinks(date_payment)
INDEX idx_is_dead           ON websites(is_dead)
FULLTEXT idx_domain_ft      ON websites(domain)
```

---

## 5. BACKLINK STATUS RULES

### Status values
- **pending**  : newly added, crawler has never confirmed this link yet
- **live**     : crawler confirmed link exists on the page
- **lost**     : website is ALIVE but link was not found
- **expired**  : admin manually clicked stop button
- **inactive** : admin manually clicked pause button

### Transitions
```
pending  -> live      : crawler finds link for first time
live     -> lost      : website ALIVE + link not found
lost     -> live      : website ALIVE + link found again
live     -> inactive  : admin clicks pause button
live/lost -> expired  : admin clicks stop button
```

### CRITICAL RULES - NEVER BREAK THESE

1. **Website DEAD = keep all backlink statuses UNCHANGED**
   Do NOT set any backlink to `lost` when website is dead.
   Only send internal `website_die` notification.

2. `lost` is ONLY set when website is confirmed ALIVE.

3. `expired` and `inactive` are ONLY set by admin manually. NEVER automatic.

4. `date_payment` does NOT automatically expire a backlink.
   It is only used for the expiring-soon reminder on Dashboard.

5. **Each backlink status is INDEPENDENT** from other backlinks on the same domain.
   Notifications are sent per customer group separately.

6. Lost notification sent ONCE per lost event.
   If already lost → do NOT re-notify.
   If goes live then lost again → send again (new event).

---

## 6. CRAWLER LOGIC (status_updater.py)

```
For each domain in DB (one by one, batch=1):

  IF crawl FAILS (website dead):
    - Set website.is_dead = True, dead_since = now (only if not already dead)
    - Send internal notification: website_die
    - STOP - do not touch any backlink status

  IF crawl SUCCEEDS:
    - If website was dead before: set is_dead = False, send internal: website_alive
    - For each backlink of this website:
        - Update last_checked = now
        - Check if source_href is in the list of crawled links

        IF FOUND:
          - Update last_live_at = now
          - pending  -> set live (no notification)
          - live     -> keep live (no action)
          - lost     -> set live, notify internal + customer (lost->live)
          - inactive -> send internal "inactive_still_live" every 24h
          - expired  -> no action

        IF NOT FOUND:
          - pending  -> keep pending (no notification)
          - live     -> set lost, lost_at = now, notify internal + customer (live->lost)
          - lost     -> keep lost (DO NOT re-notify)
          - inactive -> no action
          - expired  -> no action
```

---

## 7. NOTIFICATION RULES

| Event | Internal Group | Customer Group |
|-------|---------------|----------------|
| website_die | Immediately (once per dead period) | Never |
| website_alive | Immediately | Never |
| live -> lost | Immediately | Immediately (their links only) |
| lost -> live | Immediately | Immediately (their links only) |
| inactive_still_live | Every 24h while link still found | Never |
| expired status changes | Immediately | Never |

**Customer notifications never show: price, anchor text, other customers' data**

---

## 8. NOTIFICATION MESSAGE FORMATS

### Internal - website_die
```
🔴 WEBSITE CANNOT BE ACCESSED
📅 03/03/2026 14:30

1. example.com → HTTP 503
2. other.com   → Timeout

⚠️ Backlinks on these domains are temporarily NOT updated!
```

### Internal - website_alive
```
✅ WEBSITE IS BACK ONLINE
📅 03/03/2026 15:30

1. example.com
2. other.com

👉 System continues crawling normally!
```

### Internal - lost
```
⚠️ BACKLINK LOST
📅 03/03/2026 14:30

👤 Team A (3 links)
1. example.com | "click here" | 500,000 VND
2. example.com | "visit site" | 500,000 VND
3. other.com   | "read more"  | 300,000 VND

👤 Team B (2 links)
1. other.com   | "anchor 1"  | 300,000 VND
2. example.com | "anchor 2"  | 500,000 VND

💸 Total affected: 2,100,000 VND/month
```

### Internal - live (recovered)
```
✅ BACKLINK RECOVERED
📅 03/03/2026 15:00

👤 Team A (2 links)
1. example.com | "click here" | 500,000 VND
2. example.com | "visit site" | 500,000 VND

💰 Total recovered: 1,000,000 VND/month
```

### Internal - inactive_still_live
```
💡 LINK HAS NOT BEEN REMOVED
📅 03/03/2026 14:30

👤 Team A
1. example.com | "click here" | 500,000 VND | expired 01/03/2026
2. example.com | "visit site" | 500,000 VND | expired 28/02/2026

👉 These links still exist — consider contacting customer to renew!
```

### Customer - lost
```
⚠️ BACKLINK LOST
📅 03/03/2026 14:30

1. example.com
2. other.com

We are checking and will resolve this shortly!
```

### Customer - live (recovered)
```
✅ BACKLINK RECOVERED
📅 03/03/2026 15:00

1. example.com
2. other.com
```

---

## 9. TELEGRAM BOT COMMANDS

### /info (any group)
Returns group ID and group name. Used by admin to get ID to register in system.
```
📋 GROUP INFO
🏷️ Name  : Team A Backlink
🆔 ID    : -1001234567890
👉 Copy this Group ID to add to the system!
```

### /check (no keyword)
- From INTERNAL_GROUP_ID: show all backlinks counts + total monthly revenue
- From customer group: show only their backlinks counts (no revenue)

Internal format:
```
📊 BACKLINK OVERVIEW
📅 03/03/2026 14:30
✅ Live      : 45 links
⚠️ Lost      : 3 links
⏰ Expired   : 5 links
⏳ Pending   : 2 links
🔴 Inactive  : 8 links
💰 Active revenue: 15,500,000 VND/month
```

Customer format:
```
📊 BACKLINK OVERVIEW
📅 03/03/2026 14:30
✅ Live      : 10 links
⚠️ Lost      : 1 link
⏰ Expired   : 2 links
```

### /check [keyword]
- From INTERNAL_GROUP_ID: search all backlinks, show domain + anchor + customer + status + price + date
- From customer group: search only their backlinks, show domain + anchor + status + date (NO price)
- If keyword matches another customer's link: return "❌ No results found!"

Internal format:
```
🔍 SEARCH RESULTS: "example"
📅 03/03/2026 14:30
1. example.com
   Anchor   : "click here"
   Customer : Team A
   Status   : ✅ Live
   Price    : 500,000 VND/month
   Added    : 01/01/2026
```

Customer format:
```
🔍 SEARCH RESULTS: "example"
📅 03/03/2026 14:30
1. example.com
   Anchor   : "click here"
   Status   : ✅ Live
   Added    : 01/01/2026
```

---

## 10. API ENDPOINTS REFERENCE

```
POST   /api/auth/login
POST   /api/auth/refresh

GET    /api/customers
POST   /api/customers
PUT    /api/customers/{id}
DELETE /api/customers/{id}
PATCH  /api/customers/{id}/deactivate

GET    /api/websites
PUT    /api/websites/{id}
DELETE /api/websites/{id}
POST   /api/websites/{id}/crawl

GET    /api/backlinks
POST   /api/backlinks/bulk
PUT    /api/backlinks/{id}
PATCH  /api/backlinks/{id}/inactive
PATCH  /api/backlinks/{id}/expired
DELETE /api/backlinks/{id}

POST   /api/crawl
POST   /api/crawl/all

GET    /api/blacklist
POST   /api/blacklist
PATCH  /api/blacklist/{id}/restore

GET    /api/logs

GET    /api/dashboard/stats
GET    /api/dashboard/expiring
GET    /api/dashboard/inactive-alive
GET    /api/dashboard/dead-websites
```

---

## 11. FRONTEND PAGES REFERENCE

### Design System
```
Sidebar background : #0f172a (dark navy)
Page background    : #f8fafc (light gray)
Card               : white, shadow, border-radius 12px
Primary            : #6366f1 (indigo)
Success            : #22c55e (green)
Danger             : #ef4444 (red)
Warning            : #f97316 (orange)
Font               : Inter
```

### /login
- Centered white card on dark background
- Username + Password + Login button
- On success: store JWT in localStorage, redirect to /

### / (Dashboard)
- 5 stat cards: Live / Lost / Pending / Expired / Monthly Revenue
- "Crawl All Now" button → POST /api/crawl/all → progress bar
- Table: links expiring within 7 days
- Table: inactive links still alive
- Table: dead websites

### /backlinks
- Filters: Customer / Status / Domain / Search keyword
- Pagination: 20 per page
- Row actions: Edit / Set Inactive / Set Expired / Delete
- Edit modal: Customer=editable, Price=editable, PaymentDate=editable, Domain=READONLY, Anchor=READONLY

### /crawl
- Input domain + Crawl button + loading state
- Box 1 - New Links: checkbox per link + Select All + Blacklist button per link + Add Group button
- Box 2 - Already in DB: href + anchor + customer + status (read only)
- Box 3 - Blacklisted: href + anchor (read only)
- Add Group Modal:
  - domain: readonly (auto-filled)
  - price: pre-filled if domain exists in websites table, else empty input
  - table of selected links: href (readonly), anchor_text (readonly), customer dropdown (per link)
  - date_placed and date_payment: hidden, auto set
  - Save: creates backlinks in DB, links move from Box 1 to Box 2

### /websites
- Table: Domain / Price / Category / Note / Status / Dead
- Actions: Edit / Crawl (single domain) / Delete
- NO Add button — websites are auto-created when first crawled via /crawl page

### /customers
- Table: Name / Group URL / Link Count / Status
- Add/Edit modal: Name / Telegram Group ID / Telegram Group URL / Note
- Actions: Edit / Deactivate / Delete

### /blacklist
- Table: Domain / Full Href / Anchor / Date Added
- Restore button: sets is_active = FALSE, link immediately reappears in /crawl Box 1

### /logs
- Filters: Customer / Type / Date From / Date To
- Table: Time / Type / Customer / Domain / Message
- Pagination: 20 per page

---

## 12. ENVIRONMENT VARIABLES

```env
# DATABASE
DB_HOST=localhost
DB_PORT=3306
DB_NAME=backlink_db
DB_USER=root
DB_PASSWORD=your_password

# AUTH
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_password
JWT_SECRET_KEY=your_secret_key
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# TELEGRAM
TELEGRAM_BOT_TOKEN=your_bot_token
INTERNAL_GROUP_ID=-1001234567890

# CRAWLER
CRAWL_INTERVAL_MINUTES=60
CRAWL_RETRY=3
CRAWL_TIMEOUT=30
```

---

## 13. KEY DECISIONS - NEVER FORGET

1. Websites are NEVER manually created by admin. They are auto-created when a domain is first crawled via /crawl page.

2. source_href in Backlinks is the FULL URL (e.g. https://example.com/post-123), NOT just the domain.

3. date_payment auto-renews +1 month but does NOT auto-expire the backlink. expired is ONLY set by admin.

4. When website is dead: ALL backlink statuses are FROZEN. No lost transitions, no customer notifications.

5. Customer notifications: domain list only. No anchor text, no price, no other customers data.

6. Internal notifications: full detail — grouped by customer, anchor, price, total revenue impact.

7. /check keyword from customer group: if keyword matches another customer's link → return "No results found!" Never reveal other customers data.

8. Inactive backlinks: still crawled. If link still found → notify internal every 24h. If link gone → no notification.

9. Expired backlinks: still crawled. Internal team still notified. Customer group receives NO notifications.

10. Lost notification sent ONCE per lost event. Already lost = do not re-send. Goes live then lost again = send again (new event).

---

## 14. FUTURE FEATURES (do not build yet)

1. Telegram notification: remind customer 7 days before date_payment expires
2. Full /check and /report bot commands for customer groups
3. /report_lost and /report_live Excel exports for customers
