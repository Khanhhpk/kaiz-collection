/**
 * Điện thoại nhỏ - Module APP Cleaner (Dọn dẹp hệ thống) v2.1
 * * Cập nhật: Tương thích hoàn hảo với Music App v6.x & Group Chat WeChat.
 * * Tính năng Smart Clean: Xóa Lịch sử/Hàng đợi nhạc nhưng GIỮ LẠI Playlist và Yêu thích.
 * * Tính năng WeChat Clean: Quét và dọn dẹp cả tin nhắn cá nhân lẫn tin nhắn Group Chat.
 * * Xóa triệt để rác tồn đọng từ các phiên bản Music cũ (v3, v4, v5).
 */

(function () {
    'use strict';

    // Hàm đợi hệ thống điện thoại khởi tạo xong
    function waitForPhoneSystem(callback) {
        if (window.parent.PhoneSystem) {
            callback();
        } else {
            console.log('[APP Cleaner] Đang đợi PhoneSystem tải...');
            setTimeout(function () { waitForPhoneSystem(callback); }, 100);
        }
    }

    waitForPhoneSystem(function () {
        console.log('[APP Cleaner] PhoneSystem đã sẵn sàng, bắt đầu khởi tạo');

        const APP_ID = 'cleaner';
        const APP_NAME = 'Dọn rác';
        // Icon cây chổi quét dọn
        const APP_ICON = '<img src="https://api.iconify.design/mdi:broom.svg?color=white" style="width:70%;height:70%">';
        const APP_COLOR = 'linear-gradient(135deg, #00b4db, #0083b0)';

        // ============ Logic Xử lý Dữ liệu ============

        // Hàm quét xem có bao nhiêu mục rác
        function scanStorage() {
            let stats = { weather: 0, news: 0, wechat: 0, music: 0, total: 0, byteSize: 0 };
            
            for (let i = 0; i < localStorage.length; i++) {
                let key = localStorage.key(i);
                let value = localStorage.getItem(key) || '';
                let size = new Blob([value]).size; // Ước lượng kích thước byte

                // Nhắm mục tiêu chính xác vào các prefix của từng app
                if (key.startsWith('phone_weather_')) { stats.weather++; stats.total++; stats.byteSize += size; }
                else if (key.startsWith('phone_news_')) { stats.news++; stats.total++; stats.byteSize += size; }
                // Cập nhật v2.1: Quét cả tin nhắn cá nhân (oc_) và tin nhắn nhóm (group_)
                else if (key.startsWith('oc_chat_messages_') || key.startsWith('group_chat_messages_')) { 
                    stats.wechat++; stats.total++; stats.byteSize += size; 
                }
                else if (key.startsWith('phone_music_')) { 
                    // Bắt tất cả các version của app nhạc
                    stats.music++; stats.total++; stats.byteSize += size; 
                }
            }
            return stats;
        }

        // Hàm thực thi xóa (Tích hợp Smart Clean)
        function performClean(typesToClean) {
            let keysToRemove = [];
            let itemsCleaned = 0; // Đếm số mục thực tế đã xử lý
            
            for (let i = 0; i < localStorage.length; i++) {
                let key = localStorage.key(i);
                
                if (typesToClean.weather && key.startsWith('phone_weather_')) keysToRemove.push(key);
                else if (typesToClean.news && key.startsWith('phone_news_')) keysToRemove.push(key);
                // Cập nhật v2.1: Đưa cả tin nhắn nhóm vào danh sách dọn dẹp
                else if (typesToClean.wechat && (key.startsWith('oc_chat_messages_') || key.startsWith('group_chat_messages_'))) keysToRemove.push(key);
                else if (typesToClean.music && key.startsWith('phone_music_')) {
                    
                    if (key === 'phone_music_v6') {
                        // SMART CLEAN: Chỉ xóa rác, giữ lại tài sản của người dùng
                        try {
                            let musicData = JSON.parse(localStorage.getItem(key) || '{}');
                            musicData.history = [];
                            musicData.queue = [];
                            musicData.currentSong = null;
                            musicData.queueIndex = -1;
                            musicData.queueName = '';
                            
                            // Lưu ngược lại tệp đã làm sạch
                            localStorage.setItem(key, JSON.stringify(musicData));
                            itemsCleaned++; 
                        } catch(e) {
                            keysToRemove.push(key); // Nếu file lỗi JSON, xóa luôn
                        }
                    } else {
                        // Xóa triệt để các tệp rác từ bản v3, v4, v5 cũ kĩ
                        keysToRemove.push(key);
                    }
                }
            }

            keysToRemove.forEach(k => {
                localStorage.removeItem(k);
                itemsCleaned++;
            });

            return itemsCleaned;
        }

        // Định dạng dung lượng
        function formatBytes(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        // ============ Giao diện UI ============

        function generateCSS() {
            return `
            <style id="cleaner-app-styles">
                #cleaner-app * { box-sizing: border-box; }
                #cleaner-app .cleaner-header {
                    height: 88px; display: flex; align-items: flex-end; padding: 0 16px 12px;
                    background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(20px);
                    border-bottom: 1px solid rgba(0,0,0,0.05); z-index: 10; flex-shrink: 0;
                }
                .clean-btn-container {
                    display: flex; justify-content: center; align-items: center;
                    padding: 40px 0; flex-direction: column;
                }
                .big-clean-btn {
                    width: 150px; height: 150px; border-radius: 50%;
                    background: linear-gradient(135deg, #00b4db, #0083b0);
                    color: white; display: flex; justify-content: center; align-items: center;
                    flex-direction: column; box-shadow: 0 10px 30px rgba(0, 180, 219, 0.4);
                    cursor: pointer; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    border: 4px solid rgba(255,255,255,0.5);
                }
                .big-clean-btn:active { transform: scale(0.92); box-shadow: 0 5px 15px rgba(0, 180, 219, 0.3); }
                .big-clean-btn.cleaning {
                    animation: pulse 1.5s infinite; pointer-events: none;
                }
                .big-clean-btn.cleaning .broom-icon {
                    animation: sweep 0.8s infinite alternate;
                }
                .big-clean-btn.done { background: linear-gradient(135deg, #11998e, #38ef7d); box-shadow: 0 10px 30px rgba(56, 239, 125, 0.4); }
                
                @keyframes sweep {
                    0% { transform: rotate(-20deg) translateX(-5px); }
                    100% { transform: rotate(20deg) translateX(5px); }
                }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(0, 180, 219, 0.7); }
                    70% { box-shadow: 0 0 0 20px rgba(0, 180, 219, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(0, 180, 219, 0); }
                }

                .cleaner-list { background: #fff; border-radius: 16px; margin: 0 20px; padding: 10px; box-shadow: 0 2px 12px rgba(0,0,0,0.03); }
                .cleaner-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 10px; border-bottom: 1px solid #f0f0f0; }
                .cleaner-item:last-child { border-bottom: none; }
                .cleaner-item-left { display: flex; align-items: center; gap: 12px; }
                
                /* Checkbox Toggle iOS style */
                .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
                .toggle-switch input { opacity: 0; width: 0; height: 0; }
                .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 24px; }
                .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
                input:checked + .slider { background-color: #00b4db; }
                input:checked + .slider:before { transform: translateX(20px); }
            </style>
            `;
        }

        function generateHTML(stats) {
            return `
            <div id="cleaner-app" style="position:absolute;inset:0;background:#f8f9fa;display:flex;flex-direction:column;font-family:-apple-system,'SF Pro Text',sans-serif;color:#333;overflow:hidden;z-index:400">
                <div class="cleaner-header">
                    <div id="cleaner-back-btn" style="color:#0083b0;display:flex;align-items:center;gap:4px;cursor:pointer;width:80px">
                        <span style="font-size:22px;line-height:1">‹</span> Trở về
                    </div>
                    <div style="flex:1;text-align:center;font-weight:bold;font-size:17px;color:#111;">Dọn dẹp</div>
                    <div style="width:80px;"></div>
                </div>

                <div style="flex:1;overflow-y:auto;padding-bottom:30px;">
                    <div class="clean-btn-container">
                        <div id="main-clean-btn" class="big-clean-btn">
                            <img class="broom-icon" src="https://api.iconify.design/mdi:broom.svg?color=white" style="width:50px;height:50px;margin-bottom:8px;">
                            <span id="clean-status-text" style="font-size:16px;font-weight:bold;">Tối ưu hóa</span>
                            <span id="clean-size-text" style="font-size:12px;opacity:0.8;margin-top:4px;">Phát hiện ${formatBytes(stats.byteSize)}</span>
                        </div>
                        <div id="clean-summary" style="margin-top:20px;font-size:14px;color:#666;">
                            Tổng số tệp rác: <strong>${stats.total}</strong> mục
                        </div>
                    </div>

                    <div style="padding: 0 20px 10px; font-size:13px; font-weight:600; color:#888; text-transform:uppercase;">
                        Các ứng dụng cần dọn
                    </div>

                    <div class="cleaner-list">
                        <div class="cleaner-item">
                            <div class="cleaner-item-left">
                                <img src="https://api.iconify.design/mdi:weather-partly-cloudy.svg?color=%234A90D9" style="width:24px;height:24px;">
                                <div>
                                    <div style="font-weight:500;font-size:15px;">Thời tiết</div>
                                    <div style="font-size:12px;color:#888;">${stats.weather} tệp lưu trữ cache</div>
                                </div>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="check-weather" checked>
                                <span class="slider"></span>
                            </label>
                        </div>

                        <div class="cleaner-item">
                            <div class="cleaner-item-left">
                                <img src="https://api.iconify.design/ri:newspaper-line.svg?color=%23ef4444" style="width:24px;height:24px;">
                                <div>
                                    <div style="font-weight:500;font-size:15px;">Tin tức</div>
                                    <div style="font-size:12px;color:#888;">${stats.news} tệp dữ liệu cũ</div>
                                </div>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="check-news" checked>
                                <span class="slider"></span>
                            </label>
                        </div>

                        <div class="cleaner-item">
                            <div class="cleaner-item-left">
                                <img src="https://api.iconify.design/ri:wechat-fill.svg?color=%2307c160" style="width:24px;height:24px;">
                                <div>
                                    <div style="font-weight:500;font-size:15px;">WeChat & Group Chat</div>
                                    <div style="font-size:12px;color:#888;">${stats.wechat} lịch sử trò chuyện</div>
                                </div>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="check-wechat" checked>
                                <span class="slider"></span>
                            </label>
                        </div>

                        <div class="cleaner-item">
                            <div class="cleaner-item-left">
                                <img src="https://api.iconify.design/ri:netease-cloud-music-fill.svg?color=%23ff7e5f" style="width:24px;height:24px;">
                                <div>
                                    <div style="font-weight:500;font-size:15px;">Âm nhạc</div>
                                    <div style="font-size:12px;color:#888;">${stats.music} tệp lịch sử & hàng đợi</div>
                                </div>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="check-music" checked>
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>
                    
                    <div style="text-align:center; margin-top: 30px; font-size: 12px; color: #aaa; padding: 0 20px;">
                        Việc dọn dẹp sẽ xóa bối cảnh (cache) lưu trong LocalStorage giúp máy nhẹ hơn. Dữ liệu Playlist của app Âm Nhạc được bảo vệ an toàn.
                    </div>
                </div>
            </div>
            `;
        }

        // ============ Quản lý Vòng đời App ============

        function openApp() {
            console.log('[APP Cleaner] Mở ứng dụng');
            const phoneSystem = window.parent.PhoneSystem;
            if (!phoneSystem || !phoneSystem.iframeWindow) return;

            const iframeDoc = phoneSystem.iframeWindow.document;

            // Ẩn màn hình chính
            const homeScreen = iframeDoc.getElementById('home-screen');
            if (homeScreen) homeScreen.style.display = 'none';

            // Tạo hoặc tái sử dụng container
            let appContainer = iframeDoc.getElementById('app-container');
            if (!appContainer) {
                const screen = iframeDoc.querySelector('.screen');
                if (screen) {
                    appContainer = iframeDoc.createElement('div');
                    appContainer.id = 'app-container';
                    appContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:300;pointer-events:none';
                    screen.appendChild(appContainer);
                }
            }

            // Quét dữ liệu hiện tại
            const stats = scanStorage();

            // Render UI
            appContainer.innerHTML = generateCSS() + generateHTML(stats);
            appContainer.style.pointerEvents = 'auto';

            // Gắn sự kiện nút Trở về
            const backBtn = iframeDoc.getElementById('cleaner-back-btn');
            if (backBtn) {
                backBtn.onclick = () => window.parent.PhoneSystem.goHome();
            }

            // Gắn sự kiện dọn dẹp
            const cleanBtn = iframeDoc.getElementById('main-clean-btn');
            if (cleanBtn) {
                cleanBtn.onclick = function() {
                    if (cleanBtn.classList.contains('cleaning') || cleanBtn.classList.contains('done')) return;

                    // Lấy trạng thái từ checkbox
                    const typesToClean = {
                        weather: iframeDoc.getElementById('check-weather')?.checked,
                        news: iframeDoc.getElementById('check-news')?.checked,
                        wechat: iframeDoc.getElementById('check-wechat')?.checked,
                        music: iframeDoc.getElementById('check-music')?.checked
                    };

                    if (!typesToClean.weather && !typesToClean.news && !typesToClean.wechat && !typesToClean.music) {
                        if (window.parent.toastr) window.parent.toastr.warning('Hãy chọn ít nhất 1 ứng dụng để dọn dẹp!');
                        return;
                    }

                    // Bắt đầu animation dọn dẹp
                    cleanBtn.classList.add('cleaning');
                    iframeDoc.getElementById('clean-status-text').innerText = "Đang quét...";
                    
                    // Giả lập thời gian dọn dẹp cho mượt (1.5 giây)
                    setTimeout(() => {
                        const removed = performClean(typesToClean);
                        
                        cleanBtn.classList.remove('cleaning');
                        cleanBtn.classList.add('done');
                        cleanBtn.innerHTML = `
                            <img src="https://api.iconify.design/mdi:check-bold.svg?color=white" style="width:50px;height:50px;margin-bottom:8px;">
                            <span style="font-size:16px;font-weight:bold;">Hoàn tất</span>
                            <span style="font-size:12px;opacity:0.9;margin-top:4px;">Đã xử lý ${removed} mục</span>
                        `;

                        // Reset lại số liệu hiển thị
                        iframeDoc.getElementById('clean-summary').innerHTML = `Đã dọn dẹp thành công hệ thống!`;
                        if (window.parent.toastr) window.parent.toastr.success(`Đã dọn dẹp ${removed} tệp rác thành công!`);

                        // Khôi phục nút sau 3 giây
                        setTimeout(() => {
                            if (iframeDoc.getElementById('main-clean-btn')) {
                                openApp(); // Quét lại dung lượng mới
                            }
                        }, 3000);
                        
                    }, 1500);
                };
            }

            // Đổi màu Status bar
            const statusBar = iframeDoc.getElementById('status-bar');
            if (statusBar) {
                statusBar.classList.remove('light');
                statusBar.classList.add('dark');
            }
        }

        function closeApp() {
            const phoneSystem = window.parent?.PhoneSystem;
            if (!phoneSystem?.iframeWindow) return;

            try {
                const iframeDoc = phoneSystem.iframeWindow.document;
                const appContainer = iframeDoc.getElementById('app-container');
                if (appContainer) {
                    appContainer.innerHTML = '';
                    appContainer.style.pointerEvents = 'none';
                }

                const homeScreen = iframeDoc.getElementById('home-screen');
                if (homeScreen) homeScreen.style.display = 'block';

                const statusBar = iframeDoc.getElementById('status-bar');
                if (statusBar) {
                    statusBar.classList.remove('dark');
                    statusBar.classList.add('light');
                }
            } catch (e) {
                console.error('[APP Cleaner] closeApp thất bại:', e);
            }
        }

        // ============ Đăng ký App với PhoneSystem ============

        window.parent.PhoneSystem.registerApp({
            id: APP_ID,
            name: APP_NAME,
            icon: APP_ICON,
            color: APP_COLOR,
            order: 18 // Đặt sau cùng
        });

        window.parent.PhoneSystem.on('app-opened', function (data) {
            if (data.id === APP_ID) openApp();
        });

        window.parent.PhoneSystem.on('go-home', function () {
            closeApp();
        });

        console.log('[APP Cleaner] Module v2.1 đã được tải thành công');
    });
})();