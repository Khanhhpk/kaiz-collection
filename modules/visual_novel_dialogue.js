/**
 * Visual Novel Dialogue Beautifier v0.7.0.0
 * - Tiêm system prompt cấu trúc lời thoại @Tên@ vào SillyTavern (In-chat Depth 0)
 * - Tự động nhận diện giới tính @Tên(Nữ/Nam)@ và gán ảnh Waifu/Husbando từ neko.best
 * - Quản lý ảnh nhân vật từ 9 free Anime API + Local Upload + Kho Link + Crop Avatar + kho Local/URL lưu lại
 * - Render lời thoại/suy nghĩ kiểu Visual Novel với 7 theme cao cấp
 * - Tối ưu hóa hiệu năng toàn diện (GPU VRAM, CPU Caching, RAF Streaming, Zero-allocation DOM)
 */
(function () {
    'use strict';

    const PW = window.parent || window;
    const PD = PW.document;
    const SCRIPT_ID = 'vn-dialogue';
    const SCRIPT_VERSION = 'v0.7.0.0';
    const STORE_KEY = 'VNDialogue_Config_v2';

    // ========== DỌN DẸP TRƯỚC KHI KHỞI TẠO ==========
    ['vn-styles', 'vn-modal-overlay', 'vn-img-modal-overlay', 'vn-toast-container', 'vn-standalone-fab'].forEach(id => {
        const el = PD.getElementById(id);
        if (el) el.remove();
    });
    if (PW.FloatingMenuManager && typeof PW.FloatingMenuManager.unregisterButton === 'function') {
        PW.FloatingMenuManager.unregisterButton(SCRIPT_ID);
    }
    if (PD._vnObserver) { PD._vnObserver.disconnect(); delete PD._vnObserver; }
    if (PD._vnInjector) { clearTimeout(PD._vnInjector); delete PD._vnInjector; }
    if (PD._vnFinishRenderTimer) { clearTimeout(PD._vnFinishRenderTimer); delete PD._vnFinishRenderTimer; }
    if (PD._vnClickHook) {
        PD.removeEventListener('click', PD._vnClickHook, true);
        PD.removeEventListener('keydown', PD._vnClickHook, true);
        delete PD._vnClickHook;
    }
    if (PD._vnAvatarLightboxHook) {
        PD.body && PD.body.removeEventListener('click', PD._vnAvatarLightboxHook, true);
        delete PD._vnAvatarLightboxHook;
    }
    if (PD._vnImageErrorHook) {
        PD.body && PD.body.removeEventListener('error', PD._vnImageErrorHook, true);
        delete PD._vnImageErrorHook;
    }

    // ========== CẤU HÌNH MẶC ĐỊNH ==========
    const DEFAULT_CONFIG = {
        enabled: true,
        promptInjection: true,
        wrapRuleBlock: true,
        injectTarget: 'in_chat', // in_chat | in_prompt | after_prompt
        injectRole: 'system', // system | user | assistant
        injectDepth: 0, // Độ sâu khi chọn in_chat (0 = trước câu cuối)
        renderMode: true,
        showStandaloneIcon: true,
        standalonePos: { x: null, y: null },
        displayStyle: 'bubble', // bubble | compact | classic | cyberpunk | manga | royal | modern
        regexMode: 'at', // at | japanese | curly | brackets | colon | custom
        autoRegisterChars: true,
        autoAssignAvatar: false,
        dynamicContextImages: false,
        customRegex: '',
        cleanPatterns: '', // Để trống = giữ nguyên theo regex, không tự xóa
        customSizing: {
            avatarSize: 52,
            fontSize: 14.5,
            maxWidth: 78,
            imgQuality: 'smooth',
            fontFamily: 'default',
            fontFamilyCustom: '',
            textColor: 'default',
            textColorCustom: '#ffffff'
        },
        customPrompt: `[CHỈ ÁP DỤNG CHO BẢN DỊCH TIẾNG VIỆT]
[SYSTEM REQUIREMENT: STRICT DIALOGUE & THOUGHT FORMATTING]
Bạn PHẢI tuân thủ TUYỆT ĐỐI quy tắc định dạng dưới đây cho toàn bộ lời thoại và suy nghĩ nội tâm của tất cả nhân vật:
1. MỖI câu lời thoại hoặc suy nghĩ PHẢI được tách thành một dòng/đoạn riêng biệt, KHÔNG gộp chung với phần dẫn truyện hay hành động.
2. ĐỨNG ĐẦU mỗi dòng lời thoại hoặc suy nghĩ PHẢI có thẻ tên nhân vật theo cú pháp chính xác: @TênNhânVật@
   - Lời thoại nói ra miệng: @TênNhânVật@ "Nội dung lời thoại đặt trong ngoặc kép"
   - Suy nghĩ nội tâm: @TênNhânVật@ *Nội dung suy nghĩ đặt trong dấu hoa thị hoặc in nghiêng*
3. KHÔNG BỎ SÓT, KHÔNG QUÊN THẺ TÊN: Ngay cả khi nhân vật nói liên tiếp hoặc thoại ngắn, VẪN PHẢI gắn thẻ @TênNhânVật@ ở đầu dòng!
4. PHẦN DẪN TRUYỆN (mô tả hành động, bối cảnh, cảm xúc...): Viết bình thường thành các đoạn văn riêng biệt, TUYỆT ĐỐI KHÔNG gắn thẻ @TênNhânVật@.
5. NGHIÊM CẤM việc tạo thẻ cho mob/npc/quần chúng/không có tên rõ ràng. Nếu chỉ là các lời thoại của nhân vật phụ thì không cần tạo thẻ tên, cứ viết thẳng lời thoại.

[MẪU VÍ DỤ CHUẨN - HÃY TUÂN THỦ]:
Trời bắt đầu chuyển mưa lất phất, không khí lạnh dần.
@Kazumi@ "Thôi nào, mặc nhanh chiếc áo khoác này vào đi."
Kazumi nhẹ nhàng khoác chiếc áo lên vai anh, ánh mắt lộ rõ vẻ quan tâm.
@Itsuki@ *Sao cô ấy lại tốt với mình đến vậy chứ...*
@Itsuki@ "Cảm ơn em nhiều nhé, Kazumi."`,
        genderPrompt: `[QUY TẮC NHẬN DIỆN GIỚI TÍNH NHÂN VẬT MỚI (TỰ ĐỘNG GÁN ẢNH)]
Khi một nhân vật xuất hiện hoặc có lời thoại/suy nghĩ, bạn PHẢI ghi kèm giới tính vào bên trong thẻ tên theo định dạng chuẩn:
- Nhân vật nữ: @TênNhânVật(Nữ)@ hoặc @TênNhânVật(Waifu)@ (ví dụ: @Kazumi(Nữ)@, @Elena(Waifu)@)
- Nhân vật nam: @TênNhânVật(Nam)@ hoặc @TênNhânVật(Husbando)@ (ví dụ: @Itsuki(Nam)@, @Arthur(Husbando)@)
Quy tắc này giúp hệ thống tự động nhận diện và gán ảnh đại diện anime Waifu/Husbando phù hợp cho nhân vật!`,
        dynamicPrompt: `[QUY TẮC GẮN NHÃN ẢNH NGỮ CẢNH ĐỘNG (DYNAMIC CONTEXT IMAGES)]
Hiện tại, các nhân vật có danh sách nhãn cảm xúc/ngữ cảnh sau đây:
{{charTagsList}}

Khi nhân vật có lời thoại hoặc suy nghĩ, nếu ngữ cảnh hoặc cảm xúc khớp với một trong các nhãn trên, bạn HÃY viết kèm tên nhãn vào trong thẻ tên nhân vật theo định dạng: @TênNhânVật [TênNhãn]@ (hoặc có thêm giới tính nếu cần).
Ví dụ: @Kazumi [Ăn kem]@ "Món kem này ngon quá đi mất!" hoặc @Kazumi [buồn]@ *Sao anh ấy lại nói vậy với mình chứ...*
Nếu ngữ cảnh không khớp với nhãn nào trong danh sách, hoặc nhân vật ở trạng thái bình thường, hãy chỉ ghi tên nhân vật như bình thường.`,
        inchatImgPos: 'top', // top | bottom
        inchatImgMode: 'normal', // normal | always_full
        characters: {},
        favourites: [],
        linkLibrary: [] // Kho URL ảnh tự nhập, lưu lại để lần sau dùng lại
    };

    // ========== TIỆN ÍCH AN TOÀN, CLONE SÂU & ẢNH LOCAL INDEXEDDB ==========
    const VN_IDB_DB_NAME = 'VNDialogue_Images_v1';
    const VN_IDB_STORE = 'images';
    const VN_IDB_PREFIX = 'vn-idb://';
    const VN_BLANK_IMG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');
    const VN_IDB_OBJECT_URL_CACHE = {};
    const VN_IDB_PENDING = {};

    function cloneDeep(obj) {
        if (typeof structuredClone === 'function') {
            try { return structuredClone(obj); } catch (e) { }
        }
        return JSON.parse(JSON.stringify(obj));
    }

    function getDefaultConfig() {
        return cloneDeep(DEFAULT_CONFIG);
    }

    function normalizeConfig(input) {
        const base = getDefaultConfig();
        const parsed = input && typeof input === 'object' ? input : {};
        const cfg = Object.assign(base, parsed);
        cfg.standalonePos = Object.assign({}, DEFAULT_CONFIG.standalonePos, parsed.standalonePos || {});
        cfg.customSizing = Object.assign({}, DEFAULT_CONFIG.customSizing, parsed.customSizing || {});
        cfg.characters = Object.assign({}, parsed.characters || {});
        Object.keys(cfg.characters).forEach(k => {
            const ch = cfg.characters[k];
            if (ch && typeof ch === 'object') {
                ch.expressions = Array.isArray(ch.expressions) ? ch.expressions.filter(e => e && e.label && e.url) : [];
            }
        });
        cfg.favourites = Array.isArray(parsed.favourites) ? parsed.favourites.slice() : [];
        cfg.linkLibrary = Array.isArray(parsed.linkLibrary) ? parsed.linkLibrary.filter(Boolean).slice() : [];
        return cfg;
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[ch]));
    }

    function escapeAttr(value) {
        return escapeHtml(value).replace(/`/g, '&#96;');
    }

    function safeCssValue(value, fallback = '') {
        const v = String(value ?? '').trim();
        if (!v) return fallback;
        if (/[<>"'`;{}]/.test(v) || /url\s*\(|expression\s*\(/i.test(v)) return fallback;
        return v;
    }


    function safeInlineStyle(styleText) {
        const allowedProps = new Set([
            'color', 'background-color', 'font-style', 'font-weight', 'font-size',
            'text-decoration', 'text-shadow', 'opacity', 'letter-spacing',
            'font-variant', 'font-variant-ligatures'
        ]);
        const raw = String(styleText || '');
        if (!raw || /[<>`{}]/.test(raw) || /url\s*\(|expression\s*\(|javascript\s*:/i.test(raw)) return '';
        const parts = [];
        raw.split(';').forEach(part => {
            const idx = part.indexOf(':');
            if (idx <= 0) return;
            const prop = part.slice(0, idx).trim().toLowerCase();
            let val = part.slice(idx + 1).trim();
            if (!allowedProps.has(prop) || !val) return;
            if (prop === 'opacity') {
                const n = Number(val);
                if (!Number.isFinite(n)) return;
                val = String(Math.max(0, Math.min(1, n)));
            }
            if (/[<>"'`{};]/.test(val) || /url\s*\(|expression\s*\(|javascript\s*:/i.test(val)) return;
            parts.push(`${prop}: ${val}`);
        });
        return parts.join('; ');
    }

    function sanitizeInlineHtml(input) {
        // FREE HTML MODE: giữ nguyên HTML inline/block do SillyTavern/model sinh ra trong nội dung thoại.
        // Lưu ý: các phần khác như tên nhân vật, attribute, URL avatar vẫn được escape/safe ở nơi dùng.
        // Chỉ dùng chế độ này khi bạn tin nguồn nội dung chat/config, vì HTML tự do có thể mang rủi ro injection.
        return String(input ?? '');
    }

    function isLocalImageRef(url) {
        return typeof url === 'string' && url.startsWith(VN_IDB_PREFIX);
    }

    function isLegacyDataImage(url) {
        return typeof url === 'string' && /^data:image\//i.test(url);
    }

    function safeImageUrl(url) {
        if (!url || typeof url !== 'string') return '';
        const s = url.trim();
        if (!s) return '';
        if (isLocalImageRef(s) || isLegacyDataImage(s)) return s;
        try {
            const u = new URL(s, PW.location && PW.location.href ? PW.location.href : undefined);
            if (['http:', 'https:', 'blob:'].includes(u.protocol)) return u.href;
        } catch (e) { }
        return '';
    }

    function buildInitialSvgData(name) {
        const initial = escapeHtml(String(name || '?').charAt(0).toUpperCase() || '?');
        const color = safeCssValue((getCharCfg(name) || {}).color, safeCssValue(getNameColor(name), '#4f46e5'));
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f46e5"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs><rect width="220" height="220" rx="110" fill="${color.startsWith('linear-gradient') ? 'url(#g)' : escapeAttr(color)}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#fff" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif" font-size="92" font-weight="700">${initial}</text></svg>`;
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }


    // ========== CĂN CHỈNH KHUNG AVATAR THEO TỪNG NHÂN VẬT ==========
    function clampAvatarPercent(value, fallback = 50) {
        const n = Number(value);
        if (!Number.isFinite(n)) return fallback;
        return Math.max(0, Math.min(100, Math.round(n)));
    }

    function clampAvatarZoom(value, fallback = 100) {
        const n = Number(value);
        if (!Number.isFinite(n)) return fallback;
        return Math.max(50, Math.min(300, Math.round(n)));
    }

    function normalizeAvatarFit(value) {
        return value === 'contain' ? 'contain' : 'cover';
    }

    function getAvatarViewConfig(nameOrCfg) {
        const cfg = (typeof nameOrCfg === 'string') ? (getCharCfg(nameOrCfg) || {}) : (nameOrCfg || {});
        return {
            avatarPosX: clampAvatarPercent(cfg.avatarPosX, 50),
            avatarPosY: clampAvatarPercent(cfg.avatarPosY, 50),
            avatarZoom: clampAvatarZoom(cfg.avatarZoom, 100),
            avatarFit: normalizeAvatarFit(cfg.avatarFit)
        };
    }

    function getAvatarInlineStyle(nameOrCfg) {
        const v = getAvatarViewConfig(nameOrCfg);
        const scale = (v.avatarZoom / 100).toFixed(2);
        // Không đặt transform inline !important, để chế độ xem full ảnh có thể trả ảnh về kích thước/tỉ lệ gốc.
        return `object-position:${v.avatarPosX}% ${v.avatarPosY}% !important;--vn-avatar-zoom:${scale};`;
    }

    function applyAvatarViewToElement(el, nameOrCfg) {
        if (!el || !el.style) return;
        const v = getAvatarViewConfig(nameOrCfg);
        const scale = (v.avatarZoom / 100).toFixed(2);
        el.style.setProperty('object-position', `${v.avatarPosX}% ${v.avatarPosY}%`, 'important');
        const isCropPreview = el.classList && (el.classList.contains('vn-avatar-crop-img') || el.id === 'vn-char-avatar-live-preview');
        const isChatAvatar = el.classList && el.classList.contains('vn-avatar');
        if (isCropPreview) {
            el.style.setProperty('transform', `scale(${scale})`, 'important');
            el.style.setProperty('transform-origin', 'center center', 'important');
        } else if (isChatAvatar) {
            el.style.setProperty('--vn-avatar-zoom', scale);
            el.style.removeProperty('transform');
            el.style.removeProperty('transform-origin');
        } else {
            el.style.removeProperty('--vn-avatar-zoom');
            el.style.removeProperty('transform');
            el.style.removeProperty('transform-origin');
        }
        el.style.removeProperty('object-fit');
        el.dataset.vnAvatarFit = v.avatarFit;
        el.dataset.vnAvatarZoom = String(v.avatarZoom);
    }

    function setAvatarAdjustControls(cfg) {
        const v = getAvatarViewConfig(cfg || {});
        const x = PD.getElementById('vn-char-avatar-x');
        const y = PD.getElementById('vn-char-avatar-y');
        const zoom = PD.getElementById('vn-char-avatar-zoom');
        const fit = PD.getElementById('vn-char-avatar-fit');
        if (x) x.value = String(v.avatarPosX);
        if (y) y.value = String(v.avatarPosY);
        if (zoom) zoom.value = String(v.avatarZoom);
        if (fit) fit.value = v.avatarFit;
        updateAvatarAdjustPreview();
    }

    function readAvatarAdjustControls() {
        const x = PD.getElementById('vn-char-avatar-x');
        const y = PD.getElementById('vn-char-avatar-y');
        const zoom = PD.getElementById('vn-char-avatar-zoom');
        const fit = PD.getElementById('vn-char-avatar-fit');
        return {
            avatarPosX: clampAvatarPercent(x ? x.value : 50, 50),
            avatarPosY: clampAvatarPercent(y ? y.value : 50, 50),
            avatarZoom: clampAvatarZoom(zoom ? zoom.value : 100, 100),
            avatarFit: normalizeAvatarFit(fit ? fit.value : 'cover')
        };
    }

    function writeAvatarAdjustControls(nextCfg) {
        const v = getAvatarViewConfig(nextCfg || {});
        const x = PD.getElementById('vn-char-avatar-x');
        const y = PD.getElementById('vn-char-avatar-y');
        const zoom = PD.getElementById('vn-char-avatar-zoom');
        const fit = PD.getElementById('vn-char-avatar-fit');
        if (x) x.value = String(v.avatarPosX);
        if (y) y.value = String(v.avatarPosY);
        if (zoom) zoom.value = String(v.avatarZoom);
        if (fit) fit.value = v.avatarFit;
        updateAvatarAdjustPreview();
    }

    function updateAvatarAdjustPreview() {
        const cfg = readAvatarAdjustControls();
        const xVal = PD.getElementById('vn-char-avatar-x-val');
        const yVal = PD.getElementById('vn-char-avatar-y-val');
        const zoomVal = PD.getElementById('vn-char-avatar-zoom-val');
        const cropHint = PD.getElementById('vn-avatar-crop-pos-hint');
        if (xVal) xVal.textContent = cfg.avatarPosX + '%';
        if (yVal) yVal.textContent = cfg.avatarPosY + '%';
        if (zoomVal) zoomVal.textContent = cfg.avatarZoom + '%';
        if (cropHint) cropHint.textContent = `Vị trí khung: ngang ${cfg.avatarPosX}% · dọc ${cfg.avatarPosY}% · zoom ${cfg.avatarZoom}%`;

        const urlEl = PD.getElementById('vn-char-det-avatar-url');
        const rawUrl = urlEl ? urlEl.value.trim() : '';
        const safeUrl = rawUrl ? safeImageUrl(rawUrl) : '';
        const fallback = buildInitialSvgData(_currentEditChar || '?');
        const src = safeUrl ? resolveImageSrc(safeUrl, fallback) : fallback;

        ['vn-char-avatar-adjust-preview', 'vn-char-avatar-live-preview'].forEach(id => {
            const preview = PD.getElementById(id);
            if (!preview) return;
            preview.src = src;
            preview.dataset.origSrc = safeUrl || '';
            applyAvatarViewToElement(preview, cfg);
            if (isLocalImageRef(safeUrl)) hydrateLocalImageEl(preview, safeUrl);
        });

        const avatarImg = PD.getElementById('vn-char-det-avatar');
        if (avatarImg) applyAvatarViewToElement(avatarImg, cfg);
    }

    function setupAvatarCropEditor() {
        const stage = PD.getElementById('vn-avatar-crop-stage');
        if (!stage || stage.dataset.vnCropReady === '1') return;
        stage.dataset.vnCropReady = '1';
        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startCfg = null;

        const stopDrag = (e) => {
            dragging = false;
            stage.classList.remove('dragging');
            if (e && e.pointerId !== undefined && stage.releasePointerCapture) {
                try { stage.releasePointerCapture(e.pointerId); } catch (err) { }
            }
        };

        stage.addEventListener('pointerdown', e => {
            if (e.button !== undefined && e.button !== 0) return;
            dragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startCfg = readAvatarAdjustControls();
            stage.classList.add('dragging');
            if (stage.setPointerCapture) {
                try { stage.setPointerCapture(e.pointerId); } catch (err) { }
            }
            e.preventDefault();
        });

        stage.addEventListener('pointermove', e => {
            if (!dragging || !startCfg) return;
            const rect = stage.getBoundingClientRect();
            const base = Math.max(1, Math.min(rect.width || 1, rect.height || 1));
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            // Kéo ảnh sang phải nghĩa là chọn vùng ảnh lệch trái hơn, nên đảo chiều với object-position.
            writeAvatarAdjustControls({
                avatarPosX: clampAvatarPercent(startCfg.avatarPosX - (dx / base) * 100, startCfg.avatarPosX),
                avatarPosY: clampAvatarPercent(startCfg.avatarPosY - (dy / base) * 100, startCfg.avatarPosY),
                avatarZoom: startCfg.avatarZoom,
                avatarFit: startCfg.avatarFit
            });
            e.preventDefault();
        });

        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => stage.addEventListener(ev, stopDrag));

        stage.addEventListener('wheel', e => {
            const cfg = readAvatarAdjustControls();
            const step = e.shiftKey ? 5 : 10;
            const dir = e.deltaY < 0 ? 1 : -1;
            writeAvatarAdjustControls(Object.assign({}, cfg, {
                avatarZoom: clampAvatarZoom(cfg.avatarZoom + dir * step, cfg.avatarZoom)
            }));
            e.preventDefault();
        }, { passive: false });

        PD.querySelectorAll('[data-vn-crop-zoom]').forEach(btn => {
            if (btn.dataset.vnCropZoomBtnReady === '1') return;
            btn.dataset.vnCropZoomBtnReady = '1';
            btn.addEventListener('click', () => {
                const cfg = readAvatarAdjustControls();
                const delta = Number(btn.dataset.vnCropZoom || 0);
                writeAvatarAdjustControls(Object.assign({}, cfg, {
                    avatarZoom: clampAvatarZoom(cfg.avatarZoom + delta, cfg.avatarZoom)
                }));
            });
        });

        PD.querySelectorAll('[data-vn-crop-pos]').forEach(btn => {
            if (btn.dataset.vnCropBtnReady === '1') return;
            btn.dataset.vnCropBtnReady = '1';
            btn.addEventListener('click', () => {
                const parts = String(btn.dataset.vnCropPos || '50,50').split(',');
                const cfg = readAvatarAdjustControls();
                writeAvatarAdjustControls({
                    avatarPosX: clampAvatarPercent(parts[0], 50),
                    avatarPosY: clampAvatarPercent(parts[1], 50),
                    avatarZoom: cfg.avatarZoom,
                    avatarFit: cfg.avatarFit
                });
            });
        });
    }

    function getLocalImageId(ref) {
        return decodeURIComponent(String(ref || '').slice(VN_IDB_PREFIX.length));
    }

    function makeLocalImageRef(id) {
        return VN_IDB_PREFIX + encodeURIComponent(id);
    }

    function openVNImageDB() {
        return new Promise((resolve, reject) => {
            if (!PW.indexedDB) { reject(new Error('Trình duyệt không hỗ trợ IndexedDB.')); return; }
            const req = PW.indexedDB.open(VN_IDB_DB_NAME, 2);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(VN_IDB_STORE)) db.createObjectStore(VN_IDB_STORE, { keyPath: 'id' });
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error || new Error('Không mở được IndexedDB.'));
        });
    }

    async function putLocalImageBlob(blob, meta = {}) {
        const id = 'img_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
        const db = await openVNImageDB();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(VN_IDB_STORE, 'readwrite');
            tx.objectStore(VN_IDB_STORE).put({
                id,
                blob,
                name: meta.name || '',
                type: meta.type || blob.type || 'image/*',
                size: meta.size || blob.size || 0,
                lastModified: meta.lastModified || 0,
                createdAt: Date.now()
            });
            tx.oncomplete = () => { db.close(); resolve(makeLocalImageRef(id)); };
            tx.onerror = () => { db.close(); reject(tx.error || new Error('Không lưu được ảnh vào IndexedDB.')); };
        });
    }

    function dataUrlToBlob(dataUrl) {
        const parts = String(dataUrl).split(',');
        const meta = parts[0] || '';
        const mime = (meta.match(/data:([^;]+)/) || [])[1] || 'image/png';
        const bin = atob(parts[1] || '');
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        return new Blob([arr], { type: mime });
    }

    async function getLocalImageObjectUrl(ref) {
        if (!isLocalImageRef(ref)) return ref;
        if (VN_IDB_OBJECT_URL_CACHE[ref]) return VN_IDB_OBJECT_URL_CACHE[ref];
        if (VN_IDB_PENDING[ref]) return VN_IDB_PENDING[ref];
        VN_IDB_PENDING[ref] = (async () => {
            const db = await openVNImageDB();
            try {
                const rec = await new Promise((resolve, reject) => {
                    const tx = db.transaction(VN_IDB_STORE, 'readonly');
                    const req = tx.objectStore(VN_IDB_STORE).get(getLocalImageId(ref));
                    req.onsuccess = () => resolve(req.result || null);
                    req.onerror = () => reject(req.error || new Error('Không đọc được ảnh local.'));
                });
                if (!rec || !rec.blob) throw new Error('Ảnh local không còn tồn tại trong IndexedDB.');
                const objectUrl = URL.createObjectURL(rec.blob);
                VN_IDB_OBJECT_URL_CACHE[ref] = objectUrl;
                return objectUrl;
            } finally {
                db.close();
                delete VN_IDB_PENDING[ref];
            }
        })();
        return VN_IDB_PENDING[ref];
    }

    function resolveImageSrc(url, fallback = VN_BLANK_IMG) {
        const safe = safeImageUrl(url);
        if (!safe) return fallback;
        if (isLocalImageRef(safe)) {
            if (VN_IDB_OBJECT_URL_CACHE[safe]) {
                return VN_IDB_OBJECT_URL_CACHE[safe];
            }
            getLocalImageObjectUrl(safe).then(objectUrl => {
                PD.querySelectorAll('img[data-orig-src]').forEach(el => {
                    if (el.dataset.origSrc === safe) el.src = objectUrl;
                });
                PD.querySelectorAll('img[data-vn-local-ref]').forEach(el => {
                    if (el.dataset.vnLocalRef === safe) el.src = objectUrl;
                });
            }).catch(err => console.warn('[VN Dialogue] Không resolve được ảnh local:', err));
            return fallback;
        }
        return safe;
    }

    function hydrateLocalImageEl(el, ref) {
        if (!el || !isLocalImageRef(ref)) return;
        el.dataset.vnLocalRef = ref;
        getLocalImageObjectUrl(ref).then(objectUrl => {
            if (el.dataset.vnLocalRef === ref || el.dataset.origSrc === ref) el.src = objectUrl;
        }).catch(() => { if (el.classList) el.classList.add('vn-local-img-missing'); });
    }

    function clearVNImageDB() {
        return openVNImageDB().then(db => new Promise((resolve, reject) => {
            const tx = db.transaction(VN_IDB_STORE, 'readwrite');
            tx.objectStore(VN_IDB_STORE).clear();
            tx.oncomplete = () => {
                db.close();
                Object.keys(VN_IDB_OBJECT_URL_CACHE).forEach(k => { try { URL.revokeObjectURL(VN_IDB_OBJECT_URL_CACHE[k]); } catch (e) { } delete VN_IDB_OBJECT_URL_CACHE[k]; });
                resolve();
            };
            tx.onerror = () => { db.close(); reject(tx.error || new Error('Không xoá được IndexedDB ảnh.')); };
        })).catch(err => console.warn('[VN Dialogue] Không thể xoá IndexedDB ảnh:', err));
    }

    async function listLocalImageRecords() {
        const db = await openVNImageDB();
        try {
            const recs = await new Promise((resolve, reject) => {
                const tx = db.transaction(VN_IDB_STORE, 'readonly');
                const store = tx.objectStore(VN_IDB_STORE);
                const req = store.getAll ? store.getAll() : null;
                if (req) {
                    req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
                    req.onerror = () => reject(req.error || new Error('Không đọc được kho ảnh Local.'));
                } else {
                    const out = [];
                    const cursorReq = store.openCursor();
                    cursorReq.onsuccess = ev => {
                        const cur = ev.target.result;
                        if (cur) { out.push(cur.value); cur.continue(); }
                        else resolve(out);
                    };
                    cursorReq.onerror = () => reject(cursorReq.error || new Error('Không đọc được kho ảnh Local.'));
                }
            });
            return recs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        } finally {
            db.close();
        }
    }

    async function deleteLocalImageRef(ref) {
        if (!isLocalImageRef(ref)) return;
        const db = await openVNImageDB();
        try {
            await new Promise((resolve, reject) => {
                const tx = db.transaction(VN_IDB_STORE, 'readwrite');
                tx.objectStore(VN_IDB_STORE).delete(getLocalImageId(ref));
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error || new Error('Không xoá được ảnh Local.'));
            });
            if (VN_IDB_OBJECT_URL_CACHE[ref]) {
                try { URL.revokeObjectURL(VN_IDB_OBJECT_URL_CACHE[ref]); } catch (e) { }
                delete VN_IDB_OBJECT_URL_CACHE[ref];
            }
        } finally {
            db.close();
        }
    }

    function formatBytesVN(bytes) {
        const n = Number(bytes || 0);
        if (!Number.isFinite(n) || n <= 0) return '';
        if (n < 1024) return n + ' B';
        if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
        return (n / 1024 / 1024).toFixed(2) + ' MB';
    }

    async function migrateLegacyDataUrlImagesToIndexedDB() {
        let changed = false;
        try {
            for (const name of Object.keys(CFG.characters || {})) {
                const ch = CFG.characters[name];
                if (ch && isLegacyDataImage(ch.avatar)) {
                    ch.avatar = await putLocalImageBlob(dataUrlToBlob(ch.avatar), { name: `${name}.png` });
                    changed = true;
                }
            }
            if (Array.isArray(CFG.favourites)) {
                for (let i = 0; i < CFG.favourites.length; i++) {
                    if (isLegacyDataImage(CFG.favourites[i])) {
                        CFG.favourites[i] = await putLocalImageBlob(dataUrlToBlob(CFG.favourites[i]), { name: `favourite-${i}.png` });
                        changed = true;
                    }
                }
            }
            if (Array.isArray(CFG.linkLibrary)) {
                for (let i = 0; i < CFG.linkLibrary.length; i++) {
                    if (isLegacyDataImage(CFG.linkLibrary[i])) {
                        CFG.linkLibrary[i] = await putLocalImageBlob(dataUrlToBlob(CFG.linkLibrary[i]), { name: `link-library-${i}.png` });
                        changed = true;
                    }
                }
            }
            if (changed) {
                saveConfig(CFG);
                renderCharGrid && renderCharGrid();
                forceReRenderAll && forceReRenderAll();
                showToast('Đã chuyển ảnh Local cũ từ localStorage sang IndexedDB.', 'success', 4000);
            }
        } catch (err) {
            console.error('[VN Dialogue] Lỗi migrate ảnh local sang IndexedDB:', err);
            showToast('Không chuyển được một số ảnh Local cũ sang IndexedDB.', 'warning', 4500);
        }
    }

    function setupImageErrorFallback() {
        if (PD._vnImageErrorHook) {
            PD.body.removeEventListener('error', PD._vnImageErrorHook, true);
            delete PD._vnImageErrorHook;
        }
        PD._vnImageErrorHook = function (e) {
            const img = e.target;
            if (!img || !img.classList || !img.classList.contains('vn-avatar')) return;
            const name = img.dataset.vnFallbackName || img.getAttribute('alt') || '?';
            const wrap = PD.createElement('div');
            wrap.innerHTML = buildInitialHtml(name);
            const fallback = wrap.firstElementChild;
            if (fallback) img.replaceWith(fallback);
        };
        PD.body.addEventListener('error', PD._vnImageErrorHook, true);
    }

    // ========== QUẢN LÝ LƯU TRỮ (STORAGE) ==========
    function loadConfig() {
        try {
            const raw = localStorage.getItem(STORE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                // Tự động nâng cấp sang @Tên@ nếu đang dùng mặc định cũ ([Tên] hoặc 【Tên】) để chống nhiễu rác và CoT
                if (!parsed._migratedToAt) {
                    if (parsed.customPrompt && (parsed.customPrompt.includes('[TênNhânVật]') || parsed.customPrompt.includes('【TênNhânVật】'))) {
                        parsed.customPrompt = DEFAULT_CONFIG.customPrompt;
                    }
                    if (parsed.regexMode === 'brackets' || parsed.regexMode === 'japanese' || !parsed.regexMode) {
                        parsed.regexMode = 'at';
                    }
                    parsed._migratedToAt = true;
                }
                if (!parsed._migratedToStrongPromptV2) {
                    if (!parsed.customPrompt || parsed.customPrompt.includes('[ĐỊNH DẠNG LỜI THOẠI BẮT BUỘC]') || parsed.customPrompt.includes('[TênNhânVật]')) {
                        parsed.customPrompt = DEFAULT_CONFIG.customPrompt;
                    }
                    if (!parsed.genderPrompt || parsed.genderPrompt.includes('[QUY TẮC NHẬN DIỆN GIỚI TÍNH NHÂN VẬT MỚI]')) {
                        parsed.genderPrompt = DEFAULT_CONFIG.genderPrompt;
                    }
                    parsed._migratedToStrongPromptV2 = true;
                }
                if (!parsed._migratedToDynamicPromptV1) {
                    if (!parsed.dynamicPrompt) {
                        parsed.dynamicPrompt = DEFAULT_CONFIG.dynamicPrompt;
                    }
                    parsed._migratedToDynamicPromptV1 = true;
                }
                if (!parsed._migratedToVietnameseRuleV3) {
                    if (!parsed.customPrompt || !parsed.customPrompt.includes('NGHIÊM CẤM việc tạo thẻ cho mob/npc/quần chúng')) {
                        parsed.customPrompt = DEFAULT_CONFIG.customPrompt;
                    }
                    parsed._migratedToVietnameseRuleV3 = true;
                }
                return normalizeConfig(parsed);
            }
        } catch (e) { console.error('[VN Dialogue] Lỗi đọc config:', e); }
        return getDefaultConfig();
    }
    function saveConfig(cfg) {
        try {
            if (typeof _blockHtmlCache !== 'undefined' && _blockHtmlCache && _blockHtmlCache.clear) _blockHtmlCache.clear();
            if (typeof _parsedNameCache !== 'undefined' && _parsedNameCache && _parsedNameCache.clear) _parsedNameCache.clear();
            localStorage.setItem(STORE_KEY, JSON.stringify(cfg));
        } catch (e) {
            console.error('[VN Dialogue] Lỗi lưu config:', e);
            if (e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
                showToast('⚠️ localStorage đã đầy. Ảnh Local mới đã dùng IndexedDB; hãy xuất/xoá bớt cấu hình cũ có ảnh data URL nếu còn.', 'error');
            }
        }
    }

    let CFG = loadConfig();

    function updateSizingVars() {
        if (!PD || !PD.documentElement) return;
        const sz = CFG.customSizing || { avatarSize: 52, fontSize: 14.5, maxWidth: 78, imgQuality: 'smooth' };
        PD.documentElement.style.setProperty('--vn-avatar-size', sz.avatarSize + 'px');
        PD.documentElement.style.setProperty('--vn-font-size', sz.fontSize + 'px');
        PD.documentElement.style.setProperty('--vn-max-width', sz.maxWidth + '%');
        PD.documentElement.setAttribute('data-vn-img-quality', sz.imgQuality || 'smooth');
        PD.documentElement.setAttribute('data-vn-img-pos', CFG.inchatImgPos || 'top');
        PD.documentElement.setAttribute('data-vn-img-mode', CFG.inchatImgMode || 'normal');

        // Custom font family
        let fontStr = '';
        if (sz.fontFamily === 'serif') fontStr = "'Palatino Linotype', 'Book Antiqua', 'Cambria', 'Lora', 'Merriweather', 'Georgia', 'Times New Roman', serif";
        else if (sz.fontFamily === 'sans') fontStr = "'Inter', 'Roboto', 'Segoe UI', 'Arial', -apple-system, sans-serif";
        else if (sz.fontFamily === 'monospace') fontStr = "'Consolas', 'Courier New', 'Fira Code', monospace";
        else if (sz.fontFamily === 'comic') fontStr = "'Comic Sans MS', cursive, 'Chalkboard SE', sans-serif";
        else if (sz.fontFamily === 'system') fontStr = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
        else if (sz.fontFamily === 'custom' && sz.fontFamilyCustom) fontStr = sz.fontFamilyCustom;

        if (fontStr) {
            PD.documentElement.style.setProperty('--vn-custom-font', fontStr);
            PD.documentElement.setAttribute('data-vn-custom-font', '1');
        } else {
            PD.documentElement.style.removeProperty('--vn-custom-font');
            PD.documentElement.removeAttribute('data-vn-custom-font');
        }

        // Custom text color
        if (sz.textColorMode === 'per_char') {
            PD.documentElement.style.removeProperty('--vn-custom-color');
            PD.documentElement.removeAttribute('data-vn-custom-color');
        } else {
            let colorStr = '';
            if (sz.textColor === 'custom' && sz.textColorCustom) colorStr = sz.textColorCustom;
            else if (sz.textColor && sz.textColor !== 'default') colorStr = sz.textColor;

            if (colorStr) {
                PD.documentElement.style.setProperty('--vn-custom-color', colorStr);
                PD.documentElement.setAttribute('data-vn-custom-color', '1');
            } else {
                PD.documentElement.style.removeProperty('--vn-custom-color');
                PD.documentElement.removeAttribute('data-vn-custom-color');
            }
        }
    }
    updateSizingVars();

    // ========== HỆ THỐNG THÔNG BÁO (TOAST) ==========
    function showToast(msg, type = 'info', duration = 3000) {
        let tc = PD.getElementById('vn-toast-container');
        if (!tc) {
            tc = PD.createElement('div');
            tc.id = 'vn-toast-container';
            tc.style.cssText = 'position:fixed;top:20px;right:20px;z-index:2000000;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
            PD.body.appendChild(tc);
        }
        const colors = { info: '#3b82f6', success: '#10b981', warning: '#f59e0b', error: '#ef4444' };
        const t = PD.createElement('div');
        t.style.cssText = `background:${colors[type] || colors.info};color:#fff;padding:10px 16px;border-radius:10px;font-size:13px;font-weight:500;font-family:-apple-system,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.3);opacity:0;transform:translateX(20px);transition:all 0.3s;pointer-events:auto;max-width:280px;line-height:1.4;`;
        t.textContent = msg;
        tc.appendChild(t);
        requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateX(0)'; });
        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transform = 'translateX(20px)';
            setTimeout(() => t.remove(), 300);
        }, duration);
    }

    // ========== TẠO STYLE CSS ==========
    function injectStyles() {
        if (PD.getElementById('vn-styles')) return;
        const s = PD.createElement('style');
        s.id = 'vn-styles';
        s.textContent = `
/* ===== VN DIALOGUE BUBBLES ===== */
.vn-block {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin: 12px 0;
    animation: vn-slidein 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
}
.vn-block.vn-right {
    flex-direction: row-reverse;
}
@keyframes vn-slidein {
    from { opacity:0; transform: translateY(12px) scale(0.96); }
    to   { opacity:1; transform: translateY(0)    scale(1); }
}
/* ===== TẮT ANIMATION & TRANSITION KHI ĐANG STREAMING HOẶC RE-RENDER (CHỐNG NHẢY BÓNG) ===== */
.mes.is_streaming .vn-block,
.mes[is_streaming="true"] .vn-block,
.mes.streaming .vn-block,
.vn-block.vn-no-anim {
    animation: none !important;
    transform: none !important;
    opacity: 1 !important;
    transition: none !important;
}
.mes.is_streaming .vn-bubble,
.mes[is_streaming="true"] .vn-bubble,
.mes.streaming .vn-bubble,
.vn-block.vn-no-anim .vn-bubble {
    transition: none !important;
}
.mes.is_streaming .vn-avatar,
.mes[is_streaming="true"] .vn-avatar,
.mes.streaming .vn-avatar,
.vn-block.vn-no-anim .vn-avatar {
    transition: none !important;
}
.vn-avatar-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
}
.vn-avatar-viewport {
    width: var(--vn-avatar-size, 52px) !important;
    height: var(--vn-avatar-size, 52px) !important;
    border-radius: 50%;
    overflow: hidden;
    border: 2.5px solid rgba(255,255,255,0.3);
    box-shadow: 0 4px 14px rgba(0,0,0,0.4);
    background: #1e293b;
    flex-shrink: 0;
    transition: opacity 0.25s ease, box-shadow 0.25s ease, border-radius 0.25s ease;
}
.vn-avatar-viewport:hover {
    box-shadow: 0 6px 18px rgba(129,140,248,0.5);
}
.vn-avatar-viewport .vn-avatar {
    width: 100% !important;
    height: 100% !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    margin: 0 !important;
    display: block;
    transform: none;
    transform-origin: center center;
}
.vn-avatar-viewport:not([data-vn-avatar-zoom="100"]) .vn-avatar {
    transform: scale(var(--vn-avatar-zoom, 1));
}
.vn-avatar-viewport .vn-avatar:hover {
    box-shadow: none !important;
}
.vn-avatar {
    width: var(--vn-avatar-size, 52px) !important;
    height: var(--vn-avatar-size, 52px) !important;
    border-radius: 50%;
    object-fit: cover !important;
    border: 2.5px solid rgba(255,255,255,0.3);
    box-shadow: 0 4px 14px rgba(0,0,0,0.4);
    background: #1e293b;
    flex-shrink: 0;
    image-rendering: auto;
    transition: opacity 0.25s ease, box-shadow 0.25s ease, border-radius 0.25s ease;
}
.vn-avatar:hover {
    box-shadow: 0 6px 18px rgba(129,140,248,0.5);
}
.vn-avatar[data-vn-avatar-fit="contain"],
.vn-char-card img[data-vn-avatar-fit="contain"],
.vn-char-detail-avatar[data-vn-avatar-fit="contain"],
#vn-char-avatar-adjust-preview[data-vn-avatar-fit="contain"],
#vn-char-avatar-live-preview[data-vn-avatar-fit="contain"] {
    object-fit: contain !important;
    background: #111827 !important;
}
.vn-avatar-crop-editor {
    background: rgba(0,0,0,0.26);
    border: 1px solid rgba(129,140,248,0.24);
    border-radius: 16px;
    padding: 12px;
}
.vn-avatar-crop-layout {
    display: grid;
    grid-template-columns: minmax(190px, 240px) 1fr;
    gap: 16px;
    align-items: start;
}
.vn-avatar-crop-stage {
    position: relative;
    width: min(240px, 100%);
    aspect-ratio: 1 / 1;
    margin: 0 auto;
    overflow: hidden;
    border-radius: 18px;
    background: #020617;
    border: 1px solid rgba(148,163,184,0.22);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05), 0 12px 30px rgba(0,0,0,0.45);
    cursor: grab;
    touch-action: none;
    user-select: none;
}
.vn-avatar-crop-stage.dragging { cursor: grabbing; }
.vn-avatar-crop-stage::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
    background:
        linear-gradient(rgba(148,163,184,0.13) 1px, transparent 1px),
        linear-gradient(90deg, rgba(148,163,184,0.13) 1px, transparent 1px);
    background-size: 33.333% 33.333%;
}
.vn-avatar-crop-img {
    position: absolute;
    inset: 0;
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
    object-position: center center;
    transform-origin: center center;
    will-change: transform, object-position;
    display: block;
    pointer-events: none;
    -webkit-user-drag: none;
    user-select: none;
}
.vn-avatar-crop-frame {
    position: absolute;
    inset: 18px;
    z-index: 4;
    border-radius: 50%;
    pointer-events: none;
    border: 3px solid rgba(129,140,248,0.95);
    box-shadow:
        0 0 0 999px rgba(2,6,23,0.56),
        0 0 26px rgba(129,140,248,0.45),
        inset 0 0 0 1px rgba(255,255,255,0.45);
}
.vn-avatar-crop-crosshair {
    position: absolute;
    inset: 18px;
    z-index: 5;
    border-radius: 50%;
    pointer-events: none;
    background:
        linear-gradient(90deg, transparent calc(50% - 0.5px), rgba(255,255,255,0.5) 50%, transparent calc(50% + 0.5px)),
        linear-gradient(transparent calc(50% - 0.5px), rgba(255,255,255,0.5) 50%, transparent calc(50% + 0.5px));
    opacity: 0.75;
}
.vn-avatar-live-preview-wrap {
    width: 92px;
    height: 92px;
    border-radius: 50%;
    overflow: hidden;
    background: #111827;
    border: 3px solid rgba(129,140,248,0.58);
    box-shadow: 0 8px 24px rgba(0,0,0,0.45);
    flex-shrink: 0;
}
.vn-avatar-live-preview-wrap img {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
    transform-origin: center center;
    will-change: transform, object-position;
    display: block;
}
.vn-avatar-crop-tools {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
}
.vn-avatar-crop-preset-grid {
    display: grid;
    grid-template-columns: repeat(3, 30px);
    gap: 5px;
}
.vn-avatar-crop-preset-grid button {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    border: 1px solid rgba(148,163,184,0.28);
    background: rgba(15,23,42,0.9);
    color: #c4b5fd;
    cursor: pointer;
    font-size: 11px;
    line-height: 1;
}
.vn-avatar-crop-preset-grid button:hover {
    background: rgba(99,102,241,0.28);
    border-color: rgba(129,140,248,0.78);
    color: #fff;
}
@media (max-width: 620px) {
    .vn-avatar-crop-layout { grid-template-columns: 1fr; }
    .vn-avatar-crop-stage { width: min(260px, 100%); }
}
/* Chế độ 1: Siêu mịn & Khử răng cưa GPU (Default) */
html[data-vn-img-quality="smooth"] .vn-avatar,
html[data-vn-img-quality="smooth"] .vn-char-card img,
html[data-vn-img-quality="smooth"] .vn-char-detail-avatar,
html[data-vn-img-quality="smooth"] .vn-fav-thumb,
html[data-vn-img-quality="smooth"] .vn-img-thumb img {
    image-rendering: auto !important;
    filter: none;
}
/* Chế độ 2: Tăng cường sắc nét & Tương phản (Sharpness & Contrast) */
html[data-vn-img-quality="sharp"] .vn-avatar,
html[data-vn-img-quality="sharp"] .vn-char-card img,
html[data-vn-img-quality="sharp"] .vn-char-detail-avatar,
html[data-vn-img-quality="sharp"] .vn-fav-thumb,
html[data-vn-img-quality="sharp"] .vn-img-thumb img {
    image-rendering: auto !important;
    filter: contrast(1.08) saturate(1.08) brightness(1.02) !important;
}
/* Chế độ 3: Pixel Art / Retro 8-bit (Crisp-Edges / Pixelated) */
html[data-vn-img-quality="pixel"] .vn-avatar,
html[data-vn-img-quality="pixel"] .vn-char-card img,
html[data-vn-img-quality="pixel"] .vn-char-detail-avatar,
html[data-vn-img-quality="pixel"] .vn-fav-thumb,
html[data-vn-img-quality="pixel"] .vn-img-thumb img {
    image-rendering: -webkit-optimize-contrast !important;
    image-rendering: crisp-edges !important;
    image-rendering: pixelated !important;
    filter: contrast(1.05) !important;
}
/* Chế độ 4: Chuẩn tự nhiên (Standard HD) */
html[data-vn-img-quality="standard"] .vn-avatar,
html[data-vn-img-quality="standard"] .vn-char-card img,
html[data-vn-img-quality="standard"] .vn-char-detail-avatar,
html[data-vn-img-quality="standard"] .vn-fav-thumb,
html[data-vn-img-quality="standard"] .vn-img-thumb img {
    image-rendering: auto !important;
    filter: none !important;
}
.vn-avatar.vn-no-img {
    background: linear-gradient(135deg,#4f46e5,#7c3aed);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: calc(var(--vn-avatar-size, 52px) * 0.42) !important;
    font-weight: 700;
    color: #fff;
    font-family: -apple-system,sans-serif;
}
.vn-charname {
    display: none !important;
}
.vn-bubble {
    background: rgba(30,41,59,0.95);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 18px;
    padding: 13px 18px;
    max-width: var(--vn-max-width, 78%) !important;
    box-shadow: 0 4px 15px rgba(0,0,0,0.25);
    position: relative;
    font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    font-size: var(--vn-font-size, 14.5px) !important;
    line-height: 1.65;
    color: #f1f5f9;
    flex: 1;
}
.vn-bubble.vn-thought {
    background: rgba(15,23,42,0.8);
    border-style: dashed;
    border-color: rgba(148,163,184,0.35);
    font-style: italic;
    color: #cbd5e1;
}
.vn-bubble-tag {
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 6px;
    opacity: 0.9;
    font-family: -apple-system,sans-serif;
}
.vn-bubble-text {
    word-break: break-word;
}
/* Compact style */
.mes[data-vn-style="compact"] .vn-block {
    margin: 6px 0;
    gap: 8px;
}
.mes[data-vn-style="compact"] .vn-avatar { width: calc(var(--vn-avatar-size, 52px) * 0.75) !important; height: calc(var(--vn-avatar-size, 52px) * 0.75) !important; border-width: 1.5px; }
.mes[data-vn-style="compact"] .vn-avatar-viewport { width: calc(var(--vn-avatar-size, 52px) * 0.75) !important; height: calc(var(--vn-avatar-size, 52px) * 0.75) !important; border-width: 1.5px; }
.mes[data-vn-style="compact"] .vn-bubble { padding: 8px 14px; border-radius: 12px; }
.mes[data-vn-style="compact"] .vn-charname { font-size: 9.5px; }
/* Classic style */
.mes[data-vn-style="classic"] .vn-block {
    margin: 12px 0;
    padding-left: 12px;
    border-left: 3.5px solid rgba(99,102,241,0.7);
    gap: 14px;
}
.mes[data-vn-style="classic"] .vn-bubble {
    background: rgba(15,23,42,0.65);
    border: 1px solid rgba(99,102,241,0.3);
    border-radius: 12px;
}
.mes[data-vn-style="classic"] .vn-avatar { width: calc(var(--vn-avatar-size, 52px) * 0.9) !important; height: calc(var(--vn-avatar-size, 52px) * 0.9) !important; border-radius: 12px; }
.mes[data-vn-style="classic"] .vn-avatar-viewport { width: calc(var(--vn-avatar-size, 52px) * 0.9) !important; height: calc(var(--vn-avatar-size, 52px) * 0.9) !important; border-radius: 12px; }
/* Cyberpunk Neon style */
.mes[data-vn-style="cyberpunk"] .vn-block {
    margin: 14px 0;
    gap: 14px;
}
.mes[data-vn-style="cyberpunk"] .vn-bubble {
    background: rgba(10, 14, 26, 0.92);
    border: 1.5px solid #00f0ff;
    box-shadow: 0 0 16px rgba(0,240,255,0.25), inset 0 0 12px rgba(255,0,128,0.15);
    border-radius: 4px 20px 4px 20px;
}
.mes[data-vn-style="cyberpunk"] .vn-avatar {
    border-color: #ff007f;
    box-shadow: 0 0 14px rgba(255,0,127,0.5);
    border-radius: 6px 16px 6px 16px;
}
.mes[data-vn-style="cyberpunk"] .vn-avatar-viewport {
    border-color: #ff007f;
    box-shadow: 0 0 14px rgba(255,0,127,0.5);
    border-radius: 6px 16px 6px 16px;
}
.mes[data-vn-style="cyberpunk"] .vn-bubble-tag {
    color: #00f0ff !important;
    text-shadow: 0 0 8px rgba(0,240,255,0.6);
    letter-spacing: 0.1em;
}
/* Manga Comic style */
.mes[data-vn-style="manga"] .vn-block {
    margin: 14px 0;
    gap: 14px;
}
.mes[data-vn-style="manga"] .vn-bubble {
    background: #ffffff;
    color: #0f172a !important;
    border: 2.5px solid #0f172a;
    border-radius: 20px;
    box-shadow: 5px 5px 0px #0f172a;
    font-weight: 500;
}
.mes[data-vn-style="manga"] .vn-bubble.vn-thought {
    background: #f8fafc;
    border-style: dotted;
    color: #334155 !important;
}
.mes[data-vn-style="manga"] .vn-avatar {
    border: 2.5px solid #0f172a;
    box-shadow: 3px 3px 0px #0f172a;
}
.mes[data-vn-style="manga"] .vn-avatar-viewport {
    border: 2.5px solid #0f172a;
    box-shadow: 3px 3px 0px #0f172a;
}
.mes[data-vn-style="manga"] .vn-bubble-tag {
    background: #0f172a !important;
    color: #ffffff !important;
    -webkit-text-fill-color: #ffffff !important;
    padding: 3px 10px;
    border-radius: 6px;
    display: inline-block;
}
/* Royal Velvet style */
.mes[data-vn-style="royal"] .vn-block {
    margin: 14px 0;
    gap: 14px;
}
.mes[data-vn-style="royal"] .vn-bubble {
    background: linear-gradient(135deg, rgba(30,18,40,0.92), rgba(15,15,25,0.96));
    border: 1.5px solid rgba(234,179,8,0.55);
    box-shadow: 0 8px 26px rgba(0,0,0,0.6), 0 0 14px rgba(234,179,8,0.18);
    border-radius: 16px;
    font-family: 'Palatino Linotype', 'Book Antiqua', 'Cambria', 'Lora', 'Merriweather', 'Georgia', 'Times New Roman', 'Segoe UI', -apple-system, serif;
    font-variant-ligatures: normal;
}
.mes[data-vn-style="royal"] .vn-avatar {
    border: 2.5px solid #eab308;
    box-shadow: 0 0 15px rgba(234,179,8,0.4);
}
.mes[data-vn-style="royal"] .vn-avatar-viewport {
    border: 2.5px solid #eab308;
    box-shadow: 0 0 15px rgba(234,179,8,0.4);
}
.mes[data-vn-style="royal"] .vn-bubble-tag {
    background: linear-gradient(135deg, #fef08a, #eab308, #ca8a04);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-size: 12px;
}
/* Modern Chat style */
.mes[data-vn-style="modern"] .vn-block {
    margin: 8px 0;
    gap: 10px;
}
.mes[data-vn-style="modern"] .vn-bubble {
    background: rgba(51, 65, 85, 0.92);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 22px;
    padding: 12px 18px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.2);
}
.mes[data-vn-style="modern"] .vn-avatar {
    border-radius: 18px;
    border-width: 1.5px;
}
.mes[data-vn-style="modern"] .vn-avatar-viewport {
    border-radius: 18px;
    border-width: 1.5px;
}
html[data-vn-custom-font="1"] .mes[data-vn-style] .vn-bubble,
html[data-vn-custom-font="1"] .mes[data-vn-style] .vn-bubble-text,
html[data-vn-custom-font="1"] .vn-bubble,
html[data-vn-custom-font="1"] .vn-bubble-text {
    font-family: var(--vn-custom-font) !important;
}
html[data-vn-custom-color="1"] .mes[data-vn-style] .vn-bubble,
html[data-vn-custom-color="1"] .mes[data-vn-style] .vn-bubble-text,
html[data-vn-custom-color="1"] .vn-bubble,
html[data-vn-custom-color="1"] .vn-bubble-text {
    color: var(--vn-custom-color) !important;
}
/* ===== MAIN MODAL ===== */
#vn-modal-overlay {
    position:fixed; inset:0;
    width: 100vw; height: 100vh;
    width: 100dvw; height: 100dvh;
    background:rgba(10,14,26,0.88);
    z-index:1999990;
    display:none;
    align-items:center;
    justify-content:center;
    padding: 16px;
    box-sizing: border-box;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
}
#vn-modal-overlay.show { display:flex; }
.vn-modal {
    background: rgba(10,14,26,0.98);
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 22px;
    width: 680px;
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 32px);
    max-width: calc(100dvw - 32px);
    max-height: calc(100dvh - 32px);
    min-height: 0;
    min-width: 0;
    margin: auto;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 32px 80px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.1);
    color: #e2e8f0;
    box-sizing: border-box;
}
.vn-modal-header {
    padding: 18px 20px 0;
    flex-shrink: 0;
}
.vn-modal-title {
    font-size: clamp(16px, 1.35vw, 22px);
    font-weight: 700;
    background: linear-gradient(135deg,#a78bfa,#60a5fa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
}
.vn-tabs {
    display:flex;
    gap:4px;
    flex-wrap:wrap;
    background:rgba(0,0,0,0.35);
    border-radius:12px;
    padding:5px;
    margin-bottom:0;
}
.vn-tab {
    flex:1 1 auto;
    padding:9px 6px;
    border:none;
    background:transparent;
    color:#94a3b8;
    font-size: clamp(12px, 0.95vw, 15px);
    font-weight:600;
    cursor:pointer;
    border-radius:9px;
    transition:all 0.2s;
    letter-spacing:0.02em;
    text-align:center;
    font-family:-apple-system,sans-serif;
}
.vn-tab.active {
    background:linear-gradient(135deg,#4f46e5,#7c3aed);
    color:#fff;
    box-shadow:0 2px 8px rgba(79,70,229,0.45);
}
.vn-tab:hover:not(.active) { background:rgba(255,255,255,0.08); color:#e2e8f0; }
.vn-tab-content {
    display:none;
    flex:1 1 auto;
    min-height: 0;
    min-width: 0;
    overflow-y:auto;
    padding:16px 20px 20px;
    scrollbar-width:thin;
    scrollbar-color: rgba(99,102,241,0.4) transparent;
}
.vn-tab-content.active { display:flex; flex-direction:column; gap:14px; }
.vn-tab-content::-webkit-scrollbar { width:5px; }
.vn-tab-content::-webkit-scrollbar-thumb { background:rgba(99,102,241,0.4);border-radius:4px; }
/* sections */
.vn-section-label {
    font-size:11px;
    font-weight:700;
    letter-spacing:0.08em;
    text-transform:uppercase;
    color:#818cf8;
    margin-bottom:6px;
    margin-top:4px;
}
.vn-icon {
    width:16px;
    height:16px;
    vertical-align:middle;
    margin-right:6px;
    display:inline-block;
    flex-shrink:0;
    filter:drop-shadow(0 1px 2px rgba(0,0,0,0.25));
}
.vn-btn .vn-icon { margin-right:6px; }
.vn-section-label .vn-icon { margin-right:6px; width:16px; height:16px; }
.vn-group { display:flex; flex-direction:column; gap:6px; }
.vn-input {
    width:100%; box-sizing:border-box;
    padding:10px 12px;
    background:rgba(0,0,0,0.35);
    border:1px solid rgba(255,255,255,0.12);
    border-radius:10px;
    color:#e2e8f0;
    font-size: clamp(13px, 0.95vw, 15.5px);
    outline:none;
    transition:all 0.2s;
    font-family:inherit;
}
.vn-input:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,0.25); }
.vn-textarea {
    min-height:110px;
    resize:vertical;
    line-height:1.6;
    font-size: clamp(13px, 0.95vw, 15.5px);
}
.vn-btn {
    padding:10px 16px;
    border:none;
    border-radius:10px;
    font-size: clamp(12.5px, 0.95vw, 15px);
    font-weight:600;
    cursor:pointer;
    transition:all 0.2s;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:6px;
    font-family:inherit;
}
.vn-btn-primary { background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;box-shadow:0 3px 10px rgba(79,70,229,0.35); }
.vn-btn-primary:hover { filter:brightness(1.12); transform:translateY(-1px); }
.vn-btn-secondary { background:rgba(255,255,255,0.08);color:#e2e8f0;border:1px solid rgba(255,255,255,0.12); }
.vn-btn-secondary:hover { background:rgba(255,255,255,0.14); }
.vn-btn-danger { background:rgba(239,68,68,0.18);color:#f87171;border:1px solid rgba(239,68,68,0.35); }
.vn-btn-danger:hover { background:rgba(239,68,68,0.28); }
.vn-btn-sm { padding:6px 12px; font-size:12px; }
.vn-toggle-row {
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding:12px 14px;
    background:rgba(0,0,0,0.25);
    border-radius:12px;
    border:1px solid rgba(255,255,255,0.07);
}
.vn-toggle-info { display:flex; flex-direction:column; gap:3px; }
.vn-toggle-name { font-size:13.5px; font-weight:600; color:#e2e8f0; }
.vn-toggle-desc { font-size:11.5px; color:#94a3b8; }
.vn-switch { position:relative; width:46px; height:24px; flex-shrink:0; }
.vn-switch input { opacity:0; width:0; height:0; }
.vn-slider { position:absolute; cursor:pointer; inset:0; background:#334155; border-radius:24px; transition:0.3s; }
.vn-slider::before { content:""; position:absolute; height:18px; width:18px; left:3px; bottom:3px; background:#cbd5e1; border-radius:50%; transition:0.3s; }
.vn-switch input:checked + .vn-slider { background:linear-gradient(135deg,#4f46e5,#7c3aed); }
.vn-switch input:checked + .vn-slider::before { transform:translateX(22px); background:#fff; }
/* style picker */
.vn-style-picker { display:flex; gap:10px; flex-wrap:wrap; }
.vn-style-opt {
    flex:1;
    min-width:140px;
    padding:12px 10px;
    background:rgba(0,0,0,0.3);
    border:2px solid rgba(255,255,255,0.08);
    border-radius:14px;
    cursor:pointer;
    transition:all 0.2s;
    text-align:center;
    font-size:12px;
    color:#94a3b8;
    font-family:inherit;
}
.vn-style-opt:hover { border-color:rgba(99,102,241,0.5); background:rgba(99,102,241,0.1); }
.vn-style-opt.selected { border-color:#6366f1; background:rgba(99,102,241,0.18); color:#f1f5f9; box-shadow:0 4px 12px rgba(99,102,241,0.2); }
.vn-style-opt .vn-style-preview { font-size:24px; margin-bottom:6px; }
.vn-style-opt .vn-style-name { font-weight:700; margin-bottom:3px; font-size:13px; color:#e2e8f0; }
/* character grid */
.vn-char-grid {
    display:grid;
    grid-template-columns:repeat(auto-fill,minmax(96px,1fr));
    gap:10px;
}
.vn-char-card {
    background:rgba(0,0,0,0.35);
    border:2px solid rgba(255,255,255,0.08);
    border-radius:14px;
    padding:10px 6px;
    text-align:center;
    cursor:pointer;
    transition:all 0.2s;
    position:relative;
}
.vn-char-card:hover { border-color:rgba(99,102,241,0.5); background:rgba(99,102,241,0.1); transform:translateY(-2px); }
.vn-char-card.active { border-color:#6366f1; background:rgba(99,102,241,0.18); }
.vn-char-chk {
    position: absolute;
    top: 6px;
    left: 6px;
    width: 17px;
    height: 17px;
    cursor: pointer;
    z-index: 5;
    accent-color: #ef4444;
}
.vn-char-card.selected-bulk {
    border-color: #ef4444 !important;
    box-shadow: 0 0 12px rgba(239,68,68,0.3) !important;
    background: rgba(239,68,68,0.1) !important;
}
.vn-char-card img {
    width:56px; height:56px;
    border-radius:50%;
    object-fit:cover;
    margin:0 auto 6px;
    display:block;
    border:2px solid rgba(255,255,255,0.2);
    image-rendering: auto;
}
.vn-char-card .vn-char-initial {
    width:56px; height:56px;
    border-radius:50%;
    margin:0 auto 6px;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:22px;
    font-weight:700;
    color:#fff;
    background:linear-gradient(135deg,#4f46e5,#7c3aed);
}
.vn-char-card .vn-char-card-name {
    font-size:11.5px; font-weight:600; color:#e2e8f0;
    overflow:hidden; white-space:nowrap; text-overflow:ellipsis;
}
.vn-char-card .vn-char-del {
    position:absolute; top:4px; right:4px;
    width:20px; height:20px; border-radius:50%;
    background:rgba(239,68,68,0.8); color:#fff;
    font-size:11px; border:none; cursor:pointer;
    display:none; align-items:center; justify-content:center;
    line-height:1;
}
.vn-char-card:hover .vn-char-del { display:flex; }
.vn-add-char {
    background:rgba(99,102,241,0.08);
    border:2px dashed rgba(99,102,241,0.4);
    border-radius:14px;
    padding:10px 6px;
    text-align:center;
    cursor:pointer;
    transition:all 0.2s;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    min-height:94px;
    color:#818cf8;
    font-size:11.5px; font-weight:600;
    gap:4px;
}
.vn-add-char:hover { background:rgba(99,102,241,0.15); border-color:rgba(99,102,241,0.7); }
.vn-char-detail {
    background:rgba(0,0,0,0.25);
    border:1px solid rgba(255,255,255,0.08);
    border-radius:14px;
    padding:14px;
    display:flex;
    flex-direction:column;
    gap:10px;
}
.vn-char-detail-header {
    display:flex;
    align-items:center;
    gap:12px;
}
.vn-char-detail-avatar {
    width:64px; height:64px; border-radius:50%;
    object-fit:cover; border:3px solid rgba(99,102,241,0.5);
    flex-shrink:0; background:#1e293b;
    cursor:pointer;
}
.vn-char-detail-info { flex:1; min-width:0; }
.vn-char-detail-name {
    font-size:16px; font-weight:700; color:#e2e8f0;
    margin-bottom:4px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;
}
.vn-char-btns { display:flex; gap:6px; flex-wrap:wrap; }
/* ===== IMAGE PICKER MODAL ===== */
#vn-img-modal-overlay {
    position:fixed; inset:0;
    width: 100vw; height: 100vh;
    width: 100dvw; height: 100dvh;
    background:rgba(10,14,26,0.92);
    z-index:2000000;
    display:none;
    align-items:center;
    justify-content:center;
    padding: 16px;
    box-sizing: border-box;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
}
#vn-img-modal-overlay.show { display:flex; }
.vn-img-modal {
    background:rgba(10,14,26,0.98);
    border:1px solid rgba(255,255,255,0.12);
    border-radius:20px;
    width: 700px;
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 32px);
    max-width: calc(100dvw - 32px);
    max-height: calc(100dvh - 32px);
    min-height: 0;
    min-width: 0;
    margin:auto;
    display:flex;
    flex-direction:column;
    overflow:hidden;
    box-shadow:0 32px 80px rgba(0,0,0,0.8);
    color:#e2e8f0;
    box-sizing: border-box;
}
.vn-img-modal-header {
    padding:16px 18px 12px;
    border-bottom:1px solid rgba(255,255,255,0.08);
    flex-shrink:0;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
}
.vn-img-modal-title {
    font-size:16px; font-weight:700; color:#e2e8f0;
    display:flex; align-items:center; gap:8px;
    margin-bottom:12px;
}
.vn-img-toolbar {
    display:flex; gap:8px; align-items:center;
    width: 100%; max-width: 100%; min-width: 0;
    box-sizing: border-box;
    flex-wrap: wrap;
}
.vn-src-nav-btn {
    width: 30px; height: 36px;
    border-radius: 8px; border: 1px solid rgba(129,140,248,0.4);
    background: rgba(99,102,241,0.25);
    color: #a78bfa; font-size: 14px; font-weight: bold;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; flex-shrink: 0;
    transition: all 0.2s;
    user-select: none;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}
.vn-src-nav-btn:hover {
    background: rgba(99,102,241,0.5); color: #fff;
    transform: scale(1.05);
}
.vn-src-nav-btn:active {
    transform: scale(0.95);
}
.vn-img-src-tabs {
    display:flex; gap:6px;
    background:rgba(0,0,0,0.4);
    border-radius:10px; padding:8px 8px 12px 8px;
    overflow-x: auto;
    max-width: 100%; width: 100%; min-width: 0;
    flex: 1 1 0%;
    box-sizing: border-box;
    scrollbar-width: thin;
    scrollbar-color: #818cf8 rgba(255,255,255,0.15);
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
}
.vn-img-src-tabs::-webkit-scrollbar {
    height: 8px;
}
.vn-img-src-tabs::-webkit-scrollbar-track {
    background: rgba(255,255,255,0.1);
    border-radius: 8px;
    margin: 0 4px;
}
.vn-img-src-tabs::-webkit-scrollbar-thumb {
    background: #818cf8;
    border-radius: 8px;
    border: 1px solid rgba(0,0,0,0.3);
}
.vn-img-src-tabs::-webkit-scrollbar-thumb:hover {
    background: #a78bfa;
}
.vn-src-tab {
    padding:6px 14px; border:none; background:transparent;
    color:#94a3b8; font-size:12px; font-weight:600;
    cursor:pointer; border-radius:7px; transition:all 0.2s;
    font-family:inherit; white-space: nowrap; flex-shrink: 0;
}
.vn-src-tab.active { background:#4f46e5; color:#fff; box-shadow:0 2px 6px rgba(79,70,229,0.4); }
.vn-img-search {
    flex:1; min-width:110px;
    padding:7px 10px;
    background:rgba(0,0,0,0.35);
    border:1px solid rgba(255,255,255,0.12);
    border-radius:8px;
    color:#e2e8f0; font-size:12.5px; outline:none;
    font-family:inherit;
}
.vn-img-search:focus { border-color:#6366f1; }
.vn-nsfw-toggle {
    display:flex; align-items:center; gap:5px;
    font-size:12px; color:#cbd5e1; font-weight:600;
    cursor:pointer; white-space:nowrap; user-select:none;
}
.vn-img-modal-body {
    flex:1 1 auto; overflow-y:auto; overflow-x:hidden; display:flex; flex-direction:column;
    min-height: 0; min-width: 0;
    padding:12px 16px;
    gap:10px;
    scrollbar-width: thin;
    scrollbar-color: #818cf8 rgba(255,255,255,0.1);
}
/* favourite bar */
.vn-fav-bar {
    display:flex; gap:8px; overflow-x:auto;
    padding-bottom:6px;
    scrollbar-width:thin;
    scrollbar-color:rgba(99,102,241,0.4) transparent;
    flex-shrink:0;
}
.vn-fav-thumb {
    width:46px; height:46px; border-radius:10px;
    object-fit:cover; cursor:pointer; flex-shrink:0;
    border:2.5px solid rgba(99,102,241,0.6);
    transition:all 0.15s;
}
.vn-fav-thumb:hover { border-color:#6366f1; box-shadow:0 4px 10px rgba(0,0,0,0.4); }
.vn-fav-empty {
    font-size:12px; color:#64748b; font-style:italic;
    display:flex; align-items:center; height:46px; padding:0 4px;
}
/* image grid */
.vn-img-grid {
    flex:1 1 auto; overflow-y:auto;
    min-height: 0; min-width: 0;
    display:grid;
    grid-template-columns:repeat(auto-fill,minmax(130px,1fr));
    gap:14px;
    scrollbar-width:thin;
    scrollbar-color:rgba(99,102,241,0.4) transparent;
    align-content:start;
    grid-auto-rows: max-content;
}
.vn-img-grid::-webkit-scrollbar { width:5px; }
.vn-img-grid::-webkit-scrollbar-thumb { background:rgba(99,102,241,0.4);border-radius:4px; }
.vn-img-thumb {
    position:relative;
    width: 100%;
    aspect-ratio: 1 / 1;
    height: auto;
    min-height: 130px;
    border-radius:14px;
    overflow:hidden;
    cursor:pointer;
    border:2.5px solid rgba(255,255,255,0.08);
    transition:all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    background:#1e293b;
    display: flex;
    align-items: center;
    justify-content: center;
}
.vn-img-thumb:hover { border-color:#6366f1; box-shadow:0 8px 20px rgba(0,0,0,0.5); z-index:10; }
.vn-img-thumb img {
    position: absolute;
    inset: 0;
    width:100% !important;
    height:100% !important;
    object-fit:cover !important;
    object-position: center !important;
    display:block !important;
}
.vn-img-thumb .vn-img-fav-btn {
    position:absolute; top:6px; right:6px;
    width:26px; height:26px; border-radius:50%;
    background:rgba(0,0,0,0.7); color:#fff;
    font-size:13px; border:none; cursor:pointer;
    display:none; align-items:center; justify-content:center;
    transition:all 0.15s;
    line-height:1;
    z-index: 5;
}
.vn-img-thumb:hover .vn-img-fav-btn { display:flex; }
.vn-img-thumb .vn-img-fav-btn.starred { background:rgba(251,191,36,0.95); color:#78350f; display:flex; }
.vn-img-thumb .vn-img-fav-btn.starred:hover { background:rgba(251,191,36,1); }
.vn-img-thumb .vn-img-del-btn {
    position:absolute; top:6px; left:6px;
    width:26px; height:26px; border-radius:50%;
    background:rgba(239,68,68,0.86); color:#fff;
    font-size:12px; border:none; cursor:pointer;
    display:none; align-items:center; justify-content:center;
    transition:all 0.15s; line-height:1; z-index:5;
}
.vn-img-thumb:hover .vn-img-del-btn { display:flex; }
.vn-img-thumb .vn-img-del-btn:hover { background:rgba(239,68,68,1); }
.vn-img-thumb .vn-img-nsfw-badge {
    position:absolute; bottom:6px; left:6px;
    background:rgba(239,68,68,0.9); color:#fff;
    font-size:9px; font-weight:700; padding:2px 6px;
    border-radius:4px; display:none;
    z-index: 5;
}
.vn-img-thumb.nsfw .vn-img-nsfw-badge { display:block; }
.vn-img-load-more {
    grid-column:1/-1;
    padding:11px;
    background:rgba(99,102,241,0.12);
    border:1px solid rgba(99,102,241,0.35);
    border-radius:10px;
    color:#a78bfa; font-size:13px; font-weight:600;
    cursor:pointer; transition:all 0.2s;
    font-family:inherit;
    text-align:center;
}
.vn-img-load-more:hover { background:rgba(99,102,241,0.22); }
.vn-img-placeholder {
    grid-column:1/-1;
    text-align:center;
    padding:40px 20px;
    color:#64748b;
    font-size:13.5px;
}
.vn-img-modal-footer {
    padding:12px 18px;
    border-top:1px solid rgba(255,255,255,0.08);
    display:flex;
    gap:10px;
    flex-shrink:0;
    align-items:center;
}
.vn-img-preview {
    width:42px; height:42px; border-radius:8px;
    object-fit:cover;
    border:2px solid rgba(99,102,241,0.5);
    display:none;
    flex-shrink:0;
}
.vn-img-preview.show { display:block; }
.vn-selected-url {
    flex:1;
    font-size:11.5px; color:#94a3b8;
    overflow:hidden; white-space:nowrap; text-overflow:ellipsis;
}
/* loading skeleton */
.vn-skeleton {
    aspect-ratio:1;
    border-radius:12px;
    background:linear-gradient(90deg,rgba(30,41,59,0.6) 25%,rgba(51,65,85,0.6) 50%,rgba(30,41,59,0.6) 75%);
    background-size:200% 100%;
    animation:vn-shimmer 1.4s infinite;
}
@keyframes vn-shimmer {
    0%{background-position:200% 0}
    100%{background-position:-200% 0}
}
/* ===== STANDALONE FLOATING ICON ===== */
#vn-standalone-fab {
    position: fixed;
    bottom: 90px;
    right: 25px;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(168, 85, 247, 0.4), inset 0 2px 4px rgba(255,255,255,0.4);
    z-index: 99990;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
    user-select: none;
    touch-action: none;
}
#vn-standalone-fab:hover {
    box-shadow: 0 8px 25px rgba(236, 72, 153, 0.6), inset 0 2px 6px rgba(255,255,255,0.6);
}
#vn-standalone-fab:active {
    box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4), inset 0 1px 3px rgba(255,255,255,0.4);
}
/* ===== ẢNH AVATAR MỞ RỘNG TRỰC TIẾP TRONG CHÍNH VĂN (IN-PLACE EXPANSION) ===== */
.vn-avatar {
    cursor: pointer !important;
    transition: opacity 0.25s ease, box-shadow 0.25s ease, border-radius 0.25s ease !important;
}
.vn-avatar:hover {
    box-shadow: 0 6px 20px rgba(129,140,248,0.5) !important;
}
.vn-block {
    transition: gap 0.25s ease !important;
}
html[data-vn-img-mode="always_full"] .vn-block,
.vn-block.vn-expanded-img {
    align-items: center !important;
    gap: 16px !important;
}
html[data-vn-img-pos="top"] .vn-block.vn-expanded-img,
html[data-vn-img-mode="always_full"][data-vn-img-pos="top"] .vn-block,
html:not([data-vn-img-pos="bottom"]) .vn-block.vn-expanded-img,
html:not([data-vn-img-pos="bottom"])[data-vn-img-mode="always_full"] .vn-block {
    flex-direction: column !important;
}
html[data-vn-img-pos="bottom"] .vn-block.vn-expanded-img,
html[data-vn-img-mode="always_full"][data-vn-img-pos="bottom"] .vn-block {
    flex-direction: column-reverse !important;
}
html[data-vn-img-mode="always_full"] .vn-block .vn-avatar-wrap,
.vn-block.vn-expanded-img .vn-avatar-wrap {
    width: 100% !important;
    max-width: 100% !important;
    align-items: center !important;
}
html[data-vn-img-mode="always_full"] .vn-block:not(.vn-collapsed-img) .vn-avatar-viewport,
.vn-block.vn-expanded-img .vn-avatar-viewport {
    width: 100% !important;
    height: auto !important;
    max-width: 100% !important;
    overflow: visible !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    background: transparent !important;
    display: flex !important;
    justify-content: center !important;
    transition: opacity 0.25s ease !important;
}
html[data-vn-img-mode="always_full"] .vn-block:not(.vn-collapsed-img) .vn-avatar-viewport:hover,
.vn-block.vn-expanded-img .vn-avatar-viewport:hover {
    transform: none !important;
    box-shadow: none !important;
}
html[data-vn-img-mode="always_full"] .vn-block:not(.vn-collapsed-img) .vn-avatar-viewport,
.vn-block.vn-expanded-img .vn-avatar-viewport {
    --vn-avatar-zoom: 1;
}
html[data-vn-img-mode="always_full"] .vn-block:not(.vn-collapsed-img) .vn-avatar-viewport .vn-avatar,
.vn-block.vn-expanded-img .vn-avatar-viewport .vn-avatar {
    --vn-avatar-zoom: 1 !important;
    object-position: center center !important;
}
html[data-vn-img-mode="always_full"] .vn-block:not(.vn-collapsed-img) .vn-avatar,
.vn-block.vn-expanded-img .vn-avatar {
    width: auto !important;
    height: auto !important;
    max-width: 100% !important;
    max-height: 650px !important;
    border-radius: 14px !important;
    object-fit: contain !important;
    border: 2px solid rgba(129, 140, 248, 0.5) !important;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7) !important;
    background: rgba(15, 23, 42, 0.8) !important;
    animation: none !important;
}
html[data-vn-img-mode="always_full"] .vn-block:not(.vn-collapsed-img) .vn-charname,
.vn-block.vn-expanded-img .vn-charname {
    font-size: 15px !important;
    margin-top: 8px !important;
    color: #a78bfa !important;
    animation: none !important;
}
html[data-vn-img-mode="always_full"] .vn-block:not(.vn-collapsed-img) .vn-bubble,
.vn-block.vn-expanded-img .vn-bubble {
    width: 100% !important;
    box-sizing: border-box !important;
    animation: none !important;
}
/* Khi ở chế độ luôn mở full, click vào ảnh sẽ thu gọn về bình thường (vn-collapsed-img) */
html[data-vn-img-mode="always_full"] .vn-block.vn-collapsed-img {
    flex-direction: row !important;
    align-items: flex-start !important;
    gap: 12px !important;
}
html[data-vn-img-mode="always_full"] .vn-block.vn-right.vn-collapsed-img {
    flex-direction: row-reverse !important;
}
html[data-vn-img-mode="always_full"] .vn-block.vn-collapsed-img .vn-avatar-wrap {
    width: auto !important;
}
html[data-vn-img-mode="always_full"] .vn-block.vn-collapsed-img .vn-avatar-viewport {
    width: var(--vn-avatar-size, 52px) !important;
    height: var(--vn-avatar-size, 52px) !important;
    max-width: none !important;
    overflow: hidden !important;
    border-radius: 50% !important;
    border: 2.5px solid rgba(255,255,255,0.3) !important;
    box-shadow: 0 4px 14px rgba(0,0,0,0.4) !important;
    background: #1e293b !important;
}
html[data-vn-img-mode="always_full"] .vn-block.vn-collapsed-img .vn-avatar-viewport > .vn-avatar {
    width: 100% !important;
    height: 100% !important;
    max-width: none !important;
    max-height: none !important;
    min-width: 0 !important;
    min-height: 0 !important;
    margin: 0 !important;
    display: block !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    background: transparent !important;
    object-fit: cover !important;
    box-sizing: border-box !important;
    animation: none !important;
    transform: none !important;
    transform-origin: center center !important;
}
html:not([data-vn-img-mode="always_full"]) .vn-block:not(.vn-expanded-img) .vn-avatar-viewport:not([data-vn-avatar-zoom="100"]) .vn-avatar,
html[data-vn-img-mode="always_full"] .vn-block.vn-collapsed-img .vn-avatar-viewport:not([data-vn-avatar-zoom="100"]) .vn-avatar {
    transform: scale(var(--vn-avatar-zoom, 1)) !important;
    transform-origin: center center !important;
}
html[data-vn-img-mode="always_full"] .vn-block.vn-collapsed-img .vn-avatar-viewport > .vn-avatar[data-vn-avatar-fit="contain"] {
    object-fit: contain !important;
    background: #111827 !important;
}
html[data-vn-img-mode="always_full"] .vn-block.vn-collapsed-img .vn-charname {
    font-size: 12px !important;
    margin-top: 0 !important;
}

/* --- BẢN VÁ HOÀN CHỈNH: CHỐNG NHẢY ẢNH KHI STREAM & TRẢ LẠI HIỆU ỨNG THU NHỎ --- */

/* 1. KHI ĐANG STREAM: Khóa cứng animation và ép ảnh đứng im ở full 100% */
html[data-vn-img-mode="always_full"] .mes.is_streaming .vn-block .vn-avatar,
html[data-vn-img-mode="always_full"] .mes[is_streaming="true"] .vn-block .vn-avatar,
html[data-vn-img-mode="always_full"] .mes.streaming .vn-block .vn-avatar {
    animation: none !important;
    transform: scale(1) !important;
    opacity: 1 !important;
}
html[data-vn-img-mode="always_full"] .mes.is_streaming .vn-block .vn-charname,
html[data-vn-img-mode="always_full"] .mes[is_streaming="true"] .vn-block .vn-charname,
html[data-vn-img-mode="always_full"] .mes.streaming .vn-block .vn-charname,
html[data-vn-img-mode="always_full"] .mes.is_streaming .vn-block .vn-bubble,
html[data-vn-img-mode="always_full"] .mes[is_streaming="true"] .vn-block .vn-bubble,
html[data-vn-img-mode="always_full"] .mes.streaming .vn-block .vn-bubble {
    animation: none !important;
    opacity: 1 !important;
}

/* 2. SAU KHI STREAM XONG */
html[data-vn-img-mode="always_full"] .vn-block.vn-no-anim .vn-avatar,
html[data-vn-img-mode="always_full"] .vn-block.vn-no-anim .vn-charname,
html[data-vn-img-mode="always_full"] .vn-block.vn-no-anim .vn-bubble {
    animation: none !important;
    opacity: 1 !important;
}

.vn-block.vn-no-anim {
    transition: gap 0.25s ease !important;
}
.vn-block.vn-no-anim .vn-avatar {
    transition: opacity 0.25s ease, box-shadow 0.25s ease, border-radius 0.25s ease !important;
}

/* --- TỐI ƯU GPU: TẮT KÍNH MỜ KHI ĐANG STREAMING --- */
.mes.is_streaming .vn-bubble,
.mes[is_streaming="true"] .vn-bubble,
.mes.streaming .vn-bubble {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    /* Dùng màu nền đặc hơn một chút để bù lại việc mất kính mờ */
    background-color: rgba(30,41,59,0.98) !important; 
}

/* --- BẢN VÁ ZOOM AVATAR: không để zoom ảnh phá hover/animation mở - thu ảnh --- */
html:not([data-vn-img-mode="always_full"]) .vn-block:not(.vn-expanded-img) .vn-avatar-viewport:not([data-vn-avatar-zoom="100"]) .vn-avatar,
html[data-vn-img-mode="always_full"] .vn-block.vn-collapsed-img .vn-avatar-viewport:not([data-vn-avatar-zoom="100"]) .vn-avatar {
    transform: scale(var(--vn-avatar-zoom, 1)) !important;
    transform-origin: center center !important;
    box-shadow: none !important;
}
html:not([data-vn-img-mode="always_full"]) .vn-block:not(.vn-expanded-img) .vn-avatar-viewport,
html[data-vn-img-mode="always_full"] .vn-block.vn-collapsed-img .vn-avatar-viewport {
    cursor: pointer !important;
    overflow: hidden !important;
}
html[data-vn-img-mode="always_full"] .vn-block:not(.vn-expanded-img) .vn-avatar-viewport .vn-avatar:hover,
.vn-block.vn-expanded-img .vn-avatar-viewport .vn-avatar:hover {
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7) !important;
}
.vn-block.vn-no-anim .vn-avatar-viewport {
    transition: opacity 0.25s ease, box-shadow 0.25s ease, border-radius 0.25s ease !important;
}

/* --- BẢN VÁ TUYỆT ĐỐI CHỐNG RUNG VÀ CHỐNG NHẢY PIXEL KHI STREAMING & REFLOW --- */
/* 1. Tối ưu GPU compositing & isolation cho ảnh trong chế độ always_full và expanded để tránh nhảy sub-pixel trên Windows */
html[data-vn-img-mode="always_full"] .vn-block:not(.vn-collapsed-img) .vn-avatar,
.vn-block.vn-expanded-img .vn-avatar {
    backface-visibility: hidden !important;
    -webkit-backface-visibility: hidden !important;
    transform: none !important;
    decoding: sync !important;
    contain: layout paint !important;
}
/* 2. Khi đang streaming: Khóa tuyệt đối transition/animation & Giữ cố định con trỏ chuột ở chế độ text (I-beam) */
.mes.is_streaming .vn-block,
.mes[is_streaming="true"] .vn-block,
.mes.streaming .vn-block,
.vn-block.vn-streaming,
.mes.is_streaming .vn-bubble,
.mes[is_streaming="true"] .vn-bubble,
.mes.streaming .vn-bubble,
.vn-block.vn-streaming .vn-bubble,
.vn-block.vn-streaming .vn-bubble-text,
.vn-block.vn-streaming .vn-bubble-text * {
    cursor: text !important;
    user-select: text !important;
    -webkit-user-select: text !important;
}
.mes.is_streaming .vn-block *,
.mes[is_streaming="true"] .vn-block *,
.mes.streaming .vn-block *,
.vn-block.vn-streaming,
.vn-block.vn-streaming *,
.vn-block.vn-streaming .vn-avatar,
.vn-block.vn-streaming .vn-avatar-viewport,
.vn-block.vn-streaming .vn-avatar-wrap,
.vn-block.vn-streaming .vn-bubble,
.vn-block.vn-streaming .vn-charname {
    animation: none !important;
    transition: none !important;
    backface-visibility: hidden !important;
    -webkit-backface-visibility: hidden !important;
}
`;
        PD.head.appendChild(s);
    }

    // ========== NGUỒN ANIME API FREE SIÊU MƯỢT ==========
    // Fetch trực tiếp cho các API có CORS sẵn (Danbooru, Jikan, AniList...)
    async function directApiFetch(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        try {
            const r = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (r.status === 429) {
                if (typeof showToast === 'function') showToast('🚫 Rate Limit! Vui lòng thử lại sau vài giây.', 'error');
                return null;
            }
            if (!r.ok) return null;
            return await r.json();
        } catch (e) {
            clearTimeout(timeoutId);
            return null;
        }
    }

    // Fetch qua cors.sh proxy cho Safebooru (không có CORS header)
    async function proxiedBooruFetch(url) {
        // cors.sh: proxy miễn phí, hỗ trợ CORS, ổn định hơn allorigins
        const proxyUrl = 'https://cors.sh/' + url;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        try {
            const r = await fetch(proxyUrl, {
                signal: controller.signal,
                headers: { 'x-cors-api-key': 'temp_' + Date.now() }
            });
            clearTimeout(timeoutId);
            if (!r.ok) return [];
            const text = await r.text();
            if (!text) return [];
            let data;
            try { data = JSON.parse(text); } catch(e) {
                // XML fallback (Safebooru đôi khi trả XML)
                try {
                    const parser = new DOMParser();
                    const xml = parser.parseFromString(text, 'text/xml');
                    const posts = xml.getElementsByTagName('post');
                    data = Array.from(posts).map(p => {
                        const attrs = {};
                        for (let i = 0; i < p.attributes.length; i++) attrs[p.attributes[i].name] = p.attributes[i].value;
                        return attrs;
                    });
                } catch(e2) { return []; }
            }
            const arr = data?.post || data?.posts || data || [];
            return Array.isArray(arr) ? arr : [];
        } catch(e) {
            clearTimeout(timeoutId);
            return [];
        }
    }

    // Alias để tương thích với code cũ (không còn dùng trực tiếp cho Gelbooru/Rule34)
    async function advancedBooruFetch(url) {
        return proxiedBooruFetch(url);
    }

    const API_SOURCES = {
        'safebooru': {
            label: 'Safebooru (SFW)',
            sfw: true, nsfw: false,
            async fetch(opts = {}) {
                let tags = (opts.tag || '').trim().replace(/ /g, '_');
                const page = opts.offset || 0;
                // Safebooru không cần tag nếu để trống - lấy latest general
                const url = `https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=${tags ? encodeURIComponent(tags) : 'rating%3Ageneral'}&limit=24&pid=${page}`;
                const data = await proxiedBooruFetch(url);
                return data.map(item => ({
                    url: item.file_url || `https://safebooru.org//images/${item.directory}/${item.image}`,
                    // preview_url là thumbnail nhỏ (150px), sample_url là medium
                    thumb: item.preview_url || item.sample_url || null,
                    tags: item.tags ? item.tags.split(' ') : [],
                    nsfw: false,
                    src: 'safebooru'
                }));
            }
        },
        'danbooru': {
            label: 'Danbooru (CORS OK)',
            sfw: true, nsfw: true,
            async fetch(opts = {}) {
                let tags = (opts.tag || '').trim().replace(/ /g, '_');
                const page = Math.floor((opts.offset || 0) / 20) + 1;
                // Danbooru rating: g=general, s=sensitive, q=questionable, e=explicit
                // Dùng -rating:e để lọc theo NSFW toggle
                const ratingFilter = opts.nsfw ? '' : ' -rating:e -rating:q';
                const searchTags = (tags ? tags : '') + ratingFilter;
                const url = `https://danbooru.donmai.us/posts.json?tags=${encodeURIComponent(searchTags.trim())}&limit=20&page=${page}`;
                const data = await directApiFetch(url);
                if (!data || !Array.isArray(data)) return [];
                return data.map(item => ({
                    url: item.large_file_url || item.file_url,  // large_file_url available to anon
                    thumb: item.preview_file_url,               // 180x180 thumbnail từ CDN
                    tags: [item.tag_string_character, item.tag_string_general].filter(Boolean),
                    nsfw: opts.nsfw,
                    src: 'danbooru'
                })).filter(i => i.url && i.thumb);  // chỉ lấy item có cả url lẫn thumb
            }
        },
        'nekos.best': {
            label: 'nekos.best',
            sfw: true, nsfw: false,
            async fetch(opts = {}) {
                const query = (opts.tag || '').trim().toLowerCase();
                const allCats = ['waifu', 'neko', 'kitsune', 'shinobu', 'megumin', 'hug', 'pat', 'slap', 'cuddle', 'smile', 'blush', 'happy', 'wink', 'poke', 'dance', 'husbando', 'cry', 'baka', 'stare', 'think', 'bored', 'shrug', 'thumbsup', 'laugh'];
                const matchedCats = query
                    ? allCats.filter(c => c === query || c.includes(query) || query.includes(c) || query.split(' ').some(w => w.length > 2 && (c.includes(w) || w.includes(c))))
                    : [];
                const fetchCat = async (cat) => {
                    try {
                        const r = await fetch(`https://nekos.best/api/v2/${cat}?amount=20`);
                        if (!r.ok) return [];
                        const d = await r.json();
                        return (d.results || []).map(i => ({
                            url: i.url,
                            tags: [cat, i.anime_name, i.artist_name].filter(Boolean),
                            nsfw: false,
                            src: 'nekos.best',
                        }));
                    } catch { return []; }
                };
                let items = [];
                if (matchedCats.length > 0) {
                    const batches = await Promise.all(matchedCats.slice(0, 4).map(c => fetchCat(c)));
                    items = batches.flat();
                } else {
                    items = await fetchCat('waifu');
                }
                const seen = new Set();
                return items.filter(i => { if (seen.has(i.url)) return false; seen.add(i.url); return true; });
            },
            tags: ['waifu', 'neko', 'kitsune', 'shinobu', 'megumin', 'hug', 'pat', 'slap', 'cuddle', 'smile', 'blush', 'happy', 'wink', 'poke', 'dance', 'husbando', 'cry', 'baka', 'stare', 'think']
        },
        'anilist': {
            label: 'AniList DB',
            sfw: true, nsfw: false,
            async fetch(opts = {}) {
                const query = (opts.tag || '').trim();
                const page = Math.floor((opts.offset || 0) / 16) + 1;
                const gql = query
                    ? `{ Page(page: ${page}, perPage: 16) { characters(search: "${query.replace(/"/g, '')}") { name { full } image { large } } } }`
                    : `{ Page(page: ${page}, perPage: 16) { characters(sort: [FAVOURITES_DESC]) { name { full } image { large } } } }`;
                const r = await fetch('https://graphql.anilist.co', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ query: gql })
                });
                if (!r.ok) return [];
                const d = await r.json();
                return (d.data?.Page?.characters || []).map(c => ({
                    url: c.image?.large,
                    tags: [c.name?.full || 'AniList', 'official', 'character'],
                    nsfw: false,
                    src: 'anilist'
                })).filter(i => i.url);
            },
            tags: ['Rem', 'Marin Kitagawa', 'Frieren', 'Hatsune Miku', 'Raiden Shogun', 'Gawr Gura', 'Kurumi Tokisaki', 'Emilia', 'Albedo', 'Zero Two', 'Mai Sakurajima', 'Kaguya Shinomiya', 'Mikasa', 'Asuna', 'Kafka', 'Firefly', 'Gojo Satoru', 'Levi Ackerman', 'Luffy', 'Zoro']
        },
        'pic.re': {
            label: 'Pic.re Art DB',
            sfw: true, nsfw: false,
            async fetch(opts = {}) {
                const count = Math.min(opts.count || 12, 16);
                const results = await Promise.all(Array.from({length: count}, () => fetch('https://pic.re/image.json').then(r => r.json()).catch(() => null)));
                return [...new Set(results.filter(r => r && r.file_url).map(d => 'https://' + d.file_url))].map(url => ({
                    url,
                    tags: ['highres', 'pic.re', 'wallpaper', 'art'],
                    nsfw: false,
                    src: 'pic.re'
                }));
            },
            tags: ['highres', 'wallpaper', 'anime', 'aesthetic', 'art', 'portrait']
        },
        'nekos.life': {
            label: 'nekos.life',
            sfw: true, nsfw: false,
            async fetch(opts = {}) {
                const query = (opts.tag || '').trim().toLowerCase();
                const validCats = ['waifu', 'neko', 'shinobu', 'megumin', 'avatar', 'fox_girl', 'cuddle', 'hug', 'pat', 'smug', 'kiss', 'slap', 'poke'];
                const cat = validCats.includes(query) ? query : 'waifu';
                const count = Math.min(opts.count || 12, 16);
                const results = await Promise.all(Array.from({length: count}, () => fetch(`https://nekos.life/api/v2/img/${cat}`).then(r => r.json()).catch(() => null)));
                return [...new Set(results.filter(r => r && r.url).map(d => d.url))].map(url => ({ url, tags: [cat, 'nekos.life'], nsfw: false, src: 'nekos.life' }));
            },
            tags: ['waifu', 'neko', 'shinobu', 'megumin', 'avatar', 'fox_girl', 'cuddle', 'hug', 'pat', 'smug', 'kiss', 'slap', 'poke']
        },
        'nekos.moe': {
            label: 'nekos.moe',
            sfw: true, nsfw: true,
            async fetch(opts = {}) {
                const count = Math.min(opts.count || 16, 20);
                const nsfw = opts.nsfw || false;
                const query = (opts.tag || '').trim();
                let images = [];
                if (query) {
                    try {
                        const res = await fetch('https://nekos.moe/api/v1/images/search', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ tags: query.split(','), limit: count, nsfw, skip: opts.offset || 0 })
                        });
                        if (res.ok) images = (await res.json()).images || [];
                    } catch (e) {}
                }
                if (images.length === 0) {
                    const r = await fetch(`https://nekos.moe/api/v1/random/image?count=${count}&nsfw=${nsfw}`);
                    if (r.ok) images = (await r.json()).images || [];
                }
                return images.map(i => ({
                    url: `https://nekos.moe/image/${i.id}`,
                    tags: i.tags || ['waifu'],
                    nsfw: i.nsfw || false,
                    src: 'nekos.moe'
                }));
            },
            tags: ['waifu', 'neko', '1girl', 'solo', 'maid', 'uniform', 'cat_ears', 'blush', 'smile']
        },
        'myanimelist': {
            label: 'MyAnimeList DB',
            sfw: true, nsfw: false,
            async fetch(opts = {}) {
                const query = (opts.tag || '').trim();
                const page = Math.floor((opts.offset || 0) / 16) + 1;
                const url = query
                    ? `https://api.jikan.moe/v4/characters?q=${encodeURIComponent(query)}&limit=16&page=${page}`
                    : `https://api.jikan.moe/v4/top/characters?limit=16&page=${page}`;
                // Jikan đôi khi 429 rate limit hoặc 504 overload - thử tối đa 3 lần
                const fetchWithRetry = async (retries = 2) => {
                    const controller = new AbortController();
                    const tid = setTimeout(() => controller.abort(), 12000);
                    try {
                        const r = await fetch(url, { signal: controller.signal });
                        clearTimeout(tid);
                        if (r.status === 429 || r.status === 504 || r.status === 503) {
                            if (retries > 0) {
                                await new Promise(res => setTimeout(res, 1200));
                                return fetchWithRetry(retries - 1);
                            }
                            return null;
                        }
                        if (!r.ok) return null;
                        return await r.json();
                    } catch(e) {
                        clearTimeout(tid);
                        if (retries > 0 && e.name !== 'AbortError') {
                            await new Promise(res => setTimeout(res, 800));
                            return fetchWithRetry(retries - 1);
                        }
                        return null;
                    }
                };
                const d = await fetchWithRetry();
                if (!d) return [];
                return (d.data || []).filter(c => c && c.images && (c.images.jpg?.image_url || c.images.webp?.image_url)).map(c => ({
                    url: c.images.jpg?.image_url || c.images.webp?.image_url,
                    tags: [c.name, ...(c.nicknames || []).slice(0, 2), 'MAL', 'official'].filter(Boolean),
                    nsfw: false,
                    src: 'myanimelist'
                }));
            },
            tags: ['Marin Kitagawa', 'Rem', 'Zero Two', 'Megumin', 'Shinobu Oshino', 'Kurumi Tokisaki', 'Asuna', 'Mikasa', 'Kaguya Shinomiya', 'Mai Sakurajima', 'Chizuru Mizuhara', 'Albedo', 'Emilia', 'Roxy Migurdia', 'Frieren', 'Maomao', 'Raiden Shogun', 'Hatsune Miku', 'Furina', 'Hu Tao', 'Gawr Gura', 'Kafka', 'Firefly', 'Gojo Satoru', 'Levi Ackerman', 'Luffy', 'Zoro', 'Kakashi', 'Sung Jin-Woo']
        },
        'otakugifs': {
            label: 'OtakuGIFs',
            sfw: true, nsfw: false,
            async fetch(opts = {}) {
                const query = (opts.tag || '').trim().toLowerCase();
                const cat = ['hug', 'pat', 'slap', 'cuddle', 'smile', 'blush', 'kiss', 'lick', 'smug', 'bonk'].includes(query) ? query : 'hug';
                const results = await Promise.all(Array.from({length: Math.min(opts.count || 8, 10)}, () => fetch(`https://api.otakugifs.xyz/gif?reaction=${cat}`).then(r => r.json()).catch(() => null)));
                return [...new Set(results.filter(r => r && r.url).map(d => d.url))].map(url => ({ url, tags: [cat, 'gif'], nsfw: false, src: 'otakugifs' }));
            },
            tags: ['hug', 'pat', 'slap', 'cuddle', 'smile', 'blush', 'kiss', 'lick', 'smug', 'bonk']
        },
        'nekobot': {
            label: 'Nekobot DB',
            sfw: true, nsfw: false,
            async fetch(opts = {}) {
                const query = (opts.tag || '').trim().toLowerCase();
                const type = ['neko', 'kemonomimi', 'gah', 'coffee', 'food', 'holo', 'kanna'].includes(query) ? query : 'neko';
                const results = await Promise.all(Array.from({length: Math.min(opts.count || 12, 16)}, () => fetch(`https://nekobot.xyz/api/image?type=${type}`).then(r => r.json()).catch(() => null)));
                return [...new Set(results.filter(r => r && r.message).map(d => d.message))].map(url => ({ url, tags: [type, 'nekobot'], nsfw: false, src: 'nekobot' }));
            },
            tags: ['neko', 'kemonomimi', 'gah', 'coffee', 'food', 'holo', 'kanna']
        },
        'thecatapi': {
            label: '🐾 Pet & Beast DB',
            sfw: true, nsfw: false,
            async fetch(opts = {}) {
                const r = await fetch('https://api.thecatapi.com/v1/images/search?limit=12');
                if (!r.ok) return [];
                const d = await r.json();
                return (d || []).map(i => ({
                    url: i.url,
                    tags: ['cute', 'pet', 'familiar', 'beast', 'cat'],
                    nsfw: false,
                    src: 'thecatapi'
                }));
            },
            tags: ['cute', 'pet', 'familiar', 'beast', 'cat']
        },
        'local': {
            label: '📁 Local',
            sfw: true, nsfw: false,
            fetch: async () => []
        }
    };

    // ========== MODULE 1: PROMPT INJECTION (EVENT HOOKS - KHÔNG XÂM LẤN AUTHOR'S NOTE) ==========
    function setupPromptInjection() {
        if (PD._vnClickHook) {
            PD.removeEventListener('click', PD._vnClickHook, true);
            PD.removeEventListener('keydown', PD._vnClickHook, true);
            delete PD._vnClickHook;
        }
        // Luôn dọn dẹp sạch sẽ marker cũ khỏi Author's Note / extensionPrompts của người dùng
        cleanUpLegacyAuthorNote();
        if (!CFG.enabled) return;

        // Đăng ký qua SillyTavern eventSource chuẩn (Event Hooks)
        try {
            const ctx = PW.SillyTavern && PW.SillyTavern.getContext ? PW.SillyTavern.getContext() : null;
            if (ctx && ctx.eventSource && ctx.event_types) {
                // --- CHỐNG RÒ RỈ BỘ NHỚ EVENT SOURCE ---
                if (window._vnEventHandlers && ctx.eventSource.off) {
                    window._vnEventHandlers.forEach(({ event, handler }) => {
                        ctx.eventSource.off(event, handler);
                    });
                }
                window._vnEventHandlers = [];
                const addEv = (event, handler) => {
                    if (event && ctx.eventSource.on) {
                        ctx.eventSource.on(event, handler);
                        window._vnEventHandlers.push({ event, handler });
                    }
                };

                // Lắng nghe tất cả các sự kiện dựng prompt để tiêm hướng dẫn vào luồng xử lý (In-Chat @ Depth 0)
                const promptEvents = [
                    ctx.event_types.CHAT_COMPLETION_PROMPT_READY,
                    ctx.event_types.GENERATE_AFTER_COMBINE_PROMPTS,
                    ctx.event_types.TEXT_COMPLETION_PROMPT_READY,
                    ctx.event_types.PROMPT_READY,
                    'chat_completion_prompt_ready',
                    'generate_after_combine_prompts',
                    'text_completion_prompt_ready',
                    'prompt_ready'
                ];
                promptEvents.forEach(evt => {
                    if (evt) {
                        addEv(evt, (payload) => {
                            injectVnDialoguePrompt(payload, typeof evt === 'string' ? evt : 'PROMPT_READY');
                        });
                    }
                });

                // --- TỐI ƯU STREAMING THỜI GIAN THỰC (TỚI ĐÂU RENDER TỚI ĐÓ, KHÔNG NHÁY) ---
                const scheduleApplyStreaming = () => {
                    if (!CFG.enabled || !CFG.renderMode) return;
                    const chat = PD.getElementById('chat');
                    const mesList = chat ? chat.getElementsByClassName('mes') : null;
                    if (!mesList || !mesList.length) return;
                    const lastMes = mesList[mesList.length - 1];
                    if (lastMes && !lastMes.classList.contains('is_user')) {
                        scheduleStreamingRender(lastMes);
                    }
                };

                const et = ctx.event_types;
                if (et.STREAM_TOKEN_RECEIVED) addEv(et.STREAM_TOKEN_RECEIVED, scheduleApplyStreaming);
                if (et.STREAM_MESSAGE) addEv(et.STREAM_MESSAGE, scheduleApplyStreaming);

                const finishEvents = [
                    et.MESSAGE_RECEIVED,
                    et.CHARACTER_MESSAGE_RENDERED,
                    et.USER_MESSAGE_RENDERED,
                    et.MESSAGE_UPDATED,
                    et.STREAM_END,
                    et.GENERATION_STOPPED,
                    et.GENERATION_ENDED,
                    et.CHAT_CHANGED
                ];
                finishEvents.forEach(ev => {
                    if (ev) {
                        addEv(ev, () => {
                            if (ev === et.CHAT_CHANGED) {
                                for (const k in AVATAR_CACHE) delete AVATAR_CACHE[k];
                            }
                            clearTimeout(window._vnStreamSafetyTimer);
                            scheduleFinishRender(ev === et.CHAT_CHANGED);
                        });
                    }
                });
            }
        } catch (err) { }
    }

    function cleanUpLegacyAuthorNote() {
        try {
            const ctx = PW.SillyTavern && PW.SillyTavern.getContext ? PW.SillyTavern.getContext() : null;
            if (ctx) {
                if (typeof ctx.setExtensionPrompt === 'function') {
                    ctx.setExtensionPrompt('vn_dialogue_format', '', 0, 0, false, 0);
                    delete ctx.extensionPrompts?.['vn_dialogue_format'];
                } else if (ctx.extensionPrompts) {
                    delete ctx.extensionPrompts['vn_dialogue_format'];
                }
            }
        } catch (e) { }

        try {
            const marker = 'vn_dialogue_format_marker';
            const startMark = `<!-- ${marker}_start -->`;
            const endMark = `<!-- ${marker}_end -->`;
            const selectors = [
                '#authors_note_textarea',
                '#extension_floating_prompt',
                '#floatingPrompt textarea',
                '#author_note_popup #authors_note_textarea'
            ];
            selectors.forEach(sel => {
                PD.querySelectorAll(sel).forEach(el => {
                    if (el && el.value !== undefined && !el.closest('#character_popup, #character_edit_form, .character_edit, #character_editor, .character-edit-form, #character_author_note_popup, #char_author_note, .character-author-note, #default_author_note_popup, #default_author_note, [id*="char"], [class*="char"], [id*="default"], [class*="default"], [id*="preset"], [class*="preset"]')) {
                        let cur = el.value || '';
                        if (cur.includes(startMark) && cur.includes(endMark)) {
                            const si = cur.indexOf(startMark);
                            const ei = cur.indexOf(endMark) + endMark.length;
                            cur = (cur.slice(0, si) + cur.slice(ei)).replace(/^\n+/g, '').replace(/\n{3,}/g, '\n\n').trim();
                            el.value = cur;
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                            el.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }
                });
            });
        } catch (e) { }
    }

    function getDynamicTagFormatExample(name, tag) {
        const mode = CFG.regexMode || 'at';
        if (mode === 'japanese') return `【${name} [${tag}]】`;
        if (mode === 'curly') return `{${name} [${tag}]}`;
        if (mode === 'brackets') return `[${name} - ${tag}]`;
        if (mode === 'colon') return `${name} [${tag}]:`;
        return `@${name} [${tag}]@`;
    }

    function getEffectivePrompt() {
        let base = CFG.customPrompt ? CFG.customPrompt.trim() : '';
        if (CFG.autoAssignAvatar) {
            const gPrompt = (CFG.genderPrompt || DEFAULT_CONFIG.genderPrompt || '').trim();
            if (gPrompt && !base.includes('[QUY TẮC NHẬN DIỆN GIỚI TÍNH')) {
                base += '\n\n' + gPrompt;
            }
        }
        if (CFG.dynamicContextImages) {
            let charTagsList = '';
            Object.keys(CFG.characters).forEach(cName => {
                const ch = CFG.characters[cName];
                if (ch && Array.isArray(ch.expressions) && ch.expressions.length > 0) {
                    const validLabels = ch.expressions.map(e => e && e.label ? e.label.trim() : '').filter(Boolean);
                    if (validLabels.length > 0) {
                        charTagsList += `- ${cName}: [${validLabels.join(', ')}]\n`;
                    }
                }
            });
            if (charTagsList) {
                let dynPrompt = (CFG.dynamicPrompt || DEFAULT_CONFIG.dynamicPrompt || '').trim();
                dynPrompt = dynPrompt
                    .replace(/\{\{charTagsList\}\}/gi, charTagsList.trim())
                    .replace(/\{\{char_tags_list\}\}/gi, charTagsList.trim())
                    .replace(/\{\{dynamicTagsList\}\}/gi, charTagsList.trim())
                    .replace(/\{\{charTags\}\}/gi, charTagsList.trim())
                    .replace(/\{\{labels\}\}/gi, charTagsList.trim())
                    .replace(/\{\{dynamic_tags\}\}/gi, charTagsList.trim())
                    .replace(/\{\{danh_sach_nhan\}\}/gi, charTagsList.trim())
                    .replace(/\{\{tagFormatExample\}\}/gi, getDynamicTagFormatExample('TênNhânVật', 'TênNhãn'))
                    .replace(/\{\{example1\}\}/gi, getDynamicTagFormatExample('Kazumi', 'Ăn kem'))
                    .replace(/\{\{example2\}\}/gi, getDynamicTagFormatExample('Kazumi', 'buồn'));

                // Nếu dùng mẫu mặc định (@TênNhânVật [TênNhãn]@), tự động chuyển theo regexMode hiện tại
                if ((CFG.dynamicPrompt || '').trim() === DEFAULT_CONFIG.dynamicPrompt.trim() || !CFG.dynamicPrompt) {
                    dynPrompt = dynPrompt
                        .replace(/@TênNhânVật \[TênNhãn\]@/g, getDynamicTagFormatExample('TênNhânVật', 'TênNhãn'))
                        .replace(/@Kazumi \[Ăn kem\]@/g, getDynamicTagFormatExample('Kazumi', 'Ăn kem'))
                        .replace(/@Kazumi \[buồn\]@/g, getDynamicTagFormatExample('Kazumi', 'buồn'));
                }

                const checkHeader = dynPrompt.split('\n')[0].trim();
                if (!base.includes('[QUY TẮC GẮN NHÃN ẢNH NGỮ CẢNH ĐỘNG') && (!checkHeader || !base.includes(checkHeader))) {
                    base += '\n\n' + dynPrompt;
                }
            }
        }
        return base;
    }

    function injectVnDialoguePrompt(payload, evtName) {
        if (!CFG.enabled || !CFG.promptInjection) return;
        if (!payload) return;

        const customPrompt = getEffectivePrompt();
        if (!customPrompt) return;

        // Chống bơm kép (Anti-double injection)
        if (payload._vnDialogueInjected || (Array.isArray(payload) && payload._vnDialogueInjected)) return;

        // Bọc khối luật theo cấu hình (Wrap Rule Block)
        let finalPrompt = customPrompt;
        if (CFG.wrapRuleBlock !== false) {
            finalPrompt = `<!-- vn_dialogue_format_marker_start -->\n${customPrompt}\n<!-- vn_dialogue_format_marker_end -->`;
        }

        const target = CFG.injectTarget || 'in_chat';
        const role = CFG.injectRole || 'system';
        const depth = parseInt(CFG.injectDepth, 10) || 0;

        let targetArray = null;
        if (Array.isArray(payload)) {
            targetArray = payload;
        } else if (payload && Array.isArray(payload.messages)) {
            targetArray = payload.messages;
        } else if (payload && Array.isArray(payload.chat)) {
            targetArray = payload.chat;
        }

        if (targetArray) {
            // Kiểm tra chống trùng lặp nội dung
            if (targetArray.some(m => m && (m._vnDialogueInjected || (typeof m.content === 'string' && m.content.includes(customPrompt))))) {
                return;
            }

            targetArray._vnDialogueInjected = true;
            if (!payload._vnDialogueInjected) payload._vnDialogueInjected = true;

            if (target === 'in_prompt') {
                const sysMsg = targetArray.find(m => m && (m.role === 'system' || m.role === 0));
                if (sysMsg) {
                    sysMsg.content += `\n\n${finalPrompt}`;
                    sysMsg._vnDialogueInjected = true;
                } else {
                    targetArray.unshift({ role: role, content: finalPrompt, _vnDialogueInjected: true });
                }
            } else if (target === 'after_prompt') {
                targetArray.push({ role: role, content: finalPrompt, _vnDialogueInjected: true });
            } else if (target === 'in_chat') {
                if (targetArray.length === 0) {
                    targetArray.push({ role: role, content: finalPrompt, _vnDialogueInjected: true });
                } else {
                    let insertIdx = targetArray.length - 1 - depth;
                    if (insertIdx < 0) insertIdx = 0;
                    targetArray.splice(insertIdx, 0, { role: role, content: finalPrompt, _vnDialogueInjected: true });
                }
            }
        } 
        // Xử lý Text Completion (Chuỗi thô)
        else if (payload && typeof payload.prompt === 'string') {
            if (payload.prompt.includes(customPrompt)) return;
            payload._vnDialogueInjected = true;
            const formattedPrompt = `\n[${role.toUpperCase()}: ${finalPrompt}]\n`;
            if (target === 'in_prompt') {
                payload.prompt = formattedPrompt + payload.prompt;
            } else {
                payload.prompt = payload.prompt + formattedPrompt;
            }
        }
    }

    // Giữ hàm doInjectSystemPrompt để tương thích ngược nếu có sự kiện hay nút bấm nào gọi
    function doInjectSystemPrompt() {
        cleanUpLegacyAuthorNote();
    }

    // ========== MODULE 3: DIALOGUE PARSER & RENDERER (HTML-PRESERVING & MULTI-FORMAT) ==========
    let _cachedRegexNormal = null;
    let _cachedRegexStreaming = null;
    let _cachedRegexKey = '';

    function getDialogueRegex(isStreaming = false) {
        const key = `${CFG.regexMode}_${CFG.customRegex || ''}`;
        if (_cachedRegexKey !== key) {
            _cachedRegexNormal = null;
            _cachedRegexStreaming = null;
            _cachedRegexKey = key;
        }

        if (isStreaming && _cachedRegexStreaming) {
            _cachedRegexStreaming.lastIndex = 0;
            return _cachedRegexStreaming;
        }
        if (!isStreaming && _cachedRegexNormal) {
            _cachedRegexNormal.lastIndex = 0;
            return _cachedRegexNormal;
        }

        // TÁCH RIÊNG xử lý Ngoặc kép và Nháy đơn để không bị đá nhau khi lồng ngoặc
        const D_OPEN = `(?:["“]|&quot;|&#34;|&#x22;|<q[^>]*>)+`;
        const D_CLOSE = isStreaming ? `(?:(?:["”]|&quot;|&#34;|&#x22;|<\\/q>)+|(?=\\n|$))` : `(?:["”]|&quot;|&#34;|&#x22;|<\\/q>)+`;
        const S_OPEN = `(?:['‘])+`;
        const S_CLOSE = isStreaming ? `(?:(?:['’])+|(?=\\n|$))` : `(?:['’])+`;
        const TAG_INLINE = `(?:<(?:b|strong|i|em|span|font|mark|code|small|big)[^>]*>)*`;
        const TAG_INLINE_CLOSE = `(?:<\\/(?:b|strong|i|em|span|font|mark|code|small|big)>)*`;
        const SEP_ANY = `(?:&nbsp;|\\s|[:\\-–—]|<(?:b|strong|i|em|span|font|mark|code|small|big|br)[^>]*>|<\\/(?:b|strong|i|em|span|font|mark|code|small|big)>)*`;

        let res;
        if (CFG.regexMode === 'custom' && CFG.customRegex && CFG.customRegex.trim()) {
            try {
                res = new RegExp(CFG.customRegex, 'gm');
            } catch (e) {
                console.error('[VN Dialogue] Lỗi Custom Regex, dùng mặc định:', e);
            }
        }

        if (!res) {
            let namePart = `${TAG_INLINE}@([^@\\n<>]{1,50})@${TAG_INLINE_CLOSE}${SEP_ANY}`; // @ mặc định (@Tên@)
            if (CFG.regexMode === 'japanese') {
                namePart = `${TAG_INLINE}【([^】\\n<>]{1,50})】${TAG_INLINE_CLOSE}${SEP_ANY}`;
            } else if (CFG.regexMode === 'curly') {
                namePart = `${TAG_INLINE}\\{([^}\\n<>]{1,50})\\}${TAG_INLINE_CLOSE}${SEP_ANY}`;
            } else if (CFG.regexMode === 'brackets') {
                namePart = `${TAG_INLINE}\\[([^\\]\\n<>]{1,50})\\]${TAG_INLINE_CLOSE}${SEP_ANY}`;
            } else if (CFG.regexMode === 'colon') {
                namePart = `${TAG_INLINE}([a-zA-Z0-9_\\-\\s\\[\\]\\(\\)<>\u00C0-\u017F\u3040-\u30FF\u4E00-\u9FAF]{1,50})${TAG_INLINE_CLOSE}\\s*[:：]\\s*`;
            }

            const closeSpan = isStreaming ? `(?:<\\/span>|(?=\\n|$))` : `<\\/span>`;
            const closeEm = isStreaming ? `(?:<\\/em>|(?=\\n|$))` : `<\\/em>`;
            const closeI = isStreaming ? `(?:<\\/i>|(?=\\n|$))` : `<\\/i>`;
            const closeStar = isStreaming ? `(?:\\*+|(?=\\n|$))` : `\\*+`;

            res = new RegExp(
                namePart +
                `(?:` +
                    `${D_OPEN}([\\s\\S]{1,2000}?)${D_CLOSE}` + `|` +
                    `${S_OPEN}([\\s\\S]{1,2000}?)${S_CLOSE}` + `|` +
                    `<span\\b[^>]*>([\\s\\S]{1,2000}?)${closeSpan}` + `|` +
                    `<em[^>]*>([\\s\\S]{1,2000}?)${closeEm}` + `|` +
                    `<i[^>]*>([\\s\\S]{1,2000}?)${closeI}` + `|` +
                    `\\*+([^*\\n<]{1,2000}?)${closeStar}` +
                `)`,
                'gm'
            );
        }

        if (isStreaming) {
            _cachedRegexStreaming = res;
            _cachedRegexStreaming.lastIndex = 0;
        } else {
            _cachedRegexNormal = res;
            _cachedRegexNormal.lastIndex = 0;
        }
        return res;
    }

    const GENDER_PARSE_RE = /^(.*?)\s*\((Nữ|Nam|Waifu|Husbando|Female|Male|F|M|Girl|Boy|nữ|nam)\)\s*(.*?)$/i;
    const TAG_BRACKET_RE = /^(.*?)\s*\[([^\]]+)\]\s*(.*?)$/;
    const TAG_ANGLE_RE = /^(.*?)\s*<([^>]+)>\s*(.*?)$/;
    const TAG_DASH_RE = /^(.*?)\s*-\s*([^\-]+)$/;
    const TAG_PAREN_RE = /^(.*?)\s*\(([^)]+)\)\s*(.*?)$/;
    const _parsedNameCache = new Map();

    function parseNameGenderAndTag(rawName) {
        if (!rawName || typeof rawName !== 'string') return { cleanName: '', gender: null, tag: null };
        const key = rawName.trim();
        if (_parsedNameCache.has(key)) return _parsedNameCache.get(key);
        if (_parsedNameCache.size > 1000) _parsedNameCache.clear();

        let name = key;
        let gender = null;
        let tag = null;

        // 1. Tách giới tính (Nữ/Nam/Waifu/Husbando/...) TRƯỚC để tránh xung đột với thẻ ngữ cảnh
        const genderMatch = name.match(GENDER_PARSE_RE);
        if (genderMatch) {
            const g = genderMatch[2].toLowerCase();
            if (['nữ', 'waifu', 'female', 'f', 'girl'].includes(g)) {
                gender = 'waifu';
            } else if (['nam', 'husbando', 'male', 'm', 'boy'].includes(g)) {
                gender = 'husbando';
            }
            name = (genderMatch[1] + ' ' + genderMatch[3]).trim();
        }

        // 2. Tách nhãn trong ngoặc vuông [Tag] hoặc <Tag> hoặc - Tag
        const tagBracketMatch = name.match(TAG_BRACKET_RE);
        if (tagBracketMatch) {
            tag = tagBracketMatch[2].trim();
            name = (tagBracketMatch[1] + ' ' + tagBracketMatch[3]).trim();
        } else {
            const tagAngleMatch = name.match(TAG_ANGLE_RE);
            if (tagAngleMatch) {
                tag = tagAngleMatch[2].trim();
                name = (tagAngleMatch[1] + ' ' + tagAngleMatch[3]).trim();
            } else {
                const tagDashMatch = name.match(TAG_DASH_RE);
                if (tagDashMatch) {
                    const potentialName = tagDashMatch[1].trim();
                    const potentialTag = tagDashMatch[2].trim();
                    const ch = getCharCfg(potentialName);
                    if (ch && Array.isArray(ch.expressions) && ch.expressions.some(e => e && e.label && e.label.toLowerCase() === potentialTag.toLowerCase())) {
                        name = potentialName;
                        tag = potentialTag;
                    }
                }
            }
        }

        // 3. Nếu vẫn còn ngoặc tròn (...), kiểm tra xem có phải là Tag trong ngoặc tròn không (ví dụ Kazumi (Ăn kem))
        if (!tag) {
            const parenMatch = name.match(TAG_PAREN_RE);
            if (parenMatch) {
                const parenVal = parenMatch[2].trim();
                const potentialName = (parenMatch[1] + ' ' + parenMatch[3]).trim();
                const ch = getCharCfg(potentialName);
                if (ch && Array.isArray(ch.expressions) && ch.expressions.some(e => e && e.label && e.label.toLowerCase() === parenVal.toLowerCase())) {
                    tag = parenVal;
                    name = potentialName;
                } else if (!gender) {
                    tag = parenVal;
                    name = potentialName;
                }
            }
        }

        const res = { cleanName: name.trim(), gender: gender, tag: tag };
        _parsedNameCache.set(key, res);
        return res;
    }

    function parseNameAndGender(rawName) {
        return parseNameGenderAndTag(rawName);
    }

    const FETCHING_AVATARS = new Set();
    async function autoAssignAvatarForChar(cleanName, gender) {
        if (!cleanName || !CFG.characters[cleanName]) return;
        if (CFG.characters[cleanName].avatar && CFG.characters[cleanName].avatar.trim()) return;
        if (FETCHING_AVATARS.has(cleanName.toLowerCase())) return;

        FETCHING_AVATARS.add(cleanName.toLowerCase());
        const cat = (gender === 'husbando') ? 'husbando' : 'waifu';
        try {
            const res = await fetch(`https://nekos.best/api/v2/${cat}?amount=20`);
            if (!res.ok) { FETCHING_AVATARS.delete(cleanName.toLowerCase()); return; }
            const d = await res.json();
            const results = d.results || [];
            if (results.length > 0) {
                const randIdx = Math.floor(Math.random() * results.length);
                const chosenUrl = results[randIdx].url;
                if (chosenUrl && CFG.characters[cleanName] && !CFG.characters[cleanName].avatar) {
                    CFG.characters[cleanName].avatar = chosenUrl;
                    CFG.characters[cleanName].gender = gender || 'waifu';
                    saveConfig(CFG);
                    const countEl = PD.getElementById('vn-char-count');
                    if (countEl) countEl.textContent = Object.keys(CFG.characters).length;
                    if (PD.getElementById('vn-char-grid')) {
                        renderCharGrid();
                    }
                    if (_currentEditChar === cleanName) {
                        const detUrlEl = PD.getElementById('vn-char-det-avatar-url');
                        const detImgEl = PD.getElementById('vn-char-det-avatar');
                        const detInitEl = PD.getElementById('vn-char-det-initial');
                        if (detUrlEl) detUrlEl.value = chosenUrl;
                        if (detImgEl) {
                            detImgEl.src = AVATAR_CACHE[chosenUrl] || getSmoothAvatar(chosenUrl);
                            detImgEl.style.display = 'block';
                        }
                        if (detInitEl) detInitEl.style.display = 'none';
                    }
                    forceReRenderAll();
                    showToast(`🌸 Đã tự động gán ảnh ${cat === 'husbando' ? 'Husbando ⚔️' : 'Waifu 🌸'} từ neko.best cho "${cleanName}"!`, 'success', 4000);
                }
            }
        } catch (e) {
            console.error('[VN Dialogue] Lỗi tự động gán ảnh từ neko.best:', e);
        } finally {
            FETCHING_AVATARS.delete(cleanName.toLowerCase());
        }
    }

    function registerCharIfNew(rawName) {
        if (!rawName || typeof rawName !== 'string') return false;
        if (CFG.autoRegisterChars === false) return false;
        const parsed = parseNameAndGender(rawName);
        const cleanName = parsed.cleanName || rawName.trim();
        const gender = parsed.gender;

        if (!cleanName || cleanName.length < 1 || cleanName.length > 50) return false;
        if (/^[\d\s\-_.,!?]+$/.test(cleanName)) return false;

        const charObj = getCharCfg(cleanName);
        if (!charObj) {
            CFG.characters[cleanName] = { avatar: '', color: getNameColor(cleanName), gender: gender || 'waifu' };
            saveConfig(CFG);
            const countEl = PD.getElementById('vn-char-count');
            if (countEl) countEl.textContent = Object.keys(CFG.characters).length;
            showToast(`✨ Phát hiện nhân vật mới: "${cleanName}"${gender ? ` (${gender === 'husbando' ? 'Nam / Husbando ⚔️' : 'Nữ / Waifu 🌸'})` : ''}`, 'success', 3000);
            if (CFG.autoAssignAvatar) {
                autoAssignAvatarForChar(cleanName, gender || 'waifu');
            }
            return true;
        } else {
            let changed = false;
            if (gender && !charObj.gender) {
                charObj.gender = gender;
                changed = true;
            }
            if (CFG.autoAssignAvatar && !charObj.avatar) {
                autoAssignAvatarForChar(cleanName, gender || charObj.gender || 'waifu');
            } else if (changed) {
                saveConfig(CFG);
            }
            return false;
        }
    }

    function getCharCfg(name) {
        if (!name) return null;
        if (CFG.characters[name]) return CFG.characters[name];
        const lower = name.toLowerCase();
        const key = Object.keys(CFG.characters).find(k => k.toLowerCase() === lower);
        if (key) {
            CFG.characters[name] = CFG.characters[key];
            return CFG.characters[name];
        }
        return null;
    }

    const GRADIENTS = [
        'linear-gradient(135deg,#6366f1,#8b5cf6)',
        'linear-gradient(135deg,#3b82f6,#06b6d4)',
        'linear-gradient(135deg,#10b981,#059669)',
        'linear-gradient(135deg,#f59e0b,#ef4444)',
        'linear-gradient(135deg,#ec4899,#8b5cf6)',
        'linear-gradient(135deg,#14b8a6,#3b82f6)',
    ];
    function getNameColor(name) {
        let h = 0;
        for (let i = 0; i < name.length; i++) h = ((h << 5) - h) + name.charCodeAt(i);
        return GRADIENTS[Math.abs(h) % GRADIENTS.length];
    }

    function buildInitialHtml(name) {
        const initial = escapeHtml(String(name || '?').charAt(0).toUpperCase() || '?');
        const charCfg = getCharCfg(name);
        const color = safeCssValue(charCfg && charCfg.color ? charCfg.color : getNameColor(name), '#4f46e5');
        return `<div class="vn-avatar vn-no-img" style="background:${escapeAttr(color)}">${initial}</div>`;
    }

    // ========== MODULE: AUTO-MIPMAP THUMBNAILER (Khử vỡ nét ảnh độ phân giải cao) ==========
    const AVATAR_CACHE = {};
    function pruneAvatarCache() {
        const keys = Object.keys(AVATAR_CACHE);
        if (keys.length > 50) {
            keys.slice(0, keys.length - 50).forEach(k => {
                delete AVATAR_CACHE[k];
            });
        }
    }
    function getSmoothAvatar(url) {
        if (!url || typeof url !== 'string') return url;
        if (isLocalImageRef(url)) return resolveImageSrc(url, VN_BLANK_IMG);
        url = safeImageUrl(url);
        if (!url) return VN_BLANK_IMG;
        if (AVATAR_CACHE[url]) return AVATAR_CACHE[url];
        pruneAvatarCache();
        if (/\.(gif|webp|svg)(\?.*)?$/i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
            AVATAR_CACHE[url] = url;
            return url;
        }
        AVATAR_CACHE[url] = url; // Đánh dấu tạm thời ngay lập tức để tránh tải/xử lý mipmap trùng lặp khi có nhiều tin nhắn cùng gọi
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            if (w <= 250 || h <= 250 || w === 0 || h === 0) {
                AVATAR_CACHE[url] = url;
                return;
            }
            try {
                let curW = w;
                let curH = h;
                let curCanvas = PD.createElement('canvas');
                let curCtx = curCanvas.getContext('2d');
                curCanvas.width = curW;
                curCanvas.height = curH;
                curCtx.drawImage(img, 0, 0, curW, curH);

                while (curW * 0.5 >= 200 && curH * 0.5 >= 200) {
                    const nextW = Math.floor(curW * 0.5);
                    const nextH = Math.floor(curH * 0.5);
                    const nextCanvas = PD.createElement('canvas');
                    const nextCtx = nextCanvas.getContext('2d');
                    nextCanvas.width = nextW;
                    nextCanvas.height = nextH;
                    nextCtx.imageSmoothingEnabled = true;
                    nextCtx.imageSmoothingQuality = 'high';
                    nextCtx.drawImage(curCanvas, 0, 0, nextW, nextH);
                    curCanvas = nextCanvas;
                    curW = nextW;
                    curH = nextH;
                }
                const finalW = Math.min(curW, 220);
                const finalH = Math.floor(curH * (finalW / curW));
                const finalCanvas = PD.createElement('canvas');
                const finalCtx = finalCanvas.getContext('2d');
                finalCanvas.width = finalW;
                finalCanvas.height = finalH;
                finalCtx.imageSmoothingEnabled = true;
                finalCtx.imageSmoothingQuality = 'high';
                finalCtx.drawImage(curCanvas, 0, 0, finalW, finalH);

                const dataUrl = finalCanvas.toDataURL('image/png');
                AVATAR_CACHE[url] = dataUrl;
                PD.querySelectorAll('.vn-avatar, .vn-char-card img, .vn-char-detail-avatar, .vn-fav-thumb').forEach(el => {
                    if (el.getAttribute('src') === url || el.dataset.origSrc === url) {
                        el.dataset.origSrc = url;
                        el.src = dataUrl;
                    }
                });
            } catch (e) {
                AVATAR_CACHE[url] = url;
            }
        };
        img.onerror = () => { AVATAR_CACHE[url] = url; };
        img.src = url;
        return url;
    }

    function buildAvatarHtml(name, isStreaming = false, tag = null) {
        const charCfg = getCharCfg(name);
        let avatarPart = '';
        if (charCfg && charCfg.avatar) {
            let targetUrl = charCfg.avatar;
            if (CFG.dynamicContextImages && tag && Array.isArray(charCfg.expressions)) {
                const foundExp = charCfg.expressions.find(e => e && e.label && e.label.toLowerCase() === tag.toLowerCase());
                if (foundExp && foundExp.url && foundExp.url.trim()) {
                    targetUrl = foundExp.url.trim();
                }
            }
            const safeAvatar = safeImageUrl(targetUrl);
            if (safeAvatar) {
                const fallbackSrc = buildInitialSvgData(name);
                const optSrc = (CFG.inchatImgMode === 'always_full') ? resolveImageSrc(safeAvatar, fallbackSrc) : (AVATAR_CACHE[safeAvatar] || getSmoothAvatar(safeAvatar));
                avatarPart = `<img class="vn-avatar" decoding="sync" loading="eager" src="${escapeAttr(optSrc)}" data-orig-src="${escapeAttr(safeAvatar)}" data-vn-fallback-name="${escapeAttr(name)}" alt="${escapeAttr(name)}" data-vn-avatar-fit="${escapeAttr(getAvatarViewConfig(charCfg).avatarFit)}" style="${escapeAttr(getAvatarInlineStyle(charCfg))}">`;
            } else {
                avatarPart = buildInitialHtml(name);
            }
        } else {
            avatarPart = buildInitialHtml(name);
        }
        const viewCfg = getAvatarViewConfig(charCfg || {});
        return `<div class="vn-avatar-wrap"><div class="vn-avatar-viewport" data-vn-avatar-fit="${escapeAttr(viewCfg.avatarFit)}" data-vn-avatar-zoom="${escapeAttr(viewCfg.avatarZoom)}">${avatarPart}</div></div>`;
    }

    let _blockHtmlCache = new Map();
    let _cachedCleanPatternStr = null;
    let _cachedCleanPatternRe = null;
    let _streamingRafId = 0;
    let _streamingTargetMes = null;

    function scheduleStreamingRender(mesEl) {
        if (!CFG.enabled || !CFG.renderMode) return;
        if (mesEl) _streamingTargetMes = mesEl;
        if (_streamingRafId) return;
        _streamingRafId = requestAnimationFrame(() => {
            _streamingRafId = 0;
            const target = _streamingTargetMes || (PD.getElementById('chat')?.lastElementChild);
            if (target && !target.classList.contains('is_user')) {
                processMessage(target, true);
            }
            _streamingTargetMes = null;
        });
    }

    function cleanBubbleText(text) {
        if (!text) return '';
        let s = text.trim().normalize('NFC');
        // Nếu người dùng để trống hoặc không cài đặt -> tuân theo tuyệt đối regex, để nguyên!
        if (!CFG.cleanPatterns || !CFG.cleanPatterns.trim()) {
            return s;
        }
        try {
            let pattern = CFG.cleanPatterns.trim();
            if (pattern !== _cachedCleanPatternStr) {
                let parts = pattern.includes('|') ? pattern.split('|') : pattern.split('');
                parts = parts.map(p => p.trim()).filter(Boolean);
                if (parts.length === 0) {
                    _cachedCleanPatternRe = null;
                } else {
                    const escaped = parts.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
                    _cachedCleanPatternRe = new RegExp(`^(?:${escaped})+|(?:${escaped})+$`, 'gi');
                }
                _cachedCleanPatternStr = pattern;
            }
            if (_cachedCleanPatternRe) {
                let prev = '';
                while (s !== prev) {
                    prev = s;
                    _cachedCleanPatternRe.lastIndex = 0;
                    s = s.replace(_cachedCleanPatternRe, '').trim();
                }
            }
        } catch (err) {
            console.error('[VN Dialogue] Clean pattern error:', err);
        }
        return s;
    }

    function buildBlockHtml(name, content, isThought, noAnim = false, isStreaming = false, tag = null) {
        if (isStreaming) {
            const cacheKey = `${name}///${content}///${isThought}///${noAnim}///${CFG.displayStyle}///${CFG.inchatImgMode}///${tag || ''}`;
            if (_blockHtmlCache.has(cacheKey)) {
                return _blockHtmlCache.get(cacheKey);
            }
            if (_blockHtmlCache.size > 500) _blockHtmlCache.clear();
            const res = _buildBlockHtmlInternal(name, content, isThought, noAnim, true, tag);
            _blockHtmlCache.set(cacheKey, res);
            return res;
        } else {
            if (_blockHtmlCache.size > 0) _blockHtmlCache.clear();
        }
        return _buildBlockHtmlInternal(name, content, isThought, noAnim, false, tag);
    }

    function _buildBlockHtmlInternal(name, content, isThought, noAnim, isStreaming, tag = null) {
        const isRight = isThought;
        const avatarHtml = buildAvatarHtml(name, isStreaming, tag);
        const tagText = name + (tag && CFG.dynamicContextImages ? ` · ✦ ${tag}` : '') + (isThought ? ' · ✦ Suy nghĩ' : '');
        const cleanContent = cleanBubbleText(content).normalize('NFC');
        const bubbleText = sanitizeInlineHtml(cleanContent); // FREE HTML MODE: render nguyên HTML trong bubble để hỗ trợ style/custom markup
        const charCfg = getCharCfg(name);
        const color = safeCssValue(charCfg && charCfg.color ? charCfg.color : getNameColor(name), '#818cf8');
        const tagStyle = `background:${color};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;`;
        let customTextStyle = '';
        if (CFG.customSizing && CFG.customSizing.textColorMode === 'per_char' && charCfg && charCfg.textColor) {
            const safeTextColor = safeCssValue(charCfg.textColor, '');
            if (safeTextColor) customTextStyle = ` style="color:${escapeAttr(safeTextColor)} !important;"`;
        }
        return `<div class="vn-block${isRight ? ' vn-right' : ''}${noAnim ? ' vn-no-anim' : ''}${isStreaming ? ' vn-streaming' : ''}" data-name="${escapeAttr(name)}" data-vn-tag="${escapeAttr(tag || '')}">${avatarHtml}<div class="vn-bubble${isThought ? ' vn-thought' : ''}"${customTextStyle}><div class="vn-bubble-tag" style="${escapeAttr(tagStyle)}">${escapeHtml(tagText)}</div><div class="vn-bubble-text"${customTextStyle}>${bubbleText}</div></div></div>`;
    }

    function isElementStreaming(el) {
        if (!el) return false;
        const mes = el.classList && el.classList.contains('mes') ? el : (el.nodeType === 3 ? el.parentNode?.closest('.mes') : el.closest?.('.mes'));
        if (!mes) return false;
        if (mes.classList.contains('is_streaming') || 
            mes.classList.contains('streaming') || 
            mes.getAttribute('is_streaming') === 'true' ||
            (mes.querySelector && mes.querySelector('.is_streaming, .streaming, [is_streaming="true"]') !== null)) {
            return true;
        }
        const ctx = window.SillyTavern?.getContext?.() || window;
        const isGen = ctx.is_generating || window.is_generating || document.body.classList.contains('generating') || document.body.classList.contains('is_generating');
        if (isGen) {
            let next = mes.nextElementSibling;
            while (next && !next.classList?.contains('mes')) {
                next = next.nextElementSibling;
            }
            if (!next) return true;
        }
        return false;
    }

    const SPAN_STYLE_RE = /<span\b[^>]*style=["']([^"']*)["']/i;
    const ITALIC_STYLE_RE = /font-style\s*:\s*italic/i;
    const EMPTY_P_BR_RE = /<p>\s*(?:<br\s*\/?>)?\s*<\/p>/gi;

    function processMessage(mesEl, isStreaming = false) {
        const textEl = mesEl.querySelector('.mes_text');
        if (!textEl) return;
        const isUser = mesEl.getAttribute('is_user') === 'true' || mesEl.classList.contains('is_user');
        if (isUser) return;

        const actuallyStreaming = isStreaming || isElementStreaming(mesEl);
        if (!actuallyStreaming && typeof _blockHtmlCache !== 'undefined') {
            _blockHtmlCache.clear();
        }

        const hasBlock = textEl.querySelector('.vn-block') !== null;
        let raw = (textEl.innerHTML || '').normalize('NFC');
        const needsVersionRerender = hasBlock && mesEl.dataset.vnVersion !== SCRIPT_VERSION && !!mesEl.dataset.vnOriginalHtml && !actuallyStreaming;
        if (needsVersionRerender) {
            textEl.innerHTML = mesEl.dataset.vnOriginalHtml;
            raw = (textEl.innerHTML || '').normalize('NFC');
            delete mesEl.dataset.vnProcessed;
        }
        const re = getDialogueRegex(actuallyStreaming);
        re.lastIndex = 0;
        const hasUnrendered = re.test(raw);

        // Nếu đã có block và không còn thẻ lời thoại nào chưa render -> Bỏ qua!
        if (hasBlock && !needsVersionRerender && !hasUnrendered && mesEl.dataset.vnStyle === CFG.displayStyle) {
            return;
        }
        if (!hasUnrendered && !hasBlock) return;

        const isAlreadyProcessed = mesEl.dataset.vnProcessed === '1';
        if (!hasBlock || (hasUnrendered && !actuallyStreaming)) {
            mesEl.dataset.vnOriginalHtml = raw;
        }

        mesEl.dataset.vnProcessed = '1';
        mesEl.dataset.vnVersion = SCRIPT_VERSION;
        mesEl.dataset.vnStyle = CFG.displayStyle;

        re.lastIndex = 0;
        let newHtml = raw.replace(re, (match, g1, g2, g3, g4, g5, g6, g7) => {
            const rawName = (g1 || '').trim();
            const parsed = parseNameGenderAndTag(rawName);
            const name = parsed.cleanName || rawName;
            const tag = parsed.tag || null;
            if (CFG.autoRegisterChars === false && !getCharCfg(name)) {
                return match;
            }
            registerCharIfNew(rawName);
            // Lấy nội dung từ các group (g2: ngoặc kép, g3: nháy đơn, g4: span, g5: em, g6: i, g7: hoa thị)
            const content = (g2 || g3 || g4 || g5 || g6 || g7 || '').trim();
            const spanStyle = (match.match(SPAN_STYLE_RE) || [])[1] || '';
            // Đánh dấu suy nghĩ nội tâm (em/i/hoa thị, hoặc span có font-style: italic)
            const isThought = (g5 !== undefined || g6 !== undefined || g7 !== undefined) ||
                ITALIC_STYLE_RE.test(spanStyle) ||
                (CFG.regexMode === 'custom' && (match.includes('*') || match.includes('<em>') || match.includes('<i>')));
            return buildBlockHtml(name, content, isThought, actuallyStreaming || isAlreadyProcessed, actuallyStreaming, tag);
        });

        newHtml = newHtml.replace(EMPTY_P_BR_RE, '');

        if (newHtml !== raw) {
            mesEl._vnMutating = true;
            textEl.innerHTML = newHtml;
            textEl.querySelectorAll('img[data-orig-src]').forEach(img => {
                if (isLocalImageRef(img.dataset.origSrc)) hydrateLocalImageEl(img, img.dataset.origSrc);
            });
            Promise.resolve().then(() => { delete mesEl._vnMutating; });
        }
    }

    function scheduleFinishRender(fullScan = false) {
        clearTimeout(PD._vnFinishRenderTimer);
        PD._vnFinishRenderTimer = setTimeout(() => {
            if (!CFG.enabled || !CFG.renderMode) return;
            if (fullScan) {
                processAllMessages();
                return;
            }
            const mesList = PD.querySelectorAll('#chat .mes');
            if (mesList.length) processMessage(mesList[mesList.length - 1], false);
        }, 90);
    }

    function processAllMessages() {
        if (!CFG.enabled || !CFG.renderMode) return;
        const chat = PD.getElementById('chat');
        if (!chat) return;
        const mesList = chat.getElementsByClassName('mes');
        for (let i = 0; i < mesList.length; i++) {
            processMessage(mesList[i]);
        }
    }

    function forceReRenderAll() {
        const chat = PD.getElementById('chat');
        const mesList = chat ? chat.getElementsByClassName('mes') : PD.querySelectorAll('#chat .mes');
        for (let i = 0; i < mesList.length; i++) {
            const m = mesList[i];
            delete m.dataset.vnProcessed;
            delete m.dataset.vnVersion;
            
            // Cập nhật ngay style cho container .mes
            if (CFG.renderMode) {
                m.dataset.vnStyle = CFG.displayStyle;
            } else {
                delete m.dataset.vnStyle;
            }
            
            // Cập nhật trực tiếp DOM cho các khối .vn-block đang hiển thị (phòng trường hợp tin nhắn cũ chưa có vnOriginalHtml)
            const textEl = m.querySelector('.mes_text');
            if (textEl && textEl.querySelector('.vn-block')) {
                if (m.dataset.vnOriginalHtml) {
                    textEl.innerHTML = m.dataset.vnOriginalHtml;
                } else {
                    textEl.querySelectorAll('.vn-block').forEach(block => {
                        const charNameEl = block.querySelector('.vn-charname');
                        const name = block.dataset.name || (charNameEl ? charNameEl.textContent.trim() : '');
                        const tag = block.dataset.vnTag || null;
                        if (name) {
                            const charCfg = getCharCfg(name);
                            const color = safeCssValue(charCfg && charCfg.color ? charCfg.color : getNameColor(name), '#818cf8');
                            const avatarWrap = block.querySelector('.vn-avatar-wrap');
                            if (avatarWrap) {
                                avatarWrap.outerHTML = buildAvatarHtml(name, false, tag);
                            }
                            const tagEl = block.querySelector('.vn-bubble-tag');
                            if (tagEl) {
                                tagEl.style.cssText = `background:${color};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;`;
                                const tagText = name + (tag && CFG.dynamicContextImages ? ` · ✦ ${tag}` : '') + (block.querySelector('.vn-bubble.vn-thought') ? ' · ✦ Suy nghĩ' : '');
                                tagEl.textContent = tagText;
                            }
                        }
                        const bubbleTextEl = block.querySelector('.vn-bubble-text');
                        if (bubbleTextEl) {
                            bubbleTextEl.innerHTML = sanitizeInlineHtml(cleanBubbleText(bubbleTextEl.innerHTML || bubbleTextEl.textContent));
                        }
                    });
                }
            }
        }
        if (CFG.enabled && CFG.renderMode) processAllMessages();
    }

    function setupObserver() {
        if (PD._vnObserver) PD._vnObserver.disconnect();
        const chat = PD.getElementById('chat');
        if (!chat) { setTimeout(setupObserver, 800); return; }

        const getMesEl = (node) => {
            if (!node) return null;
            const el = node.nodeType === 3 ? node.parentNode : node;
            return el && el.closest ? el.closest('.mes') : null;
        };

        PD._vnObserver = new MutationObserver((mutations) => {
            if (!CFG.enabled || !CFG.renderMode) return;
            const seen = new Set();
            for (const mut of mutations) {
                const targetMes = getMesEl(mut.target);
                if (targetMes && targetMes._vnMutating) continue;
                for (const node of mut.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    if (node.classList && node.classList.contains('mes')) {
                        clearTimeout(node._vnTimer);
                        if (!seen.has(node)) {
                            seen.add(node);
                            const isStr = isElementStreaming(node);
                            if (isStr) {
                                scheduleStreamingRender(node);
                            } else {
                                processMessage(node, false);
                            }
                        }
                    }
                    node.querySelectorAll && node.querySelectorAll('.mes').forEach(m => {
                        clearTimeout(m._vnTimer);
                        if (!seen.has(m)) {
                            seen.add(m);
                            const isStr = isElementStreaming(m);
                            if (isStr) {
                                scheduleStreamingRender(m);
                            } else {
                                processMessage(m, false);
                            }
                        }
                    });
                }
                if (mut.type === 'childList' || mut.type === 'characterData') {
                    const mesEl = getMesEl(mut.target);
                    if (mesEl && !mesEl._vnMutating) {
                        clearTimeout(mesEl._vnTimer);
                        if (!seen.has(mesEl)) {
                            seen.add(mesEl);
                            const isStr = isElementStreaming(mesEl);
                            if (isStr) {
                                scheduleStreamingRender(mesEl);
                            } else {
                                processMessage(mesEl, false);
                            }
                        }
                    }
                }
            }
        });
        PD._vnObserver.observe(chat, { childList: true, subtree: true, characterData: true });
        forceReRenderAll();
    }

    // ========== MODULE 2: IMAGE PICKER STATE & MODAL ==========
    let imgPickerState = {
        currentSrc: 'nekos.best',
        tag: '',
        nsfw: false,
        images: [],
        offset: 0,
        localPage: 0,
        urlPage: 0,
        loading: false,
        selectedUrl: '',
        targetChar: null
    };
    let imgPickerCallback = null;

    function buildImgPickerModal() {
        if (PD.getElementById('vn-img-modal-overlay')) return;
        const overlay = PD.createElement('div');
        overlay.id = 'vn-img-modal-overlay';
        overlay.innerHTML = `
<div class="vn-img-modal">
  <div class="vn-img-modal-header">
    <div class="vn-img-modal-title">🖼️ Chọn ảnh nhân vật <span id="vn-ipm-charname" style="color:#a78bfa"></span></div>
    <div class="vn-img-toolbar" style="flex-wrap: nowrap; gap: 4px;">
      <button class="vn-src-nav-btn" id="vn-ipm-scroll-left" title="Cuộn tab sang trái">◄</button>
      <div class="vn-img-src-tabs" id="vn-ipm-srctabs">
        <button class="vn-src-tab active" data-src="nekos.best">nekos.best</button>
        <button class="vn-src-tab" data-src="safebooru">🌟 Safebooru</button>
        <button class="vn-src-tab" data-src="danbooru">Danbooru</button>
        <button class="vn-src-tab" data-src="myanimelist">MyAnimeList</button>
        <button class="vn-src-tab" data-src="anilist">AniList DB</button>
        <button class="vn-src-tab" data-src="pic.re">Pic.re Art</button>
        <button class="vn-src-tab" data-src="nekos.life">nekos.life</button>
        <button class="vn-src-tab" data-src="nekos.moe">nekos.moe</button>
        <button class="vn-src-tab" data-src="otakugifs">OtakuGIFs</button>
        <button class="vn-src-tab" data-src="nekobot">Nekobot DB</button>
        <button class="vn-src-tab" data-src="thecatapi">🐾 Pet & Beast</button>
        <button class="vn-src-tab" data-src="local">📁 Kho Local</button>
        <button class="vn-src-tab" data-src="url">🔗 Kho Link</button>
      </div>
      <button class="vn-src-nav-btn" id="vn-ipm-scroll-right" title="Cuộn tab sang phải">►</button>
    </div>
    <div class="vn-img-toolbar" style="margin-top:10px;" id="vn-ipm-searchtoolbar">
      <input class="vn-img-search" id="vn-ipm-search" placeholder="Tìm từ khoá / tag..." />
      <select class="vn-img-search" id="vn-ipm-tag" style="max-width:140px;"><option value="">-- Chọn Tag --</option></select>
      <label class="vn-nsfw-toggle"><input type="checkbox" id="vn-ipm-nsfw" /> NSFW</label>
      <button class="vn-btn vn-btn-primary vn-btn-sm" id="vn-ipm-fetch">⚡ Tải ảnh</button>
    </div>
    <div id="vn-ipm-url-row" style="display:none;margin-top:10px;">
      <div style="display:flex;gap:8px;align-items:center;">
        <input class="vn-img-search" id="vn-ipm-urlbox" placeholder="Dán đường dẫn trực tiếp (https://...) vào đây..." style="width:100%;" />
        <button class="vn-btn vn-btn-primary vn-btn-sm" id="vn-ipm-url-save" style="white-space:nowrap;">➕ Lưu link</button>
      </div>
      <div style="font-size:11px;color:#94a3b8;margin-top:6px;line-height:1.5;">Link ảnh sẽ được kiểm tra tải thử trước khi lưu. Link lỗi sẽ không lưu hoặc tự xoá khỏi <b>Kho Link</b> khi phát hiện lỗi.</div>
    </div>
    <div id="vn-ipm-local-row" style="display:none;margin-top:10px;">
      <input type="file" id="vn-ipm-fileinput" accept="image/*" multiple style="display:none;" />
      <button class="vn-btn vn-btn-secondary vn-btn-sm" id="vn-ipm-filebtn" style="width:100%;">📂 Import ảnh từ máy tính vào Kho Local offline</button>
      <div style="font-size:11px;color:#94a3b8;margin-top:6px;line-height:1.5;">Ảnh Local được lưu trong IndexedDB của trình duyệt. Lần sau vào tab <b>Kho Local</b> để chọn lại ngay.</div>
    </div>
  </div>
  <div class="vn-img-modal-body">
    <div style="font-size:11px;color:#818cf8;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">⭐ Ảnh yêu thích (Favourites)</div>
    <div class="vn-fav-bar" id="vn-ipm-favbar"></div>
    <div style="font-size:11px;color:#818cf8;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;margin-top:4px;">Kết quả tìm kiếm</div>
    <div class="vn-img-grid" id="vn-ipm-grid"></div>
    <div id="vn-ipm-full-preview-box" style="display:none; margin-top:20px; padding:16px; background:rgba(0,0,0,0.45); border:1px solid rgba(129,140,248,0.4); border-radius:14px; text-align:center; box-shadow: 0 10px 30px rgba(0,0,0,0.6); flex-shrink:0; max-width:100%; box-sizing:border-box; overflow:hidden;">
      <div style="font-size:12px; color:#a78bfa; font-weight:700; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between; gap:6px; flex-wrap:wrap;">
        <span>📐 XEM TRƯỚC ẢNH GỐC (TỶ LỆ THỰC TẾ)</span>
        <button class="vn-btn vn-btn-secondary vn-btn-sm" id="vn-ipm-back-to-list" style="padding:5px 12px; font-size:11.5px; border-radius:8px; display:flex; align-items:center; gap:4px;">⬅️ Quay lại danh sách ảnh</button>
      </div>
      <div style="display:flex; justify-content:center; align-items:center; min-height:80px; max-height:min(460px, 50vh); overflow:hidden;">
        <img id="vn-ipm-full-preview-img" style="max-width:100%; max-height:min(440px, 48vh); width:auto; height:auto; object-fit:contain; border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,0.7);" />
      </div>
      <div id="vn-ipm-full-preview-info" style="font-size:11.5px; color:#94a3b8; margin-top:12px; word-break:break-all;"></div>
    </div>
  </div>
  <div class="vn-img-modal-footer">
    <img class="vn-img-preview" id="vn-ipm-preview" />
    <div class="vn-selected-url" id="vn-ipm-selurl">Chưa chọn ảnh nào</div>
    <button class="vn-btn vn-btn-secondary vn-btn-sm" id="vn-ipm-close">Huỷ</button>
    <button class="vn-btn vn-btn-primary vn-btn-sm" id="vn-ipm-confirm">✓ Xác nhận chọn ảnh này</button>
  </div>
</div>`;
        PD.body.appendChild(overlay);
        setupImgPickerEvents();
    }

    function setupImgPickerEvents() {
        const $ = id => PD.getElementById(id) || {
            addEventListener: () => {},
            classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
            style: {},
            value: '',
            checked: false,
            focus: () => {},
            click: () => {},
            querySelectorAll: () => [],
            querySelector: () => null,
            setAttribute: () => {},
            getAttribute: () => null,
            removeAttribute: () => {},
            dataset: {},
            scrollBy: () => {},
            scrollTop: 0,
            scrollHeight: 0,
            innerHTML: '',
            textContent: '',
            appendChild: () => {},
            removeChild: () => {},
            remove: () => {}
        };
        const overlay = $('vn-img-modal-overlay');

        const srcTabs = $('vn-ipm-srctabs');
        if ($('vn-ipm-scroll-left')) {
            $('vn-ipm-scroll-left').addEventListener('click', () => {
                srcTabs.scrollBy({ left: -220, behavior: 'smooth' });
            });
        }
        if ($('vn-ipm-scroll-right')) {
            $('vn-ipm-scroll-right').addEventListener('click', () => {
                srcTabs.scrollBy({ left: 220, behavior: 'smooth' });
            });
        }

        srcTabs.addEventListener('click', e => {
            const tab = e.target.closest('.vn-src-tab');
            if (!tab) return;
            const src = tab.dataset.src;
            PD.querySelectorAll('.vn-src-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            imgPickerState.currentSrc = src;
            imgPickerState.selectedUrl = '';
            const searchEl = $('vn-ipm-search');
            if ((src === 'local' || src === 'url') && searchEl) searchEl.value = '';
            $('vn-ipm-searchtoolbar').style.display = (src === 'local' || src === 'url') ? 'none' : 'flex';
            $('vn-ipm-url-row').style.display = src === 'url' ? 'block' : 'none';
            $('vn-ipm-local-row').style.display = src === 'local' ? 'block' : 'none';
            const fullBox = $('vn-ipm-full-preview-box');
            if (fullBox) fullBox.style.display = 'none';

            const tagSel = $('vn-ipm-tag');
            const srcDef = API_SOURCES[src];
            tagSel.innerHTML = '<option value="">-- Chọn Tag --</option>';
            if (srcDef && srcDef.tags) {
                srcDef.tags.forEach(t => {
                    const o = PD.createElement('option');
                    o.value = t; o.textContent = t; tagSel.appendChild(o);
                });
            }
            if (src === 'local') renderLocalLibraryGrid();
            else if (src === 'url') renderLinkLibraryGrid();
            else {
                const grid = $('vn-ipm-grid');
                if (grid) grid.innerHTML = '<div class="vn-img-placeholder">Nhấn nút "⚡ Tải ảnh" để duyệt kho ảnh anime miễn phí.</div>';
            }
        });

        $('vn-ipm-tag').addEventListener('change', e => { 
            $('vn-ipm-search').value = e.target.value; 
            if (e.target.value !== undefined) fetchImagesForPicker(true);
        });
        $('vn-ipm-fetch').addEventListener('click', () => fetchImagesForPicker(true));
        const nsfwToggle = $('vn-ipm-nsfw');
        if (nsfwToggle) {
            nsfwToggle.addEventListener('change', e => {
                // No longer toggling Rule34 tab
            });
        }
        $('vn-ipm-search').addEventListener('keydown', e => { if (e.key === 'Enter') fetchImagesForPicker(true); });

        // Live filter: gõ vào ô search → lọc ngay các thumbnail đã tải
        $('vn-ipm-search').addEventListener('input', e => {
            const kw = e.target.value.trim().toLowerCase();
            const grid = $('vn-ipm-grid');
            if (!grid) return;
            const cells = grid.querySelectorAll('.vn-img-thumb');
            let visible = 0;
            cells.forEach(cell => {
                const searchText = cell.dataset.searchText || '';
                const match = !kw || searchText.includes(kw) || kw.split(' ').every(w => !w || searchText.includes(w));
                cell.style.display = match ? '' : 'none';
                if (match) visible++;
            });
            // Hiện thị thông báo nếu không có kết quả khớp
            let noMatchEl = grid.querySelector('.vn-live-filter-empty');
            if (kw && visible === 0 && cells.length > 0) {
                if (!noMatchEl) {
                    noMatchEl = PD.createElement('div');
                    noMatchEl.className = 'vn-live-filter-empty vn-img-placeholder';
                    noMatchEl.style.cssText = 'grid-column:1/-1; padding:16px; text-align:center; color:#94a3b8; font-size:13px;';
                    grid.appendChild(noMatchEl);
                }
                noMatchEl.textContent = `Không có ảnh khớp "${kw}" trong kết quả hiện tại. Nhấn [⚡ Tải ảnh] để tỏi tải batch mới theo từ khoá.`;
            } else if (noMatchEl) {
                noMatchEl.remove();
            }
        });

        const backToList = () => {
            const fullBox = $('vn-ipm-full-preview-box');
            if (fullBox) fullBox.style.display = 'none';
            // Scroll modal body itself, NOT the page
            const modalBody = PD.querySelector('.vn-img-modal-body');
            if (modalBody) modalBody.scrollTop = 0;
        };
        if ($('vn-ipm-back-to-list')) $('vn-ipm-back-to-list').addEventListener('click', backToList);

        // Local Upload -> IndexedDB. Không đặt giới hạn dung lượng ở tầng script; trình duyệt sẽ tự quản lý quota.
        $('vn-ipm-filebtn').addEventListener('click', () => $('vn-ipm-fileinput').click());
        $('vn-ipm-fileinput').addEventListener('change', e => {
            const files = Array.from(e.target.files || []).filter(f => f && f.type && f.type.startsWith('image/'));
            if (files.length === 0) return;
            (async () => {
                try {
                    let firstRef = '';
                    for (const file of files) {
                        const ref = await putLocalImageBlob(file, { name: file.name, type: file.type, size: file.size, lastModified: file.lastModified });
                        if (!firstRef) firstRef = ref;
                    }
                    if (firstRef) selectImage(firstRef);
                    await renderLocalLibraryGrid();
                    showToast(`Đã import ${files.length} ảnh vào Kho Local ✓`, 'success');
                } catch (err) {
                    console.error('[VN Dialogue] Lỗi lưu ảnh Local vào IndexedDB:', err);
                    showToast('Không lưu được ảnh Local vào IndexedDB.', 'error');
                } finally {
                    e.target.value = '';
                }
            })();
        });

        const saveUrlFromBox = async () => {
            const box = $('vn-ipm-urlbox');
            const raw = box ? box.value.trim() : '';
            const normalizedUrl = normalizeUrlLibraryEntry(raw);
            if (!normalizedUrl) { showToast('URL ảnh không hợp lệ. Hãy dùng link http/https trực tiếp.', 'warning'); return; }
            const savedUrl = await saveUrlToLibraryAfterCheck(normalizedUrl);
            if (!savedUrl) return;
            selectImage(savedUrl);
            renderLinkLibraryGrid();
            showToast('Đã kiểm tra và lưu link ảnh vào Kho Link ✓', 'success');
        };
        if ($('vn-ipm-url-save')) $('vn-ipm-url-save').addEventListener('click', saveUrlFromBox);
        if ($('vn-ipm-urlbox')) $('vn-ipm-urlbox').addEventListener('keydown', e => { if (e.key === 'Enter') saveUrlFromBox(); });

        $('vn-ipm-close').addEventListener('click', () => { overlay.classList.remove('show'); });
        $('vn-ipm-confirm').addEventListener('click', async () => {
            const src = imgPickerState.currentSrc;
            let url = imgPickerState.selectedUrl;
            if (src === 'url') {
                const typedUrl = $('vn-ipm-urlbox') ? $('vn-ipm-urlbox').value.trim() : '';
                if (typedUrl) {
                    const normalizedUrl = normalizeUrlLibraryEntry(typedUrl);
                    if (!normalizedUrl) { showToast('URL ảnh không hợp lệ. Hãy dùng link http/https trực tiếp.', 'warning'); return; }
                    const savedUrl = await saveUrlToLibraryAfterCheck(normalizedUrl);
                    if (!savedUrl) return;
                    url = savedUrl;
                } else if (url && !isLocalImageRef(url)) {
                    const ok = await checkImageUrlLoads(url, 9000);
                    if (ok !== 'ok') {
                        removeUrlFromLibrary(url);
                        renderLinkLibraryGrid();
                        showToast('Link ảnh đã chọn bị lỗi nên đã xoá khỏi Kho Link.', 'error', 4500);
                        return;
                    }
                }
            }
            if (!url) { showToast('Hãy chọn hoặc nhập URL ảnh trước!', 'warning'); return; }
            if (imgPickerCallback) imgPickerCallback(url);
            overlay.classList.remove('show');
        });

        renderFavBar();
    }

    function normalizeUrlLibraryEntry(url) {
        const safe = safeImageUrl(url);
        if (!safe || isLocalImageRef(safe) || isLegacyDataImage(safe)) return '';
        try {
            const u = new URL(safe, PW.location && PW.location.href ? PW.location.href : undefined);
            return ['http:', 'https:'].includes(u.protocol) ? u.href : '';
        } catch (e) { return ''; }
    }

    function saveUrlToLibrary(url) {
        const safe = normalizeUrlLibraryEntry(url);
        if (!safe) return '';
        const list = Array.isArray(CFG.linkLibrary) ? CFG.linkLibrary : (CFG.linkLibrary = []);
        CFG.linkLibrary = [safe, ...list.filter(u => u !== safe)].slice(0, 500);
        saveConfig(CFG);
        return safe;
    }

    function removeUrlFromLibrary(url) {
        const safe = normalizeUrlLibraryEntry(url);
        if (!safe) return false;
        const list = Array.isArray(CFG.linkLibrary) ? CFG.linkLibrary : [];
        const next = list.filter(u => normalizeUrlLibraryEntry(u) !== safe);
        const changed = next.length !== list.length;
        if (changed) {
            CFG.linkLibrary = next;
            if (Array.isArray(CFG.favourites)) CFG.favourites = CFG.favourites.filter(u => normalizeUrlLibraryEntry(u) !== safe);
            saveConfig(CFG);
        }
        return changed;
    }

    let vnLinkLibraryRefreshTimer = null;
    function scheduleLinkLibraryRefresh() {
        if (vnLinkLibraryRefreshTimer) clearTimeout(vnLinkLibraryRefreshTimer);
        vnLinkLibraryRefreshTimer = setTimeout(() => {
            vnLinkLibraryRefreshTimer = null;
            if (imgPickerState.currentSrc === 'url') renderLinkLibraryGrid();
            renderFavBar();
        }, 500);
    }

    function checkImageUrlLoads(url, timeoutMs = 9000) {
        const safe = normalizeUrlLibraryEntry(url);
        if (!safe) return Promise.resolve('invalid');
        return new Promise(resolve => {
            let done = false;
            const img = new Image();
            const timer = setTimeout(() => finish('timeout'), timeoutMs);
            function finish(result) {
                if (done) return;
                done = true;
                clearTimeout(timer);
                img.onload = null;
                img.onerror = null;
                resolve(result);
            }
            img.onload = () => {
                if ((img.naturalWidth || 0) > 0 && (img.naturalHeight || 0) > 0) finish('ok');
                else finish('error');
            };
            img.onerror = () => finish('error');
            img.src = safe;
        });
    }

    async function saveUrlToLibraryAfterCheck(url, options = {}) {
        const safe = normalizeUrlLibraryEntry(url);
        if (!safe) return '';
        if (!options.silent) showToast('Đang kiểm tra link ảnh...', 'info', 1200);
        const result = await checkImageUrlLoads(safe, options.timeoutMs || 9000);
        if (result !== 'ok') {
            removeUrlFromLibrary(safe);
            scheduleLinkLibraryRefresh();
            const msg = result === 'timeout'
                ? 'Link ảnh phản hồi quá lâu nên không lưu. Hãy thử link trực tiếp khác.'
                : 'Link ảnh không tải được nên đã không lưu / đã xoá khỏi Kho Link.';
            if (!options.silent) showToast(msg, 'error', 4500);
            return '';
        }
        return saveUrlToLibrary(safe);
    }

    async function renderLocalLibraryGrid() {
        const grid = PD.getElementById('vn-ipm-grid');
        if (!grid) return;
        grid.innerHTML = '<div class="vn-img-placeholder">Đang đọc Kho Local...</div>';
        try {
            const recs = await listLocalImageRecords();
            grid.innerHTML = '';
            if (!recs.length) {
                grid.innerHTML = '<div class="vn-img-placeholder">Kho Local đang trống. Nhấn nút Import phía trên để lưu ảnh từ máy tính vào IndexedDB.</div>';
                return;
            }
            const items = recs.map(rec => ({
                url: makeLocalImageRef(rec.id),
                tags: [rec.name || 'local image', rec.type || '', formatBytesVN(rec.size), 'local import'].filter(Boolean),
                nsfw: false,
                src: 'local-import',
                _library: 'local'
            }));
            
            const pageSize = 24;
            const totalPages = Math.ceil(items.length / pageSize);
            if (imgPickerState.localPage >= totalPages) imgPickerState.localPage = Math.max(0, totalPages - 1);
            
            const start = imgPickerState.localPage * pageSize;
            const pageItems = items.slice(start, start + pageSize);
            
            renderImgGrid(pageItems, grid);
            
            if (totalPages > 1) {
                renderPagination(grid, imgPickerState.localPage, totalPages, (newPage) => {
                    imgPickerState.localPage = newPage;
                    renderLocalLibraryGrid();
                });
            }
        } catch (err) {
            console.error('[VN Dialogue] Không đọc được Kho Local:', err);
            grid.innerHTML = `<div class="vn-img-placeholder">Không đọc được Kho Local: ${escapeHtml(err.message || 'Không rõ lỗi')}</div>`;
        }
    }

    function renderLinkLibraryGrid() {
        const grid = PD.getElementById('vn-ipm-grid');
        if (!grid) return;
        const urls = (Array.isArray(CFG.linkLibrary) ? CFG.linkLibrary : []).map(normalizeUrlLibraryEntry).filter(Boolean);
        CFG.linkLibrary = [...new Set(urls)];
        saveConfig(CFG);
        grid.innerHTML = '';
        if (!CFG.linkLibrary.length) {
            grid.innerHTML = '<div class="vn-img-placeholder">Kho Link đang trống. Dán link ảnh phía trên rồi nhấn “➕ Lưu link”.</div>';
            return;
        }
        const items = CFG.linkLibrary.map(url => {
            let filename = '';
            try { filename = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'link image'); } catch (e) { filename = 'link image'; }
            return { url, tags: [filename, 'link đã lưu'], nsfw: false, src: 'url-library', _library: 'url' };
        });
        
        const pageSize = 24;
        const totalPages = Math.ceil(items.length / pageSize);
        if (imgPickerState.urlPage >= totalPages) imgPickerState.urlPage = Math.max(0, totalPages - 1);
        
        const start = imgPickerState.urlPage * pageSize;
        const pageItems = items.slice(start, start + pageSize);
        
        renderImgGrid(pageItems, grid);
        
        if (totalPages > 1) {
            renderPagination(grid, imgPickerState.urlPage, totalPages, (newPage) => {
                imgPickerState.urlPage = newPage;
                renderLinkLibraryGrid();
            });
        }
    }

    function renderPagination(grid, currentPage, totalPages, onPageChange) {
        const wrap = PD.createElement('div');
        wrap.className = 'vn-pagination-wrap';
        wrap.style.cssText = 'width: 100%; display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 15px; padding-bottom: 10px; grid-column: 1 / -1;';
        
        const prevBtn = PD.createElement('button');
        prevBtn.className = 'vn-btn vn-btn-secondary vn-btn-sm';
        prevBtn.textContent = '⬅ Trang trước';
        prevBtn.disabled = currentPage <= 0;
        if (currentPage <= 0) prevBtn.style.opacity = '0.5';
        prevBtn.addEventListener('click', () => {
            if (currentPage > 0) onPageChange(currentPage - 1);
        });
        
        const info = PD.createElement('span');
        info.style.cssText = 'color: #94a3b8; font-size: 13px; font-weight: 500;';
        info.textContent = `Trang ${currentPage + 1} / ${totalPages}`;
        
        const nextBtn = PD.createElement('button');
        nextBtn.className = 'vn-btn vn-btn-secondary vn-btn-sm';
        nextBtn.textContent = 'Trang sau ➡';
        nextBtn.disabled = currentPage >= totalPages - 1;
        if (currentPage >= totalPages - 1) nextBtn.style.opacity = '0.5';
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages - 1) onPageChange(currentPage + 1);
        });
        
        wrap.appendChild(prevBtn);
        wrap.appendChild(info);
        wrap.appendChild(nextBtn);
        grid.appendChild(wrap);
    }

    function renderFavBar() {
        const bar = PD.getElementById('vn-ipm-favbar');
        if (!bar) return;
        bar.innerHTML = '';
        if (!CFG.favourites || CFG.favourites.length === 0) {
            const em = PD.createElement('div');
            em.className = 'vn-fav-empty';
            em.textContent = 'Chưa có ảnh yêu thích nào. Hover vào ảnh bên dưới → nhấn ⭐ để ghim vào đây.';
            bar.appendChild(em);
            return;
        }
        CFG.favourites.forEach(url => {
            const img = PD.createElement('img');
            img.className = 'vn-fav-thumb';
            img.src = resolveImageSrc(url, VN_BLANK_IMG);
            if (isLocalImageRef(url)) {
                img.dataset.origSrc = url;
                hydrateLocalImageEl(img, url);
            }
            img.title = 'Nhấn để chọn ngay | Click chuột phải để bỏ ghim';
            img.onerror = () => { img.style.display = 'none'; };
            img.addEventListener('click', () => selectImage(url));
            img.addEventListener('contextmenu', e => {
                e.preventDefault();
                CFG.favourites = CFG.favourites.filter(u => u !== url);
                saveConfig(CFG);
                renderFavBar();
                showToast('Đã bỏ ghim ảnh khỏi yêu thích', 'info');
            });
            bar.appendChild(img);
        });
    }

    async function fetchImagesForPicker(reset = false) {
        const src = imgPickerState.currentSrc;
        if (src === 'local') { await renderLocalLibraryGrid(); return; }
        if (src === 'url') { renderLinkLibraryGrid(); return; }
        const grid = PD.getElementById('vn-ipm-grid');
        if (!grid) return;
        if (imgPickerState.loading) return;

        if (reset) { imgPickerState.images = []; imgPickerState.offset = 0; grid.innerHTML = ''; }

        // Hiển thị hint về loại tìm kiếm
        const searchHints = {
            'safebooru':    '🌟 Safebooru (SFW Only): Tìm theo tag Booru chuẩn, VD: frieren, hatsune_miku, rem_(re_zero). Luôn an toàn!',
            'danbooru':     '🌟 Danbooru (CORS OK): Kho ảnh Booru lớn nhất. Nhập tag (VD: frieren). Tự động lọc SFW/NSFW theo công tắc.',
            'myanimelist':  '✅ MyAnimeList Jikan (Advanced): Tìm kiếm nhân vật (VD: miku) → Tải TOÀN BỘ album ảnh của họ từ MAL!',
            'nekos.best':   '🌟 nekos.best: Kho ảnh waifu, neko, kitsune và ảnh động reaction anime chất lượng cao!',
            'anilist':      '🌟 AniList GraphQL: Tìm kiếm tên nhân vật (Rem, Frieren, Miku...) hoặc để trống xem Top Yêu Thích!',
            'pic.re':       '🎨 Pic.re High-Res: Kho ảnh nghệ thuật và hình nền chất lượng siêu cao!',
            'nekos.life':   '📂 Category: waifu, neko, kiss, hug, pat, cuddle, smug...',
            'nekos.moe':    '🔍 Tag search: blonde_hair, neko, maid, uniform...',
            'otakugifs':    '📂 Category GIF: hug, pat, kiss, cry, smile, blush...',
            'nekobot':      '📂 Category: neko, kemonomimi, holo, kanna, food...',
            'thecatapi':    '🐾 Pet & Beast: Dành cho nhân vật thú cưng, linh thú hoặc avatar đáng yêu!'
        };
        let hintEl = PD.getElementById('vn-ipm-search-hint');
        if (!hintEl) {
            hintEl = PD.createElement('div');
            hintEl.id = 'vn-ipm-search-hint';
            hintEl.style.cssText = 'font-size:11px;color:#818cf8;padding:4px 0 2px;line-height:1.5;min-height:18px;';
            const toolbar = PD.getElementById('vn-ipm-searchtoolbar');
            if (toolbar && toolbar.parentNode) toolbar.parentNode.insertBefore(hintEl, toolbar.nextSibling);
        }
        hintEl.innerHTML = (searchHints[src] || '') + '<div style="color:#64748b;font-size:10.5px;margin-top:2px;">💡 Đã có 11 nguồn ảnh anime miễn phí (Safebooru ✅ · Danbooru ✅ · MyAnimeList ✅ · AniList ✅ + 7 kho khác)!</div>';

        const skels = [];
        for (let i = 0; i < 12; i++) {
            const sk = PD.createElement('div');
            sk.className = 'vn-skeleton';
            skels.push(sk);
            grid.appendChild(sk);
        }

        imgPickerState.loading = true;
        try {
            const apiSrc = API_SOURCES[src];
            if (!apiSrc) throw new Error('Unknown source');
            const tag = PD.getElementById('vn-ipm-search') ? PD.getElementById('vn-ipm-search').value.trim() : '';
            const nsfw = PD.getElementById('vn-ipm-nsfw') ? PD.getElementById('vn-ipm-nsfw').checked : false;
            const results = await apiSrc.fetch({ tag, nsfw, count: 12, offset: imgPickerState.offset });
            skels.forEach(s => s.remove());
            imgPickerState.offset += results.length;

            if (results.length === 0 && imgPickerState.images.length === 0) {
                grid.innerHTML = '<div class="vn-img-placeholder">Không tìm thấy ảnh nào. Hãy thử đổi từ khoá hoặc nguồn khác.</div>';
                return;
            }
            imgPickerState.images.push(...results);
            renderImgGrid(results, grid);

            if (results.length >= 12) {
                const moreBtn = PD.createElement('button');
                moreBtn.className = 'vn-img-load-more';
                moreBtn.textContent = '⬇ Tải thêm ảnh tiếp theo...';
                moreBtn.addEventListener('click', async () => { moreBtn.remove(); await fetchImagesForPicker(false); });
                grid.appendChild(moreBtn);
            }
        } catch (e) {
            skels.forEach(s => s.remove());
            grid.innerHTML = `<div class="vn-img-placeholder">Lỗi tải ảnh: ${escapeHtml(e.message || 'Không rõ lỗi')}</div>`;
        } finally {
            imgPickerState.loading = false;
        }
    }

    function renderImgGrid(images, grid) {
        const loadMore = grid.querySelector('.vn-img-load-more');
        if (loadMore) grid.removeChild(loadMore);
        const currentFilter = (() => {
            const searchEl = PD.getElementById('vn-ipm-search');
            return searchEl ? searchEl.value.trim().toLowerCase() : '';
        })();
        images.forEach(item => {
            const cell = PD.createElement('div');
            // Build searchable text: tags + url filename
            const urlName = (item.url || '').split('/').pop().replace(/[_\-\.]/g, ' ');
            const searchText = [...(item.tags || []), urlName, item.src || ''].join(' ').toLowerCase();
            cell.dataset.searchText = searchText;
            cell.className = 'vn-img-thumb' + (item.nsfw ? ' nsfw' : '');
            // Apply live filter if there's a current keyword
            if (currentFilter && !searchText.includes(currentFilter) && !currentFilter.split(' ').every(w => !w || searchText.includes(w))) {
                cell.style.display = 'none';
            }
            const img = PD.createElement('img');
            img.src = resolveImageSrc(item.thumb || item.url, VN_BLANK_IMG);
            if (isLocalImageRef(item.url)) hydrateLocalImageEl(img, item.url);
            img.loading = 'lazy';
            img.referrerPolicy = 'no-referrer';
            img.alt = (item.tags || []).join(',');
            cell.title = (item.tags || []).join(' • ');
            img.onerror = () => {
                // Chỉ ẩn ảnh lỗi nếu đang dùng thumb, thử fallback sang url gốc trước
                if (img.src !== item.url && item.url && img.src !== resolveImageSrc(item.url, VN_BLANK_IMG)) {
                    img.src = resolveImageSrc(item.url, VN_BLANK_IMG);
                    return;
                }
                // Nếu là kho thư viện thì ẩn và xử lý
                if (item._library === 'url') {
                    cell.style.display = 'none';
                    const removed = removeUrlFromLibrary(item.url);
                    if (removed) {
                        showToast('Đã xoá 1 link ảnh lỗi khỏi Kho Link.', 'warning', 3500);
                        scheduleLinkLibraryRefresh();
                    }
                } else if (item._library === 'local') {
                    cell.style.display = 'none';
                } else {
                    // API images: chỉ ẩn cell nếu cả thumb lẫn url đều lỗi
                    cell.style.opacity = '0.3';
                    img.title = 'Ảnh không tải được (lỗi CORS hoặc domain chặn)';
                }
            };
            img.addEventListener('click', () => selectImage(item.url));

            const favBtn = PD.createElement('button');
            const favs = Array.isArray(CFG.favourites) ? CFG.favourites : (CFG.favourites = []);
            favBtn.className = 'vn-img-fav-btn' + (favs.includes(item.url) ? ' starred' : '');
            favBtn.title = 'Ghim vào yêu thích';
            favBtn.textContent = '⭐';
            favBtn.addEventListener('click', e => {
                e.stopPropagation();
                if (CFG.favourites.includes(item.url)) {
                    CFG.favourites = CFG.favourites.filter(u => u !== item.url);
                    favBtn.classList.remove('starred');
                    showToast('Đã xoá khỏi yêu thích', 'info');
                } else {
                    CFG.favourites.push(item.url);
                    favBtn.classList.add('starred');
                    showToast('Đã ghim vào yêu thích ⭐', 'success');
                }
                saveConfig(CFG);
                renderFavBar();
            });

            let delBtn = null;
            if (item._library === 'url' || item._library === 'local') {
                delBtn = PD.createElement('button');
                delBtn.className = 'vn-img-del-btn';
                delBtn.title = item._library === 'local' ? 'Xoá ảnh khỏi Kho Local' : 'Xoá link khỏi Kho Link';
                delBtn.textContent = '🗑';
                delBtn.addEventListener('click', async e => {
                    e.stopPropagation();
                    if (item._library === 'url') {
                        CFG.linkLibrary = (Array.isArray(CFG.linkLibrary) ? CFG.linkLibrary : []).filter(u => u !== item.url);
                        saveConfig(CFG);
                        renderLinkLibraryGrid();
                        showToast('Đã xoá link khỏi Kho Link', 'info');
                    } else if (item._library === 'local') {
                        if (!confirm('Xoá ảnh này khỏi Kho Local? Nếu avatar nhân vật đang dùng ảnh này thì ảnh sẽ không còn hiển thị.')) return;
                        try {
                            await deleteLocalImageRef(item.url);
                            await renderLocalLibraryGrid();
                            showToast('Đã xoá ảnh khỏi Kho Local', 'info');
                        } catch (err) {
                            console.error('[VN Dialogue] Không xoá được ảnh Local:', err);
                            showToast('Không xoá được ảnh Local.', 'error');
                        }
                    }
                });
            }

            const badge = PD.createElement('div');
            badge.className = 'vn-img-nsfw-badge';
            badge.textContent = 'NSFW';

            cell.appendChild(img);
            cell.appendChild(favBtn);
            if (delBtn) cell.appendChild(delBtn);
            cell.appendChild(badge);
            grid.appendChild(cell);
        });
    }

    function selectImage(url) {
        imgPickerState.selectedUrl = url;
        const preview = PD.getElementById('vn-ipm-preview');
        const selUrl = PD.getElementById('vn-ipm-selurl');
        const displaySrc = resolveImageSrc(url, VN_BLANK_IMG);
        if (preview) {
            preview.src = displaySrc;
            preview.classList.add('show');
            if (isLocalImageRef(url)) hydrateLocalImageEl(preview, url);
        }
        if (selUrl) {
            const label = isLocalImageRef(url) ? 'Ảnh Local đã lưu trong IndexedDB' : url;
            selUrl.textContent = label.length > 65 ? label.slice(0, 62) + '...' : label;
        }
        if (imgPickerState.currentSrc === 'url') {
            const urlBox = PD.getElementById('vn-ipm-urlbox');
            if (urlBox && !isLocalImageRef(url)) urlBox.value = url;
        }

        const fullBox = PD.getElementById('vn-ipm-full-preview-box');
        const fullImg = PD.getElementById('vn-ipm-full-preview-img');
        const fullInfo = PD.getElementById('vn-ipm-full-preview-info');
        if (fullBox && fullImg) {
            fullImg.src = displaySrc;
            if (isLocalImageRef(url)) hydrateLocalImageEl(fullImg, url);
            fullBox.style.display = 'block';
            if (fullInfo) fullInfo.textContent = isLocalImageRef(url) ? url : '';
            setTimeout(() => {
                fullBox.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 60);
        }
    }

    function openImgPicker(charName, callback) {
        buildImgPickerModal();
        imgPickerCallback = callback;
        imgPickerState.selectedUrl = '';
        imgPickerState.images = [];
        imgPickerState.offset = 0;
        const nameEl = PD.getElementById('vn-ipm-charname');
        if (nameEl) nameEl.textContent = charName ? `- "${charName}"` : '';
        const preview = PD.getElementById('vn-ipm-preview');
        const selUrl = PD.getElementById('vn-ipm-selurl');
        if (preview) { preview.classList.remove('show'); preview.src = ''; }
        if (selUrl) selUrl.textContent = 'Chưa chọn ảnh nào';

        const fullBox = PD.getElementById('vn-ipm-full-preview-box');
        if (fullBox) fullBox.style.display = 'none';

        PD.querySelectorAll('.vn-src-tab').forEach(t => t.classList.remove('active'));
        const defTab = PD.querySelector('.vn-src-tab[data-src="nekos.best"]');
        if (defTab) defTab.classList.add('active');
        const searchtb = PD.getElementById('vn-ipm-searchtoolbar');
        const urlRow = PD.getElementById('vn-ipm-url-row');
        const localRow = PD.getElementById('vn-ipm-local-row');
        if (searchtb) searchtb.style.display = 'flex';
        if (urlRow) urlRow.style.display = 'none';
        if (localRow) localRow.style.display = 'none';
        imgPickerState.currentSrc = 'nekos.best';
        const grid = PD.getElementById('vn-ipm-grid');
        if (grid) grid.innerHTML = '<div class="vn-img-placeholder">Nhấn nút "⚡ Tải ảnh" để duyệt kho ảnh anime miễn phí.</div>';
        renderFavBar();
        const ov = PD.getElementById('vn-img-modal-overlay');
        if (ov) ov.classList.add('show');
    }



    // ========== MODULE 4: MAIN MODAL & SETTINGS ==========
    function buildMainModal() {
        if (PD.getElementById('vn-modal-overlay')) PD.getElementById('vn-modal-overlay').remove();
        const overlay = PD.createElement('div');
        overlay.id = 'vn-modal-overlay';
        overlay.innerHTML = `
<div class="vn-modal">
  <div class="vn-modal-header">
    <div class="vn-modal-title">🎭 Visual Novel Dialogue Beautifier <span style="font-size:12px;color:#38bdf8;background:rgba(56,189,248,0.15);padding:2px 8px;border-radius:12px;margin-left:6px;border:1px solid rgba(56,189,248,0.3);vertical-align:middle;">${SCRIPT_VERSION}</span></div>
    <div class="vn-tabs">
      <button class="vn-tab active" data-tab="chars"><img src="https://api.iconify.design/lucide:users.svg?color=%23818cf8" class="vn-icon">Nhân vật & Avatar</button>
      <button class="vn-tab" data-tab="style"><img src="https://api.iconify.design/lucide:palette.svg?color=%23818cf8" class="vn-icon">Giao diện & Style</button>
      <button class="vn-tab" data-tab="prompt"><img src="https://api.iconify.design/lucide:pen-tool.svg?color=%23818cf8" class="vn-icon">Prompt Cấu trúc</button>
      <button class="vn-tab" data-tab="settings"><img src="https://api.iconify.design/lucide:settings.svg?color=%23818cf8" class="vn-icon">Cài đặt & Dữ liệu</button>
    </div>
  </div>
  <!-- TAB 1: NHÂN VẬT -->
  <div class="vn-tab-content active" data-tab="chars" id="vn-tab-chars">
    <!-- VIEW 1: DANH SÁCH NHÂN VẬT -->
    <div id="vn-char-list-view">
      <button class="vn-btn vn-btn-secondary" id="vn-scan-chars" style="margin-bottom:12px;width:100%;font-weight:700;border-color:rgba(99,102,241,0.5);color:#a78bfa;">
        <img src="https://api.iconify.design/lucide:search.svg?color=%23a78bfa" class="vn-icon">Quét tự động tất cả thẻ [Tên] trong khung chat hiện tại
      </button>
      <div class="vn-toggle-row" style="margin-bottom:10px;border-color:rgba(99,102,241,0.4);background:rgba(99,102,241,0.1);">
        <div class="vn-toggle-info">
          <div class="vn-toggle-name" style="color:#818cf8;"><img src="https://api.iconify.design/lucide:bot.svg?color=%23818cf8" class="vn-icon">Tự động bắt thẻ & tạo nhân vật mới (Auto Register)</div>
          <div class="vn-toggle-desc">Tự động tạo thẻ khi gặp tên mới trong lời thoại chat</div>
        </div>
        <label class="vn-switch"><input type="checkbox" id="vn-toggle-autoreg-char" class="vn-auto-reg-toggle" /><span class="vn-slider"></span></label>
      </div>
      <div class="vn-toggle-row" style="margin-bottom:14px;border-color:rgba(244,63,94,0.4);background:rgba(244,63,94,0.1);">
        <div class="vn-toggle-info">
          <div class="vn-toggle-name" style="color:#f43f5e;"><img src="https://api.iconify.design/lucide:heart.svg?color=%23f43f5e" class="vn-icon">Tự động gán ảnh Waifu/Husbando cho nhân vật mới</div>
          <div class="vn-toggle-desc">Tự động nhận diện @Tên(Nữ/Nam)@ và gán ngẫu nhiên ảnh từ neko.best</div>
        </div>
        <label class="vn-switch"><input type="checkbox" id="vn-toggle-auto-assign" /><span class="vn-slider"></span></label>
      </div>
      <div class="vn-toggle-row" style="margin-bottom:14px;border-color:rgba(236,72,153,0.4);background:rgba(236,72,153,0.1);">
        <div class="vn-toggle-info">
          <div class="vn-toggle-name" style="color:#ec4899;"><img src="https://api.iconify.design/lucide:smile.svg?color=%23ec4899" class="vn-icon">Bật tính năng Ảnh ngữ cảnh động (Dynamic Context Images)</div>
          <div class="vn-toggle-desc">Bơm danh sách nhãn ảnh vào prompt để AI tự động gắn thẻ và hiển thị ảnh theo cảm xúc/ngữ cảnh truyện (Ăn kem, buồn, vui...)</div>
        </div>
        <label class="vn-switch"><input type="checkbox" id="vn-toggle-dynamic-context" /><span class="vn-slider"></span></label>
      </div>
      <div id="vn-add-char-wrap" style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:12px;margin-bottom:14px;">
        <div class="vn-section-label" style="margin-top:0;"><img src="https://api.iconify.design/lucide:user-plus.svg?color=%23818cf8" class="vn-icon">Thêm nhanh nhân vật mới</div>
        <div style="display:flex;gap:8px;">
          <input class="vn-input" id="vn-new-char-name" placeholder="Tên nhân vật (Ví dụ: Kazumi, Itsuki...)" style="flex:1;" />
          <button class="vn-btn vn-btn-primary" id="vn-new-char-add"><img src="https://api.iconify.design/lucide:plus.svg?color=white" class="vn-icon">Thêm</button>
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:10px;flex-wrap:wrap;">
        <div class="vn-section-label" style="margin:0;">Danh sách nhân vật (<span id="vn-char-count">0</span>)</div>
        <input class="vn-input" id="vn-char-search-filter" placeholder="🔍 Tìm nhanh tên nhân vật..." style="max-width:240px;padding:6px 12px;font-size:13px;border-radius:10px;" />
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px;flex-wrap:wrap;background:rgba(255,255,255,0.03);padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);">
        <div style="display:flex;gap:8px;align-items:center;">
          <button class="vn-btn vn-btn-secondary" id="vn-bulk-select-all" style="padding:4px 10px;font-size:12px;"><img src="https://api.iconify.design/lucide:check-square.svg?color=%2394a3b8" class="vn-icon" style="width:14px;height:14px;">Chọn tất cả</button>
          <button class="vn-btn vn-btn-secondary" id="vn-bulk-deselect-all" style="padding:4px 10px;font-size:12px;"><img src="https://api.iconify.design/lucide:square.svg?color=%2394a3b8" class="vn-icon" style="width:14px;height:14px;">Hủy chọn</button>
        </div>
        <button class="vn-btn" id="vn-bulk-delete" style="padding:4px 12px;font-size:12px;background:rgba(239,68,68,0.2);color:#f87171;border:1px solid rgba(239,68,68,0.4);display:none;"><img src="https://api.iconify.design/lucide:trash-2.svg?color=%23f87171" class="vn-icon" style="width:14px;height:14px;">Xóa đã chọn (0)</button>
      </div>
      <div class="vn-char-grid" id="vn-char-grid"></div>
    </div>
    <!-- VIEW 2: CHI TIẾT NHÂN VẬT (Ẩn mặc định) -->
    <div id="vn-char-detail-wrap" style="display:none;">
      <button class="vn-btn vn-btn-secondary" id="vn-char-det-back" style="margin-bottom:12px;width:100%;justify-content:flex-start;font-weight:700;"><img src="https://api.iconify.design/lucide:arrow-left.svg?color=%23cbd5e1" class="vn-icon">Quay lại danh sách nhân vật</button>
      <div class="vn-section-label"><img src="https://api.iconify.design/lucide:user-check.svg?color=%23818cf8" class="vn-icon">Tuỳ chỉnh chi tiết nhân vật</div>
      <div class="vn-char-detail" id="vn-char-detail">
        <div id="vn-char-detail-main">
          <div class="vn-char-detail-header">
            <img class="vn-char-detail-avatar" id="vn-char-det-avatar" src="" style="display:none;" title="Nhấn để đổi ảnh" />
            <div id="vn-char-det-initial" style="width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:#fff;flex-shrink:0;"></div>
            <div class="vn-char-detail-info">
              <div class="vn-char-detail-name" id="vn-char-det-name"></div>
              <div class="vn-char-btns" id="vn-char-det-btns"></div>
            </div>
          </div>
          <div class="vn-group">
            <div class="vn-section-label"><img src="https://api.iconify.design/lucide:tag.svg?color=%23818cf8" class="vn-icon">Tên nhân vật (khớp với thẻ [Tên] trong truyện)</div>
            <input class="vn-input" id="vn-char-det-rename" placeholder="Tên nhân vật..." />
          </div>
          <div class="vn-group">
            <div class="vn-section-label"><img src="https://api.iconify.design/lucide:image.svg?color=%23818cf8" class="vn-icon">URL ảnh đại diện (Avatar)</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <input class="vn-input" id="vn-char-det-avatar-url" placeholder="https://... hoặc data:image/..." style="flex:1;min-width:180px;" />
              <button class="vn-btn vn-btn-secondary vn-btn-sm" id="vn-char-pick-img"><img src="https://api.iconify.design/lucide:folder-open.svg?color=white" class="vn-icon">Chọn ảnh...</button>
              <button class="vn-btn vn-btn-secondary vn-btn-sm" id="vn-char-open-edit-view"><img src="https://api.iconify.design/lucide:crop.svg?color=white" class="vn-icon">Cắt / Zoom ảnh</button>
            </div>
          </div>
          <div class="vn-group">
            <div class="vn-section-label"><img src="https://api.iconify.design/lucide:palette.svg?color=%23818cf8" class="vn-icon">Màu thẻ tên & khung thoại (Hex Color)</div>
            <div style="display:flex;gap:8px;align-items:center;">
              <input class="vn-input" id="vn-char-det-color" placeholder="#6366f1 (để trống sẽ dùng màu gradient tự động)" style="flex:1;" />
              <input type="color" id="vn-char-det-colorpicker" style="width:40px;height:40px;border:none;background:none;cursor:pointer;border-radius:8px;" title="Chọn màu" />
            </div>
          </div>
          <div class="vn-group" id="vn-char-det-textcolor-group">
            <div class="vn-section-label"><img src="https://api.iconify.design/lucide:type.svg?color=%23a78bfa" class="vn-icon">Màu chữ lời thoại riêng cho nhân vật này (Text Color)</div>
            <div style="display:flex;gap:8px;align-items:center;">
              <input class="vn-input" id="vn-char-det-textcolor" placeholder="#ffffff (để trống sẽ dùng theo theme/mặc định)" style="flex:1;" />
              <input type="color" id="vn-char-det-textcolorpicker" value="#ffffff" style="width:40px;height:40px;border:none;background:none;cursor:pointer;border-radius:8px;" title="Chọn màu chữ" />
            </div>
            <div id="vn-char-det-textcolor-hint" style="font-size:11px;color:#94a3b8;margin-top:2px;"><img src="https://api.iconify.design/lucide:info.svg?color=%2394a3b8" class="vn-icon" style="width:14px;height:14px;">Lưu ý: Cần bật chế độ "Chỉnh màu chữ theo từng nhân vật" ở tab Giao diện & Style thì màu này mới có hiệu lực!</div>
          </div>
          <div class="vn-group" id="vn-char-det-expressions-group" style="background:rgba(236,72,153,0.06);border:1px solid rgba(236,72,153,0.3);border-radius:12px;padding:12px;">
            <div class="vn-section-label" style="color:#ec4899;margin-top:0;"><img src="https://api.iconify.design/lucide:smile.svg?color=%23ec4899" class="vn-icon">Danh sách Ảnh ngữ cảnh động / Nhãn cảm xúc (Dynamic Context Images)</div>
            <div id="vn-char-det-expressions-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px;"></div>
            <button class="vn-btn vn-btn-secondary vn-btn-sm" id="vn-char-add-expression" type="button" style="border-color:rgba(236,72,153,0.4);color:#f472b6;"><img src="https://api.iconify.design/lucide:plus.svg?color=%23f472b6" class="vn-icon">Thêm nhãn ảnh ngữ cảnh mới...</button>
            <div style="font-size:11px;color:#cbd5e1;margin-top:6px;line-height:1.5;"><img src="https://api.iconify.design/lucide:info.svg?color=%2394a3b8" class="vn-icon" style="width:14px;height:14px;">Khi bật tính năng "Ảnh ngữ cảnh động" ở cài đặt, AI sẽ tự chọn nhãn phù hợp (ví dụ: Ăn kem, buồn, vui...) để hiển thị ảnh tương ứng cho nhân vật theo mạch truyện!</div>
          </div>
          <div style="display:flex;gap:8px;margin-top:4px;">
            <button class="vn-btn vn-btn-primary" id="vn-char-det-save" style="flex:1;"><img src="https://api.iconify.design/lucide:save.svg?color=white" class="vn-icon">Lưu nhân vật này</button>
            <button class="vn-btn vn-btn-danger vn-btn-sm" id="vn-char-det-delete" title="Xoá nhân vật"><img src="https://api.iconify.design/lucide:trash-2.svg?color=%23f87171" class="vn-icon">Xoá</button>
          </div>
        </div>
        <div id="vn-char-image-edit-view" style="display:none;">
          <button class="vn-btn vn-btn-secondary" id="vn-img-edit-back" style="margin-bottom:12px;width:100%;justify-content:flex-start;font-weight:700;"><img src="https://api.iconify.design/lucide:arrow-left.svg?color=%23cbd5e1" class="vn-icon">Xong / Quay lại cài đặt nhân vật</button>
          <div class="vn-group vn-avatar-crop-editor" id="vn-char-avatar-adjust-group" style="margin-top:0;">
            <div class="vn-section-label" style="margin-top:0;"><img src="https://api.iconify.design/lucide:crop.svg?color=%23818cf8" class="vn-icon">Cắt / căn khung Avatar</div>
            <input type="hidden" id="vn-char-avatar-x" value="50" />
            <input type="hidden" id="vn-char-avatar-y" value="50" />
            <input type="hidden" id="vn-char-avatar-zoom" value="100" />
            <div class="vn-avatar-crop-layout">
              <div>
                <div class="vn-avatar-crop-stage" id="vn-avatar-crop-stage" title="Kéo để căn ảnh, cuộn chuột để zoom in/out">
                  <img id="vn-char-avatar-adjust-preview" class="vn-avatar-crop-img" src="" draggable="false" />
                  <div class="vn-avatar-crop-frame"></div>
                  <div class="vn-avatar-crop-crosshair"></div>
                </div>
                <div style="font-size:11px;color:#94a3b8;line-height:1.45;text-align:center;margin-top:8px;">Kéo ảnh để căn vị trí. Cuộn chuột trong khung để zoom in/out.</div>
              </div>
              <div class="vn-avatar-crop-tools">
                <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
                  <div class="vn-avatar-live-preview-wrap"><img id="vn-char-avatar-live-preview" src="" draggable="false" /></div>
                  <div style="min-width:160px;flex:1;">
                    <div style="font-size:12px;font-weight:700;color:#cbd5e1;margin-bottom:6px;">Preview avatar sau khi cắt</div>
                    <div id="vn-avatar-crop-pos-hint" style="font-size:11px;color:#94a3b8;line-height:1.45;">Vị trí khung: ngang 50% · dọc 50% · zoom 100%</div>
                  </div>
                </div>
                <label style="font-size:12px;color:#cbd5e1;font-weight:600;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">Kiểu ảnh
                  <select class="vn-input" id="vn-char-avatar-fit" style="padding:6px 8px;font-size:12px;max-width:220px;">
                    <option value="cover">Cắt đầy khung avatar</option>
                    <option value="contain">Hiện nguyên ảnh</option>
                  </select>
                </label>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:#cbd5e1;font-weight:600;">Zoom
                  <button class="vn-btn vn-btn-secondary vn-btn-sm" type="button" data-vn-crop-zoom="-10">−</button>
                  <span id="vn-char-avatar-zoom-val" style="min-width:44px;text-align:center;color:#a5b4fc;">100%</span>
                  <button class="vn-btn vn-btn-secondary vn-btn-sm" type="button" data-vn-crop-zoom="10">+</button>
                  <span style="font-size:11px;color:#64748b;font-weight:500;">Cuộn chuột trong khung để zoom nhanh</span>
                </div>
                <div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap;">
                  <div>
                    <div style="font-size:11px;color:#94a3b8;margin-bottom:5px;">Canh nhanh</div>
                    <div class="vn-avatar-crop-preset-grid">
                      <button type="button" data-vn-crop-pos="0,0" title="Trên trái">↖</button>
                      <button type="button" data-vn-crop-pos="50,0" title="Trên">↑</button>
                      <button type="button" data-vn-crop-pos="100,0" title="Trên phải">↗</button>
                      <button type="button" data-vn-crop-pos="0,50" title="Trái">←</button>
                      <button type="button" data-vn-crop-pos="50,50" title="Giữa">●</button>
                      <button type="button" data-vn-crop-pos="100,50" title="Phải">→</button>
                      <button type="button" data-vn-crop-pos="0,100" title="Dưới trái">↙</button>
                      <button type="button" data-vn-crop-pos="50,100" title="Dưới">↓</button>
                      <button type="button" data-vn-crop-pos="100,100" title="Dưới phải">↘</button>
                    </div>
                  </div>
                  <button class="vn-btn vn-btn-secondary vn-btn-sm" id="vn-char-avatar-reset" style="padding:8px 12px;font-size:12px;margin-top:18px;">↺ Về giữa</button>
                </div>
                <div style="font-size:11px;color:#94a3b8;line-height:1.45;">Nhấn <b>Xong</b> rồi <b>Lưu nhân vật này</b> để áp dụng khung cắt vào toàn bộ chat. Có thể dùng các nút canh nhanh nếu ảnh lệch quá nhiều.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- TAB 2: HIỂN THỊ -->
  <div class="vn-tab-content" data-tab="style" id="vn-tab-style">
    <div class="vn-toggle-row">
      <div class="vn-toggle-info">
        <div class="vn-toggle-name">Bật chế độ Visual Novel Mode</div>
        <div class="vn-toggle-desc">Tự động chuyển đổi lời thoại [Tên] thành speech bubble có avatar</div>
      </div>
      <label class="vn-switch"><input type="checkbox" id="vn-toggle-render" /><span class="vn-slider"></span></label>
    </div>
    <div>
      <div class="vn-section-label">Chọn phong cách giao diện (Style) - 7 Theme Cao Cấp</div>
      <div class="vn-style-picker">
        <button class="vn-style-opt" data-style="bubble">
          <div class="vn-style-preview">💬</div>
          <div class="vn-style-name">Bubble Style</div>
          <div>Avatar tròn chuẩn VN, speech bubble bo góc với hiệu ứng Glassmorphism sang trọng</div>
        </button>
        <button class="vn-style-opt" data-style="compact">
          <div class="vn-style-preview">📱</div>
          <div class="vn-style-name">Compact Style</div>
          <div>Avatar nhỏ gọn, tiết kiệm tối đa không gian màn hình điện thoại/di động</div>
        </button>
        <button class="vn-style-opt" data-style="classic">
          <div class="vn-style-preview">📖</div>
          <div class="vn-style-name">Classic Novel</div>
          <div>Avatar vuông bo góc, viền trái màu sắc tạo cảm giác như đọc tiểu thuyết ánh sáng</div>
        </button>
        <button class="vn-style-opt" data-style="cyberpunk">
          <div class="vn-style-preview">🌌</div>
          <div class="vn-style-name">Cyberpunk Neon</div>
          <div>Giao diện dark neon tương lai, viền sáng phát quang cyan/magenta, góc cạnh sắc sảo</div>
        </button>
        <button class="vn-style-opt" data-style="manga">
          <div class="vn-style-preview">🌸</div>
          <div class="vn-style-name">Manga Comic</div>
          <div>Bong bóng thoại truyện tranh Nhật Bản, viền đậm rõ nét, bóng đổ comic độc đáo</div>
        </button>
        <button class="vn-style-opt" data-style="royal">
          <div class="vn-style-preview">👑</div>
          <div class="vn-style-name">Royal Velvet</div>
          <div>Nền nhung tối huyền bí, viền vàng kim quý tộc, font chữ serif hoàng gia sang trọng</div>
        </button>
        <button class="vn-style-opt" data-style="modern">
          <div class="vn-style-preview">💬</div>
          <div class="vn-style-name">Modern Chat</div>
          <div>Bong bóng chat tối giản siêu mượt phong cách iOS/Discord, bo góc mềm mại hiện đại</div>
        </button>
      </div>
    </div>
    <div style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:14px;margin-top:4px;">
      <div class="vn-section-label" style="margin-top:0;"><img src="https://api.iconify.design/lucide:maximize-2.svg?color=%23818cf8" class="vn-icon">Tuỳ chỉnh Kích thước & Khung hiển thị (Resolution & Sizing)</div>
      <div class="vn-group" style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:12.5px;color:#e2e8f0;font-weight:600;">
          <span><img src="https://api.iconify.design/lucide:image.svg?color=%2394a3b8" class="vn-icon">Kích thước ảnh Avatar: <b id="vn-sz-avatar-val">52px</b></span>
          <span style="color:#94a3b8;font-size:11px;">(20px - 250px)</span>
        </div>
        <input type="range" id="vn-sz-avatar-slider" min="20" max="250" value="52" style="width:100%;cursor:pointer;accent-color:#6366f1;" />
      </div>
      <div class="vn-group" style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:12.5px;color:#e2e8f0;font-weight:600;">
          <span><img src="https://api.iconify.design/lucide:type.svg?color=%2394a3b8" class="vn-icon">Cỡ chữ lời thoại & suy nghĩ: <b id="vn-sz-font-val">14.5px</b></span>
          <span style="color:#94a3b8;font-size:11px;">(10px - 36px)</span>
        </div>
        <input type="range" id="vn-sz-font-slider" min="10" max="36" step="0.5" value="14.5" style="width:100%;cursor:pointer;accent-color:#6366f1;" />
      </div>
      <div class="vn-group" style="margin-bottom:14px;">
        <div style="font-size:12.5px;color:#e2e8f0;font-weight:600;margin-bottom:6px;"><img src="https://api.iconify.design/lucide:baseline.svg?color=%2394a3b8" class="vn-icon">Phông chữ lời thoại & suy nghĩ (Font Family):</div>
        <select id="vn-sz-fontfamily-select" class="vn-input" style="width:100%;cursor:pointer;background:#1e293b;color:#f8fafc;font-weight:500;padding:8px 12px;border-radius:10px;">
          <option value="default">🌟 Mặc định theo theme (Khuyên dùng)</option>
          <option value="serif">📖 Serif Hoàng Gia / Truyền thống (Palatino, Georgia, Cambria, Lora...)</option>
          <option value="sans">✨ Sans-Serif Hiện Đại (Inter, Roboto, Segoe UI, Arial...)</option>
          <option value="monospace">💻 Monospace / Code (Consolas, Courier New, Fira Code...)</option>
          <option value="comic">🎨 Comic / Manga (Comic Sans MS, cursive, Chalkboard...)</option>
          <option value="system">📱 System UI (Phông chuẩn hệ thống của máy)</option>
          <option value="custom">⚙️ Tùy chỉnh tên Phông chữ riêng (Custom Font)...</option>
        </select>
        <input class="vn-input" id="vn-sz-fontfamily-custom" placeholder="Nhập tên font (VD: 'Times New Roman', 'Nunito', 'Verdana'...)" style="display:none;margin-top:8px;font-family:monospace;" />
      </div>
      <div class="vn-group" style="margin-bottom:14px;">
        <div style="font-size:12.5px;color:#e2e8f0;font-weight:600;margin-bottom:6px;"><img src="https://api.iconify.design/lucide:palette.svg?color=%23a78bfa" class="vn-icon">Chế độ chỉnh màu chữ lời thoại (Text Color Mode):</div>
        <select id="vn-sz-textcolormode-select" class="vn-input" style="width:100%;cursor:pointer;background:#1e293b;color:#f8fafc;font-weight:500;padding:8px 12px;border-radius:10px;margin-bottom:8px;">
          <option value="global">🌐 Toàn cục (Tất cả nhân vật dùng chung 1 màu chữ dưới đây)</option>
          <option value="per_char">👤 Theo từng nhân vật (Chỉnh riêng màu chữ cho từng nhân vật ở Tab 1)</option>
        </select>
        <div id="vn-sz-textcolor-global-wrap">
          <div style="font-size:12px;color:#cbd5e1;margin-bottom:4px;">Màu chữ lời thoại toàn cục:</div>
          <div style="display:flex;gap:8px;align-items:center;">
            <select id="vn-sz-textcolor-select" class="vn-input" style="flex:1;cursor:pointer;background:#1e293b;color:#f8fafc;font-weight:500;padding:8px 12px;border-radius:10px;">
              <option value="default">🌟 Mặc định theo theme (Khuyên dùng)</option>
              <option value="#ffffff">⚪ Trắng tinh (White - #FFFFFF)</option>
              <option value="#f8fafc">✨ Trắng sáng mượt (Slate Light - #F8FAFC)</option>
              <option value="#f3f4f6">☁️ Xám nhạt (Gray Light - #F3F4F6)</option>
              <option value="#fef08a">💛 Vàng kem ấm (Yellow Cream - #FEF08A)</option>
              <option value="#a78bfa">💜 Tím nhạt mộng mơ (Purple Light - #A78BFA)</option>
              <option value="#38bdf8">💙 Xanh băng giá (Ice Blue - #38BDF8)</option>
              <option value="#f43f5e">❤️ Đỏ hồng nhạt (Rose Light - #F43F5E)</option>
              <option value="#000000">⚫ Đen tuyền (Black - #000000 - Cho nền sáng)</option>
              <option value="custom">🎨 Màu tùy chỉnh (Chọn từ bảng màu)...</option>
            </select>
            <input type="color" id="vn-sz-textcolor-picker" value="#ffffff" style="display:none;width:40px;height:40px;border:none;background:none;cursor:pointer;border-radius:8px;" title="Chọn màu tùy chỉnh" />
          </div>
        </div>
        <div id="vn-sz-textcolor-perchar-wrap" style="display:none;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.35);padding:10px 12px;border-radius:10px;font-size:12px;color:#c4b5fd;line-height:1.5;">
          <img src="https://api.iconify.design/lucide:sparkles.svg?color=%23c4b5fd" class="vn-icon"><b>Chế độ chỉnh màu chữ theo từng nhân vật đang bật!</b><br>
          👉 Hãy sang tab <b>👤 Nhân vật & Avatar</b>, nhấp chọn nhân vật muốn chỉnh, và đổi mục <b>"Màu chữ lời thoại riêng"</b> cho nhân vật đó nhé!
        </div>
      </div>
      <div class="vn-group" style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;font-size:12.5px;color:#e2e8f0;font-weight:600;">
          <span><img src="https://api.iconify.design/lucide:move-horizontal.svg?color=%2394a3b8" class="vn-icon">Độ rộng tối đa khung thoại: <b id="vn-sz-width-val">78%</b></span>
          <span style="color:#94a3b8;font-size:11px;">(30% - 100%)</span>
        </div>
        <input type="range" id="vn-sz-width-slider" min="30" max="100" value="78" style="width:100%;cursor:pointer;accent-color:#6366f1;" />
      </div>
      <div class="vn-group" style="margin-bottom:14px;">
        <div style="font-size:12.5px;color:#e2e8f0;font-weight:600;margin-bottom:6px;"><img src="https://api.iconify.design/lucide:sparkles.svg?color=%2338bdf8" class="vn-icon">Chế độ Hiển thị & Khử răng cưa ảnh Avatar:</div>
        <select id="vn-sz-quality-select" class="vn-input" style="width:100%;cursor:pointer;background:#1e293b;color:#f8fafc;font-weight:500;padding:8px 12px;border-radius:10px;">
          <option value="smooth">🌟 Siêu mịn & Khử răng cưa GPU (Khuyên dùng cho Anime, Chân dung HD)</option>
          <option value="sharp">🔥 Tăng cường sắc nét & Tương phản (Làm viền sắc, tăng độ rực rỡ)</option>
          <option value="pixel">🎮 Pixel Art / Retro 8-bit (Crisp-Edges, giữ cạnh vuông sắc lẹm)</option>
          <option value="standard">💡 Chuẩn tự nhiên (Standard HD theo trình duyệt)</option>
        </select>
        <div style="font-size:11px;color:#94a3b8;margin-top:4px;line-height:1.5;">Chế độ <b>Siêu mịn</b> dùng thuật toán Bicubic/Lanczos của GPU làm mượt hoàn hảo. Chế độ <b>Tăng cường sắc nét</b> áp dụng bộ lọc tăng tương phản viền ảnh.</div>
      </div>
      <div class="vn-group" style="margin-bottom:14px; margin-top:14px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.08);">
        <div style="font-size:12.5px;color:#e2e8f0;font-weight:600;margin-bottom:6px;"><img src="https://api.iconify.design/lucide:arrow-up-down.svg?color=%23818cf8" class="vn-icon">Vị trí mở rộng ảnh khi xem trong truyện:</div>
        <select id="vn-sz-imgpos-select" class="vn-input" style="width:100%;cursor:pointer;background:#1e293b;color:#f8fafc;font-weight:500;padding:8px 12px;border-radius:10px;">
          <option value="top">⬆️ Mở ảnh lên trên (Đẩy chữ xuống dưới - Mặc định)</option>
          <option value="bottom">⬇️ Mở ảnh xuống dưới (Chữ ở trên, ảnh bên dưới)</option>
        </select>
      </div>
      <div class="vn-group" style="margin-bottom:14px;">
        <div style="font-size:12.5px;color:#e2e8f0;font-weight:600;margin-bottom:6px;"><img src="https://api.iconify.design/lucide:expand.svg?color=%2338bdf8" class="vn-icon">Chế độ mở rộng ảnh tự động:</div>
        <select id="vn-sz-imgmode-select" class="vn-input" style="width:100%;cursor:pointer;background:#1e293b;color:#f8fafc;font-weight:500;padding:8px 12px;border-radius:10px;">
          <option value="normal">💡 Bình thường (Nhấn vào avatar 52px để mở rộng ảnh)</option>
          <option value="always_full">🌟 Luôn mở full ảnh tự động (Mặc định hiện ảnh chân dung lớn cho mọi thoại)</option>
        </select>
        <div style="font-size:11px;color:#94a3b8;margin-top:4px;line-height:1.5;">Khi chọn <b>Luôn mở full ảnh tự động</b>, mọi lời thoại sẽ lập tức hiển thị kèm ảnh khổ lớn rõ nét. Bạn có thể bấm vào ảnh để thu nhỏ lại nếu muốn.</div>
      </div>
      <button class="vn-btn vn-btn-secondary vn-btn-sm" id="vn-sz-reset" style="width:100%;"><img src="https://api.iconify.design/lucide:rotate-ccw.svg?color=%2394a3b8" class="vn-icon">Khôi phục kích thước & chất lượng mặc định</button>
    </div>
    <button class="vn-btn vn-btn-secondary" id="vn-rerender-btn" style="width:100%;"><img src="https://api.iconify.design/lucide:refresh-cw.svg?color=%2338bdf8" class="vn-icon">Làm mới & Re-render tất cả tin nhắn ngay lập tức</button>
    <div style="font-size:12px;color:#94a3b8;line-height:1.7;background:rgba(0,0,0,0.2);padding:10px 14px;border-radius:10px;">
      <img src="https://api.iconify.design/lucide:lightbulb.svg?color=%23fbbf24" class="vn-icon"><b>Mẹo nhỏ:</b> Khi bạn thay đổi avatar hoặc màu sắc nhân vật ở tab Nhân vật, nhấn nút <b>Re-render</b> bên trên để áp dụng ngay thay đổi vào toàn bộ lịch sử chat!
    </div>
  </div>
  <!-- TAB 3: PROMPT -->
  <div class="vn-tab-content" data-tab="prompt" id="vn-tab-prompt">
    <div class="vn-toggle-row">
      <div class="vn-toggle-info">
        <div class="vn-toggle-name">Bật tự động tiêm Prompt hướng dẫn cấu trúc lời thoại</div>
        <div class="vn-toggle-desc">Tự động chèn hướng dẫn cấu trúc lời thoại [Tên] vào luồng xử lý (In-Chat @ Depth 0) bằng Event Hooks chuẩn của SillyTavern</div>
      </div>
      <label class="vn-switch"><input type="checkbox" id="vn-toggle-inject" /><span class="vn-slider"></span></label>
    </div>
    <div class="vn-toggle-row">
      <div class="vn-toggle-info">
        <div class="vn-toggle-name"><img src="https://api.iconify.design/lucide:package.svg?color=%23818cf8" class="vn-icon">Bọc khối luật bằng marker <!-- vn_dialogue_format_marker --></div>
        <div class="vn-toggle-desc">Giúp AI phân định rõ ràng đâu là chỉ lệnh hệ thống, đâu là ngữ cảnh truyện, chống rò rỉ prompt ra lời thoại</div>
      </div>
      <label class="vn-switch"><input type="checkbox" id="vn-toggle-wrap-rule" /><span class="vn-slider"></span></label>
    </div>
    <div style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:14px;margin-bottom:14px;">
      <div class="vn-section-label" style="margin-top:0;"><img src="https://api.iconify.design/lucide:locate.svg?color=%23818cf8" class="vn-icon">Tùy chỉnh vị trí & vai trò bơm Prompt (Injection Position)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:8px;">
        <div>
          <label style="font-size:11.5px;color:#cbd5e1;display:block;margin-bottom:4px;">Vị trí bơm (Target):</label>
          <select class="vn-input" id="vn-inject-target" style="width:100%;padding:6px 10px;font-size:12.5px;">
            <option value="in_chat">In-Chat (Trong luồng thoại)</option>
            <option value="in_prompt">In-Prompt (Trước luồng thoại)</option>
            <option value="after_prompt">After-Prompt (Sau cùng)</option>
          </select>
        </div>
        <div>
          <label style="font-size:11.5px;color:#cbd5e1;display:block;margin-bottom:4px;">Vai trò (Role):</label>
          <select class="vn-input" id="vn-inject-role" style="width:100%;padding:6px 10px;font-size:12.5px;">
            <option value="system">System (Hệ thống)</option>
            <option value="user">User (Người dùng)</option>
            <option value="assistant">Assistant (AI)</option>
          </select>
        </div>
        <div id="vn-inject-depth-wrap">
          <label style="font-size:11.5px;color:#cbd5e1;display:block;margin-bottom:4px;">Độ sâu (Depth):</label>
          <input type="number" class="vn-input" id="vn-inject-depth" min="0" max="50" value="0" style="width:100%;padding:6px 10px;font-size:12.5px;" title="0 = Ngay trước tin nhắn cuối cùng" />
        </div>
      </div>
      <div style="font-size:11.5px;color:#94a3b8;margin-top:8px;"><img src="https://api.iconify.design/lucide:lightbulb.svg?color=%23fbbf24" class="vn-icon" style="width:14px;height:14px;"><b>Khuyên dùng:</b> In-Chat + Role System + Depth 0 (Bơm ngay sát câu cuối cùng để AI nhớ cấu trúc thoại tốt nhất).</div>
    </div>
    <div class="vn-toggle-row" style="border-color:rgba(244,63,94,0.3);background:rgba(244,63,94,0.08);margin-bottom:8px;">
      <div class="vn-toggle-info">
        <div class="vn-toggle-name" style="color:#f43f5e;"><img src="https://api.iconify.design/lucide:heart.svg?color=%23f43f5e" class="vn-icon">Tự động gán ảnh theo Giới tính (Waifu/Husbando)</div>
        <div class="vn-toggle-desc">Tự động bổ sung quy tắc trả về @Tên(Nữ/Nam)@ vào Prompt hướng dẫn bên dưới cho AI</div>
      </div>
      <label class="vn-switch"><input type="checkbox" id="vn-toggle-auto-assign-prompt" /><span class="vn-slider"></span></label>
    </div>
    <div class="vn-toggle-row" style="border-color:rgba(236,72,153,0.3);background:rgba(236,72,153,0.08);margin-bottom:14px;">
      <div class="vn-toggle-info">
        <div class="vn-toggle-name" style="color:#ec4899;"><img src="https://api.iconify.design/lucide:smile.svg?color=%23ec4899" class="vn-icon">Tự động tiêm nhãn ảnh ngữ cảnh vào Prompt (Dynamic Context Images)</div>
        <div class="vn-toggle-desc">Tự động bổ sung danh sách nhãn ảnh cảm xúc của từng nhân vật vào Prompt hướng dẫn bên dưới cho AI</div>
      </div>
      <label class="vn-switch"><input type="checkbox" id="vn-toggle-dynamic-context-prompt" /><span class="vn-slider"></span></label>
    </div>
    <div class="vn-group" id="vn-dynamic-prompt-wrap" style="margin-bottom:14px;padding:12px;background:rgba(236,72,153,0.06);border:1px solid rgba(236,72,153,0.3);border-radius:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div class="vn-section-label" style="color:#ec4899;margin:0;"><img src="https://api.iconify.design/lucide:smile.svg?color=%23ec4899" class="vn-icon">Prompt Quy tắc Ảnh ngữ cảnh động (Dynamic Context Images)</div>
        <span id="vn-dynamic-prompt-status" style="font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600;"></span>
      </div>
      <textarea class="vn-input vn-textarea" id="vn-dynamic-prompt-text" rows="6" style="border-color:rgba(236,72,153,0.3);font-size:13px;background:rgba(0,0,0,0.3);"></textarea>
      <div style="font-size:11.5px;color:#cbd5e1;margin-top:6px;line-height:1.5;"><img src="https://api.iconify.design/lucide:info.svg?color=%2394a3b8" class="vn-icon" style="width:14px;height:14px;">Sử dụng macro <code style="background:rgba(236,72,153,0.2);color:#f472b6;padding:1px 5px;border-radius:4px;">{{charTagsList}}</code> để tự động chèn danh sách nhãn cảm xúc/ngữ cảnh hiện có của các nhân vật. Các phần còn lại là prompt bình thường hướng dẫn AI cách viết thẻ tên kèm nhãn.</div>
    </div>
    <div class="vn-group" id="vn-gender-prompt-wrap" style="margin-bottom:14px;padding:12px;background:rgba(244,63,94,0.06);border:1px solid rgba(244,63,94,0.3);border-radius:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div class="vn-section-label" style="color:#f43f5e;margin:0;"><img src="https://api.iconify.design/lucide:sparkles.svg?color=%23f43f5e" class="vn-icon">Prompt Quy tắc Nhận diện Giới tính (Tự động gán ảnh)</div>
        <span id="vn-gender-prompt-status" style="font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600;"></span>
      </div>
      <textarea class="vn-input vn-textarea" id="vn-gender-prompt-text" rows="4" style="border-color:rgba(244,63,94,0.3);font-size:13px;background:rgba(0,0,0,0.3);"></textarea>
      <div style="font-size:11.5px;color:#cbd5e1;margin-top:6px;"><img src="https://api.iconify.design/lucide:info.svg?color=%2394a3b8" class="vn-icon" style="width:14px;height:14px;">Khi bật công tắc bên trên, đoạn quy tắc này sẽ được tự động nối vào dưới Prompt gốc khi tiêm vào luồng xử lý để dạy AI trả về @Tên(Nữ/Nam)@.</div>
    </div>
    <div class="vn-group">
      <div class="vn-section-label"><img src="https://api.iconify.design/lucide:terminal.svg?color=%23818cf8" class="vn-icon">Nội dung Prompt hướng dẫn AI gốc (In-Chat @ Depth 0 via Event Hooks)</div>
      <textarea class="vn-input vn-textarea" id="vn-prompt-text" rows="8"></textarea>
    </div>
    <div style="display:flex;gap:10px;">
      <button class="vn-btn vn-btn-primary" id="vn-prompt-save" style="flex:1;"><img src="https://api.iconify.design/lucide:save.svg?color=white" class="vn-icon">Lưu thay đổi Prompt (Tất cả các bảng)</button>
      <button class="vn-btn vn-btn-secondary" id="vn-prompt-reset"><img src="https://api.iconify.design/lucide:rotate-ccw.svg?color=%2394a3b8" class="vn-icon">Khôi phục mặc định</button>
    </div>
    <div style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:14px;margin-top:14px;margin-bottom:14px;">
      <div class="vn-section-label" style="margin-top:0;"><img src="https://api.iconify.design/lucide:code.svg?color=%23818cf8" class="vn-icon">Cú pháp nhận diện lời thoại & tên nhân vật (Regex Mode)</div>
      <div style="font-size:12px;color:#cbd5e1;margin-bottom:10px;">Chọn định dạng thẻ tên phù hợp với cách AI viết lời thoại trong prompt của bạn:</div>
      <div class="vn-style-picker" id="vn-regex-picker">
        <button class="vn-style-opt" data-regex="at">
          <div class="vn-style-name">@Tên@ "Thoại" / *Suy nghĩ*</div>
          <div>Mặc định (@Tên@ - Chống nhiễu rác & CoT tuyệt đối)</div>
        </button>
        <button class="vn-style-opt" data-regex="japanese">
          <div class="vn-style-name">【Tên】 "Thoại" / *Suy nghĩ*</div>
          <div>Định dạng ngoặc vuông Nhật Bản</div>
        </button>
        <button class="vn-style-opt" data-regex="curly">
          <div class="vn-style-name">{Tên} "Thoại" / *Suy nghĩ*</div>
          <div>Định dạng ngoặc nhọn (An toàn CoT)</div>
        </button>
        <button class="vn-style-opt" data-regex="brackets">
          <div class="vn-style-name">[Tên] "Thoại" / *Suy nghĩ*</div>
          <div>Ngoặc vuông cổ điển</div>
        </button>
        <button class="vn-style-opt" data-regex="colon">
          <div class="vn-style-name">Tên: "Thoại" / *Suy nghĩ*</div>
          <div>Định dạng dấu hai chấm (Roleplay)</div>
        </button>
        <button class="vn-style-opt" data-regex="custom">
          <div class="vn-style-name"><img src="https://api.iconify.design/lucide:settings.svg?color=%23818cf8" class="vn-icon">Tùy chỉnh Regex</div>
          <div>Tự viết biểu thức chính quy riêng</div>
        </button>
      </div>
      <div id="vn-custom-regex-wrap" style="display:none;margin-top:12px;">
        <div class="vn-section-label"><img src="https://api.iconify.design/lucide:regex.svg?color=%23818cf8" class="vn-icon">Biểu thức chính quy (Custom Regex - Group 1: Tên, Group 2+: Thoại/Suy nghĩ)</div>
        <input class="vn-input" id="vn-custom-regex-input" placeholder="Ví dụ: \\<([^>]+)\\>\\s*\"([^\"]+)\"" style="font-family:monospace;" />
      </div>
      <div style="margin-top:16px;padding-top:14px;border-top:1px dashed rgba(255,255,255,0.1);">
        <div class="vn-section-label"><img src="https://api.iconify.design/lucide:eraser.svg?color=%23f43f5e" class="vn-icon">Dọn dẹp ký tự thừa ở đầu/cuối lời thoại & suy nghĩ (Clean Bubble Text)</div>
        <input class="vn-input" id="vn-clean-patterns-input" placeholder="Ví dụ: &quot;|“|”|* (Để trống = giữ nguyên 100% theo regex)" style="font-family:monospace;" />
        <div style="font-size:11.5px;color:#94a3b8;margin-top:4px;">Nhập các ký tự bạn muốn xóa khỏi 2 đầu bong bóng thoại (cách nhau bởi dấu <code>|</code> hoặc viết liền như <code>&quot;*“”</code>). Nếu <b>để trống</b>, script sẽ tuân thủ tuyệt đối theo regex của bạn và không tự ý xóa gì cả!</div>
      </div>
    </div>
  </div>
  <!-- TAB 4: CÀI ĐẶT -->
  <div class="vn-tab-content" data-tab="settings" id="vn-tab-settings">
    <div class="vn-toggle-row">
      <div class="vn-toggle-info">
        <div class="vn-toggle-name">Kích hoạt tổng (Master Switch)</div>
        <div class="vn-toggle-desc">Bật/tắt toàn bộ tính năng của Visual Novel Dialogue</div>
      </div>
      <label class="vn-switch"><input type="checkbox" id="vn-toggle-main" /><span class="vn-slider"></span></label>
    </div>
    <div class="vn-toggle-row">
      <div class="vn-toggle-info">
        <div class="vn-toggle-name"><img src="https://api.iconify.design/lucide:bot.svg?color=%23818cf8" class="vn-icon">Tự động bắt thẻ & tạo nhân vật mới (Auto Register)</div>
        <div class="vn-toggle-desc">Tự động tạo thẻ khi gặp tên mới trong lời thoại. Tắt đi để chỉ hiển thị lời thoại theo danh sách nhân vật tự điền ở Tab 1 (chống bắt nhầm rác/NPC).</div>
      </div>
      <label class="vn-switch"><input type="checkbox" id="vn-toggle-autoreg" class="vn-auto-reg-toggle" /><span class="vn-slider"></span></label>
    </div>
    <div class="vn-toggle-row">
      <div class="vn-toggle-info">
        <div class="vn-toggle-name" style="color:#f43f5e;"><img src="https://api.iconify.design/lucide:heart.svg?color=%23f43f5e" class="vn-icon">Tự động gán ảnh Waifu/Husbando cho nhân vật mới</div>
        <div class="vn-toggle-desc">Tự động bổ sung quy tắc @Tên(Nữ/Nam)@ vào Prompt và gán ngẫu nhiên ảnh từ neko.best</div>
      </div>
      <label class="vn-switch"><input type="checkbox" id="vn-toggle-auto-assign-set" /><span class="vn-slider"></span></label>
    </div>
    <div class="vn-toggle-row">
      <div class="vn-toggle-info">
        <div class="vn-toggle-name" style="color:#ec4899;"><img src="https://api.iconify.design/lucide:smile.svg?color=%23ec4899" class="vn-icon">Bật tính năng Ảnh ngữ cảnh động (Dynamic Context Images)</div>
        <div class="vn-toggle-desc">Bơm danh sách nhãn ảnh của nhân vật vào prompt để AI tự chọn ảnh theo mạch truyện</div>
      </div>
      <label class="vn-switch"><input type="checkbox" id="vn-toggle-dynamic-context-set" /><span class="vn-slider"></span></label>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:4px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <button class="vn-btn vn-btn-secondary" id="vn-btn-clear-cache" style="background:#334155;color:#f8fafc;padding:10px;border-radius:8px;font-weight:600;border:1px solid #475569;display:flex;align-items:center;justify-content:center;gap:6px;"><img src="https://api.iconify.design/lucide:trash.svg?color=%23cbd5e1" class="vn-icon">Dọn dẹp Cache</button>
        <button class="vn-btn vn-btn-primary" id="vn-btn-test-perf" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:10px;border-radius:8px;font-weight:600;border:none;box-shadow:0 4px 12px rgba(99,102,241,0.3);display:flex;align-items:center;justify-content:center;gap:6px;"><img src="https://api.iconify.design/lucide:zap.svg?color=%23fbbf24" class="vn-icon">Test hiệu năng (200)</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:6px;">
        <button class="vn-btn vn-btn-danger" id="vn-btn-clear-local" style="padding:10px;border-radius:8px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;"><img src="https://api.iconify.design/lucide:folder-x.svg?color=%23f87171" class="vn-icon">Xoá sạch Kho Local</button>
        <button class="vn-btn vn-btn-danger" id="vn-btn-clear-link" style="padding:10px;border-radius:8px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;"><img src="https://api.iconify.design/lucide:link-2-off.svg?color=%23f87171" class="vn-icon">Xoá sạch Kho Link</button>
      </div>
      <button class="vn-btn vn-btn-secondary" id="vn-export-cfg"><img src="https://api.iconify.design/lucide:download.svg?color=%23cbd5e1" class="vn-icon">Sao lưu cấu hình ra file JSON (Export)</button>
      <button class="vn-btn vn-btn-secondary" id="vn-import-cfg-btn"><img src="https://api.iconify.design/lucide:upload.svg?color=%23cbd5e1" class="vn-icon">Nhập cấu hình từ file JSON (Import)</button>
      <input type="file" id="vn-import-cfg-file" accept=".json" style="display:none;" />
      <button class="vn-btn vn-btn-danger" id="vn-reset-all" style="margin-top:6px;"><img src="https://api.iconify.design/lucide:alert-triangle.svg?color=%23f87171" class="vn-icon">Khôi phục toàn bộ về cài đặt gốc (Reset All)</button>
    </div>
    <div style="background:rgba(0,0,0,0.25);border-radius:12px;padding:14px;font-size:12.5px;color:#cbd5e1;line-height:1.8;margin-top:6px;">
      <b><img src="https://api.iconify.design/lucide:book-open.svg?color=%23818cf8" class="vn-icon">Hướng dẫn sử dụng nhanh:</b><br>
      1️⃣ Bật <b>Tiêm Prompt</b> ở tab Prompt để AI hiểu và trả về lời thoại kèm thẻ <code>[TênNhânVật]</code>.<br>
      2️⃣ Sang tab <b>Nhân vật</b> → Nhấn <b>Quét tự động</b> để nhận diện tên nhân vật từ chat.<br>
      3️⃣ Nhấn vào từng nhân vật → Chọn avatar từ kho ảnh anime miễn phí, Kho Local đã import hoặc Kho Link đã lưu.<br>
      4️⃣ Tận hưởng trải nghiệm Visual Novel tuyệt đẹp! Bạn có thể đổi phong cách bong bóng thoại bất kỳ lúc nào tại tab <b>Giao diện</b>.
    </div>
  </div>
  <!-- FOOTER -->
  <div style="padding:14px 20px;border-top:1px solid rgba(255,255,255,0.08);display:flex;gap:10px;justify-content:flex-end;flex-shrink:0;">
    <button class="vn-btn vn-btn-secondary" id="vn-close-modal">Đóng cửa sổ</button>
  </div>
</div>`;
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('show'); });
        PD.body.appendChild(overlay);
        setupMainModalEvents();
    }

    function refreshMainModal() {
        const tog = PD.getElementById('vn-toggle-main');
        const togR = PD.getElementById('vn-toggle-render');
        const togI = PD.getElementById('vn-toggle-inject');
        const togAuto = PD.getElementById('vn-toggle-autoreg');
        const togAutoAssign = PD.getElementById('vn-toggle-auto-assign');
        const togAutoAssignSet = PD.getElementById('vn-toggle-auto-assign-set');
        const togAutoAssignPrompt = PD.getElementById('vn-toggle-auto-assign-prompt');
        if (tog) tog.checked = CFG.enabled;
        if (togR) togR.checked = CFG.renderMode;
        if (togI) togI.checked = CFG.promptInjection;
        const togWrap = PD.getElementById('vn-toggle-wrap-rule');
        if (togWrap) togWrap.checked = CFG.wrapRuleBlock !== false;
        const injTarget = PD.getElementById('vn-inject-target');
        if (injTarget) injTarget.value = CFG.injectTarget || 'in_chat';
        const injRole = PD.getElementById('vn-inject-role');
        if (injRole) injRole.value = CFG.injectRole || 'system';
        const injDepth = PD.getElementById('vn-inject-depth');
        if (injDepth) injDepth.value = CFG.injectDepth !== undefined ? CFG.injectDepth : 0;
        const depthWrap = PD.getElementById('vn-inject-depth-wrap');
        if (depthWrap) depthWrap.style.display = (CFG.injectTarget || 'in_chat') === 'in_chat' ? 'block' : 'none';
        PD.querySelectorAll('.vn-auto-reg-toggle, #vn-toggle-autoreg, #vn-toggle-autoreg-char').forEach(el => { el.checked = CFG.autoRegisterChars !== false; });
        if (togAutoAssign) togAutoAssign.checked = !!CFG.autoAssignAvatar;
        if (togAutoAssignSet) togAutoAssignSet.checked = !!CFG.autoAssignAvatar;
        if (togAutoAssignPrompt) togAutoAssignPrompt.checked = !!CFG.autoAssignAvatar;

        const togDyn = PD.getElementById('vn-toggle-dynamic-context');
        const togDynPrompt = PD.getElementById('vn-toggle-dynamic-context-prompt');
        const togDynSet = PD.getElementById('vn-toggle-dynamic-context-set');
        if (togDyn) togDyn.checked = !!CFG.dynamicContextImages;
        if (togDynPrompt) togDynPrompt.checked = !!CFG.dynamicContextImages;
        if (togDynSet) togDynSet.checked = !!CFG.dynamicContextImages;

        PD.querySelectorAll('#vn-tab-style .vn-style-opt').forEach(b => b.classList.toggle('selected', b.dataset.style === CFG.displayStyle));
        
        const regexMode = CFG.regexMode || 'at';
        PD.querySelectorAll('#vn-regex-picker .vn-style-opt').forEach(b => b.classList.toggle('selected', b.dataset.regex === regexMode));
        const customWrap = PD.getElementById('vn-custom-regex-wrap');
        if (customWrap) customWrap.style.display = regexMode === 'custom' ? 'block' : 'none';
        const customInput = PD.getElementById('vn-custom-regex-input');
        if (customInput) customInput.value = CFG.customRegex || '';
        const cleanInput = PD.getElementById('vn-clean-patterns-input');
        if (cleanInput) cleanInput.value = CFG.cleanPatterns !== undefined ? CFG.cleanPatterns : '';

        const pt = PD.getElementById('vn-prompt-text');
        if (pt) pt.value = CFG.customPrompt || '';
        const gpt = PD.getElementById('vn-gender-prompt-text');
        if (gpt) gpt.value = CFG.genderPrompt || DEFAULT_CONFIG.genderPrompt || '';
        const gStatus = PD.getElementById('vn-gender-prompt-status');
        if (gStatus) {
            if (CFG.autoAssignAvatar) {
                gStatus.textContent = '⚡ ĐANG KÍCH HOẠT (TIÊM KÈM)';
                gStatus.style.background = 'rgba(34,197,94,0.2)';
                gStatus.style.color = '#4ade80';
            } else {
                gStatus.textContent = '⏸️ ĐANG TẮT (KHÔNG TIÊM)';
                gStatus.style.background = 'rgba(148,163,184,0.2)';
                gStatus.style.color = '#94a3b8';
            }
        }
        const dpt = PD.getElementById('vn-dynamic-prompt-text');
        if (dpt) dpt.value = CFG.dynamicPrompt || DEFAULT_CONFIG.dynamicPrompt || '';
        const dStatus = PD.getElementById('vn-dynamic-prompt-status');
        if (dStatus) {
            if (CFG.dynamicContextImages) {
                dStatus.textContent = '⚡ ĐANG KÍCH HOẠT (TIÊM KÈM)';
                dStatus.style.background = 'rgba(34,197,94,0.2)';
                dStatus.style.color = '#4ade80';
            } else {
                dStatus.textContent = '⏸️ ĐANG TẮT (KHÔNG TIÊM)';
                dStatus.style.background = 'rgba(148,163,184,0.2)';
                dStatus.style.color = '#94a3b8';
            }
        }
        closeCharDetail();
        renderCharGrid();
    }

    let _selectedChars = new Set();
    function updateBulkDeleteBtn() {
        const btn = PD.getElementById('vn-bulk-delete');
        if (!btn) return;
        if (_selectedChars.size > 0) {
            btn.style.display = 'inline-block';
            btn.innerHTML = `<img src="https://api.iconify.design/lucide:trash-2.svg?color=%23f87171" class="vn-icon" style="width:14px;height:14px;">Xóa đã chọn (${_selectedChars.size})`;
        } else {
            btn.style.display = 'none';
        }
    }

    function renderCharGrid() {
        const grid = PD.getElementById('vn-char-grid');
        if (!grid) return;
        grid.innerHTML = '';
        const allNames = Object.keys(CFG.characters);
        const filterInput = PD.getElementById('vn-char-search-filter');
        const query = (filterInput ? filterInput.value : '').trim().toLowerCase();
        const names = query ? allNames.filter(n => n.toLowerCase().includes(query)) : allNames;

        const cntEl = PD.getElementById('vn-char-count');
        if (cntEl) cntEl.textContent = query ? `${names.length}/${allNames.length}` : allNames.length;

        if (names.length === 0) {
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#64748b;padding:20px 0;font-size:13px;font-style:italic;">Không tìm thấy nhân vật nào phù hợp.</div>';
            updateBulkDeleteBtn();
            return;
        }

        names.forEach(name => {
            const card = PD.createElement('div');
            card.className = 'vn-char-card';
            if (_selectedChars.has(name)) card.classList.add('selected-bulk');
            card.dataset.name = name;

            const chk = PD.createElement('input');
            chk.type = 'checkbox';
            chk.className = 'vn-char-chk';
            chk.checked = _selectedChars.has(name);
            chk.title = 'Chọn nhân vật để xóa hàng loạt';
            chk.addEventListener('click', e => {
                e.stopPropagation();
                if (chk.checked) {
                    _selectedChars.add(name);
                    card.classList.add('selected-bulk');
                } else {
                    _selectedChars.delete(name);
                    card.classList.remove('selected-bulk');
                }
                updateBulkDeleteBtn();
            });
            card.appendChild(chk);

            const ch = CFG.characters[name];
            if (ch.avatar) {
                const img = PD.createElement('img');
                const safeAvatar = safeImageUrl(ch.avatar);
                const optSrc = safeAvatar ? (AVATAR_CACHE[safeAvatar] || getSmoothAvatar(safeAvatar)) : '';
                img.src = optSrc || buildInitialSvgData(name);
                img.dataset.origSrc = safeAvatar || ch.avatar;
                if (isLocalImageRef(safeAvatar)) hydrateLocalImageEl(img, safeAvatar);
                applyAvatarViewToElement(img, name);
                img.onerror = () => img.replaceWith(buildInitialCardEl(name));
                card.appendChild(img);
            } else {
                card.appendChild(buildInitialCardEl(name));
            }
            const label = PD.createElement('div');
            label.className = 'vn-char-card-name';
            label.textContent = name;
            card.appendChild(label);

            const delBtn = PD.createElement('button');
            delBtn.className = 'vn-char-del';
            delBtn.textContent = '✕';
            delBtn.title = 'Xoá nhân vật';
            delBtn.addEventListener('click', e => {
                e.stopPropagation();
                if (!confirm(`Bạn có chắc muốn xoá nhân vật "${name}"?`)) return;
                delete CFG.characters[name];
                _selectedChars.delete(name);
                saveConfig(CFG);
                renderCharGrid();
                closeCharDetail();
                forceReRenderAll();
                showToast(`Đã xoá nhân vật "${name}"`, 'info');
            });
            card.appendChild(delBtn);
            card.addEventListener('click', () => openCharDetail(name));
            grid.appendChild(card);
        });
        updateBulkDeleteBtn();
    }

    function buildInitialCardEl(name) {
        const el = PD.createElement('div');
        el.className = 'vn-char-card-initial';
        el.textContent = name.charAt(0).toUpperCase();
        const ch = CFG.characters[name];
        el.style.background = safeCssValue(ch && ch.color ? ch.color : getNameColor(name), '#4f46e5');
        return el;
    }

    function addExpressionRow(label = '', url = '') {
        const listEl = PD.getElementById('vn-char-det-expressions-list');
        if (!listEl) return;
        const row = PD.createElement('div');
        row.className = 'vn-expression-row';
        row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:rgba(0,0,0,0.25);padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);';
        
        const labelInput = PD.createElement('input');
        labelInput.type = 'text';
        labelInput.className = 'vn-input vn-exp-label';
        labelInput.placeholder = 'Tên nhãn (vd: Ăn kem, buồn...)';
        labelInput.value = label;
        labelInput.style.cssText = 'flex:1;min-width:120px;padding:6px 10px;font-size:13px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:#fff;';
        
        const urlInput = PD.createElement('input');
        urlInput.type = 'text';
        urlInput.className = 'vn-input vn-exp-url';
        urlInput.placeholder = 'URL ảnh hoặc chọn kho / tải lên ->';
        urlInput.value = url;
        urlInput.style.cssText = 'flex:2;min-width:160px;padding:6px 10px;font-size:13px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:#fff;';
        
        const pickBtn = PD.createElement('button');
        pickBtn.type = 'button';
        pickBtn.className = 'vn-btn vn-btn-secondary vn-btn-sm';
        pickBtn.title = 'Chọn ảnh từ kho anime miễn phí, kho local hoặc link đã lưu';
        pickBtn.innerHTML = '<img src="https://api.iconify.design/lucide:folder-open.svg?color=%23cbd5e1" class="vn-icon">Kho ảnh';
        pickBtn.style.cssText = 'padding:6px 10px;border-color:rgba(255,255,255,0.15);white-space:nowrap;';
        pickBtn.onclick = () => {
            if (typeof openImgPicker === 'function') {
                openImgPicker(_currentEditChar || 'char', (pickedUrl) => {
                    urlInput.value = pickedUrl;
                    if (typeof updatePreview === 'function') updatePreview();
                    showToast('Đã chọn ảnh cho nhãn ngữ cảnh!', 'success');
                });
            }
        };

        const fileInput = PD.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        
        const uploadBtn = PD.createElement('button');
        uploadBtn.type = 'button';
        uploadBtn.className = 'vn-btn vn-btn-secondary vn-btn-sm';
        uploadBtn.title = 'Tải ảnh từ máy tính lên';
        uploadBtn.innerHTML = '<img src="https://api.iconify.design/lucide:upload.svg?color=%23cbd5e1" class="vn-icon">Tải lên';
        uploadBtn.style.cssText = 'padding:6px 10px;border-color:rgba(255,255,255,0.15);white-space:nowrap;';
        uploadBtn.onclick = () => fileInput.click();
        
        fileInput.onchange = async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            try {
                const charName = _currentEditChar || 'char';
                const cleanTag = labelInput.value.trim() || 'exp_' + Date.now();
                const key = `${charName}_exp_${cleanTag}_${Date.now()}.png`;
                const idbUrl = await putLocalImageBlob(file, { name: key });
                urlInput.value = idbUrl;
                showToast('Đã lưu ảnh ngữ cảnh vào IndexedDB!', 'success');
            } catch (err) {
                console.error('[VN Dialogue] Lỗi upload ảnh ngữ cảnh:', err);
                const reader = new FileReader();
                reader.onload = () => { urlInput.value = reader.result; };
                reader.readAsDataURL(file);
            }
        };

        const previewImg = PD.createElement('img');
        previewImg.style.cssText = 'width:32px;height:32px;border-radius:6px;object-fit:cover;background:#1e293b;border:1px solid rgba(255,255,255,0.1);';
        const updatePreview = () => {
            const val = safeImageUrl(urlInput.value.trim());
            if (val) {
                previewImg.src = val;
                if (isLocalImageRef(val)) hydrateLocalImageEl(previewImg, val);
                previewImg.style.display = 'block';
            } else {
                previewImg.style.display = 'none';
            }
        };
        urlInput.addEventListener('input', updatePreview);
        updatePreview();
        
        const delBtn = PD.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'vn-btn vn-btn-danger vn-btn-sm';
        delBtn.title = 'Xóa nhãn này';
        delBtn.innerHTML = '<img src="https://api.iconify.design/lucide:trash-2.svg?color=%23f87171" class="vn-icon">';
        delBtn.style.cssText = 'padding:6px 10px;border-color:rgba(248,113,113,0.3);';
        delBtn.onclick = () => row.remove();
        
        row.appendChild(labelInput);
        row.appendChild(urlInput);
        row.appendChild(pickBtn);
        row.appendChild(uploadBtn);
        row.appendChild(fileInput);
        row.appendChild(previewImg);
        row.appendChild(delBtn);
        listEl.appendChild(row);
    }

    function renderCharExpressionsList(expressions = []) {
        const listEl = PD.getElementById('vn-char-det-expressions-list');
        if (!listEl) return;
        listEl.innerHTML = '';
        if (Array.isArray(expressions)) {
            expressions.forEach(exp => {
                if (exp && exp.label && exp.url) {
                    addExpressionRow(exp.label, exp.url);
                }
            });
        }
    }

    let _currentEditChar = null;
    function openCharDetail(name) {
        _currentEditChar = name;
        const ch = CFG.characters[name];
        if (!ch) return;
        const listView = PD.getElementById('vn-char-list-view');
        const detailView = PD.getElementById('vn-char-detail-wrap');
        const mainView = PD.getElementById('vn-char-detail-main');
        const editView = PD.getElementById('vn-char-image-edit-view');
        if (listView) listView.style.display = 'none';
        if (detailView) detailView.style.display = 'block';
        if (mainView) mainView.style.display = 'block';
        if (editView) editView.style.display = 'none';

        PD.getElementById('vn-char-det-name').textContent = name;
        PD.getElementById('vn-char-det-rename').value = name;
        PD.getElementById('vn-char-det-avatar-url').value = ch.avatar || '';
        setAvatarAdjustControls(ch);
        PD.getElementById('vn-char-det-color').value = ch.color || '';
        PD.getElementById('vn-char-det-colorpicker').value = ch.color && /^#[0-9A-Fa-f]{6}$/.test(ch.color) ? ch.color : '#6366f1';
        if (PD.getElementById('vn-char-det-textcolor')) {
            PD.getElementById('vn-char-det-textcolor').value = ch.textColor || '';
        }
        if (PD.getElementById('vn-char-det-textcolorpicker')) {
            PD.getElementById('vn-char-det-textcolorpicker').value = ch.textColor && /^#[0-9A-Fa-f]{6}$/.test(ch.textColor) ? ch.textColor : '#ffffff';
        }
        const hintEl = PD.getElementById('vn-char-det-textcolor-hint');
        if (hintEl) {
            const isPerChar = CFG.customSizing && CFG.customSizing.textColorMode === 'per_char';
            if (isPerChar) {
                hintEl.innerHTML = '<img src="https://api.iconify.design/lucide:check-circle.svg?color=%23a78bfa" class="vn-icon"><b style="color:#a78bfa;">Chế độ màu chữ theo từng nhân vật đang BẬT!</b> Màu bạn chọn dưới đây sẽ áp dụng riêng cho lời thoại của nhân vật này.';
                hintEl.style.color = '#c4b5fd';
            } else {
                hintEl.innerHTML = '<img src="https://api.iconify.design/lucide:info.svg?color=%2394a3b8" class="vn-icon"><b>Lưu ý:</b> Bạn đang ở chế độ màu chữ Toàn Cục. Cần chọn chế độ "Chỉnh màu chữ theo từng nhân vật" ở tab <b>Giao diện & Style</b> thì cài đặt màu riêng ở đây mới có hiệu lực!';
                hintEl.style.color = '#94a3b8';
            }
        }

        renderCharExpressionsList(ch.expressions || []);

        const btnsWrap = PD.getElementById('vn-char-det-btns');
        if (btnsWrap) btnsWrap.innerHTML = '';

        const avatarImg = PD.getElementById('vn-char-det-avatar');
        const initialEl = PD.getElementById('vn-char-det-initial');
        if (ch.avatar) {
            const safeAvatar = safeImageUrl(ch.avatar);
            const optSrc = safeAvatar ? (AVATAR_CACHE[safeAvatar] || getSmoothAvatar(safeAvatar)) : buildInitialSvgData(name);
            avatarImg.src = optSrc;
            avatarImg.dataset.origSrc = safeAvatar || ch.avatar;
            if (isLocalImageRef(safeAvatar)) hydrateLocalImageEl(avatarImg, safeAvatar);
            applyAvatarViewToElement(avatarImg, ch);
            updateAvatarAdjustPreview();
            avatarImg.style.display = 'block';
            initialEl.style.display = 'none';
        } else {
            avatarImg.style.display = 'none';
            initialEl.style.display = 'flex';
            initialEl.textContent = name.charAt(0).toUpperCase();
            initialEl.style.background = ch.color || getNameColor(name);
            updateAvatarAdjustPreview();
        }
        detailView.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        PD.querySelectorAll('.vn-char-card').forEach(c => c.classList.toggle('active', c.dataset.name === name));
    }

    function closeCharDetail() {
        _currentEditChar = null;
        const listView = PD.getElementById('vn-char-list-view');
        const detailView = PD.getElementById('vn-char-detail-wrap');
        const mainView = PD.getElementById('vn-char-detail-main');
        const editView = PD.getElementById('vn-char-image-edit-view');
        if (listView) listView.style.display = 'block';
        if (detailView) detailView.style.display = 'none';
        if (mainView) mainView.style.display = 'block';
        if (editView) editView.style.display = 'none';
    }

    function setupMainModalEvents() {
        const $ = id => PD.getElementById(id) || {
            addEventListener: () => {},
            classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
            style: {},
            value: '',
            checked: false,
            focus: () => {},
            click: () => {},
            querySelectorAll: () => [],
            querySelector: () => null,
            setAttribute: () => {},
            getAttribute: () => null,
            removeAttribute: () => {},
            dataset: {},
            scrollBy: () => {},
            scrollTop: 0,
            scrollHeight: 0,
            innerHTML: '',
            textContent: '',
            appendChild: () => {},
            removeChild: () => {},
            remove: () => {}
        };

        PD.getElementById('vn-modal-overlay').querySelectorAll('.vn-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                PD.querySelectorAll('.vn-tab').forEach(t => t.classList.remove('active'));
                PD.querySelectorAll('.vn-tab-content').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                PD.getElementById('vn-tab-' + tab.dataset.tab).classList.add('active');
            });
        });

        $('vn-close-modal').addEventListener('click', () => $('vn-modal-overlay').classList.remove('show'));

        const backBtn = $('vn-char-det-back');
        if (backBtn) backBtn.addEventListener('click', closeCharDetail);

        $('vn-toggle-main').addEventListener('change', e => {
            CFG.enabled = e.target.checked;
            saveConfig(CFG);
            setupObserver();
            setupPromptInjection();
            showToast(CFG.enabled ? 'Đã bật script Visual Novel ✓' : 'Đã tắt script Visual Novel', 'info');
        });
        $('vn-toggle-render').addEventListener('change', e => {
            CFG.renderMode = e.target.checked;
            saveConfig(CFG);
            if (CFG.renderMode) forceReRenderAll();
        });
        $('vn-toggle-inject').addEventListener('change', e => {
            CFG.promptInjection = e.target.checked;
            saveConfig(CFG);
            setupPromptInjection();
            showToast(CFG.promptInjection ? 'Đã bật tiêm Prompt hướng dẫn VN Dialogue ✓' : 'Đã tắt tiêm Prompt hướng dẫn VN Dialogue', 'info');
        });
        const togWrap = $('vn-toggle-wrap-rule');
        if (togWrap) {
            togWrap.addEventListener('change', e => {
                CFG.wrapRuleBlock = e.target.checked;
                saveConfig(CFG);
                showToast(CFG.wrapRuleBlock ? '📦 Đã bật bọc khối luật bằng marker cũ <!-- vn_dialogue_format_marker -->' : 'Đã tắt bọc thẻ khối luật', 'info');
            });
        }
        const injTarget = $('vn-inject-target');
        const depthWrap = $('vn-inject-depth-wrap');
        if (injTarget) {
            injTarget.addEventListener('change', e => {
                CFG.injectTarget = e.target.value;
                if (depthWrap) depthWrap.style.display = CFG.injectTarget === 'in_chat' ? 'block' : 'none';
                saveConfig(CFG);
                showToast(`📍 Đã đổi vị trí bơm: ${e.target.options[e.target.selectedIndex].text}`, 'success');
            });
        }
        const injRole = $('vn-inject-role');
        if (injRole) {
            injRole.addEventListener('change', e => {
                CFG.injectRole = e.target.value;
                saveConfig(CFG);
                showToast(`👤 Đã đổi vai trò bơm: ${e.target.options[e.target.selectedIndex].text}`, 'success');
            });
        }
        const injDepth = $('vn-inject-depth');
        if (injDepth) {
            injDepth.addEventListener('change', e => {
                CFG.injectDepth = parseInt(e.target.value, 10) || 0;
                saveConfig(CFG);
                showToast(`🔢 Đã đặt độ sâu bơm: Depth ${CFG.injectDepth}`, 'info');
            });
        }
        const handleAutoRegChange = (checked) => {
            CFG.autoRegisterChars = checked;
            saveConfig(CFG);
            PD.querySelectorAll('.vn-auto-reg-toggle, #vn-toggle-autoreg, #vn-toggle-autoreg-char').forEach(el => { el.checked = checked; });
            forceReRenderAll();
            showToast(CFG.autoRegisterChars !== false ? 'Đã bật tự động bắt thẻ nhân vật mới' : 'Đã tắt tự động tạo thẻ (chỉ hiển thị theo danh sách)', 'info');
        };
        PD.querySelectorAll('.vn-auto-reg-toggle, #vn-toggle-autoreg, #vn-toggle-autoreg-char').forEach(el => {
            el.addEventListener('change', e => handleAutoRegChange(e.target.checked));
        });
        const handleAutoAssignChange = (checked) => {
            CFG.autoAssignAvatar = checked;
            saveConfig(CFG);
            doInjectSystemPrompt();
            if ($('vn-toggle-auto-assign')) $('vn-toggle-auto-assign').checked = checked;
            if ($('vn-toggle-auto-assign-set')) $('vn-toggle-auto-assign-set').checked = checked;
            if ($('vn-toggle-auto-assign-prompt')) $('vn-toggle-auto-assign-prompt').checked = checked;
            const gStatus = $('vn-gender-prompt-status');
            if (gStatus) {
                if (checked) {
                    gStatus.textContent = '⚡ ĐANG KÍCH HOẠT (TIÊM KÈM)';
                    gStatus.style.background = 'rgba(34,197,94,0.2)';
                    gStatus.style.color = '#4ade80';
                } else {
                    gStatus.textContent = '⏸️ ĐANG TẮT (KHÔNG TIÊM)';
                    gStatus.style.background = 'rgba(148,163,184,0.2)';
                    gStatus.style.color = '#94a3b8';
                }
            }
            showToast(checked ? '🌸 Đã bật tự động nhận diện giới tính & gán ảnh Waifu/Husbando!' : 'Đã tắt tự động gán ảnh theo giới tính', 'info');
        };
        if ($('vn-toggle-auto-assign')) $('vn-toggle-auto-assign').addEventListener('change', e => handleAutoAssignChange(e.target.checked));
        if ($('vn-toggle-auto-assign-set')) $('vn-toggle-auto-assign-set').addEventListener('change', e => handleAutoAssignChange(e.target.checked));
        if ($('vn-toggle-auto-assign-prompt')) $('vn-toggle-auto-assign-prompt').addEventListener('change', e => handleAutoAssignChange(e.target.checked));

        const handleDynamicContextChange = (checked) => {
            CFG.dynamicContextImages = checked;
            saveConfig(CFG);
            doInjectSystemPrompt();
            if ($('vn-toggle-dynamic-context')) $('vn-toggle-dynamic-context').checked = checked;
            if ($('vn-toggle-dynamic-context-prompt')) $('vn-toggle-dynamic-context-prompt').checked = checked;
            if ($('vn-toggle-dynamic-context-set')) $('vn-toggle-dynamic-context-set').checked = checked;
            const dStatus = $('vn-dynamic-prompt-status');
            if (dStatus) {
                if (checked) {
                    dStatus.textContent = '⚡ ĐANG KÍCH HOẠT (TIÊM KÈM)';
                    dStatus.style.background = 'rgba(34,197,94,0.2)';
                    dStatus.style.color = '#4ade80';
                } else {
                    dStatus.textContent = '⏸️ ĐANG TẮT (KHÔNG TIÊM)';
                    dStatus.style.background = 'rgba(148,163,184,0.2)';
                    dStatus.style.color = '#94a3b8';
                }
            }
            forceReRenderAll();
            showToast(checked ? '✨ Đã bật tính năng Ảnh ngữ cảnh động!' : 'Đã tắt tính năng Ảnh ngữ cảnh động', 'info');
        };
        if ($('vn-toggle-dynamic-context')) $('vn-toggle-dynamic-context').addEventListener('change', e => handleDynamicContextChange(e.target.checked));
        if ($('vn-toggle-dynamic-context-prompt')) $('vn-toggle-dynamic-context-prompt').addEventListener('change', e => handleDynamicContextChange(e.target.checked));
        if ($('vn-toggle-dynamic-context-set')) $('vn-toggle-dynamic-context-set').addEventListener('change', e => handleDynamicContextChange(e.target.checked));

        PD.querySelectorAll('#vn-tab-style .vn-style-opt').forEach(btn => {
            btn.addEventListener('click', () => {
                PD.querySelectorAll('#vn-tab-style .vn-style-opt').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                CFG.displayStyle = btn.dataset.style;
                saveConfig(CFG);
                forceReRenderAll();
                showToast(`Đã chọn style: ${btn.querySelector('.vn-style-name').textContent}`, 'success');
            });
        });

        PD.querySelectorAll('#vn-regex-picker .vn-style-opt').forEach(btn => {
            btn.addEventListener('click', () => {
                PD.querySelectorAll('#vn-regex-picker .vn-style-opt').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                CFG.regexMode = btn.dataset.regex;
                const customWrap = PD.getElementById('vn-custom-regex-wrap');
                if (customWrap) customWrap.style.display = CFG.regexMode === 'custom' ? 'block' : 'none';
                saveConfig(CFG);
                forceReRenderAll();
                showToast(`Đã đổi cú pháp Regex: ${btn.querySelector('.vn-style-name').textContent}`, 'success');
            });
        });
        const customRegexInput = $('vn-custom-regex-input');
        if (customRegexInput) {
            customRegexInput.addEventListener('change', e => {
                CFG.customRegex = e.target.value.trim();
                saveConfig(CFG);
                forceReRenderAll();
                showToast('Đã áp dụng Custom Regex!', 'success');
            });
        }
        const cleanInput = $('vn-clean-patterns-input');
        if (cleanInput) {
            cleanInput.addEventListener('change', e => {
                CFG.cleanPatterns = e.target.value;
                saveConfig(CFG);
                forceReRenderAll();
                showToast('Đã cập nhật quy tắc dọn dẹp lời thoại!', 'success');
            });
        }

        const updateSizingUI = () => {
            const sz = CFG.customSizing || { avatarSize: 52, fontSize: 14.5, maxWidth: 78, imgQuality: 'smooth' };
            if ($('vn-sz-avatar-slider')) $('vn-sz-avatar-slider').value = sz.avatarSize;
            if ($('vn-sz-avatar-val')) $('vn-sz-avatar-val').textContent = sz.avatarSize + 'px';
            if ($('vn-sz-font-slider')) $('vn-sz-font-slider').value = sz.fontSize;
            if ($('vn-sz-font-val')) $('vn-sz-font-val').textContent = sz.fontSize + 'px';
            if ($('vn-sz-width-slider')) $('vn-sz-width-slider').value = sz.maxWidth;
            if ($('vn-sz-width-val')) $('vn-sz-width-val').textContent = sz.maxWidth + '%';
            if ($('vn-sz-quality-select')) $('vn-sz-quality-select').value = sz.imgQuality || 'smooth';
            if ($('vn-sz-fontfamily-select')) $('vn-sz-fontfamily-select').value = sz.fontFamily || 'default';
            if ($('vn-sz-fontfamily-custom')) {
                $('vn-sz-fontfamily-custom').style.display = sz.fontFamily === 'custom' ? 'block' : 'none';
                $('vn-sz-fontfamily-custom').value = sz.fontFamilyCustom || '';
            }
            const mode = sz.textColorMode || 'global';
            if ($('vn-sz-textcolormode-select')) $('vn-sz-textcolormode-select').value = mode;
            if ($('vn-sz-textcolor-global-wrap')) $('vn-sz-textcolor-global-wrap').style.display = mode === 'global' ? 'block' : 'none';
            if ($('vn-sz-textcolor-perchar-wrap')) $('vn-sz-textcolor-perchar-wrap').style.display = mode === 'per_char' ? 'block' : 'none';
            if ($('vn-sz-textcolor-select')) $('vn-sz-textcolor-select').value = sz.textColor || 'default';
            if ($('vn-sz-textcolor-picker')) {
                const isCustom = sz.textColor === 'custom';
                $('vn-sz-textcolor-picker').style.display = isCustom ? 'inline-block' : 'none';
                $('vn-sz-textcolor-picker').value = sz.textColorCustom || '#ffffff';
            }
            if ($('vn-sz-imgpos-select')) $('vn-sz-imgpos-select').value = CFG.inchatImgPos || 'top';
            if ($('vn-sz-imgmode-select')) $('vn-sz-imgmode-select').value = CFG.inchatImgMode || 'normal';
        };
        updateSizingUI();

        const bindSlider = (sliderId, valId, key, unit) => {
            const el = $(sliderId);
            if (!el) return;
            el.addEventListener('input', e => {
                const val = parseFloat(e.target.value);
                if ($(valId)) $(valId).textContent = val + unit;
                if (!CFG.customSizing) CFG.customSizing = { avatarSize: 52, fontSize: 14.5, maxWidth: 78, imgQuality: 'smooth' };
                CFG.customSizing[key] = val;
                updateSizingVars();
            });
            el.addEventListener('change', e => {
                const val = parseFloat(e.target.value);
                if (!CFG.customSizing) CFG.customSizing = { avatarSize: 52, fontSize: 14.5, maxWidth: 78, imgQuality: 'smooth' };
                CFG.customSizing[key] = val;
                saveConfig(CFG);
                forceReRenderAll();
            });
        };
        bindSlider('vn-sz-avatar-slider', 'vn-sz-avatar-val', 'avatarSize', 'px');
        bindSlider('vn-sz-font-slider', 'vn-sz-font-val', 'fontSize', 'px');
        bindSlider('vn-sz-width-slider', 'vn-sz-width-val', 'maxWidth', '%');

        const qualitySelect = $('vn-sz-quality-select');
        if (qualitySelect) {
            qualitySelect.addEventListener('change', e => {
                if (!CFG.customSizing) CFG.customSizing = { avatarSize: 52, fontSize: 14.5, maxWidth: 78, imgQuality: 'smooth' };
                CFG.customSizing.imgQuality = e.target.value;
                saveConfig(CFG);
                updateSizingVars();
                forceReRenderAll();
                showToast('Đã áp dụng chế độ độ phân giải & khử răng cưa mới', 'success');
            });
        }

        const fontFamSelect = $('vn-sz-fontfamily-select');
        const fontFamCustom = $('vn-sz-fontfamily-custom');
        if (fontFamSelect) {
            fontFamSelect.addEventListener('change', e => {
                if (!CFG.customSizing) CFG.customSizing = { avatarSize: 52, fontSize: 14.5, maxWidth: 78, imgQuality: 'smooth' };
                CFG.customSizing.fontFamily = e.target.value;
                if (fontFamCustom) fontFamCustom.style.display = e.target.value === 'custom' ? 'block' : 'none';
                saveConfig(CFG);
                updateSizingVars();
                forceReRenderAll();
                showToast('Đã thay đổi font chữ lời thoại!', 'success');
            });
        }
        if (fontFamCustom) {
            fontFamCustom.addEventListener('change', e => {
                if (!CFG.customSizing) CFG.customSizing = { avatarSize: 52, fontSize: 14.5, maxWidth: 78, imgQuality: 'smooth' };
                CFG.customSizing.fontFamilyCustom = e.target.value.trim();
                saveConfig(CFG);
                updateSizingVars();
                forceReRenderAll();
                showToast('Đã áp dụng font chữ tùy chỉnh!', 'success');
            });
        }

        const textColorModeSelect = $('vn-sz-textcolormode-select');
        if (textColorModeSelect) {
            textColorModeSelect.addEventListener('change', e => {
                if (!CFG.customSizing) CFG.customSizing = { avatarSize: 52, fontSize: 14.5, maxWidth: 78, imgQuality: 'smooth' };
                CFG.customSizing.textColorMode = e.target.value;
                const isGlobal = e.target.value === 'global';
                if ($('vn-sz-textcolor-global-wrap')) $('vn-sz-textcolor-global-wrap').style.display = isGlobal ? 'block' : 'none';
                if ($('vn-sz-textcolor-perchar-wrap')) $('vn-sz-textcolor-perchar-wrap').style.display = !isGlobal ? 'block' : 'none';
                saveConfig(CFG);
                updateSizingVars();
                forceReRenderAll();
                showToast(isGlobal ? 'Đã chuyển sang chế độ chỉnh màu chữ Toàn Cục!' : 'Đã bật chế độ chỉnh màu chữ theo Từng Nhân Vật!', 'success');
            });
        }

        const textColorSelect = $('vn-sz-textcolor-select');
        const textColorPicker = $('vn-sz-textcolor-picker');
        if (textColorSelect) {
            textColorSelect.addEventListener('change', e => {
                if (!CFG.customSizing) CFG.customSizing = { avatarSize: 52, fontSize: 14.5, maxWidth: 78, imgQuality: 'smooth' };
                CFG.customSizing.textColor = e.target.value;
                const isCustom = e.target.value === 'custom';
                if (textColorPicker) textColorPicker.style.display = isCustom ? 'inline-block' : 'none';
                saveConfig(CFG);
                updateSizingVars();
                forceReRenderAll();
                showToast('Đã thay đổi màu chữ lời thoại!', 'success');
            });
        }
        if (textColorPicker) {
            textColorPicker.addEventListener('input', e => {
                if (!CFG.customSizing) CFG.customSizing = { avatarSize: 52, fontSize: 14.5, maxWidth: 78, imgQuality: 'smooth' };
                CFG.customSizing.textColorCustom = e.target.value;
                updateSizingVars();
            });
            textColorPicker.addEventListener('change', e => {
                if (!CFG.customSizing) CFG.customSizing = { avatarSize: 52, fontSize: 14.5, maxWidth: 78, imgQuality: 'smooth' };
                CFG.customSizing.textColorCustom = e.target.value;
                saveConfig(CFG);
                updateSizingVars();
                forceReRenderAll();
                showToast('Đã áp dụng màu chữ tùy chỉnh!', 'success');
            });
        }

        const imgPosSelect = $('vn-sz-imgpos-select');
        if (imgPosSelect) {
            imgPosSelect.addEventListener('change', e => {
                CFG.inchatImgPos = e.target.value;
                saveConfig(CFG);
                updateSizingVars();
                forceReRenderAll();
                showToast('Đã áp dụng vị trí mở ảnh trong truyện!', 'success');
            });
        }

        const imgModeSelect = $('vn-sz-imgmode-select');
        if (imgModeSelect) {
            imgModeSelect.addEventListener('change', e => {
                CFG.inchatImgMode = e.target.value;
                saveConfig(CFG);
                updateSizingVars();
                forceReRenderAll();
                showToast('Đã chuyển đổi chế độ hiển thị ảnh trong truyện!', 'success');
            });
        }

        const szReset = $('vn-sz-reset');
        if (szReset) {
            szReset.addEventListener('click', () => {
                CFG.customSizing = { avatarSize: 52, fontSize: 14.5, maxWidth: 78, imgQuality: 'smooth', fontFamily: 'default', fontFamilyCustom: '', textColor: 'default', textColorCustom: '#ffffff' };
                CFG.inchatImgPos = 'top';
                CFG.inchatImgMode = 'normal';
                saveConfig(CFG);
                updateSizingVars();
                updateSizingUI();
                forceReRenderAll();
                showToast('Đã khôi phục kích thước & chất lượng mặc định', 'info');
            });
        }

        $('vn-rerender-btn').addEventListener('click', () => {
            forceReRenderAll();
            showToast('Đã làm mới và re-render tất cả tin nhắn!', 'success');
        });

        $('vn-prompt-save').addEventListener('click', () => {
            if ($('vn-prompt-text')) CFG.customPrompt = $('vn-prompt-text').value;
            if ($('vn-gender-prompt-text')) CFG.genderPrompt = $('vn-gender-prompt-text').value;
            if ($('vn-dynamic-prompt-text')) CFG.dynamicPrompt = $('vn-dynamic-prompt-text').value;
            saveConfig(CFG);
            doInjectSystemPrompt();
            showToast('💾 Đã lưu và cập nhật tất cả các bảng Prompt hướng dẫn AI!', 'success');
        });
        $('vn-prompt-reset').addEventListener('click', () => {
            if (!confirm('Khôi phục prompt hướng dẫn & cấu hình bơm về mặc định?')) return;
            CFG.customPrompt = DEFAULT_CONFIG.customPrompt;
            CFG.genderPrompt = DEFAULT_CONFIG.genderPrompt;
            CFG.dynamicPrompt = DEFAULT_CONFIG.dynamicPrompt;
            CFG.wrapRuleBlock = DEFAULT_CONFIG.wrapRuleBlock;
            CFG.injectTarget = DEFAULT_CONFIG.injectTarget;
            CFG.injectRole = DEFAULT_CONFIG.injectRole;
            CFG.injectDepth = DEFAULT_CONFIG.injectDepth;
            if ($('vn-prompt-text')) $('vn-prompt-text').value = CFG.customPrompt;
            if ($('vn-gender-prompt-text')) $('vn-gender-prompt-text').value = CFG.genderPrompt;
            if ($('vn-dynamic-prompt-text')) $('vn-dynamic-prompt-text').value = CFG.dynamicPrompt;
            if ($('vn-toggle-wrap-rule')) $('vn-toggle-wrap-rule').checked = CFG.wrapRuleBlock;
            if ($('vn-inject-target')) $('vn-inject-target').value = CFG.injectTarget;
            if ($('vn-inject-role')) $('vn-inject-role').value = CFG.injectRole;
            if ($('vn-inject-depth')) $('vn-inject-depth').value = CFG.injectDepth;
            if ($('vn-inject-depth-wrap')) $('vn-inject-depth-wrap').style.display = 'block';
            saveConfig(CFG);
            doInjectSystemPrompt();
            showToast('🔄 Đã khôi phục prompt & vị trí bơm về mặc định!', 'info');
        });

        $('vn-new-char-add').addEventListener('click', () => {
            const name = $('vn-new-char-name').value.trim();
            if (!name) { showToast('Vui lòng nhập tên nhân vật trước!', 'warning'); return; }
            if (CFG.characters[name]) { showToast('Nhân vật này đã tồn tại trong danh sách!', 'warning'); return; }
            CFG.characters[name] = { avatar: '', color: '', textColor: '' };
            saveConfig(CFG);
            $('vn-new-char-name').value = '';
            renderCharGrid();
            openCharDetail(name);
            forceReRenderAll();
            showToast(`Đã thêm nhân vật mới: "${name}"`, 'success');
        });
        $('vn-new-char-name').addEventListener('keydown', e => { if (e.key === 'Enter') $('vn-new-char-add').click(); });
        if ($('vn-char-search-filter')) {
            $('vn-char-search-filter').addEventListener('input', () => renderCharGrid());
        }

        $('vn-scan-chars').addEventListener('click', () => {
            const found = new Map();
            PD.querySelectorAll('#chat .mes_text').forEach(el => {
                const text = el.innerHTML || el.textContent || '';
                let m;
                const re = getDialogueRegex();
                while ((m = re.exec(text)) !== null) {
                    if (m[1] && typeof m[1] === 'string' && m[1].trim() && !/^[\d\s\-_.,!?]+$/.test(m[1].trim())) {
                        const parsed = parseNameAndGender(m[1].trim());
                        const cleanName = parsed.cleanName || m[1].trim();
                        if (cleanName && !found.has(cleanName)) {
                            found.set(cleanName, parsed.gender);
                        }
                    }
                }
            });
            let added = 0;
            found.forEach((gender, name) => {
                if (!CFG.characters[name]) {
                    CFG.characters[name] = { avatar: '', color: getNameColor(name), textColor: '', gender: gender || 'waifu' };
                    added++;
                    if (CFG.autoAssignAvatar) {
                        autoAssignAvatarForChar(name, gender || 'waifu');
                    }
                }
            });
            saveConfig(CFG);
            renderCharGrid();
            forceReRenderAll();
            if (found.size === 0) {
                showToast('Không tìm thấy thẻ tên nhân vật nào trong khung chat theo cú pháp hiện tại!', 'warning');
            } else {
                showToast(`Quét hoàn tất: Tìm thấy ${found.size} nhân vật (Thêm mới ${added})`, added > 0 ? 'success' : 'info');
            }
        });

        const btnSelectAll = $('vn-bulk-select-all');
        if (btnSelectAll) {
            btnSelectAll.addEventListener('click', () => {
                const allNames = Object.keys(CFG.characters);
                const filterInput = $('vn-char-search-filter');
                const query = (filterInput ? filterInput.value : '').trim().toLowerCase();
                const names = query ? allNames.filter(n => n.toLowerCase().includes(query)) : allNames;
                names.forEach(n => _selectedChars.add(n));
                renderCharGrid();
                updateBulkDeleteBtn();
            });
        }
        const btnDeselectAll = $('vn-bulk-deselect-all');
        if (btnDeselectAll) {
            btnDeselectAll.addEventListener('click', () => {
                _selectedChars.clear();
                renderCharGrid();
                updateBulkDeleteBtn();
            });
        }
        const btnBulkDel = $('vn-bulk-delete');
        if (btnBulkDel) {
            btnBulkDel.addEventListener('click', () => {
                if (_selectedChars.size === 0) return;
                if (!confirm(`Bạn có chắc muốn xóa hàng loạt ${_selectedChars.size} nhân vật đã chọn?`)) return;
                let count = 0;
                _selectedChars.forEach(name => {
                    if (CFG.characters[name]) {
                        delete CFG.characters[name];
                        count++;
                    }
                });
                _selectedChars.clear();
                saveConfig(CFG);
                renderCharGrid();
                closeCharDetail();
                forceReRenderAll();
                showToast(`Đã xóa hàng loạt ${count} nhân vật! 🗑️`, 'info');
            });
        }

        $('vn-char-det-avatar-url').addEventListener('input', e => {
            const url = e.target.value.trim();
            const avatarImg = $('vn-char-det-avatar');
            const safeUrl = safeImageUrl(url);
            if (url && safeUrl) {
                avatarImg.src = resolveImageSrc(safeUrl, buildInitialSvgData(_currentEditChar || '?'));
                avatarImg.dataset.origSrc = safeUrl;
                if (isLocalImageRef(safeUrl)) hydrateLocalImageEl(avatarImg, safeUrl);
                avatarImg.style.display = 'block';
                $('vn-char-det-initial').style.display = 'none';
                updateAvatarAdjustPreview();
            }
            else { avatarImg.style.display = 'none'; $('vn-char-det-initial').style.display = 'flex'; updateAvatarAdjustPreview(); }
        });
        const fixColorLock = (pickerEl) => {
            if (!pickerEl) return;
            const release = () => {
                setTimeout(() => {
                    try {
                        pickerEl.blur();
                        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
                        window.focus();
                        if (window.parent && window.parent !== window) window.parent.focus();
                    } catch (err) {}
                }, 50);
            };
            pickerEl.addEventListener('input', release);
            pickerEl.addEventListener('change', release);
            pickerEl.addEventListener('blur', release);
            pickerEl.addEventListener('click', () => {
                window.addEventListener('focus', release, { once: true });
            });
        };
        fixColorLock($('vn-char-det-colorpicker'));
        fixColorLock($('vn-char-det-textcolorpicker'));
        fixColorLock($('vn-sz-textcolor-picker'));

        $('vn-char-det-colorpicker').addEventListener('input', e => { $('vn-char-det-color').value = e.target.value; });
        $('vn-char-det-color').addEventListener('input', e => { $('vn-char-det-colorpicker').value = e.target.value; });
        if ($('vn-char-det-textcolorpicker') && $('vn-char-det-textcolor')) {
            $('vn-char-det-textcolorpicker').addEventListener('input', e => { $('vn-char-det-textcolor').value = e.target.value; });
            $('vn-char-det-textcolor').addEventListener('input', e => { if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) $('vn-char-det-textcolorpicker').value = e.target.value; });
        }
        ['vn-char-avatar-fit'].forEach(id => {
            const el = $(id);
            if (el) el.addEventListener('input', updateAvatarAdjustPreview);
            if (el && el.tagName === 'SELECT') el.addEventListener('change', updateAvatarAdjustPreview);
        });
        setupAvatarCropEditor();
        if ($('vn-char-avatar-reset')) $('vn-char-avatar-reset').addEventListener('click', () => {
            setAvatarAdjustControls({ avatarPosX: 50, avatarPosY: 50, avatarZoom: 100, avatarFit: 'cover' });
        });

        const addExpBtn = $('vn-char-add-expression');
        if (addExpBtn) {
            addExpBtn.addEventListener('click', () => {
                addExpressionRow('', '');
            });
        }

        const pickImgBtn = $('vn-char-pick-img');
        if (pickImgBtn) {
            pickImgBtn.addEventListener('click', () => {
                if (!_currentEditChar) return;
                openImgPicker(_currentEditChar, url => {
                    $('vn-char-det-avatar-url').value = url;
                    const avatarImg = $('vn-char-det-avatar');
                    const safeUrl = safeImageUrl(url);
                    avatarImg.src = resolveImageSrc(safeUrl || url, buildInitialSvgData(_currentEditChar || '?'));
                    avatarImg.dataset.origSrc = safeUrl || url;
                    if (isLocalImageRef(safeUrl)) hydrateLocalImageEl(avatarImg, safeUrl);
                    avatarImg.style.display = 'block';
                    $('vn-char-det-initial').style.display = 'none';
                    updateAvatarAdjustPreview();
                    if (CFG.characters[_currentEditChar]) {
                        if (!safeUrl) { showToast('URL ảnh không hợp lệ hoặc không an toàn.', 'warning'); return; }
                        Object.assign(CFG.characters[_currentEditChar], { avatar: safeUrl }, readAvatarAdjustControls());
                        saveConfig(CFG);
                        renderCharGrid();
                        forceReRenderAll();
                        showToast(`Đã áp dụng ảnh mới cho "${_currentEditChar}"! ✨`, 'success');
                    }
                });
            });
        }

        const openEditViewBtn = $('vn-char-open-edit-view');
        if (openEditViewBtn) {
            openEditViewBtn.addEventListener('click', () => {
                const mv = $('vn-char-detail-main');
                const ev = $('vn-char-image-edit-view');
                if (mv) mv.style.display = 'none';
                if (ev) ev.style.display = 'block';
                updateAvatarAdjustPreview();
                setupAvatarCropEditor();
            });
        }
        const imgEditBackBtn = $('vn-img-edit-back');
        if (imgEditBackBtn) {
            imgEditBackBtn.addEventListener('click', () => {
                const mv = $('vn-char-detail-main');
                const ev = $('vn-char-image-edit-view');
                if (mv) mv.style.display = 'block';
                if (ev) ev.style.display = 'none';
                const avatarImg = $('vn-char-det-avatar');
                if (avatarImg && _currentEditChar && CFG.characters[_currentEditChar]) {
                    applyAvatarViewToElement(avatarImg, readAvatarAdjustControls());
                }
            });
        }

        $('vn-char-det-save').addEventListener('click', async () => {
            if (!_currentEditChar) return;
            const newName = $('vn-char-det-rename').value.trim();
            const avatarInput = $('vn-char-det-avatar-url').value.trim();
            let avatarUrl = avatarInput ? safeImageUrl(avatarInput) : '';
            const color = safeCssValue($('vn-char-det-color').value.trim(), '');
            const textColor = safeCssValue($('vn-char-det-textcolor') ? $('vn-char-det-textcolor').value.trim() : '', '');
            const avatarAdjust = readAvatarAdjustControls();
            if (avatarInput && !avatarUrl) { showToast('URL ảnh không hợp lệ hoặc không an toàn.', 'warning'); return; }
            if (!newName) { showToast('Tên nhân vật không được để trống!', 'warning'); return; }
            if (isLegacyDataImage(avatarUrl)) {
                try {
                    avatarUrl = await putLocalImageBlob(dataUrlToBlob(avatarUrl), { name: `${newName}.png` });
                    $('vn-char-det-avatar-url').value = avatarUrl;
                } catch (err) {
                    console.error('[VN Dialogue] Không chuyển được data:image sang IndexedDB:', err);
                    showToast('Không lưu được ảnh data:image vào IndexedDB.', 'error');
                    return;
                }
            }
            const expressions = [];
            const expRows = PD.querySelectorAll('#vn-char-det-expressions-list .vn-expression-row');
            for (let i = 0; i < expRows.length; i++) {
                const labelEl = expRows[i].querySelector('.vn-exp-label');
                const urlEl = expRows[i].querySelector('.vn-exp-url');
                if (labelEl && urlEl) {
                    const label = labelEl.value.trim();
                    let url = urlEl.value.trim();
                    if (label && url) {
                        url = safeImageUrl(url) || '';
                        if (isLegacyDataImage(url)) {
                            try {
                                url = await putLocalImageBlob(dataUrlToBlob(url), { name: `${newName}_exp_${i}_${Date.now()}.png` });
                                urlEl.value = url;
                            } catch (e) {
                                console.error('[VN Dialogue] Lỗi lưu ảnh ngữ cảnh vào IndexedDB:', e);
                            }
                        }
                        if (url) expressions.push({ label, url });
                    }
                }
            }
            if (newName !== _currentEditChar) {
                const data = CFG.characters[_currentEditChar];
                delete CFG.characters[_currentEditChar];
                CFG.characters[newName] = data;
                if (_selectedChars.has(_currentEditChar)) {
                    _selectedChars.delete(_currentEditChar);
                    _selectedChars.add(newName);
                }
                _currentEditChar = newName;
            }
            const oldData = CFG.characters[_currentEditChar] || {};
            CFG.characters[_currentEditChar] = Object.assign({}, oldData, { avatar: avatarUrl, color, textColor, expressions }, avatarAdjust);
            const savedName = _currentEditChar;
            saveConfig(CFG);
            doInjectSystemPrompt();
            renderCharGrid();
            closeCharDetail();
            forceReRenderAll();
            showToast(`Đã lưu thiết lập cho nhân vật "${savedName}"!`, 'success');
        });

        $('vn-char-det-delete').addEventListener('click', () => {
            if (!_currentEditChar) return;
            if (!confirm(`Bạn có chắc muốn xoá nhân vật "${_currentEditChar}"?`)) return;
            const delName = _currentEditChar;
            delete CFG.characters[_currentEditChar];
            saveConfig(CFG);
            renderCharGrid();
            closeCharDetail();
            forceReRenderAll();
            showToast(`Đã xoá "${delName}"`, 'info');
            _currentEditChar = null;
        });

        $('vn-export-cfg').addEventListener('click', () => {
            const blob = new Blob([JSON.stringify(CFG, null, 2)], { type: 'application/json' });
            const a = PD.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `vn-dialogue-config-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            showToast('Đã xuất file cấu hình thành công', 'success');
        });
        $('vn-import-cfg-btn').addEventListener('click', () => $('vn-import-cfg-file').click());
        $('vn-import-cfg-file').addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                try {
                    const parsed = JSON.parse(ev.target.result);
                    CFG = normalizeConfig(parsed);
                    saveConfig(CFG);
                    migrateLegacyDataUrlImagesToIndexedDB();
                    refreshMainModal();
                    forceReRenderAll();
                    showToast('Nhập cấu hình thành công! ✓', 'success');
                } catch { showToast('File JSON không hợp lệ!', 'error'); }
            };
            reader.readAsText(file);
        });
        $('vn-reset-all').addEventListener('click', () => {
            if (!confirm('CẢNH BÁO: Xoá toàn bộ danh sách nhân vật, ảnh yêu thích, Kho Link, Kho Local và khôi phục cài đặt gốc?')) return;
            localStorage.removeItem(STORE_KEY);
            clearVNImageDB();
            CFG = getDefaultConfig();
            saveConfig(CFG);
            refreshMainModal();
            forceReRenderAll();
            showToast('Đã khôi phục toàn bộ về cài đặt gốc', 'info');
        });

        const btnClearCache = $('vn-btn-clear-cache');
        if (btnClearCache) {
            btnClearCache.addEventListener('click', () => {
                let count = 0;
                for (const k in AVATAR_CACHE) {
                    delete AVATAR_CACHE[k];
                    count++;
                }
                showToast(`🧹 Đã dọn dẹp bộ nhớ đệm (${count} ảnh cache)!`, 'success');
            });
        }
        
        const btnClearLocal = $('vn-btn-clear-local');
        if (btnClearLocal) {
            btnClearLocal.addEventListener('click', async () => {
                if (!confirm('CẢNH BÁO: Bạn có chắc chắn muốn xoá sạch toàn bộ ảnh đã import trong Kho Local? Hành động này không thể hoàn tác!')) return;
                try {
                    await clearVNImageDB();
                    showToast('Đã dọn dẹp sạch Kho Local!', 'success');
                } catch (e) {
                    showToast('Lỗi khi xoá Kho Local', 'error');
                }
            });
        }

        const btnClearLink = $('vn-btn-clear-link');
        if (btnClearLink) {
            btnClearLink.addEventListener('click', () => {
                if (!confirm('CẢNH BÁO: Bạn có chắc chắn muốn xoá toàn bộ danh sách link ảnh đã lưu trong Kho Link?')) return;
                CFG.linkLibrary = [];
                saveConfig(CFG);
                showToast('Đã dọn dẹp sạch Kho Link!', 'success');
            });
        }

        const btnTestPerf = $('vn-btn-test-perf');
        if (btnTestPerf) {
            btnTestPerf.addEventListener('click', () => {
                if (!confirm('⚡ Giả lập render 200 tin nhắn chat kèm hiệu ứng làm đẹp & tải ảnh avatar để đo thời gian phản hồi.\nBạn có muốn tiếp tục?')) return;
                const startTime = performance.now();
                const mockContainer = PD.createElement('div');
                mockContainer.style.position = 'absolute';
                mockContainer.style.left = '-9999px';
                mockContainer.style.top = '-9999px';
                mockContainer.style.visibility = 'hidden';
                PD.body.appendChild(mockContainer);

                const sampleNames = ['Kazumi', 'Itsuki', 'Sakura', 'Akira', 'Yuki', 'Hana', 'Ren', 'Sora', 'Mei', 'Hiro'];
                for (let i = 0; i < 200; i++) {
                    const mes = PD.createElement('div');
                    mes.className = 'mes';
                    const name = sampleNames[i % sampleNames.length];
                    const textEl = PD.createElement('div');
                    textEl.className = 'mes_text';
                    textEl.innerHTML = `@${name}@ "Đây là câu thoại giả lập số ${i + 1} để kiểm tra hiệu năng render lời thoại và tốc độ tải avatar trong Visual Novel Mode."\n@${name}@ *Và đây là dòng suy nghĩ nội tâm đang được test tốc độ xử lý Regex và DOM.*`;
                    mes.appendChild(textEl);
                    mockContainer.appendChild(mes);
                    processMessage(mes, false);
                }

                const endTime = performance.now();
                const duration = Math.round(endTime - startTime);
                PD.body.removeChild(mockContainer);
                showToast(`⚡ Test hoàn tất 200 tin nhắn! Thời gian render: ${duration}ms (${(duration / 200).toFixed(2)}ms/tin nhắn)`, duration < 300 ? 'success' : (duration < 800 ? 'info' : 'warning'), 6000);
            });
        }

        refreshMainModal();
    }

    // ========== NÚT FLOATING MENU MANAGER & STANDALONE FAB ==========
    const VN_DIALOGUE_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width:24px;height:24px;pointer-events:none;color:inherit;"><path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"/></svg>';

    function registerFMM() {
        const fmmConfig = {
            id: SCRIPT_ID,
            icon: VN_DIALOGUE_ICON_SVG,
            label: 'VN Dialogue',
            color: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            order: 21,
            onClick: openMainModal
        };
        PW._fmmPendingRegistrations = PW._fmmPendingRegistrations || [];
        if (!PW._fmmPendingRegistrations.some(x => x.id === SCRIPT_ID)) {
            PW._fmmPendingRegistrations.push(fmmConfig);
        }
        if (!PW.FloatingMenuManager || typeof PW.FloatingMenuManager.registerButton !== 'function') {
            return false;
        }
        try {
            PW.FloatingMenuManager.registerButton(fmmConfig);
            const oldFab = PD.getElementById('vn-standalone-fab');
            if (oldFab) oldFab.remove();
            return true;
        } catch (e) {
            console.error('[VN Dialogue] Lỗi đăng ký FloatingMenuManager:', e);
            return false;
        }
    }

    function setupStandaloneFab() {
        let old = PD.getElementById('vn-standalone-fab');
        if (old) old.remove();

        // Tự động: Nếu đã có bóng mẹ (FloatingMenuManager) hoạt động thì không hiển thị bóng riêng
        if (PW.FloatingMenuManager && typeof PW.FloatingMenuManager.registerButton === 'function') {
            return;
        }

        const fab = PD.createElement('div');
        fab.id = 'vn-standalone-fab';
        fab.title = 'VN Dialogue Settings (Kéo thả di chuyển, click để mở)';
        fab.innerHTML = VN_DIALOGUE_ICON_SVG;
        
        if (CFG.standalonePos && CFG.standalonePos.x !== null && CFG.standalonePos.y !== null) {
            fab.style.left = CFG.standalonePos.x + 'px';
            fab.style.top = CFG.standalonePos.y + 'px';
            fab.style.right = 'auto';
            fab.style.bottom = 'auto';
        }

        let isDragging = false, startX, startY, initX, initY, dragTime = 0;
        fab.addEventListener('pointerdown', e => {
            if (e.button !== 0) return;
            isDragging = true;
            dragTime = performance.now();
            startX = e.clientX;
            startY = e.clientY;
            const rect = fab.getBoundingClientRect();
            initX = rect.left;
            initY = rect.top;
            fab.style.left = initX + 'px';
            fab.style.top = initY + 'px';
            fab.style.right = 'auto';
            fab.style.bottom = 'auto';
            fab.setPointerCapture(e.pointerId);
        });
        fab.addEventListener('pointermove', e => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (Math.hypot(dx, dy) > 3) {
                const maxW = PW.innerWidth - 60;
                const maxH = PW.innerHeight - 60;
                const newX = Math.max(10, Math.min(initX + dx, maxW));
                const newY = Math.max(10, Math.min(initY + dy, maxH));
                fab.style.left = newX + 'px';
                fab.style.top = newY + 'px';
            }
        });
        fab.addEventListener('pointerup', e => {
            if (!isDragging) return;
            isDragging = false;
            fab.releasePointerCapture(e.pointerId);
            const dt = performance.now() - dragTime;
            const dx = Math.abs(e.clientX - startX);
            const dy = Math.abs(e.clientY - startY);
            if (dt < 250 && dx < 5 && dy < 5) {
                openMainModal();
            } else {
                const rect = fab.getBoundingClientRect();
                CFG.standalonePos = { x: Math.round(rect.left), y: Math.round(rect.top) };
                saveConfig(CFG);
            }
        });
        fab.addEventListener('pointercancel', e => {
            if (isDragging) {
                isDragging = false;
                try { fab.releasePointerCapture(e.pointerId); } catch (err) {}
            }
        });
        PD.body.appendChild(fab);
    }

    function normalizeCollapsedAvatarBlock(block) {
        if (!block) return;
        const viewport = block.querySelector('.vn-avatar-viewport');
        const avatarEl = viewport && viewport.querySelector('.vn-avatar');
        if (!viewport || !avatarEl) return;
        const name = avatarEl.dataset.vnFallbackName || avatarEl.getAttribute('alt') || '';
        const cfg = name ? (getCharCfg(name) || {}) : {};
        const viewCfg = getAvatarViewConfig(cfg);
        viewport.dataset.vnAvatarFit = viewCfg.avatarFit;
        viewport.dataset.vnAvatarZoom = String(viewCfg.avatarZoom);
        viewport.style.removeProperty('transform');
        viewport.style.removeProperty('transform-origin');
        viewport.style.removeProperty('align-items');
        viewport.style.removeProperty('justify-content');
        applyAvatarViewToElement(avatarEl, cfg);
        // Avatar thu gọn phải do viewport giữ khung/viền; ảnh bên trong chỉ bám 100% vào khung để không bị lệch tâm.
        avatarEl.style.removeProperty('width');
        avatarEl.style.removeProperty('height');
        avatarEl.style.removeProperty('max-width');
        avatarEl.style.removeProperty('max-height');
        avatarEl.style.removeProperty('border');
        avatarEl.style.removeProperty('border-radius');
        avatarEl.style.removeProperty('box-shadow');
        avatarEl.style.removeProperty('margin');
    }

    // ========== XEM ẢNH MỞ RỘNG TRỰC TIẾP TRONG CHÍNH VĂN (ĐẨY CHỮ XUỐNG DƯỚI) ==========
    function setupAvatarLightbox() {
        if (PD._vnAvatarLightboxHook) {
            PD.body.removeEventListener('click', PD._vnAvatarLightboxHook, true);
            delete PD._vnAvatarLightboxHook;
        }
        PD._vnAvatarLightboxHook = function (e) {
            const clickedAvatar = e.target.closest && e.target.closest('.vn-avatar, .vn-avatar-viewport');
            if (!clickedAvatar) return;
            if (clickedAvatar.closest('#vn-modal-overlay') || clickedAvatar.closest('#vn-img-modal-overlay')) return;

            const avatarEl = clickedAvatar.classList && clickedAvatar.classList.contains('vn-avatar')
                ? clickedAvatar
                : clickedAvatar.querySelector('.vn-avatar');
            if (!avatarEl) return;
            e.stopPropagation();
            
            const block = clickedAvatar.closest('.vn-block') || avatarEl.closest('.vn-block');
            if (!block) return;

            if (CFG.inchatImgMode === 'always_full') {
                // Trong chế độ luôn mở full, nhấn vào ảnh sẽ thu gọn về bình thường (vn-collapsed-img)
                block.classList.toggle('vn-collapsed-img');
                if (block.classList.contains('vn-collapsed-img')) {
                    normalizeCollapsedAvatarBlock(block);
                    requestAnimationFrame(() => normalizeCollapsedAvatarBlock(block));
                }
                return;
            }

            const isExpanded = block.classList.contains('vn-expanded-img');
            
            // Thu gọn tất cả ảnh đang mở rộng khác trong truyện để giữ giao diện đọc gọn gàng
            PD.querySelectorAll('.vn-block.vn-expanded-img').forEach(b => {
                b.classList.remove('vn-expanded-img');
            });

            if (!isExpanded) {
                // Tải ảnh gốc độ phân giải cao nhất nếu có
                if (avatarEl.tagName === 'IMG' && avatarEl.dataset.origSrc && !avatarEl.dataset.origSrc.startsWith('data:image/svg+xml')) {
                    const fullSrc = resolveImageSrc(avatarEl.dataset.origSrc, avatarEl.src);
                    if (avatarEl.src !== fullSrc) avatarEl.src = fullSrc;
                    if (isLocalImageRef(avatarEl.dataset.origSrc)) hydrateLocalImageEl(avatarEl, avatarEl.dataset.origSrc);
                }
                block.classList.add('vn-expanded-img');
                setTimeout(() => {
                    block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 100);
            }
        };
        PD.body.addEventListener('click', PD._vnAvatarLightboxHook, true);
    }

    function openMainModal() {
        if (!PD.getElementById('vn-modal-overlay')) {
            buildMainModal();
        }
        refreshMainModal();
        const overlay = PD.getElementById('vn-modal-overlay');
        if (overlay) overlay.classList.add('show');
        if (PW.FloatingMenuManager && typeof PW.FloatingMenuManager.collapse === 'function') PW.FloatingMenuManager.collapse();
    }

    let _fmmWatchdogTimer = null;
    function startFmmWatchdog() {
        if (_fmmWatchdogTimer) clearInterval(_fmmWatchdogTimer);
        let count = 0;
        _fmmWatchdogTimer = setInterval(() => {
            count++;
            if (registerFMM() || count >= 40) {
                clearInterval(_fmmWatchdogTimer);
                _fmmWatchdogTimer = null;
            }
        }, 500);
    }

    // ========== KHỞI TẠO HỆ THỐNG ==========
    function init() {
        if (!PD.body) { setTimeout(init, 300); return; }
        try {
            if (PD._fmmWatchdogTimer) { clearInterval(PD._fmmWatchdogTimer); delete PD._fmmWatchdogTimer; }
            injectStyles();
            buildMainModal();
            setupObserver();
            setupPromptInjection();
            setupStandaloneFab();
            setupImageErrorFallback();
            setupAvatarLightbox();
            migrateLegacyDataUrlImagesToIndexedDB();

            let registered = registerFMM();
            if (registered) {
                console.log('[VN Dialogue] Đã đăng ký thành công vào Menu Bóng Nổi Mẹ (FloatingMenuManager) ✓');
            } else {
                console.log('[VN Dialogue] Đã thêm vào hàng đợi chờ Menu Bóng Nổi Mẹ (FloatingMenuManager)...');
                startFmmWatchdog();
                PD._fmmWatchdogTimer = _fmmWatchdogTimer;
            }

            console.log(`[VN Dialogue] Đã khởi tạo Visual Novel Dialogue Beautifier ${SCRIPT_VERSION} ✓`);
        } catch (err) {
            console.error('[VN Dialogue] Lỗi nghiêm trọng khi khởi tạo script:', err);
        }
    }

    if (PD.readyState === 'loading') PD.addEventListener('DOMContentLoaded', init);
    else init();

})();
