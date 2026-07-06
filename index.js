/**
 * SillyTavern Extension: Phone Ecosystem & Helper Scripts
 * Entry point nạp tự động các module trong hệ sinh thái với cơ chế kiểm tra môi trường sẵn sàng (Ready Check).
 */

console.log('[SillyTavern Extension] Đang chờ môi trường SillyTavern & jQuery sẵn sàng...');

function waitForEnvironment(callback) {
    const checkInterval = setInterval(() => {
        if (
            typeof window !== 'undefined' &&
            window.parent &&
            window.parent.$ &&
            window.parent.jQuery &&
            window.parent.document &&
            window.parent.document.body &&
            window.parent.document.readyState !== 'loading'
        ) {
            clearInterval(checkInterval);
            callback();
        }
    }, 100);
}

waitForEnvironment(async () => {
    console.log('[SillyTavern Extension] Môi trường đã sẵn sàng! Đang nạp hệ sinh thái...');
    try {
        // ==========================================
        // 1. NẠP LÕI QUẢN LÝ GIAO DIỆN & HỆ THỐNG (CORE MASTERS)
        // ==========================================
        await import('./modules/floating_ball_manager.js'); // Quản lý bóng nổi (Bong bóng mẹ - UI Master)
        await import('./modules/phone_core.js'); // Lõi Điện thoại (Phone Core - App Master)

        // ==========================================
        // 2. NẠP CÁC ỨNG DỤNG ĐIỆN THOẠI (PHONE APPS)
        // ==========================================
        await import('./modules/app_browser.js'); // App Browser - 1
        await import('./modules/app_canvas.js'); // App Canvas - 20
        await import('./modules/app_chess.js'); // App Cờ vua - 13
        await import('./modules/app_cleanup.js'); // App Dọn dẹp - 18
        await import('./modules/app_create_char_wechat.js'); // App Tạo char wechat (Yêu cầu App trò chuyện) - 4
        await import('./modules/app_create_oc_group_chat.js'); // App Tạo OC Group Chat - 5
        await import('./modules/app_flappy_bird.js'); // App Flappy bird - 12
        await import('./modules/app_freegen.js'); // App Freegen - 16
        await import('./modules/app_infinite_craft.js'); // App Infinite Craft - 9
        await import('./modules/app_livestream.js'); // App Livestream - 14
        await import('./modules/app_music.js'); // App Âm nhạc - 11
        await import('./modules/app_news.js'); // App Tin tức - 7
        await import('./modules/app_pollinations.js'); // App Pollinations - 15
        await import('./modules/app_terminal_debug.js'); // App Terminal Debug - 10
        await import('./modules/app_theme.js'); // App Theme - 19
        await import('./modules/app_virtual_tube.js'); // App Virtual Tube - 8
        await import('./modules/app_weather.js'); // APP Thời tiết - 2
        await import('./modules/app_wechat_auau.js'); // Trò chuyện với Âu Âu nào! (Đi cùng App trò chuyện)
        await import('./modules/app_wechat.js'); // APP Wechat - 3
        await import('./modules/app_world_map.js'); // App Bản đồ thế giới - 6
        await import('./modules/app_youtube.js'); // App Youtube - 17

        // ==========================================
        // 3. NẠP CÁC TIỆN ÍCH & TÍNH NĂNG ĐỘC LẬP (UTILITIES)
        // ==========================================
        await import('./modules/avar_ai_input.js'); // Avar AI Input @Kaiz
        await import('./modules/shimeji.js'); // Shimeji v14.21
        await import('./modules/storage_inspector.js'); // Quản lý Dữ liệu Web (Storage & IndexedDB Inspector)
        await import('./modules/visual_novel_dialogue.js'); // Visual Novel Dialogue
        await import('./modules/vtuber_assistant.js'); // Vtuber v0.38.18 Voice Assistant Complete

        console.log('[SillyTavern Extension] Đã nạp thành công toàn bộ 28 module!');
    } catch (err) {
        console.error('[SillyTavern Extension] Lỗi nghiêm trọng khi nạp module:', err);
    }
});
