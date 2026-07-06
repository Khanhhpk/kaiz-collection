/**
 * Trình Quản Lý Dữ Liệu Web (Storage & IndexedDB Inspector) cho SillyTavern
 * - Đăng ký trực tiếp vào Bong Bóng Mẹ (FloatingMenuManager) và Điện Thoại Nhỏ (PhoneSystem)
 * - Quét sâu, phân loại tự động LocalStorage, SessionStorage, IndexedDB
 * - Đo lường chính xác dung lượng từng CSDL & từng Object Store trong IndexedDB
 * - Click vào bất kỳ Bảng (Store) nào trong IndexedDB để xem chi tiết từng bản ghi, chỉnh sửa hoặc xóa
 */

(function() {
    'use strict';

    const parentWindow = window.parent || window;
    const parentDocument = parentWindow.document;

    console.log('[StorageInspector] Đang khởi tạo script Quản lý Dữ liệu Web v2.1...');

    const APP_ID = 'storage_inspector_app';
    const OVERLAY_ID = 'st-storage-inspector-overlay';
    const STYLE_ID = 'st-storage-inspector-styles';

    const ICONS = {
        db: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>',
        search: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
        trash: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
        edit: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
        refresh: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>',
        plus: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
        download: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
        upload: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>',
        sort: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>',
        alert: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
        eye: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>'
    };

    function cleanupOld() {
        const oldOverlay = parentDocument.getElementById(OVERLAY_ID);
        if (oldOverlay) oldOverlay.remove();
        const oldStyle = parentDocument.getElementById(STYLE_ID);
        if (oldStyle) oldStyle.remove();
    }
    cleanupOld();

    function formatBytes(bytes) {
        if (bytes === 0 || isNaN(bytes)) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function getStringSize(str) {
        if (typeof str !== 'string') {
            try { str = JSON.stringify(str) || ''; } catch(e) { str = ''; }
        }
        try {
            return new Blob([str]).size;
        } catch (e) {
            return str.length * 2;
        }
    }

    function getItemSize(item) {
        if (item === null || item === undefined) return 0;
        if (typeof item === 'string') return getStringSize(item);
        if (typeof item === 'number' || typeof item === 'boolean') return 8;
        if (item instanceof Blob) return item.size || 0;
        if (item instanceof ArrayBuffer) return item.byteLength || 0;
        if (item && item.buffer instanceof ArrayBuffer) return item.buffer.byteLength || 0;
        try {
            return getStringSize(JSON.stringify(item));
        } catch(e) {
            return 100;
        }
    }

    function categorizeKey(key) {
        const k = String(key).toLowerCase();
        if (['apikey', 'settings', 'tavern', 'user_name', 'char_name', 'selected_char', 'poweruser', 'theme'].some(sk => k.includes(sk))) {
            return { label: 'Core Cấu Hình', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)' };
        }
        if (['chat', 'message', 'lorebook', 'worldinfo', 'persona', 'avatar'].some(sk => k.includes(sk))) {
            return { label: 'Dữ liệu Chat & Nhân vật', color: '#a7f3d0', bg: 'rgba(167, 243, 208, 0.12)', border: 'rgba(167, 243, 208, 0.3)' };
        }
        if (['extension', 'script', 'floatingmenu', 'phone_', 'oc_', 'plugin'].some(sk => k.includes(sk))) {
            return { label: 'Extension / Script', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)', border: 'rgba(192, 132, 252, 0.35)' };
        }
        return { label: 'Dữ liệu Khác', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.25)' };
    }

    function getStructuredValuePreview(val) {
        if (val === null || val === undefined || val === '') return '<span style="color:#64748b; font-style:italic;">(Trống)</span>';
        if (val instanceof Blob) return `<span style="color:#f43f5e;">[Blob (${formatBytes(val.size)})]</span> type: ${val.type || 'unknown'}`;
        if (val instanceof ArrayBuffer) return `<span style="color:#f43f5e;">[ArrayBuffer (${formatBytes(val.byteLength)})]</span>`;
        
        let strVal = typeof val === 'string' ? val : '';
        if (typeof val !== 'string') {
            try { strVal = JSON.stringify(val); } catch(e) { strVal = String(val); }
        }

        try {
            const obj = typeof val === 'string' ? JSON.parse(val) : val;
            if (Array.isArray(obj)) {
                return `<span style="color:#fbbf24;">[Array (${obj.length} mục)]</span> ${JSON.stringify(obj).substring(0, 65)}`;
            } else if (typeof obj === 'object' && obj !== null) {
                const keysCount = Object.keys(obj).length;
                return `<span style="color:#60a5fa;">{Object (${keysCount} trường)}</span> ${JSON.stringify(obj).substring(0, 65)}`;
            }
        } catch(e) {}

        return strVal.length > 80 ? strVal.substring(0, 80) + '...' : strVal;
    }

    function injectStyles() {
        if (parentDocument.getElementById(STYLE_ID)) return;
        const css = `
            #st-storage-inspector-overlay {
                position: fixed;
                top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(10, 12, 18, 0.82);
                backdrop-filter: blur(14px);
                -webkit-backdrop-filter: blur(14px);
                z-index: 999999;
                display: none;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                color: #e2e8f0;
            }
            #st-storage-inspector-overlay.show {
                display: flex !important;
                animation: stInspectFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
            }
            @keyframes stInspectFadeIn {
                from { opacity: 0; transform: scale(0.97); }
                to { opacity: 1; transform: scale(1); }
            }
            .st-inspect-modal {
                width: 1060px;
                max-width: 96vw;
                height: 88vh;
                max-height: 800px;
                background: linear-gradient(145deg, #181b26 0%, #11131a 100%);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 16px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05);
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            .st-inspect-header {
                padding: 16px 20px;
                background: rgba(255, 255, 255, 0.03);
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .st-inspect-title {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 17px;
                font-weight: 700;
                color: #fff;
                letter-spacing: 0.3px;
            }
            .st-inspect-badge {
                background: rgba(99, 102, 241, 0.2);
                border: 1px solid rgba(99, 102, 241, 0.4);
                color: #818cf8;
                font-size: 11.5px;
                padding: 3px 10px;
                border-radius: 20px;
                font-weight: 600;
            }
            .st-inspect-warning-banner {
                background: rgba(245, 158, 11, 0.12);
                border-bottom: 1px solid rgba(245, 158, 11, 0.3);
                padding: 10px 20px;
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 12.5px;
                color: #fde68a;
                line-height: 1.4;
            }
            .st-inspect-close {
                background: transparent;
                border: none;
                color: #94a3b8;
                font-size: 26px;
                line-height: 1;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 8px;
                transition: all 0.2s;
            }
            .st-inspect-close:hover {
                color: #f87171;
                background: rgba(248, 113, 113, 0.12);
            }
            .st-inspect-tabs {
                display: flex;
                background: rgba(0, 0, 0, 0.28);
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                padding: 0 16px;
                gap: 6px;
            }
            .st-inspect-tab {
                padding: 13px 20px;
                background: transparent;
                border: none;
                color: #94a3b8;
                font-size: 13.5px;
                font-weight: 600;
                cursor: pointer;
                border-bottom: 2px solid transparent;
                transition: all 0.2s;
            }
            .st-inspect-tab:hover {
                color: #e2e8f0;
            }
            .st-inspect-tab.active {
                color: #6366f1;
                border-bottom-color: #6366f1;
            }
            .st-inspect-toolbar {
                padding: 12px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                background: rgba(255, 255, 255, 0.015);
                border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                flex-wrap: wrap;
            }
            .st-inspect-search-box {
                position: relative;
                flex: 1;
                min-width: 240px;
            }
            .st-inspect-search-box svg {
                position: absolute;
                left: 12px;
                top: 50%;
                transform: translateY(-50%);
                color: #64748b;
            }
            .st-inspect-search-input {
                width: 100%;
                box-sizing: border-box;
                background: rgba(0, 0, 0, 0.35);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 8px;
                padding: 8px 12px 8px 36px;
                color: #f1f5f9;
                font-size: 13px;
                outline: none;
                transition: border-color 0.2s;
            }
            .st-inspect-search-input:focus {
                border-color: #6366f1;
            }
            .st-inspect-btn-group {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            .st-inspect-btn {
                padding: 7px 13px;
                background: rgba(255, 255, 255, 0.06);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 8px;
                color: #e2e8f0;
                font-size: 12.5px;
                font-weight: 500;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 6px;
                transition: all 0.2s;
            }
            .st-inspect-btn:hover {
                background: rgba(255, 255, 255, 0.14);
            }
            .st-inspect-btn-primary {
                background: #6366f1;
                border-color: #6366f1;
                color: #fff;
            }
            .st-inspect-btn-primary:hover {
                background: #4f46e5;
            }
            .st-inspect-btn-danger {
                background: rgba(239, 68, 68, 0.15);
                border-color: rgba(239, 68, 68, 0.35);
                color: #f87171;
            }
            .st-inspect-btn-danger:hover {
                background: rgba(239, 68, 68, 0.28);
                color: #fff;
            }
            .st-inspect-content {
                flex: 1;
                overflow-y: auto;
                padding: 0;
                position: relative;
            }
            .st-inspect-table {
                width: 100%;
                border-collapse: collapse;
                text-align: left;
                font-size: 13px;
            }
            .st-inspect-table th {
                position: sticky;
                top: 0;
                background: #151821;
                padding: 11px 16px;
                font-weight: 600;
                color: #94a3b8;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                z-index: 10;
                user-select: none;
            }
            .st-inspect-table td {
                padding: 12px 16px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                color: #cbd5e1;
                vertical-align: middle;
            }
            .st-inspect-table tr:hover td {
                background: rgba(255, 255, 255, 0.035);
            }
            .st-inspect-cb {
                width: 16px; height: 16px;
                cursor: pointer;
                accent-color: #6366f1;
            }
            .st-inspect-key-container {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .st-inspect-key {
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                font-weight: 600;
                color: #38bdf8;
                word-break: break-all;
                font-size: 13px;
            }
            .st-inspect-cat-badge {
                display: inline-block;
                width: fit-content;
                font-size: 10.5px;
                padding: 1px 7px;
                border-radius: 12px;
                font-weight: 600;
            }
            .st-inspect-val-preview {
                max-width: 400px;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                font-size: 12px;
                line-height: 1.4;
                word-break: break-all;
            }
            .st-inspect-size {
                color: #94a3b8;
                font-size: 12.5px;
                white-space: nowrap;
                font-weight: 500;
            }
            .st-inspect-actions {
                display: flex;
                gap: 6px;
                white-space: nowrap;
            }
            .st-inspect-action-btn {
                padding: 5px 10px;
                border-radius: 6px;
                background: rgba(255, 255, 255, 0.06);
                border: 1px solid rgba(255, 255, 255, 0.09);
                color: #cbd5e1;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 12px;
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
            .st-inspect-action-btn:hover {
                background: rgba(255, 255, 255, 0.16);
                color: #fff;
            }
            .st-idb-store-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: rgba(99, 102, 241, 0.12);
                border: 1px solid rgba(99, 102, 241, 0.35);
                border-radius: 8px;
                padding: 5px 10px;
                margin: 3px 5px 3px 0;
                font-size: 12px;
                color: #e2e8f0;
                cursor: pointer;
                transition: all 0.2s;
            }
            .st-idb-store-badge:hover {
                background: rgba(99, 102, 241, 0.28);
                border-color: #818cf8;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
            }
            .st-idb-store-count {
                background: #6366f1;
                color: #fff;
                border-radius: 10px;
                padding: 1px 7px;
                font-size: 10.5px;
                font-weight: 600;
            }
            .st-idb-store-size {
                color: #cbd5e1;
                font-size: 11px;
            }
            .st-inspect-submodal {
                position: absolute;
                top: 0; left: 0; width: 100%; height: 100%;
                background: #11131a;
                z-index: 50;
                display: none;
                flex-direction: column;
                padding: 20px;
                box-sizing: border-box;
            }
            .st-inspect-submodal.show {
                display: flex;
            }
            .st-inspect-editor {
                flex: 1;
                width: 100%;
                box-sizing: border-box;
                background: rgba(0, 0, 0, 0.45);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 8px;
                padding: 14px;
                color: #a7f3d0;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                font-size: 13px;
                line-height: 1.5;
                resize: none;
                outline: none;
                margin: 12px 0;
            }
        `;
        const styleEl = parentDocument.createElement('style');
        styleEl.id = STYLE_ID;
        styleEl.innerHTML = css;
        parentDocument.head.appendChild(styleEl);
    }

    let currentTab = 'localStorage';
    let searchQuery = '';
    let sortOrder = 'size_desc'; // size_desc, size_asc, name_asc
    let currentEditingKey = null;
    let selectedKeys = new Set();

    function updateTableHeader(isStorage) {
        const thead = parentDocument.querySelector('.st-inspect-table thead tr');
        if (!thead) return;
        if (isStorage) {
            thead.innerHTML = `
                <th style="width:36px; text-align:center;">
                    <input type="checkbox" class="st-inspect-cb" id="st-inspect-select-all">
                </th>
                <th>Phân loại & Tên khóa (Key)</th>
                <th>Chi tiết cấu trúc & Giá trị (Value)</th>
                <th>Dung lượng</th>
                <th>Thao tác</th>
            `;
            const selectAllCb = parentDocument.getElementById('st-inspect-select-all');
            if (selectAllCb) {
                selectAllCb.onchange = (e) => {
                    const checked = e.target.checked;
                    parentDocument.querySelectorAll('.row-cb').forEach(cb => {
                        cb.checked = checked;
                        if (checked) selectedKeys.add(cb.dataset.key);
                        else selectedKeys.delete(cb.dataset.key);
                    });
                    updateBatchDeleteBtn();
                };
            }
        } else {
            thead.innerHTML = `
                <th style="width:36px; text-align:center;">🗄️</th>
                <th>Tên Cơ sở dữ liệu (Database)</th>
                <th>Các Bảng (Object Stores) - Click vào Bảng để Xem/Sửa</th>
                <th>Dung lượng đo được</th>
                <th>Thao tác</th>
            `;
        }
    }

    function getStorageItems(type) {
        const storage = type === 'localStorage' ? parentWindow.localStorage : parentWindow.sessionStorage;
        const items = [];
        let totalSize = 0;
        if (!storage) return { items, totalSize };

        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            const value = storage.getItem(key) || '';
            const size = getStringSize(key) + getStringSize(value);
            totalSize += size;
            items.push({ key, value, size });
        }

        if (sortOrder === 'size_desc') items.sort((a, b) => b.size - a.size);
        else if (sortOrder === 'size_asc') items.sort((a, b) => a.size - b.size);
        else if (sortOrder === 'name_asc') items.sort((a, b) => a.key.localeCompare(b.key));

        return { items, totalSize, storage };
    }

    function renderStorageTable(type) {
        updateTableHeader(true);
        const { items, totalSize, storage } = getStorageItems(type);
        const filtered = items.filter(it => 
            it.key.toLowerCase().includes(searchQuery.toLowerCase()) || 
            it.value.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const badge = parentDocument.getElementById('st-inspect-badge-size');
        if (badge) badge.textContent = 'Tổng: ' + formatBytes(totalSize) + ' (' + items.length + ' mục)';

        const container = parentDocument.getElementById('st-inspect-table-body');
        if (!container) return;

        updateBatchDeleteBtn();

        if (filtered.length === 0) {
            container.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 45px; color: #64748b;">Không tìm thấy dữ liệu web phù hợp.</td></tr>';
            return;
        }

        let html = '';
        filtered.forEach(it => {
            const cat = categorizeKey(it.key);
            const structuredPreview = getStructuredValuePreview(it.value);
            const escapedKey = it.key.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            const isChecked = selectedKeys.has(it.key) ? 'checked' : '';

            html += `
                <tr>
                    <td style="width:36px; text-align:center;">
                        <input type="checkbox" class="st-inspect-cb row-cb" data-key="${escapedKey}" ${isChecked}>
                    </td>
                    <td>
                        <div class="st-inspect-key-container">
                            <span class="st-inspect-key" title="${escapedKey}">${escapedKey}</span>
                            <span class="st-inspect-cat-badge" style="color:${cat.color}; background:${cat.bg}; border:1px solid ${cat.border}">${cat.label}</span>
                        </div>
                    </td>
                    <td class="st-inspect-val-preview" title="Click Sửa để xem chi tiết">${structuredPreview}</td>
                    <td class="st-inspect-size">${formatBytes(it.size)}</td>
                    <td class="st-inspect-actions">
                        <button class="st-inspect-action-btn btn-edit" data-key="${escapedKey}" title="Xem & Chỉnh sửa">${ICONS.edit} Sửa</button>
                        <button class="st-inspect-action-btn btn-del" data-key="${escapedKey}" title="Xóa mục này">${ICONS.trash}</button>
                    </td>
                </tr>
            `;
        });
        container.innerHTML = html;

        container.querySelectorAll('.row-cb').forEach(cb => {
            cb.onchange = (e) => {
                if (e.target.checked) selectedKeys.add(cb.dataset.key);
                else selectedKeys.delete(cb.dataset.key);
                updateBatchDeleteBtn();
            };
        });

        container.querySelectorAll('.btn-edit').forEach(btn => {
            btn.onclick = () => openEditorModal(type, btn.dataset.key);
        });
        container.querySelectorAll('.btn-del').forEach(btn => {
            btn.onclick = () => {
                if (confirm('Lưu ý: Xóa hoặc thay đổi dữ liệu Storage có thể ảnh hưởng đến thiết lập hiện tại. Bạn có chắc chắn muốn xóa mục "' + btn.dataset.key + '"?')) {
                    storage.removeItem(btn.dataset.key);
                    selectedKeys.delete(btn.dataset.key);
                    renderCurrentTab();
                }
            };
        });
    }

    function updateBatchDeleteBtn() {
        const batchBtn = parentDocument.getElementById('st-inspect-btn-batch-del');
        if (!batchBtn) return;
        if (selectedKeys.size > 0) {
            batchBtn.style.display = 'flex';
            batchBtn.innerHTML = ICONS.trash + ' Xóa đã chọn (' + selectedKeys.size + ')';
        } else {
            batchBtn.style.display = 'none';
        }
    }

    async function renderIndexedDB() {
        updateTableHeader(false);
        const container = parentDocument.getElementById('st-inspect-table-body');
        const badge = parentDocument.getElementById('st-inspect-badge-size');
        if (badge) badge.textContent = 'Đang đo lường dung lượng IndexedDB...';
        if (!container) return;

        const batchBtn = parentDocument.getElementById('st-inspect-btn-batch-del');
        if (batchBtn) batchBtn.style.display = 'none';

        let dbs = [];
        if (parentWindow.indexedDB && parentWindow.indexedDB.databases) {
            try {
                dbs = await parentWindow.indexedDB.databases();
            } catch (e) {}
        }

        const commonDBNames = ['SillyTavern', 'localforage', 'keyval-store', 'firebaseLocalStorageDb'];
        commonDBNames.forEach(name => {
            if (!dbs.some(d => d.name === name)) dbs.push({ name: name, version: 1 });
        });

        let html = '';
        let totalAllDBSize = 0;
        let count = 0;

        for (let dbInfo of dbs) {
            if (!dbInfo.name) continue;
            try {
                // Mở DB và tính toán dung lượng + số bản ghi từng Object Store
                const storeDetails = await new Promise((resolve) => {
                    const req = parentWindow.indexedDB.open(dbInfo.name);
                    req.onsuccess = async (e) => {
                        const db = e.target.result;
                        const names = Array.from(db.objectStoreNames);
                        const details = [];
                        for (let storeName of names) {
                            try {
                                const tx = db.transaction(storeName, 'readonly');
                                const store = tx.objectStore(storeName);
                                
                                const allKeys = await new Promise(r => {
                                    const kr = store.getAllKeys();
                                    kr.onsuccess = () => r(kr.result || []);
                                    kr.onerror = () => r([]);
                                });
                                const allVals = await new Promise(r => {
                                    const vr = store.getAll();
                                    vr.onsuccess = () => r(vr.result || []);
                                    vr.onerror = () => r([]);
                                });

                                let storeSize = 0;
                                for (let i = 0; i < allKeys.length; i++) {
                                    storeSize += getItemSize(allKeys[i]) + getItemSize(allVals[i]);
                                }

                                details.push({ name: storeName, count: allKeys.length, size: storeSize });
                            } catch(err) {
                                details.push({ name: storeName, count: '?', size: 0 });
                            }
                        }
                        db.close();
                        resolve(details);
                    };
                    req.onerror = () => resolve([]);
                });

                if (storeDetails.length > 0 || dbs.length <= 4) {
                    count++;
                    let dbTotalSize = storeDetails.reduce((acc, cur) => acc + (cur.size || 0), 0);
                    totalAllDBSize += dbTotalSize;

                    let storesHTML = '';
                    if (storeDetails.length === 0) {
                        storesHTML = '<span style="color:#64748b;">Trống / Không có bảng dữ liệu</span>';
                    } else {
                        storeDetails.forEach(sd => {
                            storesHTML += `
                                <div class="st-idb-store-badge btn-open-store" data-dbname="${dbInfo.name}" data-storename="${sd.name}" title="Click để XEM & SỬA các bản ghi bên trong">
                                    📁 <strong>${sd.name}</strong> 
                                    <span class="st-idb-store-count">${sd.count} bản ghi</span>
                                    <span class="st-idb-store-size">(${formatBytes(sd.size)})</span>
                                </div>
                            `;
                        });
                    }

                    html += `
                        <tr>
                            <td style="width:36px; text-align:center;">🗄️</td>
                            <td>
                                <div class="st-inspect-key-container">
                                    <span class="st-inspect-key" style="color:#818cf8; font-size:14px;">${dbInfo.name}</span>
                                    <span class="st-inspect-cat-badge" style="color:#a5b4fc; background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.3)">IndexedDB Database</span>
                                </div>
                            </td>
                            <td><div style="display:flex; flex-wrap:wrap; gap:6px;">${storesHTML}</div></td>
                            <td>
                                <div style="font-weight:700; color:#34d399; font-size:13px;">${formatBytes(dbTotalSize)}</div>
                                <div style="color:#64748b; font-size:11.5px;">Phiên bản ${dbInfo.version || 1}</div>
                            </td>
                            <td class="st-inspect-actions">
                                <button class="st-inspect-action-btn btn-del-idb" data-dbname="${dbInfo.name}" style="color:#f87171">${ICONS.trash} Xóa DB</button>
                            </td>
                        </tr>
                    `;
                }
            } catch (e) {}
        }

        if (badge) badge.textContent = 'Tổng IndexedDB: ' + formatBytes(totalAllDBSize) + ' (' + count + ' CSDL)';
        container.innerHTML = html || '<tr><td colspan="5" style="text-align:center; padding: 45px; color: #64748b;">Không tìm thấy IndexedDB nào khả dụng.</td></tr>';

        container.querySelectorAll('.btn-open-store').forEach(btn => {
            btn.onclick = () => openIDBStoreViewer(btn.dataset.dbname, btn.dataset.storename);
        });

        container.querySelectorAll('.btn-del-idb').forEach(btn => {
            btn.onclick = () => {
                const dbName = btn.dataset.dbname;
                if (confirm('⚠️ CẢNH BÁO QUAN TRỌNG: Việc xóa toàn bộ IndexedDB "' + dbName + '" có thể làm mất dữ liệu lịch sử chat hoặc thiết lập sâu của extension. Bạn có chắc chắn muốn tiếp tục không?')) {
                    const req = parentWindow.indexedDB.deleteDatabase(dbName);
                    req.onsuccess = () => {
                        if (parentWindow.toastr) parentWindow.toastr.success('Đã xóa DB ' + dbName);
                        renderIndexedDB();
                    };
                    req.onerror = () => alert('Không thể xóa CSDL này khi đang có tiến trình sử dụng.');
                }
            };
        });
    }

    async function openIDBStoreViewer(dbName, storeName) {
        const submodal = parentDocument.getElementById('st-inspect-submodal');
        submodal.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:12px; margin-bottom:12px;">
                <div>
                    <h3 style="margin:0; color:#fff; font-size:16px;">🗄️ ${dbName} ➔ 📁 <span style="color:#818cf8;">${storeName}</span></h3>
                    <span style="font-size:12px; color:#94a3b8;">Danh sách chi tiết các bản ghi trong Object Store</span>
                </div>
                <button class="st-inspect-close" id="st-idb-close">&times;</button>
            </div>
            <div style="flex:1; overflow-y:auto; border:1px solid rgba(255,255,255,0.08); border-radius:8px; background:rgba(0,0,0,0.3);">
                <table class="st-inspect-table">
                    <thead>
                        <tr>
                            <th>Khóa bản ghi (Key / ID)</th>
                            <th>Nội dung bản ghi (Value Preview)</th>
                            <th>Dung lượng</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody id="st-idb-records-body">
                        <tr><td colspan="4" style="text-align:center; padding:30px;">Đang tải danh sách bản ghi...</td></tr>
                    </tbody>
                </table>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:14px;">
                <button class="st-inspect-btn" id="st-idb-back">Quay lại danh sách DB</button>
            </div>
        `;
        submodal.classList.add('show');

        parentDocument.getElementById('st-idb-close').onclick = () => submodal.classList.remove('show');
        parentDocument.getElementById('st-idb-back').onclick = () => submodal.classList.remove('show');

        const req = parentWindow.indexedDB.open(dbName);
        req.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            
            store.getAllKeys().onsuccess = (ke) => {
                const keys = ke.target.result || [];
                store.getAll().onsuccess = (ve) => {
                    const vals = ve.target.result || [];
                    db.close();

                    const tbody = parentDocument.getElementById('st-idb-records-body');
                    if (!tbody) return;
                    if (keys.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:35px; color:#64748b;">Bảng này hiện chưa có bản ghi nào.</td></tr>';
                        return;
                    }

                    let rowsHTML = '';
                    for (let i = 0; i < keys.length; i++) {
                        const k = String(keys[i]);
                        const v = vals[i];
                        const size = getItemSize(keys[i]) + getItemSize(v);
                        const preview = getStructuredValuePreview(v);
                        const escapedKey = k.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

                        rowsHTML += `
                            <tr>
                                <td class="st-inspect-key">${escapedKey}</td>
                                <td class="st-inspect-val-preview">${preview}</td>
                                <td class="st-inspect-size">${formatBytes(size)}</td>
                                <td class="st-inspect-actions">
                                    <button class="st-inspect-action-btn btn-idb-edit" data-idx="${i}" title="Sửa bản ghi này">${ICONS.edit} Sửa</button>
                                    <button class="st-inspect-action-btn btn-idb-del" data-key="${escapedKey}" title="Xóa bản ghi này">${ICONS.trash}</button>
                                </td>
                            </tr>
                        `;
                    }
                    tbody.innerHTML = rowsHTML;

                    tbody.querySelectorAll('.btn-idb-edit').forEach(btn => {
                        btn.onclick = () => {
                            const idx = parseInt(btn.dataset.idx);
                            openIDBRecordEditor(dbName, storeName, keys[idx], vals[idx]);
                        };
                    });

                    tbody.querySelectorAll('.btn-idb-del').forEach(btn => {
                        btn.onclick = () => {
                            const recKey = btn.dataset.key;
                            if (confirm('Bạn có chắc chắn muốn xóa bản ghi ID: "' + recKey + '" khỏi bảng ' + storeName + '?')) {
                                const delReq = parentWindow.indexedDB.open(dbName);
                                delReq.onsuccess = (de) => {
                                    const ddb = de.target.result;
                                    const dtx = ddb.transaction(storeName, 'readwrite');
                                    dtx.objectStore(storeName).delete(isNaN(recKey) ? recKey : (isNaN(Number(recKey)) ? recKey : Number(recKey)));
                                    dtx.oncomplete = () => {
                                        ddb.close();
                                        if (parentWindow.toastr) parentWindow.toastr.success('Đã xóa bản ghi!');
                                        openIDBStoreViewer(dbName, storeName);
                                    };
                                };
                            }
                        };
                    });
                };
            };
        };
    }

    function openIDBRecordEditor(dbName, storeName, recordKey, recordVal) {
        const submodal = parentDocument.getElementById('st-inspect-submodal');
        let strVal = '';
        try { strVal = JSON.stringify(recordVal, null, 4); } catch(e) { strVal = String(recordVal); }

        submodal.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h4 style="margin:0; color:#fff;">Sửa bản ghi IndexedDB: <span style="color:#38bdf8">${String(recordKey)}</span></h4>
                <button class="st-inspect-close" id="st-rec-close">&times;</button>
            </div>
            <textarea class="st-inspect-editor" id="st-rec-textarea">${strVal}</textarea>
            <div style="display:flex; justify-content:flex-end; gap:10px;">
                <button class="st-inspect-btn" id="st-rec-cancel">Hủy bỏ</button>
                <button class="st-inspect-btn st-inspect-btn-primary" id="st-rec-save">Lưu Thay Đổi</button>
            </div>
        `;

        parentDocument.getElementById('st-rec-close').onclick = () => openIDBStoreViewer(dbName, storeName);
        parentDocument.getElementById('st-rec-cancel').onclick = () => openIDBStoreViewer(dbName, storeName);
        parentDocument.getElementById('st-rec-save').onclick = () => {
            const txt = parentDocument.getElementById('st-rec-textarea').value;
            let finalVal = txt;
            try { finalVal = JSON.parse(txt); } catch(e){}

            const req = parentWindow.indexedDB.open(dbName);
            req.onsuccess = (e) => {
                const db = e.target.result;
                const tx = db.transaction(storeName, 'readwrite');
                tx.objectStore(storeName).put(finalVal, recordKey);
                tx.oncomplete = () => {
                    db.close();
                    if (parentWindow.toastr) parentWindow.toastr.success('Đã cập nhật bản ghi thành công!');
                    openIDBStoreViewer(dbName, storeName);
                };
            };
        };
    }

    function openEditorModal(type, key) {
        const storage = type === 'localStorage' ? parentWindow.localStorage : parentWindow.sessionStorage;
        const rawVal = storage.getItem(key) || '';
        currentEditingKey = key;

        const submodal = parentDocument.getElementById('st-inspect-submodal');
        const titleEl = parentDocument.getElementById('st-editor-title');
        const textarea = parentDocument.getElementById('st-editor-textarea');

        titleEl.textContent = 'Sửa mục: ' + key;
        try {
            textarea.value = JSON.stringify(JSON.parse(rawVal), null, 4);
        } catch (e) {
            textarea.value = rawVal;
        }
        submodal.classList.add('show');

        parentDocument.getElementById('st-editor-save').onclick = () => {
            if (!confirm('Lưu ý: Thay đổi cấu hình trực tiếp có thể gây lỗi hiển thị hoặc lệch dữ liệu nếu sai định dạng. Bạn có chắc chắn muốn lưu?')) return;
            let finalVal = textarea.value;
            try {
                finalVal = JSON.stringify(JSON.parse(textarea.value));
            } catch(e) {}
            storage.setItem(key, finalVal);
            submodal.classList.remove('show');
            if (parentWindow.toastr) parentWindow.toastr.success('Đã lưu thay đổi cho "' + key + '"');
            renderCurrentTab();
        };
    }

    function openAddModal() {
        const key = prompt('Nhập tên biến (Key):');
        if (!key) return;
        const val = prompt('Nhập giá trị (Value):', '');
        if (val === null) return;
        const storage = currentTab === 'sessionStorage' ? parentWindow.sessionStorage : parentWindow.localStorage;
        storage.setItem(key, val);
        renderCurrentTab();
    }

    function batchDeleteSelected() {
        if (selectedKeys.size === 0) return;
        if (!confirm('⚠️ CẢNH BÁO AN TOÀN: Bạn đang chọn xóa ' + selectedKeys.size + ' mục khỏi ' + currentTab + '. Các mục đã xóa sẽ không thể khôi phục trừ khi bạn đã tải tệp Backup JSON trước đó. Bạn có chắc chắn muốn xóa?')) return;
        const storage = currentTab === 'sessionStorage' ? parentWindow.sessionStorage : parentWindow.localStorage;
        selectedKeys.forEach(key => storage.removeItem(key));
        selectedKeys.clear();
        if (parentWindow.toastr) parentWindow.toastr.success('Đã xóa các mục được chọn!');
        renderCurrentTab();
    }

    function exportBackup() {
        const storage = currentTab === 'sessionStorage' ? parentWindow.sessionStorage : parentWindow.localStorage;
        const dump = {};
        for (let i = 0; i < storage.length; i++) {
            const k = storage.key(i);
            dump[k] = storage.getItem(k);
        }
        const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = parentDocument.createElement('a');
        a.href = url;
        a.download = 'SillyTavern_' + currentTab + '_backup_' + new Date().toISOString().slice(0,10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function importBackup() {
        const input = parentDocument.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    const storage = currentTab === 'sessionStorage' ? parentWindow.sessionStorage : parentWindow.localStorage;
                    let count = 0;
                    for (let k in data) {
                        storage.setItem(k, typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k]));
                        count++;
                    }
                    if (parentWindow.toastr) parentWindow.toastr.success('Đã khôi phục thành công ' + count + ' mục vào ' + currentTab);
                    else alert('Đã khôi phục thành công ' + count + ' mục!');
                    renderCurrentTab();
                } catch (err) {
                    alert('Tệp Backup JSON không hợp lệ!');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function renderCurrentTab() {
        selectedKeys.clear();
        const headerCb = parentDocument.getElementById('st-inspect-select-all');
        if (headerCb) headerCb.checked = false;

        const isStorage = currentTab === 'localStorage' || currentTab === 'sessionStorage';
        parentDocument.getElementById('st-inspect-btn-add').style.display = isStorage ? 'flex' : 'none';
        parentDocument.getElementById('st-inspect-btn-export').style.display = isStorage ? 'flex' : 'none';
        parentDocument.getElementById('st-inspect-btn-import').style.display = isStorage ? 'flex' : 'none';
        parentDocument.getElementById('st-inspect-btn-sort').style.display = isStorage ? 'flex' : 'none';

        if (currentTab === 'localStorage') renderStorageTable('localStorage');
        else if (currentTab === 'sessionStorage') renderStorageTable('sessionStorage');
        else if (currentTab === 'indexedDB') renderIndexedDB();
    }

    function buildModalDOM() {
        injectStyles();
        const modalHtml = `
            <div id="${OVERLAY_ID}">
                <div class="st-inspect-modal">
                    <div class="st-inspect-header">
                        <div class="st-inspect-title">
                            ${ICONS.db} Quản Lý Dữ Liệu Web SillyTavern
                            <span class="st-inspect-badge" id="st-inspect-badge-size">Đang tính toán...</span>
                        </div>
                        <button class="st-inspect-close" id="st-inspect-btn-close">&times;</button>
                    </div>
                    <div class="st-inspect-warning-banner">
                        ${ICONS.alert}
                        <span><strong>Cảnh báo an toàn:</strong> Trình kiểm tra cho phép thao tác trực tiếp với bộ nhớ lưu trữ trình duyệt. Chỉnh sửa hoặc xóa các từ khóa quan trọng (như API key, thiết lập nhân vật, hoặc CSDL IndexedDB) có thể làm mất dữ liệu chat hoặc lệch cấu hình SillyTavern. Hãy <strong>Xuất JSON Backup</strong> trước khi dọn dẹp lớn!</span>
                    </div>
                    <div class="st-inspect-tabs">
                        <button class="st-inspect-tab active" data-tab="localStorage">LocalStorage</button>
                        <button class="st-inspect-tab" data-tab="sessionStorage">SessionStorage</button>
                        <button class="st-inspect-tab" data-tab="indexedDB">IndexedDB</button>
                    </div>
                    <div class="st-inspect-toolbar">
                        <div class="st-inspect-search-box">
                            ${ICONS.search}
                            <input type="text" class="st-inspect-search-input" id="st-inspect-search" placeholder="Tìm kiếm theo Tên khóa hoặc Giá trị...">
                        </div>
                        <div class="st-inspect-btn-group">
                            <button class="st-inspect-btn" id="st-inspect-btn-sort" title="Thay đổi thứ tự sắp xếp">${ICONS.sort} Sắp xếp</button>
                            <button class="st-inspect-btn" id="st-inspect-btn-refresh">${ICONS.refresh} Làm mới</button>
                            <button class="st-inspect-btn st-inspect-btn-primary" id="st-inspect-btn-add">${ICONS.plus} Thêm mục</button>
                            <button class="st-inspect-btn" id="st-inspect-btn-export">${ICONS.download} Xuất JSON</button>
                            <button class="st-inspect-btn" id="st-inspect-btn-import">${ICONS.upload} Khôi phục</button>
                            <button class="st-inspect-btn st-inspect-btn-danger" id="st-inspect-btn-batch-del" style="display:none;">${ICONS.trash} Xóa đã chọn</button>
                        </div>
                    </div>
                    <div class="st-inspect-content">
                        <table class="st-inspect-table">
                            <thead>
                                <tr>
                                    <th style="width:36px; text-align:center;" id="th-select-col">
                                        <input type="checkbox" class="st-inspect-cb" id="st-inspect-select-all">
                                    </th>
                                    <th>Phân loại & Tên khóa (Key)</th>
                                    <th>Chi tiết cấu trúc & Giá trị (Value)</th>
                                    <th>Dung lượng</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody id="st-inspect-table-body"></tbody>
                        </table>
                        <div class="st-inspect-submodal" id="st-inspect-submodal">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <h4 id="st-editor-title" style="margin:0; color:#fff;">Chỉnh sửa</h4>
                                <button class="st-inspect-close" id="st-editor-close">&times;</button>
                            </div>
                            <textarea class="st-inspect-editor" id="st-editor-textarea"></textarea>
                            <div style="display:flex; justify-content:flex-end; gap:10px;">
                                <button class="st-inspect-btn" id="st-editor-cancel">Hủy bỏ</button>
                                <button class="st-inspect-btn st-inspect-btn-primary" id="st-editor-save">Lưu Thay Đổi</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        parentDocument.body.insertAdjacentHTML('beforeend', modalHtml);

        const overlay = parentDocument.getElementById(OVERLAY_ID);
        parentDocument.getElementById('st-inspect-btn-close').onclick = () => overlay.classList.remove('show');
        parentDocument.getElementById('st-editor-close').onclick = () => parentDocument.getElementById('st-inspect-submodal').classList.remove('show');
        parentDocument.getElementById('st-editor-cancel').onclick = () => parentDocument.getElementById('st-inspect-submodal').classList.remove('show');

        parentDocument.getElementById('st-inspect-btn-refresh').onclick = renderCurrentTab;
        parentDocument.getElementById('st-inspect-btn-add').onclick = openAddModal;
        parentDocument.getElementById('st-inspect-btn-export').onclick = exportBackup;
        parentDocument.getElementById('st-inspect-btn-import').onclick = importBackup;
        parentDocument.getElementById('st-inspect-btn-batch-del').onclick = batchDeleteSelected;

        parentDocument.getElementById('st-inspect-btn-sort').onclick = () => {
            if (sortOrder === 'size_desc') { sortOrder = 'size_asc'; if(parentWindow.toastr) parentWindow.toastr.info('Sắp xếp: Dung lượng tăng dần'); }
            else if (sortOrder === 'size_asc') { sortOrder = 'name_asc'; if(parentWindow.toastr) parentWindow.toastr.info('Sắp xếp: Tên A - Z'); }
            else { sortOrder = 'size_desc'; if(parentWindow.toastr) parentWindow.toastr.info('Sắp xếp: Dung lượng giảm dần'); }
            renderCurrentTab();
        };

        const selectAllCb = parentDocument.getElementById('st-inspect-select-all');
        if (selectAllCb) {
            selectAllCb.onchange = (e) => {
                const checked = e.target.checked;
                parentDocument.querySelectorAll('.row-cb').forEach(cb => {
                    cb.checked = checked;
                    if (checked) selectedKeys.add(cb.dataset.key);
                    else selectedKeys.delete(cb.dataset.key);
                });
                updateBatchDeleteBtn();
            };
        }

        parentDocument.getElementById('st-inspect-search').oninput = (e) => {
            searchQuery = e.target.value;
            renderCurrentTab();
        };

        parentDocument.querySelectorAll('.st-inspect-tab').forEach(tab => {
            tab.onclick = () => {
                parentDocument.querySelectorAll('.st-inspect-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentTab = tab.dataset.tab;
                renderCurrentTab();
            };
        });
    }

    function openInspector() {
        let overlay = parentDocument.getElementById(OVERLAY_ID);
        if (!overlay) {
            buildModalDOM();
            overlay = parentDocument.getElementById(OVERLAY_ID);
        }
        if (overlay) {
            overlay.classList.add('show');
            renderCurrentTab();
        }
        if (parentWindow.FloatingMenuManager) parentWindow.FloatingMenuManager.collapse();
    }

    const fmmConfig = {
        id: 'storage_inspector_btn',
        icon: ICONS.db,
        label: 'Dữ Liệu Web',
        color: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
        order: 3,
        onClick: openInspector
    };

    function tryRegisterFMM() {
        if (parentWindow.FloatingMenuManager && typeof parentWindow.FloatingMenuManager.registerButton === 'function') {
            parentWindow.FloatingMenuManager.registerButton(fmmConfig);
            return true;
        } else {
            parentWindow._fmmPendingRegistrations = parentWindow._fmmPendingRegistrations || [];
            if (!parentWindow._fmmPendingRegistrations.some(b => b.id === fmmConfig.id)) {
                parentWindow._fmmPendingRegistrations.push(fmmConfig);
            }
            return false;
        }
    }

    if (!tryRegisterFMM()) {
        let retry = 0;
        const timer = setInterval(() => {
            retry++;
            if (tryRegisterFMM() || retry >= 60) clearInterval(timer);
        }, 500);
    }

    if (parentWindow.PhoneSystem && typeof parentWindow.PhoneSystem.registerApp === 'function') {
        parentWindow.PhoneSystem.registerApp({
            id: APP_ID,
            name: 'Dữ liệu Web',
            icon: '📦',
            color: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
            order: 21
        });
        parentWindow.PhoneSystem.on('app-opened', (data) => {
            if (data && data.id === APP_ID) openInspector();
        });
    }

    console.log('[StorageInspector] Đã đăng ký thành công vào Bong Bóng Mẹ v2.1.');
})();
