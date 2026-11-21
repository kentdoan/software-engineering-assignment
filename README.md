# Smart E-Mobility Hub (VNU-HCM) — Hướng dẫn chạy hệ thống

## 1. Yêu cầu
- Đã cài đặt **Docker** và **Docker Compose**.
- Các cổng `5173` (Frontend), `3000` (Backend) và `5432` (PostgreSQL) chưa bị chiếm dụng.

## 2. Khởi chạy hệ thống
Mở terminal tại thư mục chứa tệp `README.md` này và chạy lệnh:

```bash
docker compose up -d --build
```

> Không cần tạo tệp `.env` vì cấu hình mặc định và dữ liệu mẫu (`database/init/`) sẽ được tự động nạp khi khởi chạy lần đầu.

Kiểm tra trạng thái các container (chờ `semh-postgres` và `semh-backend` chuyển sang `healthy`):

```bash
docker compose ps
```

## 3. Truy cập ứng dụng
- **Giao diện Web:** `http://localhost:5173`
- **Backend API:** `http://localhost:3000/api/health`

## 4. Tài khoản mẫu
Mật khẩu mặc định là `123456` (có thể chọn nhanh trực tiếp trên trang đăng nhập):

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Sinh viên | `a.nguyen23@vnuhcm.edu.vn` | `123456` |
| Nhân viên vận hành | `tien.le@emobility.vnuhcm.edu.vn` | `123456` |
| Quản trị viên | `admin@emobility.vnuhcm.edu.vn` | `123456` |

## 5. Dừng và đặt lại dữ liệu
- **Dừng hệ thống:**
  ```bash
  docker compose down
  ```
- **Xóa dữ liệu cũ và khởi chạy lại với dữ liệu mẫu ban đầu:**
  ```bash
  docker compose down -v
  docker compose up -d --build
  ```
