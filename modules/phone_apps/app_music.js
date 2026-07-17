/**
 * Điện thoại nhỏ - Music APP v6.9 (The Absolute Masterpiece)
 * * TÍNH NĂNG MỚI: Auto-Migration (Tự động đồng bộ và thích ứng ngược Playlist từ v3, v4, v5)
 * * Kế thừa: Auto-Bypass VIP, Hybrid Engine, Lọc nguồn, SVG Cover, Smart Clean v2.0
 * * CẬP NHẬT: Thanh âm lượng Popup dọc + Thanh tua nhạc vuốt kéo mượt mà (Smooth Dragging)
 */

(function () {
    'use strict';

    function waitForPhoneSystem(cb) {
        if (window.parent.PhoneSystem) {
            cb();
        } else {
            setTimeout(function () { waitForPhoneSystem(cb); }, 100);
        }
    }

    waitForPhoneSystem(function () {
        console.log('[Music APP] Khởi tạo v6.9 (Smooth Drag Edition)');

        var APP_ID = 'music';
        var STORAGE_KEY = 'phone_music_v6'; 
        var AUDIO_ID = 'phone-music-audio';
        
        var DEFAULT_COVER = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9IiM3Nzc3NzciIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOiMyMjIyMjI7Ij48cGF0aCBkPSJNMTIgM3YxMC41NWMtLjU5LS4zNC0xLjI3LS41NS0yLS41NS0yLjIxIDAtNCAxLjc5LTQgNHMxLjc5IDQgNCA0IDQtMS43OSA0LTRWN2g0VjNoLTZ6Ii8+PC9zdmc+";

        function normalizeStr(str) {
            return str ? str.trim().toLowerCase() : '';
        }

        const MusicEngine = {
            sources: ['tencent', 'netease', 'kugou', 'kuwo'],
            
            fetchWithFallback: async function(rawUrl) {
                try {
                    const res = await fetch(rawUrl);
                    return await res.json();
                } catch (e) {
                    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(rawUrl)}`;
                    const resProxy = await fetch(proxyUrl);
                    return await resProxy.json();
                }
            },

            search: async function(keyword, page = 1, sourceFilter = 'all') {
                const normKeyword = normalizeStr(keyword);
                let allResults = [];
                
                let sourcesToSearch = this.sources;
                if (sourceFilter !== 'all') {
                    sourcesToSearch = [sourceFilter];
                }
                
                const searchPromises = sourcesToSearch.map(async (src) => {
                    try {
                        if (src === 'tencent') {
                            const url = `https://api.vkeys.cn/v2/music/tencent/search/song?word=${encodeURIComponent(normKeyword)}&page=${page}&num=20`;
                            const res = await this.fetchWithFallback(url);
                            if (res && res.data && Array.isArray(res.data)) {
                                return res.data.map(item => {
                                    let singerStr = 'Unknown';
                                    if (typeof item.singer === 'string') singerStr = item.singer;
                                    else if (Array.isArray(item.singer)) singerStr = item.singer.map(s => s.name || s).join(' / ');
                                    
                                    let coverUrl = item.cover;
                                    if (!coverUrl && item.albummid) coverUrl = `https://y.qq.com/music/photo_new/T002R300x300M000${item.albummid}.jpg`;
                                    if (coverUrl && coverUrl.startsWith('http:')) coverUrl = coverUrl.replace('http:', 'https:');

                                    return {
                                        id: item.mid || item.id,
                                        mid: item.mid, 
                                        name: item.song || item.songname || item.name || 'Unknown',
                                        singer: singerStr,
                                        cover: coverUrl || DEFAULT_COVER,
                                        source: 'tencent' 
                                    };
                                });
                            }
                        } 
                        else if (src === 'kugou') {
                            const url = `https://corsproxy.io/?${encodeURIComponent('http://mobilecdn.kugou.com/api/v3/search/song?format=json&keyword=' + normKeyword + '&page=' + page + '&pagesize=20&showtype=1')}`;
                            const res = await this.fetchWithFallback(url);
                            if (res && res.data && res.data.info && Array.isArray(res.data.info)) {
                                return res.data.info.map(item => {
                                    return {
                                        id: item.hash || item.filehash,
                                        mid: item.hash || item.filehash,
                                        name: item.songname || item.filename || 'Unknown',
                                        singer: item.singername || 'Unknown',
                                        cover: DEFAULT_COVER,
                                        source: 'kugou'
                                    };
                                });
                            }
                        }
                        else {
                            const url = `https://music-api.gdstudio.xyz/api.php?types=search&source=${src}&name=${encodeURIComponent(normKeyword)}&count=10&pages=${page}`;
                            const data = await this.fetchWithFallback(url);
                            if (data && Array.isArray(data)) {
                                return data.map(item => {
                                    let coverUrl = item.pic || item.cover || item.pic_url || item.cover_url || item.pic120;
                                    if (!coverUrl && item.al && item.al.picUrl) coverUrl = item.al.picUrl;
                                    if (!coverUrl && item.album && item.album.picUrl) coverUrl = item.album.picUrl;

                                    if (!coverUrl && item.id) {
                                        coverUrl = `https://api.injahow.cn/meting/?server=${src}&type=pic&id=${item.id}`;
                                    }

                                    if (coverUrl && !coverUrl.startsWith('data:')) {
                                        coverUrl = `https://wsrv.nl/?url=${encodeURIComponent(coverUrl)}`;
                                    }

                                    return {
                                        id: item.id || item.mid,
                                        mid: item.lyric_id || item.mid, 
                                        name: item.name || item.song || 'Unknown',
                                        singer: Array.isArray(item.artist) ? item.artist.map(a => a.name || a).join(' / ') : (item.artist || item.singer || 'Unknown'),
                                        cover: coverUrl || DEFAULT_COVER,
                                        source: src 
                                    };
                                });
                            }
                        }
                    } catch (err) {
                        console.warn(`[Multi-Engine] Lỗi nguồn ${src}`);
                    }
                    return [];
                });

                const resultsArray = await Promise.allSettled(searchPromises);
                
                resultsArray.forEach(res => {
                    if (res.status === 'fulfilled' && res.value.length > 0) {
                        res.value.forEach(song => {
                            if (!allResults.some(s => s.name === song.name && s.singer === song.singer)) {
                                allResults.push(song);
                            }
                        });
                    }
                });

                return allResults;
            },

            getUrl: async function(song) {
                const src = song.source || 'tencent';
                try {
                    if (src === 'tencent') {
                        const idParam = song.mid ? 'mid=' + song.mid : 'id=' + song.id;
                        const urlReq = `https://api.vkeys.cn/v2/music/tencent?${idParam}`;
                        const res = await this.fetchWithFallback(urlReq);
                        if (res && res.data && res.data.url) return res.data.url;
                    } 
                    else {
                        const urlReq = `https://music-api.gdstudio.xyz/api.php?types=url&source=${src}&id=${song.id}&br=320`;
                        const data = await this.fetchWithFallback(urlReq);
                        if (data && data.url && !data.url.includes("music.163.com/404")) return data.url;
                    }
                } catch (e) {}
                return null;
            },

            getLyric: async function(song) {
                const src = song.source || 'tencent';
                try {
                    if (src === 'tencent') {
                        const idParam = song.mid ? 'mid=' + song.mid : 'id=' + song.id;
                        const urlReq = `https://api.vkeys.cn/v2/music/tencent/lyric?${idParam}`;
                        const res = await this.fetchWithFallback(urlReq);
                        if (res && res.data && res.data.lyric) return res.data.lyric;
                    } else {
                        const queryId = song.mid || song.id; 
                        const urlReq = `https://music-api.gdstudio.xyz/api.php?types=lyric&source=${src}&id=${queryId}`;
                        const data = await this.fetchWithFallback(urlReq);
                        if (data && data.lyric) return data.lyric;
                    }
                } catch (e) {}
                return null;
            }
        };

        var THEME_VARS = {
            light: '--primary: #ff7e5f; --gradient: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%); --bg: #f8f9fa; --card: #ffffff; --text: #333333; --textLight: #999999; --heart: #ff4757; --tabBg: rgba(255,255,255,0.95); --border: rgba(0,0,0,0.05); --modalBg: rgba(0,0,0,0.5);',
            dark: '--primary: #ff9a85; --gradient: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%); --bg: #121212; --card: #1e1e1e; --text: #ffffff; --textLight: #aaaaaa; --heart: #ff4757; --tabBg: rgba(30,30,30,0.95); --border: rgba(255,255,255,0.05); --modalBg: rgba(0,0,0,0.7);'
        };

        var I = {
            back: '<i class="ri-arrow-left-line" style="font-size:24px"></i>',
            search: '<i class="ri-search-line" style="font-size:20px"></i>',
            play: '<i class="ri-play-fill" style="font-size:32px"></i>',
            pause: '<i class="ri-pause-fill" style="font-size:32px"></i>',
            prev: '<i class="ri-skip-back-fill" style="font-size:24px"></i>',
            next: '<i class="ri-skip-forward-fill" style="font-size:24px"></i>',
            heart: '<i class="ri-heart-line" style="font-size:24px"></i>',
            heartFill: '<i class="ri-heart-fill" style="font-size:24px;color:var(--heart)"></i>',
            list: '<i class="ri-play-list-line" style="font-size:24px"></i>',
            down: '<i class="ri-arrow-down-s-line" style="font-size:32px"></i>',
            music: '<img src="https://api.iconify.design/ri:netease-cloud-music-fill.svg?color=white" style="width:100%;height:100%">',
            x: '<i class="ri-close-line" style="font-size:24px"></i>',
            stop: '<i class="ri-stop-circle-line" style="font-size:24px"></i>',
            home: '<i class="ri-compass-3-line" style="font-size:24px"></i>',
            library: '<i class="ri-folder-music-line" style="font-size:24px"></i>',
            modeLoop: '<i class="ri-repeat-line" style="font-size:20px"></i>',
            modeOne: '<i class="ri-repeat-one-line" style="font-size:20px"></i>',
            modeShuffle: '<i class="ri-shuffle-line" style="font-size:20px"></i>',
            backToDesk: '<i class="ri-home-fill" style="font-size:22px"></i>',
            moon: '<i class="ri-moon-fill" style="font-size:22px"></i>',
            sun: '<i class="ri-sun-fill" style="font-size:22px"></i>',
            addList: '<i class="ri-add-line" style="font-size:22px"></i>',
            delete: '<i class="ri-delete-bin-line" style="font-size:18px"></i>',
            drag: '<i class="ri-menu-line" style="font-size:20px"></i>',
            volumeUp: '<i class="ri-volume-up-fill" style="font-size:20px"></i>',
            volumeMute: '<i class="ri-volume-mute-fill" style="font-size:20px"></i>'
        };

        var audio = window.parent.document.getElementById(AUDIO_ID);
        if (!audio) {
            audio = window.parent.document.createElement('audio');
            audio.id = AUDIO_ID;
            audio.style.display = 'none';
            window.parent.document.body.appendChild(audio);
        }

        // Cập nhật state thêm isDragging
        var state = { currentSong: null, isPlaying: false, queue: [], queueIndex: -1, queueName: '', favorites: [], playlists: [], history: [], playMode: 0, theme: 'light', volume: 1.0, lastVol: 1.0, isDragging: false };
        var doc = null, searchCache = [], lyrics = [], currentTab = 'home', pendingSongToAdd = null;
        var currentSearchSource = 'all';

        function load() {
            try {
                var s = localStorage.getItem(STORAGE_KEY);
                if (s) {
                    var d = JSON.parse(s);
                    state.favorites = d.favorites || []; state.playlists = d.playlists || []; state.history = d.history || [];
                    state.currentSong = d.currentSong || null; state.queue = d.queue || []; state.queueIndex = typeof d.queueIndex === 'number' ? d.queueIndex : -1;
                    state.queueName = d.queueName || ''; state.theme = d.theme || 'light';
                    state.volume = typeof d.volume === 'number' ? d.volume : 1.0;
                    audio.volume = state.volume;
                    return;
                }

                var oldKeys = ['phone_music_v5', 'phone_music_v4', 'phone_music_v3', 'phone_music'];
                for (var i = 0; i < oldKeys.length; i++) {
                    var oldDataStr = localStorage.getItem(oldKeys[i]);
                    if (oldDataStr) {
                        console.log(`[Music APP] Phát hiện dữ liệu từ phiên bản cũ (${oldKeys[i]}). Bắt đầu chuyển đổi...`);
                        var oldData = JSON.parse(oldDataStr);
                        var adaptSong = function(song) { if (!song) return null; if (!song.source) song.source = 'tencent'; return song; };
                        state.favorites = (oldData.favorites || []).map(adaptSong).filter(Boolean);
                        state.playlists = (oldData.playlists || []).map(function(pl) { return { id: pl.id || Date.now() + Math.random(), name: pl.name || 'Playlist', songs: (pl.songs || []).map(adaptSong).filter(Boolean) }; });
                        state.history = (oldData.history || []).map(adaptSong).filter(Boolean);
                        state.theme = oldData.theme || 'light';
                        save();
                        localStorage.removeItem(oldKeys[i]);
                        if (window.parent && window.parent.toastr) { window.parent.toastr.success('Đã khôi phục và tối ưu hóa Playlist từ phiên bản cũ!'); }
                        break;
                    }
                }
            } catch (e) { console.error('[Music APP] Lỗi khi tải hoặc đồng bộ dữ liệu:', e); }
        }

        function save() {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ favorites: state.favorites, playlists: state.playlists, history: state.history.slice(0, 50), currentSong: state.currentSong, queue: state.queue, queueIndex: state.queueIndex, queueName: state.queueName, theme: state.theme, volume: state.volume })); } catch (e) {}
        }
        
        load();
        if (audio.src && !audio.paused) state.isPlaying = true;

        function getThemeCSS() { return ':root, #music-app { ' + THEME_VARS[state.theme] + ' }'; }
        function isFav(id) { return state.favorites.some(function (s) { return s.id === id; }); }
        
        function toggleFav(song) {
            var i = state.favorites.findIndex(function (s) { return s.id === song.id; });
            if (i >= 0) state.favorites.splice(i, 1); else state.favorites.unshift(song);
            save(); refreshFavBtns();
        }

        function addToHistory(song) {
            state.history = state.history.filter(function (s) { return s.id !== song.id; });
            state.history.unshift(song);
            if (state.history.length > 50) state.history = state.history.slice(0, 50);
            save();
        }

        function refreshFavBtns() {
            if (!doc) return;
            doc.querySelectorAll('[data-fav]').forEach(function (b) { b.innerHTML = isFav(b.dataset.fav) ? I.heartFill : I.heart; });
        }

        function formatTime(s) {
            if (!s || isNaN(s)) return '0:00';
            var m = Math.floor(s / 60), sec = Math.floor(s % 60);
            return m + ':' + (sec < 10 ? '0' : '') + sec;
        }

        function toggleTheme() {
            state.theme = state.theme === 'light' ? 'dark' : 'light';
            save();
            var styleEl = doc.getElementById('theme-style');
            if (styleEl) styleEl.textContent = getThemeCSS();
            var btn = doc.getElementById('theme-btn');
            if (btn) btn.innerHTML = state.theme === 'dark' ? I.sun : I.moon;
        }

        async function playSong(song, context, contextName, indexInContext) {
            state.currentSong = song; state.isPlaying = true;
            if (context && context.length > 0) { state.queue = context.slice(); state.queueIndex = indexInContext || 0; state.queueName = contextName || ''; }
            addToHistory(song); save(); updateUI();

            let url = await MusicEngine.getUrl(song);
            let actualSongForLyric = song;

            if (!url) {
                if (window.parent.toastr) window.parent.toastr.info(`Bài hát VIP. Đang tự động tìm nguồn thay thế...`);
                const mainSinger = (song.singer || '').split('/')[0].trim();
                const fallbackQuery = `${song.name} ${mainSinger}`.trim();
                const fallbackSources = MusicEngine.sources.filter(s => s !== song.source);
                for (let src of fallbackSources) {
                    try {
                        const results = await MusicEngine.search(fallbackQuery, 1, src);
                        if (results && results.length > 0) {
                            const fallbackUrl = await MusicEngine.getUrl(results[0]);
                            if (fallbackUrl) { url = fallbackUrl; actualSongForLyric = results[0]; if (window.parent.toastr) window.parent.toastr.success(`Đã tự động mượn nhạc từ nguồn: ${src.toUpperCase()}`); break; }
                        }
                    } catch (e) { continue; }
                }
            }

            if (url) { audio.src = url; audio.play().catch(function (e) { console.log('Phát thất bại:', e); }); fetchLyrics(actualSongForLyric); } 
            else { if (window.parent.toastr) window.parent.toastr.error(`Đã quét mọi nguồn nhưng bài này khóa VIP toàn mạng. Bỏ qua.`); playNext(); }
        }

        function togglePlay() {
            if (!state.currentSong) return;
            if (state.isPlaying) audio.pause(); else audio.play();
        }

        function toggleMode() {
            state.playMode = (state.playMode + 1) % 3;
            var modeName = ['Lặp danh sách', 'Lặp một bài', 'Phát ngẫu nhiên'][state.playMode];
            if (window.parent.toastr) window.parent.toastr.info('Chế độ phát: ' + modeName);
            updateUI();
        }

        function playNext(auto) {
            if (state.queue.length === 0) return;
            if (auto && state.playMode === 1) { audio.currentTime = 0; audio.play(); return; }
            if (state.playMode === 2) {
                var nextIndex = Math.floor(Math.random() * state.queue.length);
                if (state.queue.length > 1 && nextIndex === state.queueIndex) nextIndex = (nextIndex + 1) % state.queue.length;
                state.queueIndex = nextIndex;
            } else { state.queueIndex = (state.queueIndex + 1) % state.queue.length; }
            playSong(state.queue[state.queueIndex], state.queue, state.queueName, state.queueIndex);
        }

        function playPrev() {
            if (state.queue.length === 0) return;
            if (state.playMode === 2) state.queueIndex = Math.floor(Math.random() * state.queue.length);
            else state.queueIndex = (state.queueIndex - 1 + state.queue.length) % state.queue.length;
            playSong(state.queue[state.queueIndex], state.queue, state.queueName, state.queueIndex);
        }

        function playFromQueue(index) {
            if (index < 0 || index >= state.queue.length) return;
            state.queueIndex = index;
            playSong(state.queue[index], state.queue, state.queueName, index);
        }

        function stopMusic() {
            audio.pause(); audio.src = ''; state.currentSong = null; state.isPlaying = false; state.queue = []; state.queueIndex = -1;
            save(); updateUI();
        }

        function seekTo(pct) {
            if (!audio.duration) return;
            audio.currentTime = (pct / 100) * audio.duration;
        }

        async function fetchLyrics(song) {
            lyrics = [];
            var el = doc ? doc.getElementById('lyric') : null;
            if (el) el.textContent = '♪ Đang tải lời bài hát...';

            const rawLyric = await MusicEngine.getLyric(song);
            if (rawLyric) {
                var lines = rawLyric.split('\n'), re = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;
                lines.forEach(function (line) {
                    var matches = [], match;
                    while ((match = re.exec(line)) !== null) matches.push(match);
                    re.lastIndex = 0;
                    var text = line.replace(re, '').trim();
                    if (matches.length && text) { matches.forEach(m => lyrics.push({ time: parseInt(m[1]) * 60 + parseInt(m[2]) + parseInt(m[3]) / 1000, text: text })); }
                });
                lyrics.sort((a, b) => a.time - b.time);
                if (el && lyrics.length) el.textContent = lyrics[0].text;
                else if (el) el.textContent = '♪ Không có lời bài hát';
            } else if (el) el.textContent = '♪ Không có lời bài hát';
        }

        function updateLyric(time) {
            if (!lyrics.length || !doc) return;
            var el = doc.getElementById('lyric');
            if (!el) return;
            var cur = lyrics[0];
            for (var i = lyrics.length - 1; i >= 0; i--) { if (time >= lyrics[i].time) { cur = lyrics[i]; break; } }
            if (cur && el.textContent !== cur.text) el.textContent = cur.text;
        }

        function updateUI() {
            if (!doc) return;
            var song = state.currentSong, hasSong = !!song;
            var mini = doc.getElementById('mini'), content = doc.getElementById('content');
            if (mini) mini.style.display = hasSong ? 'flex' : 'none';
            if (content) content.style.paddingBottom = hasSong ? '114px' : '50px';

            if (hasSong) {
                setById('mini-title', song.name); setImgById('mini-cover', song.cover); setHtmlById('mini-play', state.isPlaying ? I.pause : I.play);
                setById('full-title', song.name); setById('full-artist', song.singer); setImgById('full-cover', song.cover); setBgById('full-bg', song.cover); setHtmlById('full-play', state.isPlaying ? I.pause : I.play);
                var modeBtn = doc.getElementById('mode-btn'); if (modeBtn) { modeBtn.innerHTML = state.playMode === 1 ? I.modeOne : (state.playMode === 2 ? I.modeShuffle : I.modeLoop); modeBtn.style.color = state.playMode === 0 ? 'var(--textLight)' : 'var(--primary)'; }
                var favBtn = doc.getElementById('full-fav'); if (favBtn) { favBtn.dataset.fav = song.id; favBtn.innerHTML = isFav(song.id) ? I.heartFill : I.heart; }
                setById('queue-info', state.queueName ? state.queueName.toUpperCase() : 'PLAYING FROM LIBRARY');
            }
        }

        function setById(id, val) { var e = doc.getElementById(id); if (e) e.textContent = val; }
        function setHtmlById(id, val) { var e = doc.getElementById(id); if (e) e.innerHTML = val; }
        function setImgById(id, val) { var e = doc.getElementById(id); if (e) { e.onerror = function() { this.onerror = null; this.src = DEFAULT_COVER; }; e.src = val || DEFAULT_COVER; } }
        function setBgById(id, val) { var e = doc.getElementById(id); if (e) e.style.backgroundImage = "url('" + val + "'), url('" + DEFAULT_COVER + "')"; }

        // Bỏ qua update UI khi đang kéo thả (isDragging)
        function updateProgress() {
            if (!audio.duration || !doc || state.isDragging) return;
            var pct = (audio.currentTime / audio.duration) * 100;
            var miniProg = doc.getElementById('mini-prog'), fill = doc.getElementById('prog-fill'), thumb = doc.getElementById('prog-thumb'), cur = doc.getElementById('time-cur'), total = doc.getElementById('time-total');
            if (miniProg) miniProg.style.width = pct + '%';
            if (fill) fill.style.width = pct + '%';
            if (thumb) thumb.style.left = pct + '%';
            if (cur) cur.textContent = formatTime(audio.currentTime);
            if (total) total.textContent = formatTime(audio.duration);
            updateLyric(audio.currentTime);
        }

        var searchKeyword = '', searchPage = 1, hasMoreResults = false;

        async function search(kw, page) {
            if (!kw || !doc) return;
            var content = doc.getElementById('content');
            if (!content) return;
            searchKeyword = kw; searchPage = page || 1;

            if (searchPage === 1) {
                var loadingText = currentSearchSource === 'all' ? 'Đang quét đa nền tảng...' : 'Đang tìm kiếm trên ' + currentSearchSource.toUpperCase() + '...';
                content.innerHTML = '<div style="padding:40px 20px;text-align:center"><div style="font-size:32px;animation:spin 1s linear infinite;opacity:0.5">⏳</div><div style="margin-top:10px;color:var(--textLight);">' + loadingText + '</div></div>';
                searchCache = [];
            }

            const results = await MusicEngine.search(kw, searchPage, currentSearchSource);
            if (results.length === 0) {
                if (searchPage === 1) content.innerHTML = '<div style="padding:60px 20px;text-align:center"><div style="color:var(--textLight);font-size:15px">Không tìm thấy kết quả</div></div>';
                hasMoreResults = false; return;
            }
            searchCache = searchCache.concat(results); hasMoreResults = true; renderSearchResults();
        }

        function renderSearchResults() {
            if (!doc || !searchCache.length) return;
            var content = doc.getElementById('content'); if (!content) return; var songs = searchCache;
            var html = '<div style="padding:20px 20px 120px"><div style="display:flex;align-items:center;margin-bottom:20px"><div id="back-home" style="cursor:pointer;color:var(--primary);margin-right:8px;display:flex;align-items:center;font-size:17px;font-weight:500">' + I.back + ' <span style="transform:translateY(-1px)">Trở lại</span></div></div>';
            html += '<h2 style="font-size:28px;font-weight:700;color:var(--text);margin:0 0 20px;letter-spacing:-0.5px">Kết quả tìm kiếm</h2><div style="display:flex;flex-direction:column;gap:0">';
            songs.forEach(function (s, i) {
                var isActive = state.currentSong && state.currentSong.id === s.id;
                html += '<div class="song-item touch-active" data-idx="' + i + '" style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:0.5px solid var(--border);cursor:pointer;position:relative">';
                html += '<img src="' + s.cover + '" onerror="this.onerror=null; this.src=\'' + DEFAULT_COVER + '\'" referrerpolicy="no-referrer" style="width:50px;height:50px;border-radius:8px;object-fit:cover;background:var(--border);flex-shrink:0">';
                html += '<div style="flex:1;min-width:0"><div style="font-weight:500;font-size:16px;color:' + (isActive ? 'var(--primary)' : 'var(--text)') + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:2px">' + s.name + '</div><div style="font-size:14px;color:var(--textLight)">' + s.singer + ' <span style="background:var(--card);padding:2px 4px;border-radius:4px;font-size:10px;text-transform:uppercase;">' + s.source + '</span></div></div>';
                if (isActive) html += '<div style="width:16px;color:var(--primary)">♬</div>';
                html += '<div class="add-to-pl" data-idx="' + i + '" style="cursor:pointer;display:flex;padding:8px;color:var(--textLight)">' + I.addList + '</div><div data-fav="' + s.id + '" style="cursor:pointer;display:flex;padding:8px;color:var(--textLight)">' + (isFav(s.id) ? I.heartFill : I.heart) + '</div></div>';
            });
            html += '</div>'; if (hasMoreResults) html += '<div id="load-more" style="text-align:center;padding:20px;color:var(--textLight);cursor:pointer;font-size:14px;font-weight:500">Tải thêm...</div>'; html += '</div>'; content.innerHTML = html;

            doc.getElementById('back-home').onclick = function () { switchTab(currentTab); };
            var loadMoreBtn = doc.getElementById('load-more'); if (loadMoreBtn) loadMoreBtn.onclick = function () { loadMoreBtn.textContent = 'Đang tải...'; search(searchKeyword, searchPage + 1); };
            doc.querySelectorAll('.song-item').forEach(el => el.onclick = function () { playSong(songs[parseInt(el.dataset.idx)], songs, 'Tìm kiếm: ' + searchKeyword, parseInt(el.dataset.idx)); });
            doc.querySelectorAll('.add-to-pl').forEach(el => el.onclick = function(e) { e.stopPropagation(); showAddToPlaylistModal(songs[parseInt(el.dataset.idx)]); });
            bindFavBtns(songs);
        }

        function showAddToPlaylistModal(song) {
            pendingSongToAdd = song; var modal = doc.getElementById('pl-modal'), list = doc.getElementById('pl-modal-list'); if(!modal || !list) return;
            var html = '';
            if (state.playlists.length === 0) { html = '<div style="text-align:center;color:var(--textLight);padding:20px">Chưa có danh sách phát nào.<br><br><button id="btn-create-pl-modal" style="padding:10px 20px;border:none;background:var(--primary);color:#fff;border-radius:20px;font-weight:600;cursor:pointer">Tạo mới</button></div>'; } 
            else { state.playlists.forEach((pl, i) => { html += '<div class="pl-modal-item touch-active" data-idx="' + i + '" style="padding:16px 0;border-bottom:1px solid var(--border);color:var(--text);font-size:16px;font-weight:500;cursor:pointer">' + pl.name + ' <span style="color:var(--textLight);font-size:14px">(' + pl.songs.length + ' bài)</span></div>'; }); }
            list.innerHTML = html; modal.style.display = 'flex'; doc.getElementById('close-pl-modal').onclick = function() { modal.style.display = 'none'; };
            var createBtn = doc.getElementById('btn-create-pl-modal');
            if(createBtn) createBtn.onclick = function() { var name = prompt('Nhập tên danh sách phát mới:'); if (name && name.trim()) { state.playlists.push({ id: Date.now(), name: name.trim(), songs: [] }); save(); showAddToPlaylistModal(pendingSongToAdd); } };
            list.querySelectorAll('.pl-modal-item').forEach(el => el.onclick = function() {
                var pl = state.playlists[parseInt(el.dataset.idx)];
                if (!pl.songs.some(s => s.id === pendingSongToAdd.id)) { pl.songs.push(pendingSongToAdd); save(); if (window.parent.toastr) window.parent.toastr.success('Đã thêm vào ' + pl.name); } 
                else if (window.parent.toastr) window.parent.toastr.info('Bài hát đã tồn tại trong ' + pl.name);
                modal.style.display = 'none'; if (currentTab === 'lib') renderLibrary(); 
            });
        }

        function renderHome() {
            if (!doc) return;
            var content = doc.getElementById('content'); if (!content) return;
            var colors = ['#f23d4e,#9e1b29', '#3e51b5,#283593', '#009688,#00695c', '#ff9800,#ef6c00', '#9c27b0,#6a1b9a'];
            var keywords = ['Châu Kiệt Luân', 'Taylor Swift', 'K-Pop', 'Anime', 'Billie Eilish'];
            var html = '<div style="padding:20px 20px 100px"><h3 style="font-size:22px;font-weight:700;margin:10px 0 16px;color:var(--text)">Duyệt thể loại</h3><div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:10px;margin:0 -20px 20px;padding:0 20px;-webkit-overflow-scrolling:touch">';
            keywords.forEach((k, i) => { html += '<div class="quick-search touch-active" data-kw="' + k + '" style="min-width:140px;height:100px;border-radius:12px;background:linear-gradient(135deg,' + colors[i % colors.length] + ');padding:12px;display:flex;align-items:flex-end;color:#fff;font-weight:700;font-size:16px;box-shadow:0 4px 12px rgba(0,0,0,0.15);cursor:pointer;flex-shrink:0">' + k + '</div>'; });
            html += '</div>';

            if (state.history.length > 0) {
                html += '<h3 style="font-size:22px;font-weight:700;margin:0 0 16px;color:var(--text)">Mới phát gần đây</h3><div style="display:flex;flex-direction:column">';
                state.history.slice(0, 10).forEach(function (s, i) {
                    var isActive = state.currentSong && state.currentSong.id === s.id;
                    html += '<div class="history-item touch-active" data-idx="' + i + '" style="display:flex;align-items:center;gap:16px;padding:10px 0;border-bottom:0.5px solid var(--border);cursor:pointer"><img src="' + s.cover + '" onerror="this.onerror=null; this.src=\'' + DEFAULT_COVER + '\'" referrerpolicy="no-referrer" style="width:56px;height:56px;border-radius:6px;object-fit:cover;background:var(--border)"><div style="flex:1;min-width:0"><div style="font-weight:500;font-size:16px;color:' + (isActive ? 'var(--primary)' : 'var(--text)') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px">' + s.name + '</div><div style="font-size:14px;color:var(--textLight)">' + s.singer + '</div></div><div class="add-to-pl-hist" data-idx="' + i + '" style="cursor:pointer;display:flex;padding:8px;color:var(--textLight)">' + I.addList + '</div></div>';
                });
                html += '</div>';
            } else { html += '<div style="background:var(--card);border-radius:16px;padding:30px;text-align:center;margin-top:20px"><div style="font-size:48px;color:var(--textLight);opacity:0.3;margin-bottom:10px">' + I.music + '</div><div style="color:var(--textLight);font-size:15px">Mau đi nghe nhạc thôi nào</div></div>'; }
            html += '</div>'; content.innerHTML = html;

            doc.querySelectorAll('.quick-search').forEach(el => el.onclick = function () { var input = doc.getElementById('search-input'); if (input) input.value = el.dataset.kw; search(el.dataset.kw); });
            doc.querySelectorAll('.history-item').forEach(el => el.onclick = function () { var idx = parseInt(el.dataset.idx); playSong(state.history[idx], state.history.slice(0, 20), 'Mới phát gần đây', idx); });
            doc.querySelectorAll('.add-to-pl-hist').forEach(el => el.onclick = function(e) { e.stopPropagation(); showAddToPlaylistModal(state.history[parseInt(el.dataset.idx)]); });
        }

        function renderLibrary() {
            if (!doc) return;
            var content = doc.getElementById('content'); if (!content) return;
            var html = '<div style="padding:20px 20px 120px"><h2 style="font-size:28px;font-weight:700;color:var(--text);margin:0 0 20px">Thư viện của tôi</h2><div id="lib-fav" class="touch-active" style="display:flex;align-items:center;padding:16px;background:var(--card);border-radius:12px;margin-bottom:20px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,0.02)"><div style="width:48px;height:48px;border-radius:8px;background:var(--gradient);display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;margin-right:16px">' + I.heartFill + '</div><div style="flex:1"><div style="font-size:16px;font-weight:600;color:var(--text)">Bài hát yêu thích</div><div style="font-size:13px;color:var(--textLight)">' + state.favorites.length + ' bài hát</div></div></div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h3 style="font-size:20px;font-weight:600;color:var(--text);margin:0">Danh sách phát</h3><div id="create-playlist" style="color:var(--primary);cursor:pointer;display:flex;align-items:center;gap:4px"><span style="font-size:20px">+</span> Tạo mới</div></div><div style="display:flex;flex-direction:column;gap:12px">';
            
            if (state.playlists.length === 0) html += '<div style="text-align:center;padding:30px 0;color:var(--textLight);font-size:14px">Chưa có danh sách phát nào</div>';
            else state.playlists.forEach((pl, i) => {
                var cover = pl.songs.length > 0 ? pl.songs[0].cover : DEFAULT_COVER;
                html += '<div class="lib-playlist touch-active" data-idx="' + i + '" style="display:flex;align-items:center;padding:12px;background:var(--card);border-radius:12px;cursor:pointer;position:relative;box-shadow:0 2px 10px rgba(0,0,0,0.02)"><img src="' + cover + '" onerror="this.onerror=null; this.src=\'' + DEFAULT_COVER + '\'" referrerpolicy="no-referrer" style="width:48px;height:48px;border-radius:6px;object-fit:cover;margin-right:16px;background:var(--border)"><div style="flex:1;min-width:0"><div style="font-size:16px;font-weight:600;color:var(--text);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + pl.name + '</div><div style="font-size:13px;color:var(--textLight)">' + pl.songs.length + ' bài hát</div></div><div class="delete-playlist" data-idx="' + i + '" style="padding:8px;color:var(--heart);cursor:pointer">' + I.delete + '</div></div>';
            });
            html += '</div></div>'; content.innerHTML = html;

            doc.getElementById('lib-fav').onclick = function() { renderSongList(state.favorites, 'Bài hát yêu thích', 'fav'); };
            doc.getElementById('create-playlist').onclick = function() { var name = prompt('Nhập tên danh sách phát mới:'); if (name && name.trim()) { state.playlists.push({ id: Date.now(), name: name.trim(), songs: [] }); save(); renderLibrary(); } };
            doc.querySelectorAll('.lib-playlist').forEach(el => el.onclick = function() { var pl = state.playlists[parseInt(el.dataset.idx)]; renderSongList(pl.songs, pl.name, 'playlist', pl.id); });
            doc.querySelectorAll('.delete-playlist').forEach(el => el.onclick = function(e) { e.stopPropagation(); if(confirm('Bạn có chắc chắn muốn xóa danh sách phát này?')) { state.playlists.splice(parseInt(el.dataset.idx), 1); save(); renderLibrary(); } });
        }

        function renderSongList(songs, title, type, playlistId) {
            if (!doc) return;
            var content = doc.getElementById('content');
            var canDrag = (type === 'playlist' || type === 'fav');
            var html = '<div style="padding:20px 20px 120px"><div style="display:flex;align-items:center;margin-bottom:20px"><div id="back-lib" style="cursor:pointer;color:var(--primary);margin-right:8px;display:flex;align-items:center;font-size:17px;font-weight:500">' + I.back + ' <span style="transform:translateY(-1px)">Trở lại</span></div></div><h2 style="font-size:32px;font-weight:800;color:var(--text);margin:0 0 24px;letter-spacing:-1px">' + title + '</h2>';

            if (songs.length === 0) html += '<div style="text-align:center;padding:60px 0;color:var(--textLight)">Tạm thời chưa có bài hát</div>';
            else html += '<div id="play-all" style="background:var(--card);color:var(--primary);padding:14px;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:24px">' + I.play + ' Phát tất cả</div>';

            html += '<div style="display:flex;flex-direction:column">';
            songs.forEach(function (s, i) {
                var isActive = state.currentSong && state.currentSong.id === s.id;
                html += '<div class="song-item touch-active" data-idx="' + i + '" ' + (canDrag ? 'draggable="true"' : '') + ' style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:0.5px solid var(--border);cursor:pointer;transition:background 0.2s">';
                if (canDrag) html += '<div class="drag-handle" style="color:var(--textLight);cursor:grab;padding-right:8px">' + I.drag + '</div>';
                html += '<img src="' + s.cover + '" onerror="this.onerror=null; this.src=\'' + DEFAULT_COVER + '\'" referrerpolicy="no-referrer" style="width:48px;height:48px;border-radius:6px;object-fit:cover;background:var(--border)"><div style="flex:1;min-width:0"><div style="font-weight:500;font-size:16px;color:' + (isActive ? 'var(--primary)' : 'var(--text)') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + s.name + '</div><div style="font-size:14px;color:var(--textLight)">' + s.singer + '</div></div>';
                if (type === 'playlist') html += '<div class="remove-from-pl" data-idx="' + i + '" style="cursor:pointer;padding:8px;color:var(--heart)">' + I.delete + '</div>';
                else { html += '<div class="add-to-pl-list" data-idx="' + i + '" style="cursor:pointer;padding:8px;color:var(--textLight)">' + I.addList + '</div><div data-fav="' + s.id + '" style="cursor:pointer;display:flex;padding:8px;color:var(--textLight)">' + (isFav(s.id) ? I.heartFill : I.heart) + '</div>'; }
                html += '</div>';
            });
            html += '</div></div>'; content.innerHTML = html;

            doc.getElementById('back-lib').onclick = function() { switchTab('lib'); };
            var playAllBtn = doc.getElementById('play-all'); if (playAllBtn && songs.length > 0) playAllBtn.onclick = function () { playSong(songs[0], songs, title, 0); };
            doc.querySelectorAll('.song-item').forEach(el => el.onclick = function() { playSong(songs[parseInt(el.dataset.idx)], songs, title, parseInt(el.dataset.idx)); });

            if (canDrag) {
                var dragSrcIdx = null;
                doc.querySelectorAll('.song-item').forEach(item => {
                    item.addEventListener('dragstart', function(e) { dragSrcIdx = parseInt(this.dataset.idx); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', this.dataset.idx); setTimeout(() => this.style.opacity = '0.4', 0); });
                    item.addEventListener('dragover', function(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; var rect = this.getBoundingClientRect(), relY = e.clientY - rect.top; if (relY < rect.height / 2) { this.style.borderTop = '2px solid var(--primary)'; this.style.borderBottom = '0.5px solid var(--border)'; } else { this.style.borderTop = 'none'; this.style.borderBottom = '2px solid var(--primary)'; } return false; });
                    item.addEventListener('dragleave', function(e) { this.style.borderTop = 'none'; this.style.borderBottom = '0.5px solid var(--border)'; });
                    item.addEventListener('drop', function(e) {
                        e.stopPropagation(); this.style.borderTop = 'none'; this.style.borderBottom = '0.5px solid var(--border)';
                        if (dragSrcIdx !== null) {
                            var fromIdx = dragSrcIdx, toIdx = parseInt(this.dataset.idx), rect = this.getBoundingClientRect(), relY = e.clientY - rect.top;
                            if (relY >= rect.height / 2) toIdx++; if (fromIdx < toIdx) toIdx--;
                            if (fromIdx !== toIdx) { var listToUpdate = type === 'playlist' ? state.playlists.find(p => p.id === playlistId).songs : state.favorites; var movedItem = listToUpdate.splice(fromIdx, 1)[0]; listToUpdate.splice(toIdx, 0, movedItem); save(); renderSongList(listToUpdate, title, type, playlistId); }
                        }
                        return false;
                    });
                    item.addEventListener('dragend', function(e) { this.style.opacity = '1'; doc.querySelectorAll('.song-item').forEach(el => { el.style.borderTop = 'none'; el.style.borderBottom = '0.5px solid var(--border)'; }); });
                });
            }

            if (type === 'playlist') doc.querySelectorAll('.remove-from-pl').forEach(el => el.onclick = function(e) { e.stopPropagation(); var pl = state.playlists.find(p => p.id === playlistId); if (pl) { pl.songs.splice(parseInt(el.dataset.idx), 1); save(); renderSongList(pl.songs, title, type, playlistId); } });
            else doc.querySelectorAll('.add-to-pl-list').forEach(el => el.onclick = function(e) { e.stopPropagation(); showAddToPlaylistModal(songs[parseInt(el.dataset.idx)]); });
            bindFavBtns(songs);
        }

        function renderQueue() {
            if (!doc) return;
            var content = doc.getElementById('content'); if (!content) return;
            var html = '<div style="padding:20px 20px 120px"><h2 style="font-size:32px;font-weight:800;color:var(--text);margin:0 0 24px;letter-spacing:-1px">Hàng đợi phát</h2>';

            if (state.queue.length === 0) { content.innerHTML = html + '<div style="text-align:center;padding:40px 0;color:var(--textLight)">Hàng đợi trống</div>'; return; }

            html += '<div style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center"><span style="font-size:15px;color:var(--textLight);font-weight:500">Chờ phát</span><div id="clear-queue" style="background:var(--border);color:var(--primary);padding:6px 14px;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer">Xóa sạch</div></div><div>';
            state.queue.forEach(function (s, i) {
                var isActive = i === state.queueIndex;
                html += '<div class="queue-item touch-active" data-idx="' + i + '" style="display:flex;align-items:center;gap:16px;padding:12px 16px;background:' + (isActive ? 'var(--card)' : 'transparent') + ';border-radius:12px;margin-bottom:2px;cursor:pointer">' + (isActive ? '<div style="width:20px;display:flex;justify-content:center"><div style="width:4px;height:4px;background:var(--primary);border-radius:50%"></div></div>' : '<div style="width:20px;text-align:center;color:var(--textLight);font-size:14px;font-weight:500">' + (i + 1) + '</div>') + '<img src="' + s.cover + '" onerror="this.onerror=null; this.src=\'' + DEFAULT_COVER + '\'" referrerpolicy="no-referrer" style="width:40px;height:40px;border-radius:4px;object-fit:cover;background:var(--border)"><div style="flex:1;min-width:0"><div style="font-weight:500;font-size:16px;color:' + (isActive ? 'var(--primary)' : 'var(--text)') + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + s.name + '</div><div style="font-size:14px;color:var(--textLight)">' + s.singer + '</div></div></div>';
            });
            html += '</div></div>'; content.innerHTML = html;

            var clearBtn = doc.getElementById('clear-queue'); if (clearBtn) clearBtn.onclick = function () { stopMusic(); switchTab('queue'); };
            doc.querySelectorAll('.queue-item').forEach(el => el.onclick = function () { playFromQueue(parseInt(el.dataset.idx)); });
        }

        function switchTab(tab) {
            if (!doc) return;
            currentTab = tab;
            doc.querySelectorAll('.tab').forEach(t => { t.style.color = (t.dataset.tab === tab) ? 'var(--primary)' : 'var(--textLight)'; });
            if (tab === 'home') renderHome(); else if (tab === 'lib') renderLibrary(); else if (tab === 'queue') renderQueue();
        }

        function bindFavBtns(songs) {
            if (!doc) return;
            doc.querySelectorAll('[data-fav]').forEach(btn => btn.onclick = function (e) { e.stopPropagation(); var song = songs.find(s => s.id == btn.dataset.fav) || state.currentSong; if (song) toggleFav(song); });
        }

        function showFullQueue() { if (!doc) return; var panel = doc.getElementById('queue-panel'); if (panel) { updateQueuePanel(); panel.style.transform = 'translateY(0)'; } }
        function hideFullQueue() { if (!doc) return; var panel = doc.getElementById('queue-panel'); if (panel) panel.style.transform = 'translateY(100%)'; }

        function updateQueuePanel() {
            if (!doc) return; var list = doc.getElementById('queue-list'); if (!list) return; var html = '';
            state.queue.forEach(function (s, i) { var isActive = i === state.queueIndex; html += '<div class="queue-panel-item" data-idx="' + i + '" style="display:flex;align-items:center;gap:12px;padding:12px 0;cursor:pointer;border-bottom:1px solid var(--border)"><div style="width:24px;text-align:center;color:' + (isActive ? 'var(--primary)' : 'var(--textLight)') + ';font-size:14px">' + (isActive ? '●' : (i + 1)) + '</div><img src="' + s.cover + '" onerror="this.onerror=null; this.src=\'' + DEFAULT_COVER + '\'" referrerpolicy="no-referrer" style="width:40px;height:40px;border-radius:6px;background:var(--border)"><div style="flex:1;overflow:hidden"><div style="font-size:16px;color:' + (isActive ? 'var(--primary)' : 'var(--text)') + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500">' + s.name + '</div><div style="font-size:14px;color:var(--textLight)">' + s.singer + '</div></div></div>'; });
            list.innerHTML = html; list.querySelectorAll('.queue-panel-item').forEach(el => el.onclick = function () { playFromQueue(parseInt(el.dataset.idx)); hideFullQueue(); });
        }

        function genHTML() {
            var hasSong = !!state.currentSong, songName = state.currentSong ? state.currentSong.name : 'Chưa phát', songSinger = state.currentSong ? state.currentSong.singer : '---', songCover = state.currentSong ? state.currentSong.cover : '', playIcon = state.isPlaying ? I.pause : I.play, favIcon = (state.currentSong && isFav(state.currentSong.id)) ? I.heartFill : I.heart, songId = state.currentSong ? state.currentSong.id : 0;
            
            // CẬP NHẬT CSS: Tắt hành vi cuộn dọc mặc định (touch-action: none) trên thanh tua nhạc, mở rộng Hitbox & Thêm hoạt ảnh scale khi đang kéo
            var html = '<div id="music-app" style="position:absolute;inset:0;background:var(--bg);display:flex;flex-direction:column;overflow:hidden;z-index:400;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif"><style id="theme-style">' + getThemeCSS() + '</style><link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet"><style>::-webkit-scrollbar{width:0px}.touch-active:active{opacity:0.6;transform:scale(0.98)}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} input[type=range]{-webkit-appearance:none;background:transparent;}input[type=range]::-webkit-slider-runnable-track{width:100%;height:4px;cursor:pointer;background:var(--border);border-radius:2px;}input[type=range]::-webkit-slider-thumb{height:12px;width:12px;border-radius:50%;background:#fff;cursor:pointer;-webkit-appearance:none;margin-top:-4px;box-shadow:0 2px 6px rgba(0,0,0,0.2);} .vol-group { position: relative; display: flex; align-items: center; justify-content: center; } .vol-slider-wrap { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%) translateY(10px); background: var(--tabBg); border: 1px solid var(--border); padding: 12px 0; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); opacity: 0; visibility: hidden; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; width: 36px; height: 110px; z-index: 1000; margin-bottom: 8px; } .vol-slider-wrap::before { content: \'\'; position: absolute; top: 100%; left: 0; width: 100%; height: 15px; background: transparent; } .vol-slider-wrap::after { content: \'\'; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border-width: 6px; border-style: solid; border-color: var(--tabBg) transparent transparent transparent; } .vol-group:hover .vol-slider-wrap { opacity: 1; visibility: visible; transform: translateX(-50%) translateY(0); } #mini-vol-slider { transform: rotate(-90deg); width: 80px; margin: 0; cursor: pointer; } #prog-bar { touch-action: none; position: relative; } #prog-bar::before { content: \'\'; position: absolute; top: -15px; bottom: -15px; left: 0; right: 0; z-index: 1; } #prog-thumb { z-index: 2; transition: transform 0.1s; } #prog-bar:active #prog-thumb { transform: translate(-50%,-50%) scale(1.4) !important; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }</style><div style="background:var(--bg);padding:40px 20px 10px;flex-shrink:0;display:flex;flex-direction:column;z-index:100"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><div id="go-desktop" style="width:32px;height:32px;border-radius:50%;background:var(--card);color:var(--textLight);display:flex;align-items:center;justify-content:center;cursor:pointer">' + I.backToDesk + '</div><h1 style="font-size:28px;font-weight:700;letter-spacing:-0.5px;color:var(--text);margin:0">Music</h1><div style="display:flex;gap:12px"><div id="theme-btn" style="width:32px;height:32px;border-radius:50%;background:var(--card);color:var(--textLight);display:flex;align-items:center;justify-content:center;cursor:pointer">' + (state.theme === 'dark' ? I.sun : I.moon) + '</div><div id="stop-btn" style="width:32px;height:32px;border-radius:50%;background:var(--card);color:var(--heart);display:flex;align-items:center;justify-content:center;cursor:pointer">' + I.stop + '</div></div></div><div style="background:var(--card);height:36px;border-radius:10px;padding:0 12px;display:flex;align-items:center;box-shadow:inset 0 0 0 1px var(--border)"><span style="color:var(--textLight);margin-right:8px;display:flex;transform:scale(0.9)">' + I.search + '</span><input type="text" id="search-input" style="background:transparent;flex:1;outline:none;border:none;font-size:15px;color:var(--text);font-weight:400" placeholder="Tìm kiếm bài hát, ca sĩ..."></div>';
            
            html += '<div style="display:flex;gap:8px;overflow-x:auto;margin-top:10px;padding-bottom:4px;-webkit-overflow-scrolling:touch" id="source-filters">';
            var srcs = [{id:'all', name:'Tất cả'}, {id:'tencent', name:'Tencent'}, {id:'netease', name:'Netease'}, {id:'kugou', name:'Kugou'}, {id:'kuwo', name:'Kuwo'}];
            srcs.forEach(function(s) {
                var isActive = s.id === currentSearchSource;
                var bg = isActive ? 'var(--primary)' : 'var(--card)';
                var col = isActive ? '#fff' : 'var(--textLight)';
                var border = isActive ? 'none' : '1px solid var(--border)';
                html += `<div class="src-chip touch-active" data-src="${s.id}" style="padding:4px 12px;border-radius:16px;background:${bg};color:${col};border:${border};font-size:12px;font-weight:600;white-space:nowrap;flex-shrink:0;cursor:pointer">${s.name}</div>`;
            });
            html += '</div></div>';

            html += '<div id="content" style="flex:1;overflow-y:auto;padding-bottom:' + (hasSong ? '114px' : '64px') + ';background:var(--bg)"></div>';
            
            html += '<div id="mini" style="position:absolute;bottom:64px;left:10px;right:10px;height:60px;background:var(--tabBg);backdrop-filter:blur(20px);border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);display:' + (hasSong ? 'flex' : 'none') + ';align-items:center;padding:0 12px;z-index:500;cursor:pointer;border:1px solid var(--border)"><div id="mini-prog" style="position:absolute;bottom:0;left:12px;right:12px;height:2px;background:var(--border);border-radius:1px;overflow:hidden"><div id="prog-fill" style="height:100%;background:var(--primary);width:0"></div></div><img id="mini-cover" src="' + songCover + '" onerror="this.onerror=null; this.src=\'' + DEFAULT_COVER + '\'" referrerpolicy="no-referrer" style="width:40px;height:40px;border-radius:8px;object-fit:cover;margin-right:12px;background:var(--border);"><div style="flex:1;overflow:hidden;margin-right:10px"><div id="mini-title" style="font-size:15px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:2px">' + songName + '</div></div><div style="display:flex;gap:12px;align-items:center">';
            
            // HTML Vol Group (Popup ở trên)
            html += '<div class="vol-group" style="width:32px;height:32px;"><div id="mini-vol-icon" style="color:var(--text);cursor:pointer;display:flex;width:100%;height:100%;align-items:center;justify-content:center;">' + (state.volume > 0 ? I.volumeUp : I.volumeMute) + '</div><div class="vol-slider-wrap"><input type="range" id="mini-vol-slider" min="0" max="1" step="0.01" value="' + state.volume + '"></div></div>';
            
            html += '<div id="mini-play" style="color:var(--text);cursor:pointer;display:flex;width:32px;height:32px;align-items:center;justify-content:center;">' + playIcon + '</div><div id="mini-next" style="color:var(--text);cursor:pointer;display:flex;width:32px;height:32px;align-items:center;justify-content:center;">' + I.next + '</div></div></div>';

            html += '<div style="height:60px;background:var(--tabBg);backdrop-filter:blur(20px);display:flex;align-items:center;position:absolute;bottom:0;left:0;right:0;z-index:500;padding-bottom:10px;box-shadow:0 -1px 0 var(--border)"><div class="tab touch-active" data-tab="home" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;height:100%;cursor:pointer;color:var(--primary)"><div style="transform:scale(0.9)">' + I.home + '</div><div style="font-size:10px;font-weight:500">Khám phá</div></div><div class="tab touch-active" data-tab="lib" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;height:100%;cursor:pointer;color:var(--textLight)"><div style="transform:scale(0.9)">' + I.library + '</div><div style="font-size:10px;font-weight:500">Thư viện</div></div><div class="tab touch-active" data-tab="queue" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;height:100%;cursor:pointer;color:var(--textLight)"><div style="transform:scale(0.9)">' + I.list + '</div><div style="font-size:10px;font-weight:500">Hàng đợi</div></div></div><div id="full" style="position:absolute;inset:0;background:var(--bg);transform:translateY(100%);transition:transform 0.4s cubic-bezier(0.32,0.72,0,1);z-index:600;display:flex;flex-direction:column;overflow:hidden"><div id="full-bg" style="position:absolute;inset:0;background-size:cover;background-position:center;opacity:0.6;filter:blur(80px);transform:scale(1.2);background-image:url(\'' + songCover + '\')"></div><div style="position:absolute;inset:0;background:var(--tabBg);opacity:0.85;backdrop-filter:blur(60px)"></div><div style="position:relative;z-index:10;height:44px;margin-top:44px;display:flex;align-items:center;justify-content:center;padding:0 20px"><div id="full-close" style="position:absolute;left:50%;top:0;transform:translateX(-50%);width:40px;height:5px;background:var(--textLight);opacity:0.4;border-radius:3px;cursor:pointer"></div></div><div style="position:relative;z-index:10;flex:1;display:flex;align-items:center;justify-content:center;padding:20px 40px"><div style="width:100%;aspect-ratio:1/1;border-radius:24px;box-shadow:0 20px 50px -10px rgba(0,0,0,0.2);overflow:hidden;background:#333"><img id="full-cover" src="' + songCover + '" onerror="this.onerror=null; this.src=\'' + DEFAULT_COVER + '\'" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover"></div></div><div style="position:relative;z-index:10;padding:20px 32px 60px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:30px"><div style="flex:1;overflow:hidden;margin-right:20px"><div id="full-title" style="font-weight:700;font-size:24px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:4px">' + songName + '</div><div id="full-artist" style="font-size:18px;color:var(--textLight);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + songSinger + '</div></div><div id="full-fav" data-fav="' + songId + '" style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--primary)">' + favIcon + '</div></div><div style="margin-bottom:30px"><div id="prog-bar" style="height:4px;background:var(--border);border-radius:2px;cursor:pointer;position:relative;margin-bottom:8px"><div id="prog-fill" style="height:100%;background:var(--textLight);border-radius:2px;width:0"></div><div id="prog-thumb" style="position:absolute;top:50%;transform:translate(-50%,-50%);width:16px;height:16px;background:#fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.2);left:0;opacity:1"></div></div><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--textLight);font-weight:600;font-variant-numeric:tabular-nums"><span id="time-cur">0:00</span><span id="time-total">0:00</span></div></div><div style="display:flex;justify-content:space-between;align-items:center;padding:0 20px;margin-top:20px"><div id="mode-btn" style="cursor:pointer;padding:10px;color:var(--textLight);display:flex;align-items:center;justify-content:center">' + I.modeLoop + '</div><div id="prev-btn" style="cursor:pointer;color:var(--text);opacity:0.9;display:flex;align-items:center;justify-content:center">' + I.prev + '</div><div id="full-play" style="width:72px;height:72px;border-radius:50%;background:var(--gradient);box-shadow:0 10px 30px rgba(255,100,100,0.3);cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;transform:scale(1.1)">' + playIcon + '</div><div id="next-btn" style="cursor:pointer;color:var(--text);opacity:0.9;display:flex;align-items:center;justify-content:center">' + I.next + '</div><div id="show-queue" style="cursor:pointer;padding:10px;color:var(--textLight);display:flex;align-items:center;justify-content:center">' + I.list + '</div></div><div style="display:flex;align-items:center;padding:0 30px;margin-top:24px;gap:12px;"><div id="vol-icon" style="color:var(--textLight);cursor:pointer;display:flex;align-items:center;justify-content:center;width:24px;">' + (state.volume > 0 ? I.volumeUp : I.volumeMute) + '</div><input type="range" id="vol-slider" min="0" max="1" step="0.01" value="' + state.volume + '" style="flex:1;"></div><div id="lyric" style="text-align:center;margin-top:24px;font-size:13px;color:var(--textLight);opacity:0.6;height:20px;line-height:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 30px">♪ Đang tải lời bài hát...</div></div><div id="queue-panel" style="position:absolute;bottom:0;left:0;right:0;height:70%;background:var(--bg);border-radius:24px 24px 0 0;transform:translateY(100%);transition:transform 0.4s cubic-bezier(0.3,0,0,1);z-index:700;display:flex;flex-direction:column;box-shadow:0 -10px 40px rgba(0,0,0,0.1)"><div style="padding:20px;display:flex;justify-content:space-between;align-items:center"><div style="font-weight:700;font-size:18px;color:var(--text)">Danh sách chờ phát</div><div id="close-queue-panel" style="width:30px;height:30px;background:var(--border);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text)">' + I.down + '</div></div><div id="queue-list" style="flex:1;overflow-y:auto;padding:0 20px 40px"></div></div></div><div id="pl-modal" style="display:none;position:absolute;inset:0;background:var(--modalBg);z-index:1000;align-items:flex-end;justify-content:center"><div style="background:var(--bg);width:100%;max-height:60%;border-radius:20px 20px 0 0;padding:20px;display:flex;flex-direction:column;box-shadow:0 -10px 30px rgba(0,0,0,0.2)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h3 style="margin:0;color:var(--text);font-size:18px">Thêm vào Playlist</h3><div id="close-pl-modal" style="cursor:pointer;color:var(--textLight)">' + I.x + '</div></div><div id="pl-modal-list" style="overflow-y:auto;flex:1"></div></div></div></div>';
            return html;
        }

        function syncVolumeUI() {
            if (!doc) return;
            var v = state.volume;
            var iconHTML = v > 0 ? I.volumeUp : I.volumeMute;
            var mi = doc.getElementById('mini-vol-icon'), ms = doc.getElementById('mini-vol-slider');
            var fi = doc.getElementById('vol-icon'), fs = doc.getElementById('vol-slider');
            if (mi) mi.innerHTML = iconHTML; if (ms) ms.value = v;
            if (fi) fi.innerHTML = iconHTML; if (fs) fs.value = v;
        }

        function bindEvents() {
            if (!doc) return;
            
            doc.querySelectorAll('.src-chip').forEach(function(chip) {
                chip.onclick = function() {
                    doc.querySelectorAll('.src-chip').forEach(function(c) { c.style.background = 'var(--card)'; c.style.color = 'var(--textLight)'; c.style.border = '1px solid var(--border)'; });
                    chip.style.background = 'var(--primary)'; chip.style.color = '#fff'; chip.style.border = 'none';
                    currentSearchSource = chip.dataset.src; var kw = doc.getElementById('search-input').value.trim(); if (kw) search(kw, 1);
                };
            });

            var goDesktop = doc.getElementById('go-desktop'); if (goDesktop) goDesktop.onclick = function() { closeApp(); if (window.parent && window.parent.PhoneSystem) window.parent.PhoneSystem.goHome(); };
            var stopBtn = doc.getElementById('stop-btn'); if (stopBtn) stopBtn.onclick = stopMusic;
            var themeBtn = doc.getElementById('theme-btn'); if (themeBtn) themeBtn.onclick = toggleTheme;
            var searchInput = doc.getElementById('search-input'); if (searchInput) searchInput.onkeydown = function (e) { if (e.key === 'Enter') search(searchInput.value.trim()); };
            doc.querySelectorAll('.tab').forEach(t => t.onclick = function () { switchTab(t.dataset.tab); });

            var mini = doc.getElementById('mini');
            if (mini) mini.onclick = function (e) {
                var target = e.target, id = target.id; if (!id && target.parentElement) id = target.parentElement.id;
                if (target.closest('.vol-group')) {
                    e.stopPropagation();
                    if (target.closest('#mini-vol-icon')) { if (state.volume > 0) { state.lastVol = state.volume; state.volume = 0; } else { state.volume = state.lastVol || 1.0; } audio.volume = state.volume; syncVolumeUI(); save(); }
                    return;
                }
                if (id === 'mini-play') { e.stopPropagation(); togglePlay(); } else if (id === 'mini-next') { e.stopPropagation(); playNext(); } else { var full = doc.getElementById('full'); if (full) full.style.transform = 'translateY(0)'; }
            };

            var fullClose = doc.getElementById('full-close'); if (fullClose) fullClose.onclick = function () { var full = doc.getElementById('full'); if (full) full.style.transform = 'translateY(100%)'; };
            var fullPlay = doc.getElementById('full-play'); if (fullPlay) fullPlay.onclick = togglePlay;
            var prevBtn = doc.getElementById('prev-btn'); if (prevBtn) prevBtn.onclick = playPrev;
            var nextBtn = doc.getElementById('next-btn'); if (nextBtn) nextBtn.onclick = playNext;
            var fullFav = doc.getElementById('full-fav'); if (fullFav) fullFav.onclick = function () { if (state.currentSong) { toggleFav(state.currentSong); updateUI(); } };
            
            // XỬ LÝ DRAG MƯỢT MÀ CHO PROGRESS BAR
            var progBar = doc.getElementById('prog-bar');
            if (progBar) {
                var updateProgressVisual = function(clientX) {
                    var rect = progBar.getBoundingClientRect();
                    var pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
                    var fill = doc.getElementById('prog-fill'), thumb = doc.getElementById('prog-thumb'), cur = doc.getElementById('time-cur');
                    if (fill) fill.style.width = pct + '%';
                    if (thumb) thumb.style.left = pct + '%';
                    if (cur && audio.duration) cur.textContent = formatTime((pct / 100) * audio.duration);
                    return pct;
                };

                var handleMove = function(e) {
                    if (!state.isDragging) return;
                    e.preventDefault(); 
                    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
                    updateProgressVisual(clientX);
                };

                var handleEnd = function(e) {
                    if (!state.isDragging) return;
                    state.isDragging = false;
                    var clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
                    var pct = updateProgressVisual(clientX);
                    seekTo(pct);
                    doc.removeEventListener('mousemove', handleMove);
                    doc.removeEventListener('touchmove', handleMove);
                    doc.removeEventListener('mouseup', handleEnd);
                    doc.removeEventListener('touchend', handleEnd);
                };

                var handleStart = function(e) {
                    state.isDragging = true;
                    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
                    updateProgressVisual(clientX);
                    doc.addEventListener('mousemove', handleMove, {passive: false});
                    doc.addEventListener('touchmove', handleMove, {passive: false});
                    doc.addEventListener('mouseup', handleEnd);
                    doc.addEventListener('touchend', handleEnd);
                };

                progBar.addEventListener('mousedown', handleStart);
                progBar.addEventListener('touchstart', handleStart, {passive: true});
            }

            var showQueueBtn = doc.getElementById('show-queue'); if (showQueueBtn) showQueueBtn.onclick = showFullQueue;
            var closeQueuePanel = doc.getElementById('close-queue-panel'); if (closeQueuePanel) closeQueuePanel.onclick = hideFullQueue;
            var modeBtn = doc.getElementById('mode-btn'); if (modeBtn) modeBtn.onclick = toggleMode;

            var volSlider = doc.getElementById('vol-slider'), miniVolSlider = doc.getElementById('mini-vol-slider');
            function onSliderInput(e) { e.stopPropagation(); var v = parseFloat(this.value); audio.volume = v; state.volume = v; syncVolumeUI(); save(); }
            if (volSlider) volSlider.oninput = onSliderInput;
            if (miniVolSlider) miniVolSlider.oninput = onSliderInput;

            var volIcon = doc.getElementById('vol-icon');
            if (volIcon) {
                volIcon.onclick = function () {
                    if (state.volume > 0) { state.lastVol = state.volume; state.volume = 0; } else { state.volume = state.lastVol || 1.0; }
                    audio.volume = state.volume; syncVolumeUI(); save();
                };
            }

            audio.ontimeupdate = updateProgress;
            audio.onended = function () { state.isPlaying = false; updateUI(); playNext(true); };
            audio.onplay = function () { state.isPlaying = true; updateUI(); };
            audio.onpause = function () { state.isPlaying = false; updateUI(); };
        }

        function openApp() {
            var ps = window.parent ? window.parent.PhoneSystem : null;
            if (!ps || !ps.iframeWindow) { setTimeout(openApp, 200); return; }
            try { doc = ps.iframeWindow.document; } catch (e) { return; }

            var home = doc.getElementById('home-screen'); if (home) home.style.display = 'none';
            var container = doc.getElementById('app-container');
            if (!container) { var screen = doc.querySelector('.screen'); if (screen) { container = doc.createElement('div'); container.id = 'app-container'; container.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:300;pointer-events:none'; screen.appendChild(container); } }

            if (container) {
                container.innerHTML = genHTML(); container.style.pointerEvents = 'auto';
                setTimeout(function () { bindEvents(); switchTab(currentTab); if (audio.src && !audio.paused) state.isPlaying = true; updateUI(); }, 50);
            }
            var statusBar = doc.getElementById('status-bar'); if (statusBar) { statusBar.classList.remove('light'); statusBar.classList.add('dark'); }
        }

        function closeApp() {
            var ps = window.parent ? window.parent.PhoneSystem : null, iframeWindow = ps ? ps.iframeWindow : null;
            if (!iframeWindow) { doc = null; return; }
            try {
                var d = iframeWindow.document, container = d.getElementById('app-container');
                if (container) { container.innerHTML = ''; container.style.pointerEvents = 'none'; }
                var home = d.getElementById('home-screen'); if (home) home.style.display = 'block';
                var statusBar = d.getElementById('status-bar'); if (statusBar) { statusBar.classList.remove('dark'); statusBar.classList.add('light'); }
            } catch (e) {}
            doc = null;
        }

        window.parent.PhoneSystem.registerApp({ id: APP_ID, name: 'Music', icon: I.music, color: '#ff7e5f', order: 11 });
        window.parent.PhoneSystem.on('app-opened', function (data) { if (data.id === APP_ID) openApp(); });
        window.parent.PhoneSystem.on('go-home', closeApp);

        console.log('[Music APP] v6.9 (Smooth Drag Edition) đã tải');
    });
})();