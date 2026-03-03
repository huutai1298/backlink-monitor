# TASKS - Viec can lam Step by Step

Doc file nay truoc khi bat dau code bat ky phan nao. Lam theo dung thu tu Phase 1 den 8.

## PHASE 1 - Setup du an

### Backend
- Tao cau truc thu muc backend
- Setup virtual environment Python 3.11
- Cai dependencies: fastapi uvicorn sqlalchemy alembic mysql-connector-python curl_cffi apscheduler python-telegram-bot openpyxl python-jose bcrypt python-dotenv
- Tao file .env voi day du bien moi truong
- Tao file requirements.txt
- Setup ket noi MySQL voi SQLAlchemy
- Tao database.py (engine, session, Base)

### Frontend
- Tao project React + Vite
- Cai TailwindCSS, Zustand, Axios, React Router
- Tao Axios instance voi interceptor auto attach JWT token
- Setup Zustand store auth store

## PHASE 2 - Database

### Models SQLAlchemy
- Model Customers: id, name, telegram_group_id, telegram_group_url, note, is_active, created_at, updated_at
- Model Websites: id, domain, price_monthly, category, note, is_active, is_dead, dead_since, created_at, updated_at
- Model Backlinks: id, customer_id, website_id, source_href, anchor_text, target_url, date_placed auto today, date_payment auto today+1month, status pending/live/lost/expired/inactive, last_checked, last_live_at, lost_at, inactive_notified_at, created_at, updated_at
- Model BlacklistedLinks: id, source_url, href, anchor_text, is_active, created_at, updated_at
- Model NotificationLogs: id, backlink_id nullable, website_id nullable, customer_id nullable, type lost/live/inactive_still_live/website_die/website_alive, message, sent_at, created_at

### Migration
- Setup Alembic
- Tao migration dau tien tao 5 bang
- Them indexes: idx_website_id, idx_customer_id, idx_status, idx_customer_status, idx_date_payment, idx_is_dead, FULLTEXT idx_domain_ft
- Run migration

## PHASE 3 - Backend API

### Auth
- POST /api/auth/login tra JWT access + refresh token
- POST /api/auth/refresh
- Middleware verify JWT cho tat ca routes tru /login

### Customers API
- GET POST PUT DELETE /api/customers
- PATCH /api/customers/{id}/deactivate

### Websites API
- GET PUT DELETE /api/websites
- POST /api/websites/{id}/crawl crawl thu cong 1 domain

### Backlinks API
- GET /api/backlinks filter customer status domain keyword
- POST /api/backlinks/bulk them nhieu backlink cung luc
- PUT /api/backlinks/{id} sua customer_id price date_payment
- PATCH /api/backlinks/{id}/inactive
- PATCH /api/backlinks/{id}/expired
- DELETE /api/backlinks/{id}

### Crawl API
- POST /api/crawl crawl 1 domain tra 3 nhom link moi / da co DB / blacklist
- POST /api/crawl/all crawl toan bo domain manual tu Dashboard

### Blacklist API
- GET POST /api/blacklist
- PATCH /api/blacklist/{id}/restore khoi phuc hien lai o crawl UI

### Logs API
- GET /api/logs filter customer type date range

### Dashboard API
- GET /api/dashboard/stats
- GET /api/dashboard/expiring link sap het han 7 ngay toi
- GET /api/dashboard/inactive-alive link inactive chua go
- GET /api/dashboard/dead-websites

## PHASE 4 - Crawler Engine

- crawler.py: curl_cffi Chrome124, lay external links, retry 3 lan, timeout 30s, bo internal va relative links
- status_updater.py:
  Crawl FAIL: is_dead=True dead_since=now, giu nguyen status backlinks, thong bao noi bo website die
  Crawl OK: neu truoc do is_dead=True thi set False va thong bao noi bo website song lai
  Tung backlink: thay source_href trong links crawl duoc = live last_live_at=now
  Khong thay: pending giu pending, live chuyen lost lost_at=now gui thong bao noi bo+khach, lost giu lost khong gui lai, inactive+thay link gui noi bo moi 24h, expired chi gui noi bo neu co thay doi
- scheduler.py: APScheduler chay crawl_all() moi 60 phut batch=1

## PHASE 5 - Telegram Bot

- Setup python-telegram-bot
- /info: tra Group ID + ten group
- /check: INTERNAL=tong quan tat ca+doanh thu, khach=tong quan link cua ho
- /check keyword: INTERNAL=tim tat ca+gia, khach=chi link cua ho khong hien gia, link nguoi khac=Khong tim thay ket qua nao
- notifier.py: send_internal(), send_customer(customer_id), format message lost/live/inactive_still_live/website_die/website_alive

## PHASE 6 - Frontend UI

- Design system: sidebar #0f172a bg #f8fafc primary #6366f1 success #22c55e danger #ef4444 warning #f97316 font Inter
- /login: form dang nhap JWT luu localStorage
- /: Dashboard 5 stat cards Live/Lost/Pending/Expired/Doanh thu, nut Crawl tat ca ngay + progress bar, bang sap het han 7 ngay, bang inactive chua go, bang website die
- /backlinks: filter Khach/Status/Domain/Search, pagination 20, actions Sua/Inactive/Expired/Xoa, modal sua Khach+Gia+NgayTT readonly Domain+Anchor
- /crawl: input domain, ket qua 3 box Link moi co checkbox/Link da co DB/Blacklist, flow them nhom tic checkbox modal chon khach tung link bam Luu link xuong box da co DB, nut Blacklist tren tung link moi
- /websites: Domain/Gia/Category/Note/Status/isDead, actions Sua/Crawl/Xoa, KHONG co nut Them
- /customers: Ten/GroupURL/SoLink/Status, modal Them/Sua Ten+GroupID+GroupURL+GhiChu, actions Sua/Deactivate/Xoa
- /blacklist: Domain/Href/Anchor/NgayThem, action Khoi phuc tu hien lai o crawl UI
- /logs: filter Khach/Loai/TuNgay/DenNgay, pagination 20

## PHASE 7 - Docker va Deploy

- Dockerfile backend
- Dockerfile frontend
- docker-compose.yml service backend+frontend+mysql+nginx
- nginx.conf proxy /api backend va / frontend
- SSL Lets Encrypt
- Deploy Ubuntu EC2

## PHASE 8 - Tinh nang sau

- Thong bao nhac gia han 7 ngay truoc cho khach qua Telegram
- Bot commands day du cho khach hang
- /report Excel cho khach hang