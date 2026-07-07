# Hệ Thống Chấm Công & Checklist Chấm Chéo Nhân Sự - Thời Thanh Xuân

Hệ thống quản lý ca làm việc, chấm công và kiểm tra vệ sinh (checklist chấm chéo) nội bộ dành cho nhân sự cửa hàng **Thời Thanh Xuân**.

## 🌟 Tính Năng Chính
1. **Chấm Công (Check-in / Check-out)**:
   * Nhân viên chọn bộ phận làm việc và check-in vào ca.
   * Quy trình Check-out hai bước: Hiển thị báo cáo thời gian thực về tổng giờ làm việc và tỷ lệ hoàn thành checklist chấm chéo trước khi xác nhận lưu ca.
2. **Checklist Chấm Chéo (Cross-check)**:
   * Nhân viên ca này bắt buộc phải kiểm tra và chấm điểm vệ sinh cho một bộ phận khác (chấm chéo) theo quy tắc.
   * Chụp ảnh thực tế đối chiếu với ảnh mẫu tiêu chuẩn (có tính năng căn góc chụp mờ 30% trực tiếp trên camera).
3. **Phê Duyệt Hình Ảnh (Quản lý)**:
   * Quản lý xem đối chiếu song song ảnh mẫu và ảnh chụp thực tế của nhân viên để duyệt "Đạt" hoặc "Yêu cầu làm lại".
4. **Cấu Hình Quy Tắc (Quản lý)**:
   * Quản lý có quyền thiết lập bộ phận nào sẽ chấm chéo bộ phận nào (Ví dụ: Pha chế ➔ Bán hàng).
5. **Báo Cáo Hiệu Suất & KPIs**:
   * Thống kê giờ làm việc, điểm vệ sinh và tỷ lệ hoàn thành chấm chéo.
   * Lọc tìm kiếm nhân viên thời gian thực.
   * Xuất file Excel chuẩn `.xlsx` đồng bộ theo bộ lọc.

---

## 🛠️ Công Nghệ Sử Dụng
* **Backend**: Python (Flask)
* **Cơ sở dữ liệu**: SQLite
* **Frontend**: HTML5, Vanilla CSS (Light Theme), Javascript (SPA)
* **Thư viện xuất Excel**: `openpyxl`

---

## 📂 Cấu Trúc Thư Mục
* `app.py`: File chạy chính, chứa toàn bộ API và logic nghiệp vụ.
* `database.py`: Quản lý khởi tạo cơ sở dữ liệu SQLite (`data.db`) và dữ liệu mẫu.
* `create_placeholders.py`: Script tự động tạo ảnh mẫu tiêu chuẩn cho các bộ phận.
* `templates/index.html`: Giao diện SPA chính.
* `static/css/style.css`: Giao diện Light Theme thương hiệu.
* `static/js/app.js`: Xử lý logic nghiệp vụ phía client.
* `static/uploads/`: Chứa các ảnh mẫu tiêu chuẩn (bắt đầu bằng `ref_`). Các ảnh chụp thực tế sẽ bị bỏ qua khi commit lên Git.
* `.gitignore`: Cấu hình các file không đẩy lên GitHub (Cơ sở dữ liệu cục bộ, cache, ảnh chụp thực tế...).

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Cục Bộ

1. **Cài đặt thư viện cần thiết**:
   ```bash
   pip install flask openpyxl
   ```

2. **Khởi tạo cơ sở dữ liệu và ảnh mẫu**:
   ```bash
   python database.py
   python create_placeholders.py
   ```

3. **Chạy ứng dụng**:
   ```bash
   python app.py
   ```
   Sau đó truy cập trình duyệt tại địa chỉ: [http://localhost:5000](http://localhost:5000)

---

## 🧪 Tài Khoản Thử Nghiệm Mẫu

* **Quản lý (Manager)**:
  * Mã đăng nhập: `123456`
* **Nhân viên Fulltime (FT)**:
  * Mã đăng nhập: `FT1001` (Nguyễn Văn A - Bán hàng)
  * Mã đăng nhập: `FT1002` (Trần Thị B - Pha chế)
* **Nhân viên Parttime (PT)**:
  * Mã đăng nhập: `PT2001` (Lê Văn C - Phục vụ)
