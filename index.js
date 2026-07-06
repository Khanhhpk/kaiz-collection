/**
 * SillyTavern Extension: Phone Ecosystem & Helper Scripts
 * Entry point nạp tự động các module trong hệ sinh thái.
 */

console.log('[SillyTavern Extension] Đang khởi tạo hệ sinh thái Phone Ecosystem & Helper Scripts...');

// ==========================================
// 1. NẠP LÕI QUẢN LÝ GIAO DIỆN & HỆ THỐNG (CORE MASTERS)
// ==========================================
import './modules/floating_ball_manager.js'; // Quản lý bóng nổi (Bong bóng mẹ - UI Master)
import './modules/phone_core.js'; // Lõi Điện thoại (Phone Core - App Master)

// ==========================================
// 2. NẠP CÁC ỨNG DỤNG ĐIỆN THOẠI (PHONE APPS)
// ==========================================
import './modules/app_browser.js'; // App Browser - 1
import './modules/app_canvas.js'; // App Canvas - 20
import './modules/app_chess.js'; // App Cờ vua - 13
import './modules/app_cleanup.js'; // App Dọn dẹp - 18
import './modules/app_create_char_wechat.js'; // App Tạo char wechat (Yêu cầu App trò chuyện) - 4
import './modules/app_create_oc_group_chat.js'; // App Tạo OC Group Chat - 5
import './modules/app_flappy_bird.js'; // App Flappy bird - 12
import './modules/app_freegen.js'; // App Freegen - 16
import './modules/app_infinite_craft.js'; // App Infinite Craft - 9
import './modules/app_livestream.js'; // App Livestream - 14
import './modules/app_music.js'; // App Âm nhạc - 11
import './modules/app_news.js'; // App Tin tức - 7
import './modules/app_pollinations.js'; // App Pollinations - 15
import './modules/app_terminal_debug.js'; // App Terminal Debug - 10
import './modules/app_theme.js'; // App Theme - 19
import './modules/app_virtual_tube.js'; // App Virtual Tube - 8
import './modules/app_weather.js'; // APP Thời tiết - 2
import './modules/app_wechat_auau.js'; // Trò chuyện với Âu Âu nào! (Đi cùng App trò chuyện)
import './modules/app_wechat.js'; // APP Wechat - 3
import './modules/app_world_map.js'; // App Bản đồ thế giới - 6
import './modules/app_youtube.js'; // App Youtube - 17

// ==========================================
// 3. NẠP CÁC TIỆN ÍCH & TÍNH NĂNG ĐỘC LẬP (UTILITIES)
// ==========================================
import './modules/avar_ai_input.js'; // Avar AI Input @Kaiz
import './modules/shimeji.js'; // Shimeji v14.21
import './modules/storage_inspector.js'; // Quản lý Dữ liệu Web (Storage & IndexedDB Inspector)
import './modules/visual_novel_dialogue.js'; // Visual Novel Dialogue
import './modules/vtuber_assistant.js'; // Vtuber v0.38.18 Voice Assistant Complete

console.log('[SillyTavern Extension] Đã nạp thành công toàn bộ 28 module!');
