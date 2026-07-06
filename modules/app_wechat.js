/**
 * Module: APP Wechat - 3
 * ID: bc89061d-f8b0-44e3-adb9-d94eb266dc0a
 * Converted for SillyTavern Native Extension
 */

// ==================== APP Trò Chuyện (WeChat Base UI) ====================
// Cung cấp giao diện nền và tính năng GHI ĐÈ Avatar toàn cục cho mọi OC Char ký sinh.

(function () {
    'use strict';

    const APP_ID = 'tenant_chat';
    const APP_NAME = 'WeChat';
    const APP_ICON = '<img src="https://api.iconify.design/ri:wechat-fill.svg?color=white" style="width:70%;height:70%">';

    // ==================== CSS (Đã thêm CSS Ghi đè Avatar) ====================
    const APP_STYLES = `
        /* Khung App cơ bản */
        .chat-app { display: flex; flex-direction: column; height: 100%; background: #ededed; font-family: -apple-system, 'SF Pro Text', sans-serif; padding-top: 44px; box-sizing: border-box; color: #111; }
        
        /* Chế độ xem danh sách (Danh bạ) */
        .chat-list-view { display: flex; flex-direction: column; height: 100%; }
        .chat-list-header { background: rgba(237, 237, 237, 0.9); backdrop-filter: blur(10px); padding: 10px 16px; display: flex; align-items: center; border-bottom: 1px solid rgba(0,0,0,0.1); height: 48px; box-sizing: border-box; z-index: 10; }
        .chat-list-back-btn { border: none; background: none; font-size: 24px; cursor: pointer; padding: 4px; display: flex; align-items: center; color: #111; }
        .chat-list-title { font-size: 17px; font-weight: 600; flex: 1; margin-left: 4px; }
        .chat-list-actions { display: flex; margin-left: auto; align-items: center; }
        .chat-list-btn { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; transition: opacity 0.2s; color: #111;}
        .chat-list-btn:hover { opacity: 0.7; }
        .chat-list { flex: 1; overflow-y: auto; background: #fff; }
        
        /* Item trong danh sách */
        .chat-list-item { display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: background 0.2s; position: relative; }
        .chat-list-item:active { background: #f0f0f0; }
        .chat-item-avatar { width: 48px; height: 48px; border-radius: 6px; background: #e0e0e0; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0; }
        .chat-item-content { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; height: 48px; }
        .chat-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .chat-item-name { font-size: 16px; font-weight: 500; color: #111; }
        .chat-item-time { font-size: 11px; color: #b2b2b2; flex-shrink: 0; }
        .chat-item-preview { font-size: 13px; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        /* Phòng trò chuyện */
        .chat-room-view { display: flex; flex-direction: column; height: 100%; background: #ededed; position: relative; }
        .chat-room-header { background: rgba(237, 237, 237, 0.9); backdrop-filter: blur(10px); padding: 10px 12px; display: flex; align-items: center; height: 48px; border-bottom: 1px solid rgba(0,0,0,0.1); z-index: 10; }
        .chat-room-back { border: none; background: none; cursor: pointer; padding-right: 10px; display: flex; align-items: center; }
        .chat-room-title { flex: 1; font-size: 17px; font-weight: 600; text-align: left; margin: 0 4px; }
        .chat-room-actions { display: flex; align-items: center; }
        .chat-room-btn { background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; }
        
        /* Tin nhắn */
        .chat-messages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 16px; scroll-behavior: smooth; }
        .chat-message { display: flex; align-items: flex-start; max-width: 85%; }
        .chat-message.self { align-self: flex-end; flex-direction: row-reverse; }
        .chat-message.other { align-self: flex-start; }
        .msg-avatar { width: 38px; height: 38px; border-radius: 4px; background: #eee; flex-shrink: 0; background-position: center; background-size: cover; }
        .chat-message.self .msg-avatar { margin-left: 10px; }
        .chat-message.other .msg-avatar { margin-right: 10px; }
        
        /* 🚨 CSS GHI ĐÈ AVATAR NGƯỜI DÙNG TOÀN CỤC 🚨 */
        body.has-custom-user-avatar .chat-message.self .msg-avatar {
            background-image: var(--custom-user-avatar-url) !important;
        }
        
        .msg-content-wrap { position: relative; display: flex; flex-direction: column; }
        .chat-message.self .msg-content-wrap { align-items: flex-end; }
        .msg-bubble { background: #fff; padding: 10px 14px; border-radius: 4px; font-size: 15px; line-height: 1.5; color: #111; box-shadow: 0 1px 1px rgba(0,0,0,0.05); position: relative; word-break: break-word; }
        .chat-message.other .msg-bubble::before { content: ''; position: absolute; left: -6px; top: 14px; border: 6px solid transparent; border-right-color: #fff; }
        .chat-message.self .msg-bubble { background: #95ec69; }
        .chat-message.self .msg-bubble::after { content: ''; position: absolute; right: -6px; top: 14px; border: 6px solid transparent; border-left-color: #95ec69; }
        
        .msg-retract-btn { position: absolute; top: 4px; width: 12px; height: 12px; cursor: pointer; opacity: 0.35; display: flex; align-items: center; justify-content: center; transition: opacity 0.15s; }
        .msg-retract-btn:hover { opacity: 0.8; }
        .chat-message.self .msg-retract-btn { left: -18px; }
        .chat-message.other .msg-retract-btn { right: -18px; }
        
        /* Vùng nhập liệu */
        .chat-input-area { background: #f7f7f7; padding: 10px 12px; border-top: 1px solid #dcdcdc; display: flex; align-items: flex-end; gap: 10px; min-height: 56px; box-sizing: border-box; }
        .chat-input { flex: 1; padding: 10px; border-radius: 4px; border: none; outline: none; resize: none; font-size: 16px; font-family: inherit; line-height: 1.4; max-height: 120px; }
        .chat-send-btn { background: #07c160; color: #fff; border: none; border-radius: 4px; padding: 0 16px; height: 38px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.2s; margin-bottom: 1px; }
        .chat-send-btn:hover { background: #06ae56; }
        .chat-send-btn:disabled { background: #ccc; cursor: not-allowed; }
        
        /* Hiệu ứng đang gõ */
        .typing-indicator { display: none; padding: 8px 16px; color: #999; font-size: 12px; text-align: center; align-items: center; justify-content: center;}
        .typing-indicator.show { display: flex; }
        .typing-dots span { display: inline-block; width: 4px; height: 4px; background: #999; border-radius: 50%; margin: 0 2px; animation: typing 1.4s infinite; }
        .typing-dots span:nth-child(1) { animation-delay: 0s; }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }

        /* Bảng Cài đặt */
        .chat-settings-panel { position: absolute; top: 44px; left: 0; right: 0; bottom: 0; background: #ededed; z-index: 20; display: flex; flex-direction: column; animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .settings-header { background: rgba(237, 237, 237, 0.9); padding: 10px 16px; display: flex; align-items: center; height: 48px; border-bottom: 1px solid rgba(0,0,0,0.1); }
        .settings-title { flex: 1; font-size: 17px; font-weight: 600; margin-left: 12px; }
        .empty-state { display: flex; flex-direction: column; align-items: center; padding: 60px 20px; color: #b2b2b2; text-align: center;}
    `;

    // ==================== TẠO HTML CƠ BẢN ====================
    function generateAppHTML() {
        return `
            <div class="chat-app" id="chat-app-container">
                <div class="chat-list-view" id="chat-list-view">
                    <div class="chat-list-header">
                        <button class="chat-list-back-btn" id="btn-go-home" title="Trở về" onclick="window.parent.PhoneSystem.goHome()">
                            <img src="https://api.iconify.design/ri:arrow-left-s-line.svg" style="width:28px;">
                        </button>
                        <span class="chat-list-title">WeChat</span>
                        <div class="chat-list-actions">
                            <button class="chat-list-btn" id="btn-chat-settings" title="Cài đặt">
                                <img src="https://api.iconify.design/ri:settings-3-line.svg" style="width:22px; color: #333;">
                            </button>
                        </div>
                    </div>
                    <div class="chat-list" id="chat-list">
                        <div class="empty-state" style="padding: 40px 20px;">
                            Đang tải liên hệ...
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function generateSettingsHTML() {
        return `
            <div class="chat-settings-panel" id="chat-settings-panel">
                <div class="settings-header">
                    <button class="chat-list-back-btn" id="btn-settings-back">
                        <img src="https://api.iconify.design/ri:arrow-left-s-line.svg" style="width:28px;">
                    </button>
                    <span class="settings-title">Cài đặt Giao diện</span>
                </div>
                
                <div style="flex:1; overflow-y: auto; padding: 20px;">
                    <!-- Module Ghi đè Avatar -->
                    <div style="background: #fff; padding: 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <h4 style="margin: 0 0 12px 0; color: #333; font-size: 15px;">Ảnh đại diện của bạn</h4>
                        <p style="font-size: 12px; color: #888; margin-top: -6px; margin-bottom: 12px; line-height: 1.4;">
                            Ảnh này sẽ ghi đè lên avatar mặc định trong mọi khung chat OC.
                        </p>
                        
                        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                            <div id="settings-avatar-preview" style="width: 56px; height: 56px; border-radius: 6px; background-color: #f5f5f5; background-size: cover; background-position: center; border: 1px solid #eee; flex-shrink: 0; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                                <img src="https://api.iconify.design/ri:user-3-fill.svg?color=%23ccc" style="width: 30px; height: 30px;" id="settings-avatar-icon-fallback">
                            </div>
                            
                            <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                                <input type="text" id="settings-avatar-url" placeholder="Dán link ảnh (URL)..." style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; outline: none;">
                                <div style="position: relative; overflow: hidden; display: inline-block;">
                                    <button style="background: #f0f0f0; border: 1px solid #ddd; padding: 6px 10px; border-radius: 4px; font-size: 12px; width: 100%; cursor: pointer; color: #555;">Hoặc tải lên từ máy</button>
                                    <input type="file" id="settings-avatar-file" accept="image/*" style="font-size: 100px; position: absolute; left: 0; top: 0; opacity: 0; cursor: pointer; height: 100%;">
                                </div>
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 10px; border-top: 1px solid #eee; padding-top: 12px;">
                            <button id="btn-reset-avatar" style="flex: 1; padding: 8px; background: #f8f8f8; color: #555; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-weight: 500;">Reset Mặc định</button>
                            <button id="btn-save-avatar" style="flex: 1; padding: 8px; background: #07c160; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">Áp dụng</button>
                        </div>
                    </div>

                    <div style="margin-top: 30px; text-align: center; color: #aaa;">
                        <img src="https://api.iconify.design/ri:wechat-fill.svg" style="width:40px;height:40px;color:#ddd;margin-bottom:10px;">
                        <p style="font-size: 12px; margin: 0;">WeChat Base UI - Chỉ hỗ trợ khung giao diện</p>
                    </div>
                </div>
            </div>`;
    }

    // ==================== LOGIC XỬ LÝ AVATAR GHI ĐÈ ====================
    const AVATAR_STORAGE_KEY = 'wechat_override_user_avatar';

    function applyCustomAvatarGlobal(doc, avatarData) {
        if (!doc || !avatarData) return;
        const safeUrl = avatarData.replace(/'/g, "%27");
        doc.body.classList.add('has-custom-user-avatar');
        doc.body.style.setProperty('--custom-user-avatar-url', `url('${safeUrl}')`);
    }

    function removeCustomAvatarGlobal(doc) {
        if (!doc) return;
        doc.body.classList.remove('has-custom-user-avatar');
        doc.body.style.removeProperty('--custom-user-avatar-url');
    }

    function showSettings() {
        const doc = currentIframeDoc || document;
        doc.getElementById('chat-app-container').insertAdjacentHTML('beforeend', generateSettingsHTML());

        const panel = doc.getElementById('chat-settings-panel');
        const urlInput = doc.getElementById('settings-avatar-url');
        const fileInput = doc.getElementById('settings-avatar-file');
        const preview = doc.getElementById('settings-avatar-preview');
        const fallbackIcon = doc.getElementById('settings-avatar-icon-fallback');
        const saveBtn = doc.getElementById('btn-save-avatar');
        const resetBtn = doc.getElementById('btn-reset-avatar');

        let selectedAvatarData = localStorage.getItem(AVATAR_STORAGE_KEY) || null;

        // Cập nhật Preview
        function updatePreview(data) {
            if (data) {
                preview.style.backgroundImage = `url('${data.replace(/'/g, "%27")}')`;
                fallbackIcon.style.display = 'none';
            } else {
                preview.style.backgroundImage = 'none';
                fallbackIcon.style.display = 'block';
            }
        }
        updatePreview(selectedAvatarData);

        // Xử lý chọn File từ máy (Đổi thành Base64)
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    selectedAvatarData = evt.target.result;
                    updatePreview(selectedAvatarData);
                    urlInput.value = ''; // Xóa URL nếu dùng file
                };
                reader.readAsDataURL(file);
            }
        });

        // Xử lý dán URL
        urlInput.addEventListener('input', () => {
            const val = urlInput.value.trim();
            if (val) {
                selectedAvatarData = val;
                updatePreview(selectedAvatarData);
                fileInput.value = ''; // Xóa file nếu dùng URL
            }
        });

        // Nút Lưu
        saveBtn.addEventListener('click', () => {
            if (selectedAvatarData) {
                localStorage.setItem(AVATAR_STORAGE_KEY, selectedAvatarData);
                applyCustomAvatarGlobal(doc, selectedAvatarData);
                alert('Đã áp dụng ảnh đại diện mới thành công!');
            } else {
                alert('Vui lòng chọn ảnh từ máy hoặc dán link URL!');
            }
        });

        // Nút Reset
        resetBtn.addEventListener('click', () => {
            localStorage.removeItem(AVATAR_STORAGE_KEY);
            selectedAvatarData = null;
            updatePreview(null);
            urlInput.value = '';
            fileInput.value = '';
            removeCustomAvatarGlobal(doc);
            alert('Đã xóa ảnh ghi đè, trở về avatar mặc định của hệ thống!');
        });

        // Đóng Settings
        doc.getElementById('btn-settings-back')?.addEventListener('click', () => panel.remove());
    }

    // ==================== Tích hợp PhoneSystem ====================
    let currentIframeDoc = null; 
    const AppState = { isInitialized: true };

    async function initApp() { /* Dummy */ }

    async function openApp() {
        const phoneSystem = window.parent.PhoneSystem;
        if (!phoneSystem || !phoneSystem.iframeWindow) {
            setTimeout(openApp, 200);
            return;
        }

        const iframeDoc = phoneSystem.iframeWindow.document;
        currentIframeDoc = iframeDoc;

        const appContainer = iframeDoc.getElementById('app-container');
        if (!appContainer) return;

        // Dọn dẹp và chuẩn bị khung hiển thị
        iframeDoc.getElementById('home-screen').style.display = 'none';
        appContainer.innerHTML = '';
        appContainer.style.display = 'block';
        appContainer.style.pointerEvents = 'auto';

        // Tiêm Style
        let styleTag = iframeDoc.getElementById('chat-app-styles');
        if (!styleTag) {
            styleTag = iframeDoc.createElement('style');
            styleTag.id = 'chat-app-styles';
            iframeDoc.head.appendChild(styleTag);
        }
        styleTag.textContent = APP_STYLES;

        // Chèn HTML App
        const appDiv = iframeDoc.createElement('div');
        appDiv.id = 'chat-app-wrapper';
        appDiv.style.cssText = 'width:100%;height:100%;';
        appDiv.innerHTML = generateAppHTML();
        appContainer.appendChild(appDiv);

        // Áp dụng Override Avatar ngay lập tức nếu có lưu từ trước
        const savedAvatar = localStorage.getItem(AVATAR_STORAGE_KEY);
        if (savedAvatar) {
            applyCustomAvatarGlobal(iframeDoc, savedAvatar);
        } else {
            removeCustomAvatarGlobal(iframeDoc);
        }

        // Bắt sự kiện mở cài đặt
        iframeDoc.getElementById('btn-chat-settings')?.addEventListener('click', showSettings);
    }

    function closeApp() {
        if (!window.parent?.PhoneSystem?.iframeWindow) return;
        const iframeDoc = window.parent.PhoneSystem.iframeWindow.document;
        const appContainer = iframeDoc.getElementById('app-container');
        if (appContainer) {
            appContainer.innerHTML = '';
            appContainer.style.pointerEvents = 'none';
        }
        iframeDoc.getElementById('home-screen').style.display = 'block';
        currentIframeDoc = null;
    }

    // Xuất object giả (Dummy object) để Script Âu Âu có thể gọi đến mà không báo lỗi undefined
    window.parent.ChatApp = {
        init: initApp,
        getState: function () { return AppState; },
        getIframeDoc: function () { return currentIframeDoc; },
        open: function() { /* Dummy function cho Âu Âu khi back ra */ }
    };

    // Vòng lặp đăng ký App vào Điện thoại
    const check = setInterval(() => {
        if (window.parent && window.parent.PhoneSystem) {
            clearInterval(check);
            window.parent.PhoneSystem.registerApp({ id: APP_ID, name: APP_NAME, icon: APP_ICON, color: '#07c160', order: 3 });
            window.parent.PhoneSystem.on('app-opened', (data) => { if (data.id === APP_ID) openApp(); });
            window.parent.PhoneSystem.on('go-home', closeApp);
            console.log('✅ WeChat Base UI đã tải. Đã kích hoạt Module Ghi đè Avatar Người Dùng!');
        }
    }, 100);

})();