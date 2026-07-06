/**
 * SillyTavern Extension: Phone Ecosystem & Helper Scripts
 * Entry point nạp tự động các module trong hệ sinh thái với cơ chế kiểm tra môi trường sẵn sàng (Ready Check).
 */

console.log('[SillyTavern Extension - Phone Ecosystem] Đang chờ môi trường SillyTavern sẵn sàng...');

function getTargetWindow() {
    return (typeof window !== 'undefined' && window.parent && window.parent.document) ? window.parent : window;
}

function waitForEnvironment(callback) {
    let attempts = 0;
    const checkInterval = setInterval(() => {
        attempts++;
        const targetWin = getTargetWindow();
        const doc = targetWin.document || document;
        const jq = targetWin.$ || targetWin.jQuery || window.$ || window.jQuery;

        if (
            doc &&
            doc.body &&
            doc.readyState !== 'loading' &&
            jq
        ) {
            clearInterval(checkInterval);
            console.log(`[SillyTavern Extension] Môi trường đã sẵn sàng sau ${attempts * 100}ms!`);
            callback(targetWin, jq);
        } else if (attempts >= 100) { // 10 giây
            console.warn('[SillyTavern Extension] Quá thời gian chờ jQuery/DOM, tiến hành nạp ép buộc...');
            clearInterval(checkInterval);
            callback(targetWin, jq || window.$ || null);
        }
    }, 100);
}

waitForEnvironment(async (targetWin, jq) => {
    console.log('[SillyTavern Extension] Đang nạp hệ sinh thái...');
    
    // Hàm hỗ trợ load module an toàn độc lập
    async function safeImport(path, name) {
        try {
            await import(path);
            console.log(`[PhoneEcosystem] Đã nạp thành công: ${name}`);
            return true;
        } catch (err) {
            console.error(`[PhoneEcosystem] ❌ Lỗi khi nạp module "${name}" (${path}):`, err);
            return false;
        }
    }

    // ==========================================
    // 1. NẠP LÕI QUẢN LÝ GIAO DIỆN & HỆ THỐNG (CORE MASTERS)
    // ==========================================
    await safeImport('./modules/floating_ball_manager.js', 'Floating Ball Manager (UI Master)');
    await safeImport('./modules/phone_core.js', 'Phone Core (App Master)');

    // ==========================================
    // 2. NẠP CÁC ỨNG DỤNG ĐIỆN THOẠI (PHONE APPS)
    // ==========================================
    const phoneApps = [
        { path: './modules/app_browser.js', name: 'App Browser' },
        { path: './modules/app_canvas.js', name: 'App Canvas' },
        { path: './modules/app_chess.js', name: 'App Cờ vua' },
        { path: './modules/app_cleanup.js', name: 'App Dọn dẹp' },
        { path: './modules/app_create_char_wechat.js', name: 'App Tạo char WeChat' },
        { path: './modules/app_create_oc_group_chat.js', name: 'App Tạo OC Group Chat' },
        { path: './modules/app_flappy_bird.js', name: 'App Flappy Bird' },
        { path: './modules/app_freegen.js', name: 'App Freegen' },
        { path: './modules/app_infinite_craft.js', name: 'App Infinite Craft' },
        { path: './modules/app_livestream.js', name: 'App Livestream' },
        { path: './modules/app_music.js', name: 'App Âm nhạc' },
        { path: './modules/app_news.js', name: 'App Tin tức' },
        { path: './modules/app_pollinations.js', name: 'App Pollinations' },
        { path: './modules/app_terminal_debug.js', name: 'App Terminal Debug' },
        { path: './modules/app_theme.js', name: 'App Theme' },
        { path: './modules/app_virtual_tube.js', name: 'App Virtual Tube' },
        { path: './modules/app_weather.js', name: 'App Thời tiết' },
        { path: './modules/app_wechat_auau.js', name: 'App WeChat Âu Âu' },
        { path: './modules/app_wechat.js', name: 'App WeChat' },
        { path: './modules/app_world_map.js', name: 'App Bản đồ thế giới' },
        { path: './modules/app_youtube.js', name: 'App YouTube' }
    ];

    // ==========================================
    // 3. NẠP CÁC TIỆN ÍCH & TÍNH NĂNG ĐỘC LẬP (UTILITIES)
    // ==========================================
    const utilities = [
        { path: './modules/avar_ai_input.js', name: 'Avar AI Input' },
        { path: './modules/shimeji.js', name: 'Shimeji v14.21' },
        { path: './modules/storage_inspector.js', name: 'Storage Inspector' },
        { path: './modules/visual_novel_dialogue.js', name: 'Visual Novel Dialogue' },
        { path: './modules/vtuber_assistant.js', name: 'Vtuber Assistant' }
    ];

    let successCount = 0;
    let failCount = 0;

    for (const app of [...phoneApps, ...utilities]) {
        const ok = await safeImport(app.path, app.name);
        if (ok) successCount++; else failCount++;
    }

    console.log(`[SillyTavern Extension] Hoàn tất nạp hệ sinh thái: ${successCount + 2}/28 module thành công (${failCount} lỗi).`);
});
