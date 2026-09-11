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
        const APP_ICON = '<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxwYXRoIGZpbGw9IndoaXRlIiBkPSJtMTkuMzYgMi43MmwxLjQyIDEuNDJsLTUuNzIgNS43MWMxLjA3IDEuNTQgMS4yMiAzLjM5LjMyIDQuNTlMOS4wNiA4LjEyYzEuMi0uOSAzLjA1LS43NSA0LjU5LjMyek01LjkzIDE3LjU3Yy0yLjAxLTIuMDEtMy4yNC00LjQxLTMuNTgtNi42NWw0Ljg4LTIuMDlsNy40NCA3LjQ0bC0yLjA5IDQuODhjLTIuMjQtLjM0LTQuNjQtMS41Ny02LjY1LTMuNTgiLz48L3N2Zz4=" style="width:70%;height:70%">';
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
                            <img class="broom-icon" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxwYXRoIGZpbGw9IndoaXRlIiBkPSJtMTkuMzYgMi43MmwxLjQyIDEuNDJsLTUuNzIgNS43MWMxLjA3IDEuNTQgMS4yMiAzLjM5LjMyIDQuNTlMOS4wNiA4LjEyYzEuMi0uOSAzLjA1LS43NSA0LjU5LjMyek01LjkzIDE3LjU3Yy0yLjAxLTIuMDEtMy4yNC00LjQxLTMuNTgtNi42NWw0Ljg4LTIuMDlsNy40NCA3LjQ0bC0yLjA5IDQuODhjLTIuMjQtLjM0LTQuNjQtMS41Ny02LjY1LTMuNTgiLz48L3N2Zz4=" style="width:50px;height:50px;margin-bottom:8px;">
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
                                <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxwYXRoIGZpbGw9IiM0QTkwRDkiIGQ9Ik0xMi43NCA1LjQ3YzIuMzYgMS4wMyAzLjYxIDMuNTYgMy4xOCA1Ljk5QTYgNiAwIDAgMSAxOCAxNnYuMTdhMyAzIDAgMCAxIDEtLjE3YTMgMyAwIDAgMSAzIDNhMyAzIDAgMCAxLTMgM0g2YTQgNCAwIDAgMS00LTRhNCA0IDAgMCAxIDQtNGguMjdDNSAxMi40NSA0LjYgMTAuMjQgNS41IDguMjZhNS40OSA1LjQ5IDAgMCAxIDcuMjQtMi43OW0tLjgxIDEuODNjLTEuNzctLjgtMy44NC4wMS00LjYyIDEuNzdjLS40NiAxLjAyLS4zOCAyLjE1LjEgMy4wNkE1Ljk5IDUuOTkgMCAwIDEgMTIgMTBjLjcgMCAxLjM4LjEyIDIgLjM0YTMuNTEgMy41MSAwIDAgMC0yLjA3LTMuMDRtMS42Mi0zLjY2Yy0uNTUtLjI0LTEuMS0uNDEtMS42Ny0uNTJsMi40OS0xLjNsLjkgMi44OWE3LjcgNy43IDAgMCAwLTEuNzItMS4wN20tNy40Ni44Yy0uNDkuMzUtLjkyLjc1LTEuMjkgMS4xOWwuMTEtMi44MWwyLjk2LjY4Yy0uNjIuMjEtMS4yMi41My0xLjc4Ljk0TTE4IDkuNzFjLS4wOS0uNTktLjIyLTEuMTYtLjQxLTEuNzFsMi4zOCAxLjVsLTIuMDUgMi4yM2MuMTEtLjY1LjEzLTEuMzMuMDgtMi4wMk0zLjA0IDExLjNjLjA3LjYuMiAxLjE3LjM5IDEuN2wtMi4zNy0xLjVMMy4xIDkuMjhjLS4xLjY1LS4xMyAxLjMzLS4wNiAyLjAyTTE5IDE4aC0zdi0yYTQgNCAwIDAgMC00LTRhNCA0IDAgMCAwLTQgNEg2YTIgMiAwIDAgMC0yIDJhMiAyIDAgMCAwIDIgMmgxM2ExIDEgMCAwIDAgMS0xYTEgMSAwIDAgMC0xLTEiLz48L3N2Zz4=" style="width:24px;height:24px;">
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
                                <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxwYXRoIGZpbGw9IiNlZjQ0NDQiIGQ9Ik0xNiAyMFY0SDR2MTVhMSAxIDAgMCAwIDEgMXptMyAySDVhMyAzIDAgMCAxLTMtM1YzYTEgMSAwIDAgMSAxLTFoMTRhMSAxIDAgMCAxIDEgMXY3aDR2OWEzIDMgMCAwIDEtMyAzbS0xLTEwdjdhMSAxIDAgMSAwIDIgMHYtN3pNNiA2aDZ2Nkg2em0yIDJ2MmgyVjh6bS0yIDVoOHYySDZ6bTAgM2g4djJINnoiLz48L3N2Zz4=" style="width:24px;height:24px;">
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
                                <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxwYXRoIGZpbGw9IiMwN2MxNjAiIGQ9Ik0xOC41NzUgMTMuNzExYS45MS45MSAwIDAgMCAuODk4LS44OThhLjg5NS44OTUgMCAwIDAtLjg5OC0uODk4YS44OTQuODk0IDAgMCAwLS44OTguODk4YzAgLjUuNC44OTguODk4Ljg5OG0tNC40MjUgMGEuOTEuOTEgMCAwIDAgLjg5OC0uODk4YzAtLjQ5OC0uNC0uODk4LS44OTgtLjg5OGEuODk0Ljg5NCAwIDAgMC0uODk4Ljg5OGMwIC41LjM5OS44OTguODk4Ljg5OG02LjU2NyA1LjA0YS4zNS4zNSAwIDAgMC0uMTcyLjM3YzAgLjA0OCAwIC4wOTguMDI1LjE0N2MuMDk4LjQxNy4yOTQgMS4wODEuMjk0IDEuMTA2YzAgLjA3My4wMjUuMTIyLjAyNS4xNzJhLjIyLjIyIDAgMCAxLS4yMjEuMjJjLS4wNSAwLS4wNzQtLjAyNC0uMTIzLS4wNDhsLTEuNDQ5LS44MzZhLjguOCAwIDAgMC0uMzQ0LS4wOThjLS4wNzMgMC0uMTQ3IDAtLjE5Ni4wMjRjLS42ODguMTk3LTEuNC4yOTUtMi4xNjEuMjk1Yy0zLjY2IDAtNi42MDctMi40NTctNi42MDctNS41MDVzMi45NDctNS41MDUgNi42MDctNS41MDVjMy42NTkgMCA2LjYwNiAyLjQ1OCA2LjYwNiA1LjUwNWMwIDEuNjQ3LS44ODQgMy4xNDYtMi4yODQgNC4xNTRNMTYuNjc0IDguMDk5YTkgOSAwIDAgMC0uMjgtLjAwNWMtNC4xNzQgMC03LjYwNiAyLjg2LTcuNjA2IDYuNTA1YzAgLjU1NC4wOCAxLjA5LjIyOCAxLjZoLS4wODlhMTAgMTAgMCAwIDEtMi41ODQtLjM2OGMtLjA3NC0uMDI1LS4xNDgtLjAyNS0uMjIyLS4wMjVhLjgzLjgzIDAgMCAwLS40MTkuMTIzbC0xLjc0NyAxLjAwNWEuMzUuMzUgMCAwIDEtLjE0OC4wNWEuMjczLjI3MyAwIDAgMS0uMjctLjI3YzAtLjA3NC4wMjQtLjEyMy4wNDktLjE5N2MuMDI0LS4wMjQuMjQ2LS44MzQuMzY5LTEuMzI0YzAtLjA1LjAyNC0uMTIzLjAyNC0uMTcyYS41Ni41NiAwIDAgMC0uMjIxLS40NDFDMi4wNTkgMTMuMzc2IDEgMTEuNTg2IDEgOS41OTlDMS4wMDEgNS45NDQgNC41NzEgMyA4Ljk1MSAzYzMuNzY1IDAgNi45MyAyLjE2OSA3LjcyMyA1LjA5OG0tNS4xNTQuNDE4Yy41NzMgMCAxLjAyNi0uNDc3IDEuMDI2LTEuMDI2YzAtLjU3My0uNDUzLTEuMDI2LTEuMDI2LTEuMDI2cy0xLjAyNi40NTMtMS4wMjYgMS4wMjZzLjQ1MyAxLjAyNiAxLjAyNiAxLjAyNm0tNS4yNiAwYy41NzMgMCAxLjAyNy0uNDc3IDEuMDI3LTEuMDI2YzAtLjU3My0uNDU0LTEuMDI2LTEuMDI3LTEuMDI2Yy0uNTcyIDAtMS4wMjYuNDUzLTEuMDI2IDEuMDI2cy40NTQgMS4wMjYgMS4wMjYgMS4wMjYiLz48L3N2Zz4=" style="width:24px;height:24px;">
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
                                <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxwYXRoIGZpbGw9IiNmZjdlNWYiIGQ9Ik0xMi4wMDEgMjJjLTUuNTIzIDAtMTAtNC40NzctMTAtMTBzNC40NzctMTAgMTAtMTBzMTAgNC40NzcgMTAgMTBzLTQuNDc3IDEwLTEwIDEwbS0xLjA4Ni0xMC40MzJjLjI0LS44NCAxLjA3NS0xLjU0MSAxLjk5LTEuNjQ4Yy4xODcuNjk0LjM4OCAxLjM3My41NDUgMi4wNjNjLjA1My4yMy4wMzcuNDk1LS4wMTguNzI3Yy0uMjEzLjg5Mi0xLjI0OCAxLjI0Mi0xLjk3OC42ODVjLS41My0uNDA1LS43NDItMS4xMi0uNTM5LTEuODI3bTMuODE3LS4xOTdjLS4xMjUtLjQ2NS0uMjU2LS45MjctLjM5My0xLjQyYy41LjEzLjkwNy4zNiAxLjI1NS42OTdjMS4yNTcgMS4yMjIgMS4zODUgMy4zLjI5NCA0LjczMmMtMS4xMzUgMS40OS0zLjE1NSAyLjEzNC01LjAyOCAxLjYwNWMtMi4zMDItLjY1LTMuODA4LTIuOTUyLTMuNDQxLTUuMzE2Yy4yNzQtMS43NjggMS4yNy0zLjAwNCAyLjktMy43MzNjLjQwNy0uMTgyLjU4LS41Ni40Mi0uOTNjLS4xNTctLjM2NC0uNTQtLjUwNC0uOTQ0LS4zNDNjLTIuNzIxIDEuMDg4LTQuMzIgNC4xMzQtMy42NyA2Ljk4N2MuNzEzIDMuMTE4IDMuNDk1IDUuMTYzIDYuNjc1IDQuODU5YzEuNzMyLS4xNjYgMy4xNjQtLjk0OCA0LjIxNi0yLjM0N2MxLjUwNi0yLjAwMiAxLjI5Ny00Ljc4My0uNDYzLTYuNDk5Yy0uNjY2LS42NS0xLjQ3MS0xLjAxOC0yLjM5LTEuMTUzYy0uMDgzLS4wMTMtLjIxNy0uMDUyLS4yMzItLjEwNmMtLjA4Ny0uMzEzLS4xOC0uNjMyLS4yMDYtLjk1NGMtLjAyOS0uMzU3LjI5LS42NC42NS0uNjQ1Yy4yNTMtLjAwMy40MzQuMTMuNjAzLjNjLjMwMy4zLjcwNC4zMjIuOTg4LjA2MmMuMjktLjI2NC4yOTYtLjY3OC4wMTgtMS4wMDhjLS41NjYtLjY3Mi0xLjU4Ni0uODkxLTIuNDMtLjUyM2MtLjg0Ny4zNy0xLjMyMSAxLjE4Ny0xLjIgMi4wOTNjLjAzOC4yOC4xMS41NTcuMTY3Ljg0MmwtLjI2LjA3MmEzLjg2IDMuODYgMCAwIDAtMi4wOTggMS40MTRjLS45MjEgMS4yMi0uOTM2IDIuODI4LS4wNDEgMy45NDdjMS4yNzQgMS41OTQgMy43NDcgMS4yODQgNC41MjMtLjU2OGMuMjg0LS42NzcuMjc1LTEuMzY4LjA4Ny0yLjA2NSIvPjwvc3ZnPg==" style="width:24px;height:24px;">
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
                            <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxwYXRoIGZpbGw9IndoaXRlIiBkPSJtOSAyMC40MmwtNi4yMS02LjIxbDIuODMtMi44M0w5IDE0Ljc3bDkuODgtOS44OWwyLjgzIDIuODN6Ii8+PC9zdmc+" style="width:50px;height:50px;margin-bottom:8px;">
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