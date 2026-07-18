/**
 * Module: App YouTube Player (Bản Đa Nhiệm Lõi Kép - Xoay Ngang Hoàn Hảo)
 * Phụ thuộc: Lõi Điện thoại (Phone Core)
 */

(function initYouTubeApp() {
    if (!window.parent.PhoneSystem) {
        setTimeout(initYouTubeApp, 1000);
        return;
    }

    const APP_ID = 'youtube-player-app';
    const STORAGE_KEY = 'tavernPhoneApp_YouTube_History';
    const YT_ICON_SVG = '<svg viewBox="0 0 24 24" fill="white" style="width:60%;height:60%;"><path d="M21.582,6.186c-0.23-0.86-0.908-1.538-1.768-1.768C18.254,4,12,4,12,4S5.746,4,4.186,4.418c-0.86,0.23-1.538,0.908-1.768,1.768C2,7.746,2,12,2,12s0,4.254,0.418,5.814c0.23,0.86,0.908,1.538,1.768,1.768C5.746,20,12,20,12,20s6.254,0,7.814-0.418c0.861-0.23,1.538-0.908,1.768-1.768C22,16.254,22,12,22,12S22,7.746,21.582,6.186z M10,15.464V8.536L16,12L10,15.464z"/></svg>';

    window.parent.PhoneSystem.registerApp({
        id: APP_ID,
        name: 'YouTube',
        icon: YT_ICON_SVG, 
        color: '#FF0000', 
        order: 17 
    });

    // ==========================================
    // LOGIC CHẠY NGẦM VỚI IFRAME ĐỘC LẬP
    // ==========================================
    var ytResizeObserver = null;
    var isLandscape = false; 

    function getIframeDoc() {
        var ps = window.parent.PhoneSystem;
        return (ps && ps.iframeWindow) ? ps.iframeWindow.document : null;
    }

    function getPersistentIframe() {
        var doc = getIframeDoc();
        if (!doc) return null;
        var iframe = doc.getElementById('yt-persistent-iframe');
        if (!iframe) {
            iframe = doc.createElement('iframe');
            iframe.id = 'yt-persistent-iframe';
            iframe.style.cssText = 'position: fixed; top: -10000px; left: -10000px; width: 10px; height: 10px; border: none; z-index: 9999; opacity: 0; pointer-events: none; border-radius: 12px; transition: opacity 0.3s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.5);';
            iframe.setAttribute('allowfullscreen', 'true');
            iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
            iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
            doc.body.appendChild(iframe);
        }
        return iframe;
    }

    function hideIframe() {
        var iframe = getPersistentIframe();
        if (iframe) {
            iframe.style.opacity = '0';
            iframe.style.pointerEvents = 'none';
            iframe.style.top = '-10000px';
            iframe.style.left = '-10000px';
        }
        if (ytResizeObserver) {
            ytResizeObserver.disconnect();
            ytResizeObserver = null;
        }
    }

    function isIframePlaying() {
        var iframe = getPersistentIframe();
        if (!iframe) return false;
        return iframe.src && iframe.src !== 'about:blank' && iframe.src.includes('youtube');
    }

    function syncIframeToPlaceholder(placeholder) {
        var iframe = getPersistentIframe();
        if (!iframe || !placeholder) return;

        function doSync() {
            if (!placeholder.isConnected) {
                hideIframe();
                return;
            }
            if (isIframePlaying()) {
                var rect = placeholder.getBoundingClientRect();
                iframe.style.top = rect.top + 'px';
                iframe.style.left = rect.left + 'px';
                iframe.style.width = rect.width + 'px';
                iframe.style.height = rect.height + 'px';
                iframe.style.opacity = '1';
                iframe.style.pointerEvents = 'auto';
            } else {
                hideIframe();
            }
        }

        doSync();

        if (ytResizeObserver) ytResizeObserver.disconnect();
        if (typeof window.parent.ResizeObserver !== 'undefined') {
            ytResizeObserver = new window.parent.ResizeObserver(doSync);
            ytResizeObserver.observe(placeholder);
        } else {
            window.parent.addEventListener('resize', doSync);
        }
    }

    // ==========================================
    // LOGIC XOAY MÀN HÌNH HOÀN HẢO
    // ==========================================
    function forcePortrait() {
        if (!isLandscape) return;
        var ps = window.parent.PhoneSystem;
        if (!ps) return;
        var s = ps.getSettings();

        // Khôi phục kích thước dọc ban đầu
        s.phoneWidth = window._origPhoneW || 408;
        s.phoneHeight = window._origPhoneH || 880;
        ps.saveSettings(s);
        isLandscape = false;

        // Khôi phục giao diện UI
        var doc = getIframeDoc();
        if (doc) {
            var h = doc.getElementById('yt-header'); if (h) h.style.display = 'flex';
            var i = doc.getElementById('yt-input-row'); if (i) i.style.display = 'flex';
            var ht = doc.getElementById('yt-history-title'); if (ht) ht.style.display = 'block';
            var hl = doc.getElementById('yt-history-list'); if (hl) hl.style.display = 'flex';
            var c = doc.getElementById('yt-content'); if (c) c.style.padding = '16px';
            var vp = doc.getElementById('yt-video-placeholder');
            if (vp) {
                vp.style.width = '100%';
                vp.style.height = 'auto';
                vp.style.aspectRatio = '16/9';
                vp.style.borderRadius = '12px';
                vp.style.border = '1px solid #333';
            }
            var btn = doc.getElementById('yt-exit-landscape-btn'); if (btn) btn.style.display = 'none';
        }

        // Căn giữa điện thoại để không bị lệch khung
        if (typeof ps.centerPhone === 'function') ps.centerPhone();
        else window.parent.dispatchEvent(new Event('resize'));
    }

    function toggleRotation() {
        var ps = window.parent.PhoneSystem;
        if (!ps) return;
        var s = ps.getSettings();
        var doc = getIframeDoc();

        if (!isLandscape) {
            // LÊN NGANG (LANDSCAPE)
            isLandscape = true;
            window._origPhoneW = s.phoneWidth;
            window._origPhoneH = s.phoneHeight;
            
            s.phoneWidth = window._origPhoneH; 
            s.phoneHeight = window._origPhoneW; 
            ps.saveSettings(s);

            if (doc) {
                // Giấu UI rườm rà
                var h = doc.getElementById('yt-header'); if (h) h.style.display = 'none';
                var i = doc.getElementById('yt-input-row'); if (i) i.style.display = 'none';
                var ht = doc.getElementById('yt-history-title'); if (ht) ht.style.display = 'none';
                var hl = doc.getElementById('yt-history-list'); if (hl) hl.style.display = 'none';
                var c = doc.getElementById('yt-content'); if (c) c.style.padding = '0';
                var vp = doc.getElementById('yt-video-placeholder');
                if (vp) {
                    vp.style.width = '100%';
                    vp.style.height = '100%'; 
                    vp.style.aspectRatio = 'auto'; // Gỡ bỏ tỉ lệ 16:9 chống cắt xén
                    vp.style.borderRadius = '0';
                    vp.style.border = 'none';
                }
                var btn = doc.getElementById('yt-exit-landscape-btn'); if (btn) btn.style.display = 'block';
            }
        } else {
            // VỀ DỌC
            forcePortrait();
        }

        // Căn giữa điện thoại chống nhảy khỏi web
        if (typeof ps.centerPhone === 'function') ps.centerPhone();
        else window.parent.dispatchEvent(new Event('resize'));

        // Đợi UI giãn xong thì chụp lại Iframe
        setTimeout(function(){ 
            var doc = getIframeDoc();
            if (doc) syncIframeToPlaceholder(doc.getElementById('yt-video-placeholder')); 
        }, 400);
    }

    // Đóng App an toàn
    if (!window.parent._ytBgSetupDoneV4) {
        window.parent.PhoneSystem.on('go-home', function() {
            hideIframe();
            forcePortrait(); 
        });
        window.parent.PhoneSystem.on('app-opened', function(data) {
            if (data.id !== APP_ID) {
                hideIframe();
                forcePortrait();
            }
        });
        window.parent._ytBgSetupDoneV4 = true;
    }

    // ==========================================
    // TIỆN ÍCH DỮ LIỆU
    // ==========================================
    function extractVideoID(url) {
        var match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i);
        return (match && match[1]) ? match[1] : null;
    }

    function getHistory() {
        try { return JSON.parse(window.parent.localStorage.getItem(STORAGE_KEY)) || []; } 
        catch (e) { return []; }
    }

    function saveToHistory(videoId, title) {
        var history = getHistory().filter(function(item) { return item.id !== videoId; }); 
        history.unshift({ id: videoId, title: title || ('Video: ' + videoId) });
        if (history.length > 50) history.pop(); 
        try { window.parent.localStorage.setItem(STORAGE_KEY, JSON.stringify(history)); } catch (e) {}
    }

    function removeFromHistory(videoId) {
        var history = getHistory().filter(function(item) { return item.id !== videoId; });
        try { window.parent.localStorage.setItem(STORAGE_KEY, JSON.stringify(history)); } catch (e) {}
    }

    // ==========================================
    // RENDER GIAO DIỆN APP
    // ==========================================
    window.parent.PhoneSystem.registerRenderer(APP_ID, function(container) {
        var doc = container.ownerDocument; 
        container.innerHTML = '';
        
        var appWrapper = doc.createElement('div');
        appWrapper.style.cssText = 'display:flex; flex-direction:column; height:100%; width:100%; background:#0f0f0f; color:#fff; font-family:-apple-system, sans-serif; position:absolute; top:0; left:0; z-index:10;';

// --- NÚT THOÁT NGANG MÀN HÌNH ---
        // 1. Xóa nút cũ nếu tồn tại để tránh lỗi kẹt closure từ các lần chạy trước
        var oldExitBtn = doc.getElementById('yt-exit-landscape-btn');
        if (oldExitBtn) {
            oldExitBtn.remove();
        }

        // 2. Khởi tạo nút mới với state hiện tại
        var exitLandscapeBtn = doc.createElement('div');
        exitLandscapeBtn.id = 'yt-exit-landscape-btn';
        exitLandscapeBtn.innerHTML = '✖ Thoát ngang';
        exitLandscapeBtn.style.cssText = 'position: fixed; top: 15px; right: 15px; background: rgba(0,0,0,0.7); color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; cursor: pointer; z-index: 10000; display: none; backdrop-filter: blur(5px); box-shadow: 0 2px 10px rgba(0,0,0,0.5); border: 1px solid #555; pointer-events: auto;';

        // 3. Bổ sung stopPropagation để Iframe Youtube bên dưới không cướp click
        exitLandscapeBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            forcePortrait();
        };

        // 4. Vẫn giữ nguyên việc gắn vào doc.body để thoát khỏi stacking context của appWrapper, đè lên được Iframe 9999
        doc.body.appendChild(exitLandscapeBtn);

        // --- HEADER ---
        var header = doc.createElement('div');
        header.id = 'yt-header';
        header.style.cssText = 'height: clamp(55px, 9vh, 70px); width: 100%; background: #212121; display: flex; align-items: center; justify-content: space-between; padding: 35px 16px 10px; border-bottom: 1px solid #3d3d3d; z-index: 10; box-sizing: border-box; flex-shrink: 0;';

        var backBtn = doc.createElement('div');
        backBtn.innerHTML = '‹ Trang chủ';
        backBtn.style.cssText = 'color: #fff; font-size: 16px; font-weight: 500; cursor: pointer; user-select: none; flex: 1;';
        backBtn.onclick = function() { window.parent.PhoneSystem.goHome(); };

        var title = doc.createElement('div');
        title.innerHTML = 'YouTube';
        title.style.cssText = 'font-size: 17px; font-weight: 600; color: #fff; text-align: center; flex: 1; pointer-events: none;';

        var actionsWrap = doc.createElement('div');
        actionsWrap.style.cssText = 'flex: 1; display: flex; justify-content: flex-end; align-items: center; gap: 15px;';

        var rotateBtn = doc.createElement('div');
        rotateBtn.innerHTML = 'Xoay 🔄';
        rotateBtn.style.cssText = 'color: #3B82F6; font-size: 14px; font-weight: 600; cursor: pointer; user-select: none;';
        rotateBtn.onclick = toggleRotation;

        var stopBtn = doc.createElement('div');
        stopBtn.innerHTML = 'Tắt ⏹';
        stopBtn.style.cssText = 'color: #ff4444; font-size: 14px; font-weight: 600; cursor: pointer; user-select: none;';
        stopBtn.onclick = function() {
            var iframe = getPersistentIframe();
            if (iframe) iframe.src = ''; 
            hideIframe();
            if(window.parent.toastr) window.parent.toastr.success('Đã tắt video');
        };

        actionsWrap.appendChild(rotateBtn);
        actionsWrap.appendChild(stopBtn);
        header.appendChild(backBtn);
        header.appendChild(title);
        header.appendChild(actionsWrap);
        appWrapper.appendChild(header);

        // --- KHUNG NHẬP LIỆU ---
        var content = doc.createElement('div');
        content.id = 'yt-content';
        content.style.cssText = 'flex: 1; display: flex; flex-direction: column; padding: 16px; overflow-y: auto; box-sizing: border-box; gap: 15px;';

        var inputRow = doc.createElement('div');
        inputRow.id = 'yt-input-row';
        inputRow.style.cssText = 'display:flex; gap:8px;';

        var urlInput = doc.createElement('input');
        urlInput.type = 'text';
        urlInput.placeholder = 'Dán link video hoặc Shorts...';
        urlInput.style.cssText = 'flex: 1; padding: 10px; border: 1px solid #333; border-radius: 8px; font-size: 14px; background: #121212; color: #fff; outline: none;';

        var playBtn = doc.createElement('button');
        playBtn.innerHTML = 'Phát';
        playBtn.style.cssText = 'background: #FF0000; color: #fff; border: none; padding: 0 16px; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; transition: transform 0.1s;';
        playBtn.onmousedown = function() { this.style.transform = 'scale(0.95)'; };
        playBtn.onmouseup = function() { this.style.transform = 'scale(1)'; };

        inputRow.appendChild(urlInput);
        inputRow.appendChild(playBtn);

        // --- KHUNG PLACEHOLDER VIDEO ---
        var videoPlaceholder = doc.createElement('div');
        videoPlaceholder.id = 'yt-video-placeholder';
        videoPlaceholder.style.cssText = 'width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid #333; flex-shrink: 0;';

        var emptyState = doc.createElement('div');
        emptyState.innerHTML = '📺<br><br>Dán link để xem';
        emptyState.style.cssText = 'color: #777; text-align: center; font-size: 14px;';
        videoPlaceholder.appendChild(emptyState);

        // --- LỊCH SỬ ---
        var historyTitle = doc.createElement('div');
        historyTitle.id = 'yt-history-title';
        historyTitle.innerHTML = 'Đã xem gần đây';
        historyTitle.style.cssText = 'font-size: 15px; font-weight: 600; color: #fff; margin-top: 10px; border-bottom: 1px solid #333; padding-bottom: 8px; flex-shrink: 0;';

        var historyList = doc.createElement('div');
        historyList.id = 'yt-history-list';
        historyList.style.cssText = 'display: flex; flex-direction: column; gap: 8px; padding-bottom: 20px;';

        function renderHistory() {
            historyList.innerHTML = '';
            var history = getHistory();
            if (history.length === 0) {
                historyList.innerHTML = '<div style="color:#555; font-size:13px; font-style:italic;">Chưa có video nào...</div>';
                return;
            }
            history.forEach(function(item) {
                var historyItem = doc.createElement('div');
                historyItem.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 8px; background: #212121; border-radius: 8px; cursor: pointer; border: 1px solid transparent; transition: 0.2s;';
                historyItem.onmouseover = function() { this.style.borderColor = '#555'; };
                historyItem.onmouseout = function() { this.style.borderColor = 'transparent'; };
                
                var thumb = doc.createElement('img');
                thumb.src = 'https://img.youtube.com/vi/' + item.id + '/default.jpg';
                thumb.style.cssText = 'width: 60px; height: 45px; object-fit: cover; border-radius: 4px;';

                var info = doc.createElement('div');
                info.innerHTML = item.title;
                info.style.cssText = 'font-size: 13px; color: #ddd; flex: 1; word-break: break-all;';

                var delBtn = doc.createElement('div');
                delBtn.innerHTML = '🗑️';
                delBtn.style.cssText = 'padding: 5px; font-size: 14px; opacity: 0.6; cursor: pointer;';
                delBtn.onmouseover = function() { this.style.opacity = '1'; };
                delBtn.onmouseout = function() { this.style.opacity = '0.6'; };
                delBtn.onclick = function(e) {
                    e.stopPropagation(); 
                    if (confirm('Xóa video này khỏi lịch sử?')) {
                        removeFromHistory(item.id);
                        renderHistory();
                    }
                };

                historyItem.onclick = function() { loadVideo(item.id, item.title, false); };

                historyItem.appendChild(thumb);
                historyItem.appendChild(info);
                historyItem.appendChild(delBtn);
                historyList.appendChild(historyItem);
            });
        }

        function loadVideo(videoId, title, saveToHist) {
            if (!videoId) return;
            var currentOrigin = encodeURIComponent(window.location.origin);
            var iframe = getPersistentIframe();
            
            iframe.src = 'https://www.youtube-nocookie.com/embed/' + videoId + '?autoplay=1&rel=0&modestbranding=1&controls=1&playsinline=1&origin=' + currentOrigin;
            
            syncIframeToPlaceholder(videoPlaceholder);

            if (saveToHist !== false) {
                saveToHistory(videoId, title || ('Video: ' + videoId));
                renderHistory();
            }
            urlInput.value = ''; 
        }

        playBtn.onclick = function() {
            var url = urlInput.value.trim();
            if (!url) return;
            var videoId = extractVideoID(url);
            if (videoId) { loadVideo(videoId, 'Video: ' + videoId, true); } 
            else { alert('Link không hợp lệ!'); }
        };

        urlInput.addEventListener("keyup", function(event) {
            if (event.key === "Enter") { event.preventDefault(); playBtn.click(); }
        });

        content.appendChild(inputRow);
        content.appendChild(videoPlaceholder);
        content.appendChild(historyTitle);
        content.appendChild(historyList);
        
        appWrapper.appendChild(content);
        container.appendChild(appWrapper);

        renderHistory();

        // Kích hoạt đồng bộ Iframe
        setTimeout(function() {
            syncIframeToPlaceholder(videoPlaceholder);
        }, 100);
    });

    console.log('[App YouTube] Đã cài đặt Bản Đỉnh Cao (Xoay Ngang Toàn Màn & Không Nhảy)');
})();