/**
 * Điện thoại nhỏ - Module APP YouTube (Virtual AI Tube)
 * Bản chuẩn: Ảnh random (Picsum) + Fix giao diện + Đọc Context gốc từ SillyTavern (Lọc Format) + Nâng giới hạn Context.
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
        console.log('[APP Virtual Tube] Khởi tạo module');

        const APP_ID = 'youtube';
        const APP_NAME = 'YouTube';
        const APP_ICON = '<img src="https://api.iconify.design/logos:youtube-icon.svg" style="width:70%;height:70%">';
        const APP_COLOR = '#282828';

        let generatedVideos = [];
        let currentVideoIndex = -1;
        let isGenerating = false;

        // ============ ĐÃ CẬP NHẬT: Lấy bối cảnh gốc từ SillyTavern (Giống App Tin tức) ============
        function getStoryContext() {
            try {
                var ctx = window.parent.SillyTavern?.getContext?.();
                if (!ctx || !ctx.chat || !Array.isArray(ctx.chat)) return 'Chưa có bối cảnh.';

                var recentMessages = ctx.chat.slice(-15);
                var historyText = '';

                for (var i = 0; i < recentMessages.length; i++) {
                    var msg = recentMessages[i];
                    if (msg && msg.mes) {
                        var cleanText = msg.mes
                            .replace(/<!--[\s\S]*?-->/g, '') // Lọc điểm neo, số chữ (block comment)
                            .replace(/<[^>]*>/g, '')         // Lọc HTML
                            .replace(/\{\{[^}]*\}\}/g, '')   // Lọc macro {{}}
                            .replace(/\[\[[^\]]*\]\]/g, '')  // Lọc macro [[]]
                            .trim();
                            
                        if (cleanText) {
                            historyText += `${msg.is_user ? 'Người chơi' : 'Nhân vật'}: ${cleanText}\n`;
                        }
                    }
                }
                
                // Mở rộng giới hạn lên 100000 ký tự theo yêu cầu cũ của YouTube
                if (historyText.length > 100000) {
                    historyText = "... " + historyText.substring(historyText.length - 100000);
                }
                
                return historyText || 'Chưa có bối cảnh.';
            } catch (e) { 
                console.warn('[APP Virtual Tube] Lỗi lấy lịch sử chat từ SillyTavern:', e);
                return 'Chưa có bối cảnh.'; 
            }
        }

        function extractJSON(text) {
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                try { return JSON.parse(match[0]); } catch (e) { return null; }
            }
            return null;
        }

        // ============ API 1: Tạo danh sách Video ============
        async function fetchAIVideos(iframeDoc) {
            if (isGenerating) return;
            isGenerating = true;
            
            const btn = iframeDoc.getElementById('yt-generate-btn');
            if (btn) btn.innerHTML = '<span class="yt-spinner"></span> Đang quét mạng xã hội...';

            try {
                var settings = window.parent.PhoneSystem.getSettings();
                if (!settings.apiConfig || !settings.apiConfig.apiKey) throw new Error("Chưa cài API Key.");

                const context = getStoryContext();
                const systemPrompt = `Bạn là thuật toán đề xuất video. Dựa vào bối cảnh truyện dưới đây, tạo 4 video đang viral trên mạng liên quan đến sự kiện/nhân vật đó (tin tức, vlog, bóc phốt, v.v).
Trả về ĐÚNG JSON:
{"videos":[{"title":"Tên video giật tít","channel":"Tên kênh","views":"1.2 Tr lượt xem","time":"2 giờ trước"}]}`;
                
                const result = await window.parent.PhoneSystem.callExternalAPI([
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Bối cảnh:\n${context}\n\nTạo video.` }
                ]);

                const parsed = extractJSON(result);
                if (parsed && parsed.videos) {
                    const randomSession = Math.floor(Math.random() * 100000);
                    generatedVideos = parsed.videos.map((v, idx) => ({
                        ...v, 
                        seed: `scene_${randomSession}_${idx}`, 
                        detailsFetched: false, 
                        description: "", 
                        comments: []
                    }));
                    renderAIVideos(iframeDoc);
                }
            } catch (e) {
                if (window.parent.toastr) window.parent.toastr.error('Lỗi: ' + e.message);
            } finally {
                isGenerating = false;
                if (btn) btn.innerHTML = '🔄 Làm mới bảng tin';
            }
        }

        // ============ API 2: Tạo Chi tiết & Comments ============
        async function fetchVideoDetails(iframeDoc, index) {
            const video = generatedVideos[index];
            if (video.detailsFetched) {
                renderVideoDetail(iframeDoc, index);
                return;
            }

            iframeDoc.getElementById('yt-detail-content').innerHTML = `
                <div style="padding:40px; text-align:center; color:#aaa;">
                    <div class="yt-spinner" style="width:30px;height:30px;margin-bottom:15px;"></div>
                    <div>Đang tải dữ liệu và bình luận...</div>
                </div>`;

            try {
                const context = getStoryContext();
                const systemPrompt = `Bạn là hệ thống tạo chi tiết video. 
Dựa vào Tên Video và Bối cảnh truyện, viết 1 đoạn mô tả (Description) và 5 bình luận (Comments) từ cư dân mạng ảo (netizen). 
Bình luận cần chân thực, đa dạng (khen, chê, hóng hớt, tấu hài).
Trả về ĐÚNG JSON:
{"description":"Mô tả video...","comments":[{"user":"@username","text":"Nội dung cmt","likes":"124","time":"1 giờ trước"}]}`;
                
                const userPrompt = `Bối cảnh:\n${context}\n\nVideo: [${video.title}] của kênh [${video.channel}].\nTạo chi tiết.`;

                const result = await window.parent.PhoneSystem.callExternalAPI([
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ]);

                const parsed = extractJSON(result);
                if (parsed) {
                    generatedVideos[index].description = parsed.description || "Không có mô tả.";
                    generatedVideos[index].comments = parsed.comments || [];
                    generatedVideos[index].detailsFetched = true;
                    renderVideoDetail(iframeDoc, index);
                }
            } catch (e) {
                iframeDoc.getElementById('yt-detail-content').innerHTML = `<div style="padding:20px;color:red;">Lỗi tải dữ liệu.</div>`;
            }
        }

        // ============ API 3: AI Rep Comment (Full ngữ cảnh) ============
        async function fetchCommentReply(iframeDoc, index, userText) {
            const video = generatedVideos[index];
            const btn = iframeDoc.getElementById('yt-submit-comment');
            if(btn) btn.innerHTML = '...';

            try {
                const context = getStoryContext();
                const systemPrompt = `Bạn là cộng đồng mạng. Một người dùng vừa bình luận vào video. Hãy tạo 1 hoặc 2 bình luận mới từ các netizen khác để hùa theo, cãi lại, hoặc rep trực tiếp comment đó. Phản ứng phải sát với nội dung video và bối cảnh.
Trả về ĐÚNG JSON:
{"comments":[{"user":"@random_user","text":"Nội dung rep...","likes":"12","time":"Vừa xong"}]}`;
                
                const userPrompt = `[BỐI CẢNH ROLEPLAY]\n${context}\n\n[THÔNG TIN VIDEO HIỆN TẠI]\nTiêu đề: ${video.title}\nKênh: ${video.channel}\nMô tả: ${video.description}\n\n[TÌNH HUỐNG]\nNgười chơi vừa comment: "${userText}"\n\nHãy hóa thân thành cộng đồng mạng để phản hồi lại.`;

                const result = await window.parent.PhoneSystem.callExternalAPI([
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ]);

                const parsed = extractJSON(result);
                if (parsed && parsed.comments) {
                    generatedVideos[index].comments = [...parsed.comments, ...generatedVideos[index].comments];
                    renderComments(iframeDoc, index);
                }
            } catch (e) {} 
            finally {
                if(btn) btn.innerHTML = 'Gửi';
            }
        }

        // ============ RENDER: Danh sách Home ============
        function renderAIVideos(iframeDoc) {
            const listEl = iframeDoc.getElementById('yt-ai-list');
            if (!listEl) return;
            if (generatedVideos.length === 0) {
                listEl.innerHTML = `<div style="text-align:center;padding:40px;color:#888;">Chưa có video nào. Nhấn Làm mới.</div>`;
                return;
            }

            listEl.innerHTML = generatedVideos.map((vid, idx) => {
                const thumbUrl = `https://picsum.photos/seed/${vid.seed}/320/180`;
                
                return `
                <div class="yt-card" data-idx="${idx}">
                    <div class="yt-thumb" style="background-color:#222;">
                        <img src="${thumbUrl}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
                        <span class="yt-duration">${Math.floor(Math.random()*15)+1}:${String(Math.floor(Math.random()*60)).padStart(2,'0')}</span>
                    </div>
                    <div class="yt-info">
                        <div class="yt-avatar" style="background-color: hsl(${Math.random()*360}, 70%, 40%)">${vid.channel.charAt(0).toUpperCase()}</div>
                        <div class="yt-text">
                            <div class="yt-title">${vid.title}</div>
                            <div class="yt-meta">${vid.channel} • ${vid.views} • ${vid.time}</div>
                        </div>
                    </div>
                </div>
                `;
            }).join('');

            iframeDoc.querySelectorAll('.yt-card').forEach(card => {
                card.onclick = () => {
                    currentVideoIndex = parseInt(card.dataset.idx);
                    openVideoView(iframeDoc);
                };
            });
        }

        // ============ RENDER: Chi tiết Video ============
        function openVideoView(iframeDoc) {
            iframeDoc.getElementById('yt-home-view').style.display = 'none';
            iframeDoc.getElementById('yt-player-view').style.display = 'flex';
            fetchVideoDetails(iframeDoc, currentVideoIndex);
        }

        function renderVideoDetail(iframeDoc, index) {
            const video = generatedVideos[index];
            const contentEl = iframeDoc.getElementById('yt-detail-content');
            if(!contentEl) return;

            const thumbUrl = `https://picsum.photos/seed/${video.seed}/480/270`;

            contentEl.innerHTML = `
                <div style="width:100%;aspect-ratio:16/9;background:#111;position:relative;display:flex;align-items:center;justify-content:center;border-bottom:2px solid #cc0000;overflow:hidden;">
                    <img src="${thumbUrl}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.6;">
                    <div style="z-index:2;font-size:40px;color:rgba(255,255,255,0.8);">▶️</div>
                    <div style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.7);padding:4px 8px;font-size:10px;border-radius:4px;color:#fff;">Simulated Video</div>
                </div>

                <div style="padding:16px;border-bottom:1px solid #333;">
                    <h3 style="margin:0 0 8px 0;font-size:18px;line-height:1.3">${video.title}</h3>
                    <div style="color:#aaa;font-size:13px;margin-bottom:12px;">${video.views} • ${video.time}</div>
                    
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                        <div class="yt-avatar" style="width:40px;height:40px;background-color:#555;color:#fff;display:flex;align-items:center;justify-content:center;border-radius:50%;font-weight:bold;">${video.channel.charAt(0).toUpperCase()}</div>
                        <div style="flex:1;">
                            <div style="font-weight:bold;font-size:15px;">${video.channel}</div>
                            <div style="font-size:12px;color:#aaa;">${Math.floor(Math.random()*900)+10}N người đăng ký</div>
                        </div>
                        <button style="background:#fff;color:#000;border:none;border-radius:20px;padding:8px 16px;font-weight:bold;">Đăng ký</button>
                    </div>

                    <div style="background:#222;border-radius:12px;padding:12px;font-size:13px;line-height:1.5;color:#eee;">
                        <div style="font-weight:bold;margin-bottom:4px;">Mô tả:</div>
                        ${video.description.replace(/\n/g, '<br>')}
                    </div>
                </div>

                <div style="padding:16px;">
                    <div style="font-weight:bold;margin-bottom:16px;font-size:16px;">Bình luận</div>
                    
                    <div style="display:flex;gap:12px;margin-bottom:20px;">
                        <div class="yt-avatar" style="width:32px;height:32px;background:#0055ff;color:#fff;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:11px;font-weight:bold;">Bạn</div>
                        <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
                            <input type="text" id="yt-my-comment" placeholder="Viết bình luận..." style="background:transparent;border:none;border-bottom:1px solid #555;color:#fff;outline:none;padding:4px 0;font-size:14px;">
                            <div style="display:flex;justify-content:flex-end;">
                                <button id="yt-submit-comment" style="background:#cc0000;color:#fff;border:none;border-radius:16px;padding:6px 16px;font-size:13px;cursor:pointer;font-weight:bold;">Gửi</button>
                            </div>
                        </div>
                    </div>

                    <div id="yt-comments-list"></div>
                </div>
            `;

            renderComments(iframeDoc, index);

            const submitBtn = iframeDoc.getElementById('yt-submit-comment');
            const inputEl = iframeDoc.getElementById('yt-my-comment');
            submitBtn.onclick = () => {
                const text = inputEl.value.trim();
                if(!text) return;
                
                generatedVideos[index].comments.unshift({
                    user: "@nguoi_choi",
                    text: text,
                    likes: "0",
                    time: "Vừa xong",
                    isUser: true
                });
                inputEl.value = '';
                renderComments(iframeDoc, index);
                fetchCommentReply(iframeDoc, index, text);
            };
        }

        function renderComments(iframeDoc, index) {
            const list = iframeDoc.getElementById('yt-comments-list');
            if(!list) return;
            const comments = generatedVideos[index].comments;

            list.innerHTML = comments.map(c => `
                <div style="display:flex;gap:12px;margin-bottom:16px;">
                    <div class="yt-avatar" style="width:32px;height:32px;background:${c.isUser ? '#0055ff' : '#444'}; color:#fff; display:flex; align-items:center; justify-content:center; border-radius:50%; font-size:12px; font-weight:bold; flex-shrink:0;">${c.user.charAt(1).toUpperCase() || 'U'}</div>
                    <div style="flex:1;">
                        <div style="font-size:12px;color:#aaa;margin-bottom:4px;font-weight:bold;">${c.user} <span style="font-weight:normal;">• ${c.time}</span></div>
                        <div style="font-size:14px;color:#fff;line-height:1.4;margin-bottom:6px;">${c.text}</div>
                        <div style="font-size:12px;color:#aaa;display:flex;gap:16px;">
                            <span>👍 ${c.likes || Math.floor(Math.random()*50)}</span>
                            <span>👎</span>
                            <span style="cursor:pointer;">Phản hồi</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // ============ HTML / CSS ============
        function generateHTML() {
            return `
            <div id="youtube-app" style="position:absolute;inset:0;background:#0f0f0f;display:flex;flex-direction:column;font-family:'Roboto',-apple-system,sans-serif;color:#fff;overflow:hidden;z-index:400">
                
                <div style="height:88px;display:flex;align-items:flex-end;padding:0 16px 12px;background:#0f0f0f;border-bottom:1px solid #272727;z-index:10;flex-shrink:0;justify-content:space-between">
                    <div style="display:flex;align-items:center;gap:6px">
                        <img src="https://api.iconify.design/logos:youtube-icon.svg" style="width:28px;height:20px;">
                        <span style="font-size:19px;font-weight:bold;letter-spacing:-1px;">Virtual Tube</span>
                    </div>
                    <div id="yt-close-btn" style="color:#fff;font-size:24px;cursor:pointer;padding:4px;line-height:1;">&times;</div>
                </div>

                <div id="yt-home-view" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;-webkit-overflow-scrolling:touch">
                    <div style="padding:16px;background:#0f0f0f;position:sticky;top:0;z-index:5;border-bottom:1px solid #222;">
                        <button id="yt-generate-btn" style="width:100%;background:#272727;color:#fff;border:none;border-radius:20px;padding:10px;font-weight:bold;cursor:pointer;display:flex;justify-content:center;align-items:center;gap:8px;font-size:14px">
                            🔄 Làm mới bảng tin
                        </button>
                    </div>
                    <div id="yt-ai-list" style="display:flex;flex-direction:column;padding-top:8px;">
                        <div style="text-align:center;color:#888;padding:40px 20px;font-size:14px">
                            <div style="font-size:40px;margin-bottom:10px;opacity:0.5">🌐</div>
                            Ấn "Làm mới" để xem cư dân mạng đang nói gì về thế giới của bạn.
                        </div>
                    </div>
                </div>

                <div id="yt-player-view" style="display:none;flex:1;flex-direction:column;background:#0f0f0f;overflow-y:auto;-webkit-overflow-scrolling:touch">
                    <div style="padding:44px 16px 12px;background:#0f0f0f;position:sticky;top:0;z-index:20;border-bottom:1px solid #222;display:flex;align-items:flex-end;">
                        <div id="yt-back-to-home" style="display:inline-block;color:#fff;font-size:15px;font-weight:bold;cursor:pointer;">
                            ← Quay lại
                        </div>
                    </div>
                    <div id="yt-detail-content" style="flex:1;"></div>
                </div>
            </div>
            `;
        }

        function generateCSS() {
            return `
            <style id="youtube-app-styles">
                #youtube-app * { box-sizing: border-box; }
                .yt-card { cursor: pointer; display: flex; flex-direction: column; gap: 12px; margin-bottom:16px; transition: background 0.2s; }
                .yt-card:active { background: #222; }
                .yt-thumb { width: 100%; aspect-ratio: 16/9; background-color: #222; position: relative; overflow: hidden; }
                .yt-duration { position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.8); color: #fff; font-size: 12px; padding: 3px 4px; border-radius: 4px; font-weight: 500;}
                .yt-info { display: flex; gap: 12px; padding: 0 16px; }
                .yt-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; flex-shrink: 0; color:#fff;}
                .yt-text { display: flex; flex-direction: column; gap: 4px; }
                .yt-title { font-size: 15px; font-weight: 500; color: #fff; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                .yt-meta { font-size: 12px; color: #aaa; }
                .yt-spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #fff; animation: yt-spin 1s infinite; }
                @keyframes yt-spin { to { transform: rotate(360deg); } }
                input:focus { border-bottom-color: #cc0000 !important; }
            </style>
            `;
        }

        function initEvents(iframeDoc) {
            const closeBtn = iframeDoc.getElementById('yt-close-btn');
            if (closeBtn) closeBtn.onclick = () => window.parent.PhoneSystem.goHome();

            const generateBtn = iframeDoc.getElementById('yt-generate-btn');
            if (generateBtn) generateBtn.onclick = () => fetchAIVideos(iframeDoc);

            const backBtn = iframeDoc.getElementById('yt-back-to-home');
            if (backBtn) {
                backBtn.onclick = () => {
                    iframeDoc.getElementById('yt-player-view').style.display = 'none';
                    iframeDoc.getElementById('yt-home-view').style.display = 'flex';
                };
            }
        }

        function openApp() {
            const phoneSystem = window.parent.PhoneSystem;
            if (!phoneSystem || !phoneSystem.iframeWindow) return;

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

            appContainer.innerHTML = generateCSS() + generateHTML();
            appContainer.style.pointerEvents = 'auto';

            setTimeout(() => {
                initEvents(iframeDoc);
                if (generatedVideos.length > 0) renderAIVideos(iframeDoc);
            }, 50);
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
            } catch (e) { }
        }

        window.parent.PhoneSystem.registerApp({
            id: APP_ID,
            name: 'Virtual Tube',
            icon: APP_ICON,
            color: APP_COLOR,
            order: 8
        });

        window.parent.PhoneSystem.on('app-opened', function (data) {
            if (data.id === APP_ID) openApp();
        });

        window.parent.PhoneSystem.on('go-home', function () { closeApp(); });
    });
})();