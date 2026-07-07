# KAIZ Collection (SillyTavern Phone Ecosystem & Helper Scripts)

Đây là bộ sưu tập mở rộng (Extension) chính thức cho **SillyTavern**, bao gồm Hệ sinh thái **Lõi Điện thoại (Phone Core)**, hơn 20 ứng dụng tích hợp và bộ công cụ trợ thủ giao diện (Visual Novel Dialogue, Vtuber Voice Assistant, Shimeji, Quản lý bóng nổi, v.v.).

---

## 🌟 Tính năng nổi bật
- **📱 Lõi Điện thoại (Phone Core)**: Hệ sinh thái điện thoại ảo đa nhiệm, phân trang UI, tùy chỉnh kích thước, hình nền và kết nối API sâu (OpenAI, Claude, DeepSeek).
- **📦 Hơn 20 Ứng dụng tích hợp**: Thời tiết, WeChat, Tạo Char WeChat, OC Group Chat, Bản đồ thế giới, Youtube, Livestream, Cờ vua, Flappy Bird, Âm nhạc, Terminal Debug, v.v.
- **🎨 Bộ Tiện ích Giao diện (UI Helpers)**:
  - **Visual Novel Dialogue**: Trình hiển thị hội thoại chuẩn Visual Novel tuyệt đẹp.
  - **Vtuber Voice Assistant**: Trợ lý ảo giọng nói Vtuber tích hợp hoàn chỉnh.
  - **Shimeji**: Nhân vật ngồi/đi lại trên màn hình dễ thương.
  - **Quản lý bóng nổi & Storage Inspector**: Công cụ quản lý menu nhanh và debug dữ liệu Web/IndexedDB.
- **📋 Bảng Quản lý & Nhật ký Hệ thống (Logs)**: Tích hợp sẵn trong tab Extensions giúp bạn bật/tắt từng ứng dụng và xem nhật ký hoạt động gọn gàng ngay trong SillyTavern mà không làm rác Console trình duyệt.

---

## 🚀 Cách cài đặt vào SillyTavern (Qua Link / GitHub)

### Cách 1: Cài trực tiếp qua link GitHub (Khuyên dùng)
1. Mở **SillyTavern**.
2. Bấm vào biểu tượng **Extensions (Khối xếp hình 🧩)** trên thanh menu phía trên.
3. Chọn thẻ **Install extension (Cài đặt tiện ích)**.
4. Dán đường link GitHub của kho lưu trữ này vào ô **URL**:
   ```
   https://github.com/Khanhhpk/kaiz-collection
   ```
   *(Lưu link cũ `sillytavern-phone-ecosystem` vẫn tự động chuyển hướng)*
5. Bấm **Save / Install (Lưu / Cài đặt)**. SillyTavern sẽ tự động tải về và nạp extension!

### Cách 2: Cài thủ công (Chép thư mục)
1. Tải toàn bộ kho lưu trữ `kaiz-collection` này về máy.
2. Chép thư mục vào đường dẫn sau trong SillyTavern của bạn:
   ```
   [Thư mục SillyTavern]/public/scripts/extensions/third-party/kaiz-collection/
   ```
3. Tải lại trang SillyTavern (F5).

---

## 🔄 Cách cập nhật phiên bản mới
- **Đối với người dùng SillyTavern**: Chỉ cần vào menu **Extensions 🧩** -> bấm nút **Update (Cập nhật)** ngay bên cạnh tên extension `KAIZ Collection`. Không cần phải import lại từng script JSON như trước đây!
---

## 📂 Cấu trúc thư mục Extension
```
kaiz-collection/
├── manifest.json       # File khai báo Extension với SillyTavern (KAIZ Collection)
├── index.js            # Entry point tự động nạp tất cả module & quản lý UI / Log
├── README.md           # Tài liệu hướng dẫn
└── modules/            # Thư mục chứa mã nguồn JS đã tách sạch từ JSON
    ├── phone_core.js
    ├── app_weather.js
    ├── app_wechat.js
    ... (27 file module JS)
```


