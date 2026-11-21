# Smart E-Mobility Hub (VNU-HCM) — Hướng dẫn chạy hệ thống

## 1. Cấu trúc mã nguồn
Hệ thống được xây dựng theo kiến trúc Web 3 lớp gồm Frontend (React, TypeScript, Vite, Tailwind CSS, Leaflet), Backend API (NestJS, Prisma ORM) và cơ sở dữ liệu PostgreSQL 18:

```text
.
├── backend/            # Mã nguồn REST API (NestJS + Prisma), Dockerfile
├── frontend/           # Mã nguồn giao diện Web (React + Vite), Nginx config, Dockerfile
├── database/init/      # Kịch bản khởi tạo lược đồ (01_schema.sql) và dữ liệu mẫu (02_seed.sql)
├── docker-compose.yml  # Cấu hình khởi chạy đồng bộ PostgreSQL, Backend và Frontend
├── .env.example        # Tệp mẫu biến môi trường khi chạy trực tiếp trên máy
└── package.json        # Tập lệnh tiện ích cho môi trường phát triển cục bộ
```

---

## 2. Cách 1: Khởi chạy bằng Docker Compose (Khuyến nghị)

### Yêu cầu
- Đã cài đặt **Docker** và **Docker Compose**.
- Có **kết nối Internet** ở lần khởi chạy đầu tiên (để tải các Docker image, cài đặt thư viện và hiển thị nền bản đồ OpenStreetMap).
- Các cổng `5173` (Frontend), `3000` (Backend) và `5432` (PostgreSQL) chưa bị chiếm dụng.

### Khởi chạy hệ thống
Mở terminal tại thư mục chứa tệp `README.md` này và chạy lệnh:

```bash
docker compose up -d --build --wait
```

> Không cần tạo tệp `.env` vì cấu hình mặc định và dữ liệu mẫu (`database/init/`) sẽ được tự động nạp khi khởi chạy lần đầu. Tham số `--wait` sẽ tự động chờ đến khi cả PostgreSQL và Backend đạt trạng thái `healthy`.

Kiểm tra trạng thái các container (nếu cần):

```bash
docker compose ps
```

### Dừng và đặt lại dữ liệu
- **Dừng hệ thống:**
  ```bash
  docker compose down
  ```
- **Xóa dữ liệu cũ và khởi chạy lại với dữ liệu mẫu ban đầu:**
  ```bash
  docker compose down -v
  docker compose up -d --build --wait
  ```

---

## 3. Cách 2: Chạy trực tiếp trên máy (Không dùng Docker)

Sử dụng cách này trong trường hợp máy không cài Docker.

### Yêu cầu
- **Node.js** phiên bản `>= 20` (khuyến nghị `24`) và **npm**.
- **PostgreSQL** phiên bản `>= 16` (khuyến nghị `18`) đang hoạt động.
- Có **kết nối Internet** để cài đặt thư viện npm và hiển thị bản đồ OpenStreetMap.

### Các bước thực hiện

**Bước 1: Tạo cơ sở dữ liệu và nạp dữ liệu mẫu**
Tạo cơ sở dữ liệu `smart_emobility` (và người dùng `semh_user` với mật khẩu `semh_password`, hoặc dùng tài khoản PostgreSQL có sẵn trên máy), sau đó nạp 2 tệp SQL theo đúng thứ tự:

```bash
psql -U semh_user -d smart_emobility -f database/init/01_schema.sql
psql -U semh_user -d smart_emobility -f database/init/02_seed.sql
```

**Bước 2: Cấu hình biến môi trường cho Backend**
Sao chép tệp `.env.example` thành `backend/.env` và cập nhật `DATABASE_URL` nếu bạn dùng tài khoản/cổng PostgreSQL khác mặc định:

```bash
cp .env.example backend/.env
```

**Bước 3: Cài đặt thư viện và khởi tạo Prisma Client**
```bash
cd backend
npm install
npx prisma generate

cd ../frontend
npm install
```

**Bước 4: Khởi chạy ứng dụng**
Mở 2 cửa sổ terminal riêng biệt (từ thư mục gốc của dự án):

- Terminal 1 — Chạy Backend (cổng `3000`):
  ```bash
  cd backend
  npm run start:dev
  ```
- Terminal 2 — Chạy Frontend (cổng `5173`, tự động chuyển tiếp `/api` sang cổng `3000`):
  ```bash
  cd frontend
  npm run dev
  ```

*(Hoặc cài thư viện ở thư mục gốc bằng `npm install` rồi chạy đồng thời cả hai dịch vụ bằng `npm run dev`.)*

---

## 4. Truy cập ứng dụng
- **Giao diện Web:** `http://localhost:5173`
- **Kiểm tra trạng thái Backend API:** `http://localhost:3000/api/health` (trả về `{"status":"ok"}`)

---

## 5. Tài khoản mẫu
Mật khẩu mặc định là `123456` (có thể chọn nhanh trực tiếp trên trang đăng nhập):

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Sinh viên | `a.nguyen23@vnuhcm.edu.vn` | `123456` |
| Nhân viên vận hành | `tien.le@emobility.vnuhcm.edu.vn` | `123456` |
| Quản trị viên | `admin@emobility.vnuhcm.edu.vn` | `123456` |

> Tài khoản **Quản trị viên** có sẵn nút **Khôi phục dữ liệu mẫu** ngay trên thanh công cụ để đưa cơ sở dữ liệu về trạng thái ban đầu mà không cần khởi động lại container.

---

## 6. Xử lý sự cố thường gặp
- **Lỗi trùng cổng (`port is already allocated`)**: Thường xảy ra khi máy đã có sẵn dịch vụ PostgreSQL chạy ở cổng `5432` (hoặc dịch vụ khác ở cổng `3000`/`5173`). Hãy mở tệp `docker-compose.yml` và đổi phần cổng bên trái dấu hai chấm (ví dụ đổi `"127.0.0.1:5432:5432"` thành `"127.0.0.1:5433:5432"`). Việc đổi cổng host của PostgreSQL không ảnh hưởng đến kết nối nội bộ giữa Backend và PostgreSQL trong Docker.
- **Xem nhật ký hoạt động khi dịch vụ không khởi động được**:
  ```bash
  docker compose logs -f backend
  ```
- **Khởi tạo lại hoàn toàn từ đầu nếu container/dữ liệu bị lỗi**:
  ```bash
  docker compose down -v
  docker compose up -d --build --wait
  ```
