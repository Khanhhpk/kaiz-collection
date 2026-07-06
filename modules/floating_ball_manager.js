/**
 * Trình quản lý menu bóng nổi - Quản lý thống nhất nhiều chức năng bóng nổi v2.5
 *
 * Chức năng:
 * - Tạo bóng nổi chính (nút menu)
 * - Quản lý bóng nổi phụ (bóng chức năng)
 * - Tùy chỉnh cách hiển thị bóng nổi con: Dọc (lên/xuống), Ngang (trái/phải), Vây tròn 360°, hoặc Bung hình quạt
 * - Tùy chỉnh kích thước, khoảng cách và hiệu ứng qua giao diện cài đặt (nhấp vào nút ⚙️ hoặc chuột phải bóng mẹ)
 * - Hỗ trợ kéo thả mượt mà và lưu vị trí/thiết lập (persistence)
 */

(function() {
    'use strict';

    console.log('[FloatingMenuManager] Script v2.5 bắt đầu tải...');

    const parentWindow = window.parent || window;
    const parentDocument = parentWindow.document;

    // ============ Hằng số cấu hình mặc định ============
    const DEFAULT_CONFIG = {
        MAIN_SIZE: 56,           // Kích thước bóng chính
        SUB_SIZE: 48,            // Kích thước bóng phụ
        SUB_SPACING: 62,         // Khoảng cách bóng phụ (hoặc bán kính vây quanh)
        DRAG_THRESHOLD: 5,       // Ngưỡng kéo thả (px)
        ANIMATION_DURATION: 300, // Thời lượng hiệu ứng (ms)
        Z_INDEX_MAIN: 10000,     // Layer bóng chính
        Z_INDEX_SUB: 9999,       // Layer bóng phụ
        STORAGE_KEY: 'floatingMenuManager_state',
        CONFIG_KEY: 'floatingMenuManager_custom_layout'
    };

    let userConfig = {
        direction: 'up',         // 'up', 'down', 'left', 'right', 'circle', 'fan'
        subSpacing: 62,
        mainSize: 56,
        subSize: 48,
        animationStyle: 'cascade' // 'cascade', 'bounce', 'sync'
    };

    function loadUserConfig() {
        try {
            const saved = localStorage.getItem(DEFAULT_CONFIG.CONFIG_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                userConfig = { ...userConfig, ...parsed };
            }
        } catch(e) {}
    }
    function saveUserConfig() {
        try {
            localStorage.setItem(DEFAULT_CONFIG.CONFIG_KEY, JSON.stringify(userConfig));
        } catch(e) {}
    }
    loadUserConfig();

    // ============ Biểu tượng SVG ============
    const ICONS = {
        menu: `<svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg>`,
        close: `<svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>`,
        gear: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`
    };

    // ============ Trạng thái toàn cục ============
    const state = {
        isExpanded: false,
        isDragging: false,
        hasMoved: false,
        buttons: [],
        elements: {
            main: null,
            subContainer: null,
            subs: []
        },
        dragData: {
            startX: 0,
            startY: 0,
            initialTop: 0,
            initialLeft: 0
        },
        position: {
            top: 100,
            left: 20
        }
    };

    // ============ Chèn style ============
    function injectStyles() {
        if (parentDocument.getElementById('floating-menu-manager-styles')) {
            parentDocument.getElementById('floating-menu-manager-styles').remove();
        }

        const styles = `
<style id="floating-menu-manager-styles">
.fmm-main-fab {
    position: fixed;
    width: ${userConfig.mainSize}px;
    height: ${userConfig.mainSize}px;
    border-radius: 50%;
    background: linear-gradient(135deg, #4B5563 0%, #1f2937 100%);
    box-shadow: 0 4px 22px rgba(0,0,0,0.45), 0 0 0 2px rgba(255,255,255,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: ${DEFAULT_CONFIG.Z_INDEX_MAIN};
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    user-select: none;
    -webkit-user-select: none;
    color: white;
}
.fmm-main-fab:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 28px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.2);
}
.fmm-main-fab:active {
    transform: scale(0.95);
}
.fmm-main-fab.dragging {
    cursor: move;
    transform: scale(1.05);
}
.fmm-main-fab .icon {
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    display: flex;
    align-items: center;
    justify-content: center;
}
.fmm-main-fab.expanded .icon {
    transform: rotate(180deg);
}

.fmm-sub-container {
    position: fixed;
    z-index: ${DEFAULT_CONFIG.Z_INDEX_SUB};
    pointer-events: none;
}

.fmm-sub-fab {
    position: absolute;
    width: ${userConfig.subSize}px;
    height: ${userConfig.subSize}px;
    border-radius: 50%;
    color: #ffffff;
    box-shadow: 0 3px 18px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    pointer-events: auto;
    opacity: 0;
    transform: translate(0px, 0px) scale(0);
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease, box-shadow 0.2s ease;
}
.fmm-sub-fab:hover {
    box-shadow: 0 6px 24px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.3);
    z-index: 10;
}
.fmm-sub-fab:active {
    transform: translate(var(--offset-x, 0px), var(--offset-y, 0px)) scale(0.92) !important;
}

@keyframes fmmExpandBall {
    0% {
        opacity: 0;
        transform: translate(0px, 0px) scale(0);
    }
    100% {
        opacity: 1;
        transform: translate(var(--offset-x, 0px), var(--offset-y, 0px)) scale(1);
    }
}
@keyframes fmmCollapseBall {
    0% {
        opacity: 1;
        transform: translate(var(--offset-x, 0px), var(--offset-y, 0px)) scale(1);
    }
    100% {
        opacity: 0;
        transform: translate(0px, 0px) scale(0);
    }
}
.fmm-sub-fab.expanding {
    animation: fmmExpandBall ${DEFAULT_CONFIG.ANIMATION_DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.fmm-sub-fab.collapsing {
    animation: fmmCollapseBall 200ms ease-in forwards;
}

/* Modal cài đặt bóng nổi */
#fmm-settings-overlay {
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    z-index: 9999999;
    display: none;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
#fmm-settings-overlay.show {
    display: flex !important;
}
.fmm-settings-modal {
    width: 520px;
    max-width: 92vw;
    background: linear-gradient(145deg, #1e2230 0%, #151821 100%);
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 16px;
    padding: 24px;
    color: #f1f5f9;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.85);
}
.fmm-opt-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 8px;
}
.fmm-opt-btn {
    padding: 12px 8px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    color: #cbd5e1;
    font-size: 13px;
    cursor: pointer;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
}
.fmm-opt-btn:hover {
    background: rgba(255,255,255,0.12);
}
.fmm-opt-btn.active {
    background: rgba(99,102,241,0.22);
    border-color: #6366f1;
    color: #fff;
    font-weight: 600;
}
</style>
        `;
        parentDocument.head.insertAdjacentHTML('beforeend', styles);
    }

    // ============ Tính toán tọa độ mở bóng phụ ============
    function calculateOffsets(index, total) {
        const spacing = userConfig.subSpacing;
        const dir = userConfig.direction;

        if (dir === 'up') {
            return { x: 0, y: -(index + 1) * spacing };
        } else if (dir === 'down') {
            return { x: 0, y: (index + 1) * spacing };
        } else if (dir === 'left') {
            return { x: -(index + 1) * spacing, y: 0 };
        } else if (dir === 'right') {
            return { x: (index + 1) * spacing, y: 0 };
        } else if (dir === 'circle') {
            // Vây tròn 360 độ xung quanh bóng mẹ
            const radius = spacing + (total > 6 ? (total - 6) * 8 : 0);
            const angle = (index * (2 * Math.PI / total)) - (Math.PI / 2); // Bắt đầu từ đỉnh 12 giờ
            return {
                x: Math.round(radius * Math.cos(angle)),
                y: Math.round(radius * Math.sin(angle))
            };
        } else if (dir === 'fan') {
            // Bung mở hình quạt thông minh dựa vào vị trí bóng mẹ
            const radius = spacing + 15;
            const isLeftHalf = state.position.left < (parentWindow.innerWidth / 2);
            const centerAngle = isLeftHalf ? 0 : Math.PI; // Trái thì bung sang phải, Phải thì bung sang trái
            const spread = Math.min(Math.PI * 0.85, total * 0.45);
            const startAngle = centerAngle - (spread / 2);
            const angle = total <= 1 ? centerAngle : startAngle + index * (spread / (total - 1));
            return {
                x: Math.round(radius * Math.cos(angle)),
                y: Math.round(radius * Math.sin(angle))
            };
        }
        return { x: 0, y: -(index + 1) * spacing };
    }

    // ============ Cập nhật vị trí container bóng phụ ============
    function updateSubContainerPosition() {
        if (!state.elements.main || !state.elements.subContainer) return;
        const container = state.elements.subContainer;
        // Căn giữa chính xác container phụ với bóng chính
        const offsetLeft = (userConfig.mainSize - userConfig.subSize) / 2;
        const offsetTop = (userConfig.mainSize - userConfig.subSize) / 2;
        container.style.top = (state.position.top + offsetTop) + 'px';
        container.style.left = (state.position.left + offsetLeft) + 'px';
        container.style.width = userConfig.subSize + 'px';
        container.style.height = userConfig.subSize + 'px';
    }

    // ============ Tạo bóng nổi chính ============
    function createMainFab() {
        const fab = parentDocument.createElement('div');
        fab.className = 'fmm-main-fab';
        fab.innerHTML = `<div class="icon">${ICONS.menu}</div>`;
        fab.style.top = state.position.top + 'px';
        fab.style.left = state.position.left + 'px';
        parentDocument.body.appendChild(fab);
        state.elements.main = fab;

        // Click chuột phải (ContextMenu) mở Cài đặt
        fab.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            openSettingsModal();
        });

        bindMainFabEvents(fab);
        return fab;
    }

    // ============ Tạo container bóng phụ ============
    function createSubContainer() {
        const container = parentDocument.createElement('div');
        container.className = 'fmm-sub-container';
        parentDocument.body.appendChild(container);
        state.elements.subContainer = container;
        return container;
    }

    // ============ Tạo bóng phụ ============
    function createSubFab(config, index) {
        const fab = parentDocument.createElement('div');
        fab.className = 'fmm-sub-fab';
        fab.style.background = config.color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

        if (typeof config.icon === 'string') {
            fab.innerHTML = config.icon;
        } else {
            fab.textContent = config.icon || '●';
        }
        fab.title = config.label || '';

        const total = state.buttons.length;
        const offsets = calculateOffsets(index, total);
        fab.style.setProperty('--offset-x', offsets.x + 'px');
        fab.style.setProperty('--offset-y', offsets.y + 'px');
        fab.style.top = '0px';
        fab.style.left = '0px';

        // Xử lý sự kiện click
        fab.addEventListener('click', function(e) {
            e.stopPropagation();
            if (config.onClick && typeof config.onClick === 'function') {
                config.onClick();
            }
        });

        // Hỗ trợ hover nảy lớn
        fab.addEventListener('mouseenter', () => {
            if (state.isExpanded) {
                fab.style.transform = `translate(${offsets.x}px, ${offsets.y}px) scale(1.18)`;
            }
        });
        fab.addEventListener('mouseleave', () => {
            if (state.isExpanded) {
                fab.style.transform = `translate(${offsets.x}px, ${offsets.y}px) scale(1)`;
            }
        });

        state.elements.subContainer.appendChild(fab);
        state.elements.subs.push(fab);
        return fab;
    }

    // ============ Render bóng phụ ============
    function renderSubFabs() {
        state.elements.subs.forEach(fab => fab.remove());
        state.elements.subs = [];

        state.buttons.forEach((config, index) => {
            createSubFab(config, index);
        });
        updateSubContainerPosition();
    }

    // ============ Mở menu ============
    function expand() {
        if (state.isExpanded) return;
        state.isExpanded = true;

        const icon = state.elements.main.querySelector('.icon');
        if (icon) icon.innerHTML = ICONS.close;
        state.elements.main.classList.add('expanded');

        const total = state.elements.subs.length;
        state.elements.subs.forEach((fab, index) => {
            const offsets = calculateOffsets(index, total);
            fab.style.setProperty('--offset-x', offsets.x + 'px');
            fab.style.setProperty('--offset-y', offsets.y + 'px');
            fab.classList.remove('collapsing');
            fab.classList.add('expanding');

            const delay = userConfig.animationStyle === 'sync' ? 0 : index * 40;
            setTimeout(() => {
                fab.style.opacity = '1';
                fab.style.transform = `translate(${offsets.x}px, ${offsets.y}px) scale(1)`;
            }, delay);
        });
    }

    // ============ Đóng menu ============
    function collapse() {
        if (!state.isExpanded) return;
        state.isExpanded = false;

        const icon = state.elements.main.querySelector('.icon');
        if (icon) icon.innerHTML = ICONS.menu;
        state.elements.main.classList.remove('expanded');

        state.elements.subs.forEach((fab, index) => {
            fab.classList.remove('expanding');
            fab.classList.add('collapsing');

            const delay = userConfig.animationStyle === 'sync' ? 0 : index * 25;
            setTimeout(() => {
                fab.style.opacity = '0';
                fab.style.transform = 'translate(0px, 0px) scale(0)';
            }, delay);
        });
    }

    function toggle() {
        if (state.isExpanded) collapse();
        else expand();
    }

    // ============ Giao diện cài đặt (Modal Settings) ============
    function openSettingsModal() {
        let overlay = parentDocument.getElementById('fmm-settings-overlay');
        if (!overlay) {
            const modalHTML = `
                <div id="fmm-settings-overlay">
                    <div class="fmm-settings-modal">
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:14px; margin-bottom:16px;">
                            <h3 style="margin:0; font-size:17px; display:flex; align-items:center; gap:8px;">
                                ⚙️ Cài đặt Kiểu Hiển Thị Bóng Nổi
                            </h3>
                            <button id="fmm-cfg-close" style="background:none; border:none; color:#94a3b8; font-size:24px; cursor:pointer;">&times;</button>
                        </div>
                        
                        <label style="font-size:13.5px; font-weight:600; color:#e2e8f0;">1. Hướng mở các bóng nổi con:</label>
                        <div class="fmm-opt-grid" id="fmm-dir-grid">
                            <div class="fmm-opt-btn" data-dir="up">⬆️ Dọc hướng lên</div>
                            <div class="fmm-opt-btn" data-dir="down">⬇️ Dọc hướng xuống</div>
                            <div class="fmm-opt-btn" data-dir="left">⬅️ Ngang sang trái</div>
                            <div class="fmm-opt-btn" data-dir="right">➡️ Ngang sang phải</div>
                            <div class="fmm-opt-btn" data-dir="circle">🔄 Vây tròn 360°</div>
                            <div class="fmm-opt-btn" data-dir="fan">🪛 Bung hình quạt</div>
                        </div>

                        <div style="margin-top:18px; display:flex; justify-content:space-between; align-items:center;">
                            <label style="font-size:13.5px; font-weight:600; color:#e2e8f0;">2. Khoảng cách giãn cách / Bán kính:</label>
                            <span id="fmm-space-val" style="color:#818cf8; font-weight:700;">${userConfig.subSpacing}px</span>
                        </div>
                        <input type="range" id="fmm-space-slider" min="45" max="130" value="${userConfig.subSpacing}" style="width:100%; margin-top:8px; accent-color:#6366f1;">

                        <div style="margin-top:18px; display:flex; gap:16px;">
                            <div style="flex:1;">
                                <label style="font-size:13px; font-weight:600; color:#cbd5e1;">Kích thước bóng mẹ:</label>
                                <select id="fmm-main-size" style="width:100%; margin-top:6px; padding:8px; border-radius:8px; background:#11131a; border:1px solid rgba(255,255,255,0.15); color:#fff;">
                                    <option value="48" ${userConfig.mainSize===48?'selected':''}>Nhỏ (48px)</option>
                                    <option value="56" ${userConfig.mainSize===56?'selected':''}>Chuẩn (56px)</option>
                                    <option value="64" ${userConfig.mainSize===64?'selected':''}>Lớn (64px)</option>
                                </select>
                            </div>
                            <div style="flex:1;">
                                <label style="font-size:13px; font-weight:600; color:#cbd5e1;">Kích thước bóng con:</label>
                                <select id="fmm-sub-size" style="width:100%; margin-top:6px; padding:8px; border-radius:8px; background:#11131a; border:1px solid rgba(255,255,255,0.15); color:#fff;">
                                    <option value="40" ${userConfig.subSize===40?'selected':''}>Nhỏ (40px)</option>
                                    <option value="48" ${userConfig.subSize===48?'selected':''}>Chuẩn (48px)</option>
                                    <option value="54" ${userConfig.subSize===54?'selected':''}>Lớn (54px)</option>
                                </select>
                            </div>
                        </div>

                        <div style="margin-top:24px; display:flex; justify-content:flex-end; gap:12px;">
                            <button id="fmm-cfg-save" style="padding:10px 20px; background:#6366f1; color:#fff; border:none; border-radius:10px; font-weight:600; cursor:pointer;">Lưu & Áp dụng</button>
                        </div>
                    </div>
                </div>
            `;
            parentDocument.body.insertAdjacentHTML('beforeend', modalHTML);
            overlay = parentDocument.getElementById('fmm-settings-overlay');

            parentDocument.getElementById('fmm-cfg-close').onclick = () => overlay.classList.remove('show');
            parentDocument.getElementById('fmm-cfg-save').onclick = () => {
                userConfig.subSpacing = parseInt(parentDocument.getElementById('fmm-space-slider').value);
                userConfig.mainSize = parseInt(parentDocument.getElementById('fmm-main-size').value);
                userConfig.subSize = parseInt(parentDocument.getElementById('fmm-sub-size').value);
                saveUserConfig();
                injectStyles();
                renderSubFabs();
                if (state.isExpanded) {
                    state.isExpanded = false;
                    expand();
                } else {
                    expand();
                }
                overlay.classList.remove('show');
                if (parentWindow.toastr) parentWindow.toastr.success('Đã áp dụng kiểu hiển thị bóng nổi mới!');
            };

            parentDocument.getElementById('fmm-space-slider').oninput = (e) => {
                parentDocument.getElementById('fmm-space-val').textContent = e.target.value + 'px';
            };

            parentDocument.querySelectorAll('.fmm-opt-btn').forEach(btn => {
                btn.onclick = () => {
                    parentDocument.querySelectorAll('.fmm-opt-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    userConfig.direction = btn.dataset.dir;
                };
            });
        }

        parentDocument.querySelectorAll('.fmm-opt-btn').forEach(btn => {
            if (btn.dataset.dir === userConfig.direction) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        overlay.classList.add('show');
    }

    // ============ Sự kiện kéo thả bóng chính ============
    function bindMainFabEvents(fab) {
        let rafId = null;

        function handleStart(e) {
            const touch = e.touches ? e.touches[0] : e;
            state.isDragging = true;
            state.hasMoved = false;
            state.dragData.startX = touch.clientX;
            state.dragData.startY = touch.clientY;

            const rect = fab.getBoundingClientRect();
            state.dragData.initialTop = rect.top;
            state.dragData.initialLeft = rect.left;

            fab.classList.add('dragging');
            e.preventDefault();
        }

        function handleMove(e) {
            if (!state.isDragging) return;
            const touch = e.touches ? e.touches[0] : e;
            const deltaX = touch.clientX - state.dragData.startX;
            const deltaY = touch.clientY - state.dragData.startY;

            if (Math.abs(deltaX) > DEFAULT_CONFIG.DRAG_THRESHOLD || Math.abs(deltaY) > DEFAULT_CONFIG.DRAG_THRESHOLD) {
                state.hasMoved = true;
            }

            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                const newLeft = Math.max(0, Math.min(
                    state.dragData.initialLeft + deltaX,
                    parentWindow.innerWidth - userConfig.mainSize
                ));
                const newTop = Math.max(0, Math.min(
                    state.dragData.initialTop + deltaY,
                    parentWindow.innerHeight - userConfig.mainSize
                ));

                state.position.left = newLeft;
                state.position.top = newTop;

                fab.style.left = newLeft + 'px';
                fab.style.top = newTop + 'px';

                updateSubContainerPosition();
                if (state.isExpanded) {
                    // Nếu đang mở mà kéo thì cập nhật lại vị trí các bóng con
                    state.elements.subs.forEach((sub, idx) => {
                        const offsets = calculateOffsets(idx, state.elements.subs.length);
                        sub.style.setProperty('--offset-x', offsets.x + 'px');
                        sub.style.setProperty('--offset-y', offsets.y + 'px');
                        sub.style.transform = `translate(${offsets.x}px, ${offsets.y}px) scale(1)`;
                    });
                }
                rafId = null;
            });
            e.preventDefault();
        }

        function handleEnd(e) {
            if (!state.isDragging) return;
            state.isDragging = false;
            fab.classList.remove('dragging');
            savePosition();

            if (!state.hasMoved) {
                toggle();
            }
            state.hasMoved = false;
            e.preventDefault();
        }

        fab.addEventListener('mousedown', handleStart);
        parentDocument.addEventListener('mousemove', handleMove);
        parentDocument.addEventListener('mouseup', handleEnd);

        fab.addEventListener('touchstart', handleStart, { passive: false });
        parentDocument.addEventListener('touchmove', handleMove, { passive: false });
        parentDocument.addEventListener('touchend', handleEnd, { passive: false });
    }

    function savePosition() {
        try {
            localStorage.setItem(DEFAULT_CONFIG.STORAGE_KEY, JSON.stringify(state.position));
        } catch (e) {}
    }

    function loadPosition() {
        try {
            const saved = localStorage.getItem(DEFAULT_CONFIG.STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                state.position.top = data.top || 100;
                state.position.left = data.left || 20;
            }
        } catch (e) {}
    }

    function adjustPositionToViewport() {
        if (!state.elements.main) return;
        const maxLeft = parentWindow.innerWidth - userConfig.mainSize;
        const maxTop = parentWindow.innerHeight - userConfig.mainSize;

        let adjusted = false;
        if (state.position.left > maxLeft) { state.position.left = Math.max(0, maxLeft); adjusted = true; }
        if (state.position.top > maxTop) { state.position.top = Math.max(0, maxTop); adjusted = true; }
        if (state.position.left < 0) { state.position.left = 0; adjusted = true; }
        if (state.position.top < 0) { state.position.top = 0; adjusted = true; }

        if (adjusted) {
            state.elements.main.style.left = state.position.left + 'px';
            state.elements.main.style.top = state.position.top + 'px';
            updateSubContainerPosition();
            savePosition();
        }
    }

    function bindWindowResize() {
        let resizeTimer = null;
        parentWindow.addEventListener('resize', function() {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                adjustPositionToViewport();
                resizeTimer = null;
            }, 100);
        });
    }

    // ============ Đăng ký nút cài đặt mặc định vào menu bóng nổi ============
    function registerBuiltinSettingsButton() {
        FloatingMenuManager.registerButton({
            id: 'fmm_layout_settings',
            label: 'Cài đặt kiểu mở menu',
            icon: ICONS.gear,
            color: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)',
            order: 9999,
            onClick: openSettingsModal
        });
    }

    // ============ API công khai ============
    const FloatingMenuManager = {
        registerButton: function(config) {
            if (!config || !config.id) return false;
            const existingIndex = state.buttons.findIndex(btn => btn.id === config.id);
            if (existingIndex !== -1) {
                state.buttons[existingIndex] = config;
            } else {
                state.buttons.push(config);
            }
            state.buttons.sort((a, b) => (a.order || 99) - (b.order || 99));
            if (state.elements.subContainer) {
                renderSubFabs();
            }
            return true;
        },
        unregisterButton: function(id) {
            const index = state.buttons.findIndex(btn => btn.id === id);
            if (index !== -1) {
                state.buttons.splice(index, 1);
                if (state.elements.subContainer) renderSubFabs();
                return true;
            }
            return false;
        },
        expand: () => expand(),
        collapse: () => collapse(),
        toggle: () => toggle(),
        openSettings: () => openSettingsModal(),
        setLayout: function(dir) {
            if (['up','down','left','right','circle','fan'].includes(dir)) {
                userConfig.direction = dir;
                saveUserConfig();
                renderSubFabs();
            }
        },
        init: function() {
            console.log('[FloatingMenuManager] Đang khởi tạo v2.5...');
            this.destroy();
            loadPosition();
            injectStyles();
            createMainFab();
            createSubContainer();

            registerBuiltinSettingsButton();

            var pending = parentWindow._fmmPendingRegistrations;
            if (pending && pending.length) {
                pending.forEach(function(config) {
                    FloatingMenuManager.registerButton(config);
                });
                parentWindow._fmmPendingRegistrations = [];
            }
            renderSubFabs();
            adjustPositionToViewport();
            bindWindowResize();
        },
        destroy: function() {
            if (state.elements.main) { state.elements.main.remove(); state.elements.main = null; }
            if (state.elements.subContainer) { state.elements.subContainer.remove(); state.elements.subContainer = null; }
            parentDocument.querySelectorAll('.fmm-main-fab').forEach(el => el.remove());
            parentDocument.querySelectorAll('.fmm-sub-container').forEach(el => el.remove());
            const styles = parentDocument.getElementById('floating-menu-manager-styles');
            if (styles) styles.remove();
            state.elements.subs = [];
            state.buttons = [];
            state.isExpanded = false;
            state.isDragging = false;
        },
        getState: () => ({
            isExpanded: state.isExpanded,
            buttonCount: state.buttons.length,
            position: { ...state.position },
            config: { ...userConfig }
        }),
        getButtons: () => state.buttons.map(btn => ({ id: btn.id, label: btn.label, order: btn.order }))
    };

    if (typeof window !== 'undefined') {
        parentWindow.FloatingMenuManager = FloatingMenuManager;
    }

    if (parentDocument.readyState === 'loading') {
        parentDocument.addEventListener('DOMContentLoaded', () => FloatingMenuManager.init());
    } else {
        FloatingMenuManager.init();
    }
})();
