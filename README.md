# 🔗 Backlink Monitor

Hệ thống theo dõi và quản lý backlink tự động, tích hợp thông báo Telegram, giao diện web quản trị, và crawler thông minh.

---

## 📌 Tổng quan hệ thống

Hệ thống cho phép admin theo dõi trạng thái các backlink đã mua cho từng khách hàng. Crawler tự động chạy mỗi 60 phút, phát hiện link mất/còn và gửi thông báo Telegram tức thì đến đúng nhóm nội bộ và nhóm khách hàng liên quan.

---

## 🧩 Các thành phần chính

### 1. Crawler
- Sử dụng `curl_cffi` impersonate Chrome124 để vượt Cloudflare/WAF
- Crawl từng domain một (batch = 1)
- Retry 3 lần khi lỗi mạng
- Chỉ lấy external links, bỏ internal/relative
- Tự động crawl mỗi 60 phút (APScheduler)
- Hỗ trợ crawl thủ công: toàn bộ (Dashboard) hoặc từng domain (trang Websites)

### 2. Status Logic
Mỗi backlink có status độc lập:

| Status | Mô tả |
|--------|-------|
| `pending` | Mới thêm, chưa crawl thấy lần nào |
| `live` | Đang tồn tại trên trang |
| `lost` | Website sống nhưng không thấy link |
| `expired` | Admin bấm ⛔ thủ công |
| `inactive` | Admin bấm ⏸️ thủ công |

**Quy tắc quan trọng:**
- `lost` chỉ xảy ra khi website **SỐNG** + không thấy link
- Website **die** → giữ nguyên status, KHÔNG chuyển lost
- `expired` và `inactive` chỉ do admin bấm tay, KHÔNG tự động
- `date_payment` chỉ dùng để nhắc nhở, KHÔNG tự động expired
- Status tính theo **TỪNG BACKLINK độc lập** (không ảnh hưởng backlink khác cùng domain)

### 3. Thông báo Telegram

| Sự kiện | Nội bộ | Khách |
|---------|--------|-------|
| live → lost | ✅ Ngay | ✅ Ngay (chỉ domain, không anchor) |
| lost → live | ✅ Ngay | ✅ Ngay |
| expired + lost/live | ✅ Ngay | ❌ |
| inactive still live | ✅ Mỗi 24h | ❌ |
| website die | ✅ Ngay | ❌ |
| website sống lại | ✅ Ngay | ❌ |

### 4. Web UI
Giao diện React + TailwindCSS với các trang:
- `/login` - Đăng nhập
- `/` - Dashboard (tổng quan + cảnh báo)
- `/backlinks` - Quản lý backlink
- `/crawl` - Crawl domain + thêm backlink
- `/websites` - Quản lý website
- `/customers` - Quản lý khách hàng
- `/blacklist` - Quản lý blacklist href
- `/logs` - Lịch sử thông báo

### 5. Bot Commands

| Command | Nội bộ | Khách |
|---------|--------|-------|
| `/info` | Group ID + tên | Group ID + tên |
| `/check` | Tổng quan + doanh thu | Tổng quan link của họ |
| `/check <keyword>` | Tìm tất cả + giá | Tìm link của họ, không giá |
| `/report` | Excel toàn bộ | 🔮 Mở sau |
| `/report_lost` | Excel link mất | 🔮 Mở sau |
| `/report_live` | Excel link live | 🔮 Mở sau |

---

## 🗄️ Database (5 bảng)

- `Customers` - Thông tin khách hàng + Telegram group
- `Websites` - Domain, giá, trạng thái die/alive
- `Backlinks` - Backlink theo từng khách, status độc lập
- `BlacklistedLinks` - Href bị blacklist (ẩn khỏi crawl UI)
- `NotificationLogs` - Lịch sử thông báo đã gửi

---

## ⚙️ Công nghệ

| Layer | Công nghệ |
|-------|-----------|
| Backend | Python 3.11, FastAPI, SQLAlchemy, Alembic |
| Database | MySQL 8.0 |
| Crawler | curl_cffi (Chrome124) |
| Scheduler | APScheduler |
| Telegram | python-telegram-bot |
| Excel | openpyxl |
| Frontend | React + Vite, TailwindCSS, Zustand, Axios |
| Auth | JWT (access + refresh token), bcrypt |
| Deploy | Ubuntu EC2, Nginx, Uvicorn, SSL Let's Encrypt |
| Container | Docker + docker-compose |

---

## 🚀 Tính năng sẽ build sau

| # | Tính năng |
|---|-----------|
| 1 | Thông báo nhắc gia hạn 7 ngày trước cho khách |
| 2 | Bot commands đầy đủ cho khách hàng |
| 3 | `/report` Excel cho khách hàng |

---

## 🔑 Environment Variables

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
```