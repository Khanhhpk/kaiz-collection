/**
 * Điện thoại nhỏ - Module APP Tin tức (ĐỘC LẬP HOÀN TOÀN)
 * Đã Mod: Tách toàn bộ Logic khỏi Main Phone. App tự lo API, bối cảnh, lưu trữ và UI.
 * Đã Fix: Nút Làm mới hoạt động ổn định, lưu vĩnh viễn Tin Lạ vào gốc.
 */

(function () {
    'use strict';

    function waitForPhoneSystem(callback) {
        if (window.parent.PhoneSystem) {
            callback();
        } else {
            setTimeout(function () { waitForPhoneSystem(callback); }, 100);
        }
    }

    waitForPhoneSystem(function () {
        console.log('[APP Tin tức] Khởi tạo Module Độc lập...');

        const APP_ID = 'news';
        const APP_NAME = 'Tin tức hôm nay';
        const APP_ICON = '<img src="https://api.iconify.design/ri:newspaper-line.svg?color=white" style="width:70%;height:70%">';
        const APP_COLOR = 'linear-gradient(135deg, #ef4444, #dc2626)';
        const SPECIAL_NEWS_CHANCE = 0.25;

        // ============ TRÌNH QUẢN LÝ DỮ LIỆU ĐỘC LẬP CỦA APP ============
        const NewsManager = {
            data: { headlines: [], lastUpdate: null, isLoading: false },
            currentChatId: null,

            getChatId: function () {
                try {
                    var ctx = window.parent.SillyTavern?.getContext?.();
                    if (!ctx) return 'default';
                    if (typeof ctx.getCurrentChatId === 'function') return String(ctx.getCurrentChatId() || 'default');
                    if (ctx.chatId) return String(ctx.chatId);
                    return 'default';
                } catch (e) { return 'default'; }
            },

            getStorageKey: function () {
                return 'phone_news_standalone_' + this.getChatId();
            },

            loadLocalNews: function () {
                this.currentChatId = this.getChatId();
                try {
                    const saved = localStorage.getItem(this.getStorageKey());
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        this.data.headlines = parsed.headlines || [];
                        this.data.lastUpdate = parsed.lastUpdate || null;
                    } else {
                        this.data.headlines = [];
                        this.data.lastUpdate = null;
                    }
                } catch (e) {
                    this.data.headlines = [];
                }
            },

            saveLocalNews: function () {
                try {
                    localStorage.setItem(this.getStorageKey(), JSON.stringify({
                        headlines: this.data.headlines,
                        lastUpdate: this.data.lastUpdate
                    }));
                    this.saveToSillyTavernVar();
                } catch (e) { console.error('[APP Tin tức] Lỗi lưu trữ:', e); }
            },

            saveToSillyTavernVar: function () {
                try {
                    if (this.data.headlines.length === 0) return;
                    var newsText = this.data.headlines.map(n => `【${n.tag}】${n.title}: ${n.summary}`).join('\n');
                    var command = '/setvar key=phone_news ' + newsText;
                    if (window.parent.executeSlashCommands) {
                        window.parent.executeSlashCommands(command);
                    } else if (window.parent.SillyTavern && window.parent.SillyTavern.getContext) {
                        window.parent.SillyTavern.getContext().executeSlashCommands?.(command);
                    }
                } catch (e) {}
            },

            getStoryContext: function () {
                try {
                    var ctx = window.parent.SillyTavern?.getContext?.();
                    if (!ctx || !ctx.chat || !Array.isArray(ctx.chat)) return '';
                    var recentMessages = ctx.chat.slice(-15);
                    var historyText = '';
                    for (var i = 0; i < recentMessages.length; i++) {
                        var msg = recentMessages[i];
                        if (msg && msg.mes) {
                            var cleanText = msg.mes
    .replace(/<!--[\s\S]*?-->/g, '') // Xóa triệt để các block comment HTML (Điểm neo, Số chữ...) nhiều dòng
    .replace(/<[^>]*>/g, '')         // Xóa các thẻ HTML thông thường (<br>, <i>...)
    .replace(/\{\{[^}]*\}\}/g, '')   // Xóa macro {{...}}
    .replace(/\[\[[^\]]*\]\]/g, '')  // Xóa macro [[...]]
    .trim();
                            if (cleanText) {
                                historyText += `${msg.is_user ? 'Người chơi' : 'Nhân vật'}: ${cleanText}\n`;
                            }
                        }
                    }
                    return historyText;
                } catch (e) { return ''; }
            }
        };

        // Khởi tạo data lần đầu
        NewsManager.loadLocalNews();

        // ============ LOGIC GỌI API ĐỘC LẬP ============
        async function fetchMainNews() {
            var settings = window.parent.PhoneSystem.getSettings();
            if (!settings.apiConfig || !settings.apiConfig.apiKey) throw new Error("Chưa cài đặt API Key trong điện thoại");

            const chatContext = NewsManager.getStoryContext();
            const systemPrompt = `Dựa vào bối cảnh câu chuyện dưới đây, tạo 3-5 tiêu đề tin tức ngắn gọn phản ánh thế giới trong truyện. Trả về đúng định dạng JSON: {"headlines":[{"tag":"...","title":"...","summary":"...","source":"...","time":"..."}]}`;
            const userPrompt = `Bối cảnh:\n${chatContext || 'Chưa có gì đặc biệt.'}\n\nTạo tin tức hôm nay.`;

            const result = await window.parent.PhoneSystem.callExternalAPI([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]);

            if (result) {
                const jsonMatch = result.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return parsed.headlines || [];
                }
            }
            throw new Error("Lỗi phân tích JSON từ AI");
        }

        async function fetchSpecialNewsItem() {
            try {
                const chatContext = NewsManager.getStoryContext();
                const systemPrompt = `Hệ thống tạo tin tức bí ẩn. Dựa vào bối cảnh, tạo 1 mẩu tin kỳ lạ, viễn tưởng hoặc thuyết âm mưu liên quan mờ nhạt đến nhân vật. Trả về JSON: {"tag":"Tin Lạ","title":"...","summary":"...","source":"...","time":"..."}`;
                const userPrompt = `Bối cảnh:\n${chatContext}\n\nTạo 1 tin đồn bí ẩn.`;

                const result = await window.parent.PhoneSystem.callExternalAPI([
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ]);

                if (result) {
                    const jsonMatch = result.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        parsed._isOtherWorld = true;
                        return parsed;
                    }
                }
                return null;
            } catch (e) { return null; }
        }

        async function refreshNews(iframeDoc) {
            if (NewsManager.data.isLoading) return;
            
            NewsManager.data.isLoading = true;
            const refreshBtn = iframeDoc.getElementById('news-refresh-btn');
            if (refreshBtn) {
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = 'Đang tải...';
                refreshBtn.style.opacity = '0.6';
            }
            
            renderNewsList(iframeDoc); // Show loading

            try {
                // 1. Lấy tin tức chính
                let newHeadlines = await fetchMainNews();

                // 2. Chèn tin đặc biệt (Dị giới) nếu trúng tỷ lệ
                if (Math.random() < SPECIAL_NEWS_CHANCE) {
                    const specialNews = await fetchSpecialNewsItem();
                    if (specialNews) {
                        const insertAt = Math.floor(Math.random() * (newHeadlines.length + 1));
                        newHeadlines.splice(insertAt, 0, specialNews);
                    }
                }

                // 3. Cập nhật và Lưu
                if (newHeadlines && newHeadlines.length > 0) {
                    NewsManager.data.headlines = newHeadlines;
                    NewsManager.data.lastUpdate = new Date().toISOString();
                    NewsManager.saveLocalNews();
                    if (window.parent.toastr) window.parent.toastr.success("Đã cập nhật tin tức mới");
                }
            } catch (e) {
                console.error('[APP Tin tức] Lỗi làm mới:', e);
                if (window.parent.toastr) window.parent.toastr.error('Làm mới thất bại: ' + e.message);
            } finally {
                NewsManager.data.isLoading = false;
                if (refreshBtn) {
                    refreshBtn.disabled = false;
                    refreshBtn.innerHTML = 'Làm mới';
                    refreshBtn.style.opacity = '1';
                }
                renderNewsList(iframeDoc);
                updateTimeDisplay(iframeDoc);
            }
        }

        // ============ UI RENDER ============
        function generateHTML() {
            return `
            <div id="news-app" style="position:absolute;inset:0;background:#f5f7fa;display:flex;flex-direction:column;font-family:-apple-system,'SF Pro Text',sans-serif;color:#333;overflow:hidden;z-index:400">
                <div style="height:88px;display:flex;align-items:flex-end;padding:0 16px 12px;background:rgba(255,255,255,0.8);backdrop-filter:blur(20px);border-bottom:1px solid rgba(0,0,0,0.05);z-index:10;flex-shrink:0">
                    <div id="news-back-btn" style="color:#d32f2f;display:flex;align-items:center;gap:4px;cursor:pointer;width:60px">
                        <span style="font-size:18px">‹</span> Trở về
                    </div>
                    <div style="flex:1;text-align:center;font-weight:bold;font-size:17px">Tin tức hôm nay</div>
                    <div id="news-refresh-btn" style="width:60px;text-align:right;color:#d32f2f;font-size:16px;cursor:pointer">Làm mới</div>
                </div>
                <div id="news-update-time" style="padding:10px 16px;font-size:12px;color:#888;text-align:center;background:rgba(0,0,0,0.02)">
                    Nhấp vào góc trên bên phải để nhận tin mới
                </div>
                <div id="news-list" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:16px;-webkit-overflow-scrolling:touch">
                    </div>
                <div style="padding:12px;text-align:center;font-size:11px;color:#bbb;background:#f5f7fa">
                    Powered by AI · Standalone Module
                </div>
            </div>
            `;
        }

        function generateCSS() {
            return `
            <style id="news-app-styles">
                #news-app * { box-sizing: border-box; }
                #news-app button:active { opacity: 0.8; transform: scale(0.98); }
                .news-card {
                    background: #fff; border-radius: 12px; padding: 16px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: transform 0.2s, box-shadow 0.2s;
                    border: 1px solid rgba(0,0,0,0.03); position: relative;
                }
                .news-card.other-world {
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border: 1px solid rgba(138,43,226,0.3);
                    box-shadow: 0 2px 12px rgba(138,43,226,0.15);
                }
                .news-card.other-world .news-title { color: #e8d5ff; }
                .news-card.other-world .news-summary { color: #b8a0d0; }
                .news-card.other-world .news-meta { color: #7a6090; border-top-color: rgba(138,43,226,0.2); }
                .news-card:active { transform: scale(0.98); background: #f9f9f9; }
                .news-card.other-world:active { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); }
                .news-tag {
                    display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 11px;
                    font-weight: 600; margin-bottom: 8px; color: #fff;
                }
                .news-tag.breaking { background: #ff3b30; }
                .news-tag.local { background: #007aff; }
                .news-tag.social { background: #5856d6; }
                .news-tag.economy { background: #34c759; }
                .news-tag.weather { background: #5ac8fa; }
                .news-tag.otherworld { background: linear-gradient(135deg, #8a2be2, #4b0082); }
                .news-title { font-size: 18px; font-weight: 700; line-height: 1.35; color: #111; margin-bottom: 6px; letter-spacing: -0.3px; }
                .news-summary { font-size: 14px; line-height: 1.5; color: #666; margin-bottom: 12px; }
                .news-meta { display: flex; justify-content: space-between; font-size: 12px; color: #999; border-top: 1px solid #f0f0f0; padding-top: 10px; }
                .news-loading { text-align: center; padding: 40px; }
                .news-loading-spinner {
                    width: 32px; height: 32px; border: 3px solid rgba(211,47,47,0.2);
                    border-top-color: #d32f2f; border-radius: 50%; animation: news-spin 1s linear infinite; margin: 0 auto 16px;
                }
                @keyframes news-spin { to { transform: rotate(360deg); } }
            </style>
            `;
        }

        function renderNewsList(iframeDoc) {
            const listEl = iframeDoc.getElementById('news-list');
            if (!listEl) return;

            if (NewsManager.data.isLoading) {
                listEl.innerHTML = `
                    <div class="news-loading">
                        <div class="news-loading-spinner"></div>
                        <div style="color: #666;">Hệ thống AI đang phân tích bối cảnh...</div>
                    </div>
                `;
                return;
            }

            if (NewsManager.data.headlines.length === 0) {
                listEl.innerHTML = `
                    <div id="news-placeholder" style="text-align:center;padding:80px 20px;color:#999">
                        <div style="font-size:64px;margin-bottom:20px;opacity:0.3">📰</div>
                        <div style="font-size:16px;font-weight:500;margin-bottom:8px">Tạm thời chưa có tin tức</div>
                        <div style="font-size:14px">Nhấp vào "Làm mới" góc trên bên phải để nhận tin nóng</div>
                    </div>
                `;
                return;
            }

            const tagColors = {
                '突发': 'breaking', 'Đột phá': 'breaking',
                '本地': 'local', 'Địa phương': 'local',
                '社会': 'social', 'Xã hội': 'social',
                '经济': 'economy', 'Kinh tế': 'economy',
                '天气': 'weather', 'Thời tiết': 'weather',
                '异界': 'otherworld', 'Tin Lạ': 'otherworld'
            };

            listEl.innerHTML = NewsManager.data.headlines.map((news, index) => {
                const isOtherWorld = news._isOtherWorld === true;
                const tagClass = tagColors[news.tag] || 'local';
                const cardClass = isOtherWorld ? 'news-card other-world' : 'news-card';
                return `
                <div class="${cardClass}" data-index="${index}">
                    <span class="news-tag ${tagClass}">${news.tag || 'Thông tin'}</span>
                    <div class="news-title">${news.title}</div>
                    <div class="news-summary">${news.summary}</div>
                    <div class="news-meta">
                        <span>${news.source || 'Tin nhanh địa phương'}</span>
                        <span>${news.time || 'Vừa xong'}</span>
                    </div>
                </div>
                `;
            }).join('');
        }

        function updateTimeDisplay(iframeDoc) {
            const timeEl = iframeDoc.getElementById('news-update-time');
            if (timeEl && NewsManager.data.lastUpdate) {
                const time = new Date(NewsManager.data.lastUpdate);
                const hours = String(time.getHours()).padStart(2, '0');
                const minutes = String(time.getMinutes()).padStart(2, '0');
                timeEl.textContent = `Cập nhật lần cuối: ${hours}:${minutes}`;
            }
        }

        function initEvents(iframeDoc) {
            const backBtn = iframeDoc.getElementById('news-back-btn');
            if (backBtn) backBtn.onclick = () => window.parent.PhoneSystem.goHome();

            const refreshBtn = iframeDoc.getElementById('news-refresh-btn');
            if (refreshBtn) refreshBtn.onclick = () => refreshNews(iframeDoc);
        }

        // ============ VÒNG ĐỜI QUẢN LÝ APP ============
        function openApp() {
            const phoneSystem = window.parent.PhoneSystem;
            if (!phoneSystem || !phoneSystem.iframeWindow) {
                setTimeout(openApp, 200); return;
            }

            const iframeDoc = phoneSystem.iframeWindow.document;
            const homeScreen = iframeDoc.getElementById('home-screen');
            if (homeScreen) homeScreen.style.display = 'none';

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

            // Sync lại data mỗi khi mở app để đảm bảo lấy đúng của Character hiện tại
            const currentChatId = NewsManager.getChatId();
            if (currentChatId !== NewsManager.currentChatId) {
                NewsManager.loadLocalNews();
            }

            appContainer.innerHTML = generateCSS() + generateHTML();
            appContainer.style.pointerEvents = 'auto';

            setTimeout(() => {
                initEvents(iframeDoc);
                renderNewsList(iframeDoc);
                updateTimeDisplay(iframeDoc);
            }, 50);

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
            } catch (e) { }
        }

        // Đăng ký App vào Main Phone
        window.parent.PhoneSystem.registerApp({
            id: APP_ID, name: APP_NAME, icon: APP_ICON, color: APP_COLOR, order: 7
        });

        window.parent.PhoneSystem.on('app-opened', function (data) {
            if (data.id === APP_ID) openApp();
        });

        window.parent.PhoneSystem.on('go-home', function () {
            if (window.parent.PhoneSystem.currentApp === APP_ID || !window.parent.PhoneSystem.currentApp) closeApp();
        });

    });
})();