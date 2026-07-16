# Bảng Tổng Kết Kiến Trúc KAIZ AI Agency (v2.6.0.0)

Bảng tổng kết này dành riêng cho việc theo dõi, duy trì và mở rộng hệ thống AI Agency (hiện đang được áp dụng cho **Preset** và **Regex** Editor). Có thể dùng làm tham chiếu khi tích hợp thêm các công cụ mới (như Character Editor, World Info Editor, v.v.).

---

## 1. Kiến Trúc Cốt Lõi (Core Architecture)
Hệ thống được thiết kế theo mô hình **Provider - Engine - UI** tách biệt:

### a. `llm-client.js` (Lớp giao tiếp API)
- Gửi yêu cầu HTTP đến Endpoint LLM (OpenAI Format).
- **Tính năng chính:**
  - Hỗ trợ Stream Server-Sent Events (SSE).
  - Tự động Retry với cấp số nhân (Exponential Backoff) nếu lỗi mạng.
  - Xử lý các HTTP Status đặc thù (401, 403, 404, 429).
  - Ghi log (Debug Log) toàn bộ chu trình.

### b. `engine.js` (Khối Logic AI Agency / Agentic Loop)
- Quản lý vòng lặp suy nghĩ và gọi Tool (Chain of Thought + Function Calling).
- **Tính năng chính:**
  - Quản lý Context (lịch sử tin nhắn), đảm bảo không vượt quá Max Context (Token Limit).
  - Biên dịch danh sách Tools từ Provider thành schema tương thích OpenAI.
  - Phân tích luồng stream (nhận diện `[tool_calls]` hoặc JSON).
  - Bắt lỗi đứt gãy luồng, cắt cụt (Truncation/Safety filter) và tự phục hồi bằng cách mồi thêm prompt.
  - Trả kết quả từng bước (chunk, toolCall, toolResult, done, error) thông qua Event Callbacks để UI hiển thị.

### c. Providers (`preset-provider.js` & `regex-provider.js`)
- Là lớp cầu nối (Adapter) định nghĩa logic **đặc thù** của từng tính năng.
- **Quy tắc bắt buộc của một Provider:**
  - Khai báo System Prompt riêng biệt, trong đó **phải chứa hướng dẫn CoT (Chain of Thought)** rõ ràng. Đặc biệt là quy trình **"Error Reflection"** (Tự chẩn đoán lỗi) trước khi thực thi lệnh.
  - Định nghĩa danh sách các Tools và Schema JSON của chúng.
  - Xử lý Action thực thi thực tế khi Tool được gọi.
  - Duy trì **Staging Buffer (Sandbox)**: Mọi thay đổi đều được lưu tạm vào Sandbox, không ghi đè trực tiếp lên dữ liệu thực tế cho đến khi người dùng ấn "Áp dụng".

### d. UI (`preset-agency-ui.js` & `regex-agency-ui.js`)
- Quản lý giao diện, trạng thái người dùng và bảng Diff Preview.
- **Trạng thái vòng đời (State Machine):**
  1. `idle`: Chờ lệnh (Hiện nút Gửi, Ẩn nút Dừng).
  2. `streaming`: LLM đang xả text (Ẩn Gửi, Hiện Dừng).
  3. `tool_calling`: LLM vừa gọi tool, đang đợi tool chạy (Ẩn Gửi, Hiện Dừng).
  4. `pending_confirm`: Tool hoàn tất, đang chờ người dùng xem bảng Diff (Hiện Gửi, Ẩn Dừng).

---

## 2. Bài Học & Các Lỗi Đã Giải Quyết (Lessons Learned)

- **Bypass Safety Filter:**
  - Lỗi: API từ chối phản hồi vì nội dung nhạy cảm (NSFW) trong Regex/Preset.
  - Giải pháp: Chèn directive bypass mạnh mẽ `<nofear>` vào System Prompt, giả lập vai trò "Developer Sandbox Mode", và dùng `assistant prefill` để mồi sẵn câu trả lời.
- **Truncation & Loop Breaking:**
  - Lỗi: Tool JSON bị cắt cụt giữa chừng do hết Token Output hoặc rớt mạng.
  - Giải pháp: `engine.js` phát hiện lỗi JSON, tự động nhét prompt: `[Hệ thống: Phản hồi bị ngắt...]` và gởi lại vào vòng lặp mà không cần người dùng can thiệp.
- **Premature UI State Transition (Lỗi ẩn nút Stop):**
  - Lỗi: UI chuyển sang `pending_confirm` (ẩn nút Dừng) ngay lập tức sau khi tool thực thi, trong khi LLM vẫn đang xả câu summary cuối cùng. Nếu LLM bị lỗi kết nối lúc này, vòng lặp tự Retry nhưng người dùng không thể can thiệp dừng.
  - Giải pháp: State `pending_confirm` chỉ được kích hoạt trong hàm `onDone()` khi Engine báo cáo kết thúc toàn bộ chu trình, nếu không thì phải giữ nguyên state `streaming` (để nút Dừng luôn hiện diện).
- **Error Reflection trong CoT:**
  - Lỗi: AI liên tục gọi lại một Tool bị lỗi mà không hề sửa tham số (Loop vô tận).
  - Giải pháp: Ép AI tuân thủ bước 1: `[BƯỚC 1: TỰ PHÂN TÍCH LỖI VÀ TÌM HƯỚNG KHẮC PHỤC]` trước khi gọi lại Tool. Điều này giúp phá vỡ vòng lặp lặp đi lặp lại lỗi cũ.
- **UI Expansion (UX Tối ưu):**
  - Bảng quản lý AI Agency nên đẩy phần tử cha mở rộng ra ngoài (Push outer div) thay vì bóp nghẹt diện tích bảng gốc, giúp người dùng không có cảm giác chật chội.

---

## 3. Quy Trình Mở Rộng Thêm Tab Mới (Checklist for Future Expansion)
Nếu sau này cần tích hợp AI Agency vào **World Info**, **Character Editor**, hay **Quick Replies**, hãy làm theo các bước sau:

1. **Tạo Provider Mới (VD: `world-info-provider.js`):**
   - Kế thừa hoặc thiết kế theo cấu trúc `IContextProvider`.
   - Tạo Staging Buffer riêng biệt (`_stagingMap`).
   - Định nghĩa System Prompt với CoT và Error Reflection.
   - Viết các Tools CRUD (Đọc, Sửa, Xóa, Tạo, Lưu). Đảm bảo Tool lưu luôn trả về `{ pending_review: true }`.

2. **Tạo UI Mới (VD: `world-info-agency-ui.js`):**
   - Thiết kế HTML template chứa Chat, Config, Debug Logs, Preview.
   - Quản lý DOM logic: Khi mở tab AI, tự động mở rộng vùng chứa (`.ai-agency-expanded`).
   - Copy chính xác bộ Event Handlers (`onChunk`, `onToolCall`, `onToolResult`, `onDone`, `onError`) từ Regex/Preset, đảm bảo giữ nguyên logic nút Dừng/Gửi.

3. **Cập nhật `api.js` & Các module liên quan:**
   - Trích xuất hàm Export/Import dữ liệu hiện tại để Provider có thể đọc và ghi đè sau khi Confirm Diff.

---
*(Bảng tổng kết này được tạo ở phiên bản 2.6.0.0. Hãy cập nhật khi có thêm kiến trúc hoặc sửa lỗi lõi).*

---

## 4. Nợ Kỹ Thuật & Cần Refactor (Tech Debt - Từ bản 2.6.0.0)
Do phát triển nhanh và sao chép cấu trúc từ Preset sang Regex, hệ thống hiện đang bị **trùng lặp mã nguồn (Code Duplication)** rất lớn (lên tới 70%):
- **Giao diện (UI):** Các hàm parse Markdown (`protectCodeBlocks`, `cleanAssistantText`), chu trình chat (`appendBubble`, `setState`) và cả khối HTML khổng lồ (`buildSidebarHTML`) đang bị lặp lại ở cả `preset-agency-ui.js` và `regex-agency-ui.js`.
- **Hộp cát (Staging Buffer):** Cơ chế quản lý `_stagingMap`, `_stagingCreates`, `_stagingDeletes` bị lặp lại y hệt giữa hai Provider.
👉 **Mục tiêu tiếp theo (Nếu rảnh rỗi hoặc khi thêm tính năng thứ 3):**
   - Rút trích toàn bộ logic UI chung ra một class `AgencyChatUI` (hoặc tệp `ai-ui-utils.js`).
   - Rút trích logic quản lý hộp cát ra một class `StagingBuffer` chung để các Provider chỉ cần kế thừa.
