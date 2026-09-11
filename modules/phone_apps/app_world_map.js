/**
 * Điện thoại nhỏ - Module Bản đồ thế giới APP
 * Sử dụng Leaflet.js + OpenStreetMap để tạo bản đồ thế giới thực
 * Hỗ trợ tìm kiếm địa điểm, hiển thị kinh độ và vĩ độ, mời khách thuê đi cùng
 * * Phụ thuộc: phone_main.js phải được tải trước
 */

(function () {
    'use strict';

    // Đợi module chính sẵn sàng
    function waitForPhoneSystem(callback) {
        if (window.parent.PhoneSystem) {
            callback();
        } else {
            console.log('[Bản đồ thế giới] Đang đợi PhoneSystem tải...');
            setTimeout(function () { waitForPhoneSystem(callback); }, 100);
        }
    }

    waitForPhoneSystem(function () {
        console.log('[Bản đồ thế giới] PhoneSystem đã sẵn sàng, bắt đầu khởi tạo');

        // ============ Cấu hình APP ============
        const APP_ID = 'world-map';
        const APP_NAME = 'Bản đồ thế giới';
        const APP_ICON = '<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxwYXRoIGZpbGw9IndoaXRlIiBkPSJNMTIgMmM1LjUyMyAwIDEwIDQuNDc3IDEwIDEwcy00LjQ3NyAxMC0xMCAxMFMyIDE3LjUyMyAyIDEyUzYuNDc3IDIgMTIgMm00LjAwNCAxMC44NzhjLS4zNDUtLjUyNS0uNTk0LS45MDMtMS41NDItLjc1M2MtMS43OS4yODQtMS45ODkuNTk3LTIuMDc0IDEuMTEzbC0uMDI0LjE1NmwtLjAyNS4xNjZjLS4wOTcuNjgzLS4wOTQuOTQxLjIyIDEuMjdjMS4yNjUgMS4zMjggMi4wMjMgMi4yODUgMi4yNTMgMi44NDVjLjExMi4yNzMuNCAxLjEuMjAyIDEuOTE4YTguMiA4LjIgMCAwIDAgMy4xNTEtMi4yMzdjLjExLS4zNzQuMTktLjg0LjE5LTEuNDA0di0uMTA1YzAtLjkyMiAwLTEuMzQzLS42NTItMS43MTZhNyA3IDAgMCAwLS42NDUtLjMyNWMtLjM2Ny0uMTY3LS42MS0uMjc2LS45MzgtLjc1NnEtLjA2LS4wODUtLjExNi0uMTcyTTEyIDMuODMzYy0yLjMxNyAwLTQuNDEuOTY2LTUuODk2IDIuNTE2Yy4xNzcuMTIzLjMzMS4yOTYuNDM3LjUzNGMuMjA0LjQ1Ny4yMDQuOTI4LjIwNCAxLjM0NWMwIC4zMjggMCAuNjQuMTA1Ljg2NWMuMTQ0LjMwOC43NjYuNDQgMS4zMTUuNTU0Yy4xOTcuMDQyLjM5OS4wODQuNTgzLjEzNWMuNTA2LjE0Ljg5OC41OTUgMS4yMTEuOTZjLjEzLjE1MS4zMjMuMzc0LjQyLjQzYy4wNS0uMDM2LjIxMS0uMjExLjI5LS40OThjLjA2Mi0uMjIuMDQ0LS40MTQtLjA0NS0uNTJjLS41Ni0uNjYtLjUyOS0xLjkzLS4zNTYtMi4zOTljLjI3Mi0uNzM5IDEuMTIyLS42ODQgMS43NDQtLjY0NGMuMjMyLjAxNS40NS4wMy42MTQuMDA5Yy42MjItLjA3OC44MTQtMS4wMjUuOTQ5LTEuMjFjLjI5Mi0uNCAxLjE4Ni0xLjAwMyAxLjc0LTEuMzc1QTguMSA4LjEgMCAwIDAgMTIgMy44MzMiLz48L3N2Zz4=" style="width:70%;height:70%">';
        const APP_COLOR = 'linear-gradient(135deg, #1e88e5, #43a047)';

        // ============ Biến Trạng_thái ============
        let mapInstance = null;
        let currentMarker = null;
        let selectedLocation = null;
        let selectedCompanions = []; // Đổi thành mảng để hỗ trợ chọn nhiều người

        // ============ Tạo HTML APP ============
        function generateAppHTML() {
            return `
                <div id="phone-world-map-app" style="position:absolute;inset:0;background:#f5f5f5;display:flex;flex-direction:column;overflow:hidden;z-index:400">
                    <div style="height:88px;display:flex;align-items:flex-end;padding:0 16px 12px;background:#1e88e5;z-index:1000;flex-shrink:0">
                        <div id="worldmap-back-btn" style="color:#fff;display:flex;align-items:center;gap:4px;cursor:pointer;width:60px">
                            <span style="font-size:18px">‹</span> Trở về
                        </div>
                        <div style="flex:1;text-align:center;font-weight:bold;font-size:17px;color:#fff">🌍 Bản đồ thế giới</div>
                        <div style="width:60px"></div>
                    </div>
                    
                    <div style="padding:12px;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,0.1);z-index:999;flex-shrink:0">
                        <div style="display:flex;gap:8px">
                            <input type="text" id="worldmap-search-input" placeholder="Tìm kiếm địa điểm..." style="flex:1;padding:10px 14px;border:1px solid #ddd;border-radius:20px;font-size:14px;outline:none">
                            <button id="worldmap-search-btn" style="padding:10px 16px;background:#1e88e5;color:#fff;border:none;border-radius:20px;font-size:14px;cursor:pointer">Tìm kiếm</button>
                        </div>
                        <div id="worldmap-search-results" style="display:none;margin-top:8px;max-height:150px;overflow-y:auto;background:#fff;border:1px solid #ddd;border-radius:8px"></div>
                    </div>
                    
                    <div id="worldmap-container" style="flex:1;position:relative;z-index:1">
                        </div>
                    
                    <div id="worldmap-info-bar" style="display:none;padding:12px 16px;background:#fff;border-top:1px solid #eee;flex-shrink:0">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                            <div id="worldmap-location-name" style="font-weight:bold;font-size:16px;color:#333">Địa điểm đã chọn</div>
                            <div id="worldmap-coords" style="font-size:12px;color:#666">Kinh độ và vĩ độ</div>
                        </div>
                        <div style="display:flex;gap:8px">
                            <button id="worldmap-companion-btn" style="flex:1;padding:10px;background:#1e88e5;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:bold;cursor:pointer">
                                👥 Chọn người đi cùng
                            </button>
                            <button id="worldmap-go-btn" style="flex:1;padding:10px;background:#43a047;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:bold;cursor:pointer">
                                ✈️ Xuất phát du lịch
                            </button>
                        </div>
                    </div>
                    
                    <div id="worldmap-companion-modal" style="position:absolute;inset:0;background:rgba(0,0,0,0.5);display:none;align-items:center;justify-content:center;z-index:1000">
                        <div style="background:#fff;border-radius:16px;padding:20px;margin:20px;width:calc(100% - 40px);max-width:300px">
                            <div style="font-weight:bold;font-size:18px;margin-bottom:8px;text-align:center">Chọn khách thuê đi cùng</div>
                            <div style="font-size:12px;color:#999;text-align:center;margin-bottom:12px">Có thể chọn nhiều, nhấp xác nhận để áp dụng</div>
                            <div id="worldmap-companion-list" style="max-height:200px;overflow-y:auto">
                                </div>
                            <div id="worldmap-selected-count" style="text-align:center;font-size:13px;color:#1e88e5;margin-top:8px">Đã chọn: 0 người</div>
                            <div style="display:flex;gap:8px;margin-top:12px">
                                <button id="worldmap-companion-alone" style="flex:1;padding:10px;background:#f5f5f5;border:1px solid #ddd;border-radius:8px;cursor:pointer">🚶 Đi một mình</button>
                                <button id="worldmap-companion-confirm" style="flex:1;padding:10px;background:#43a047;color:#fff;border:none;border-radius:8px;cursor:pointer">✓ Xác nhận chọn</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // ============ Tải tài nguyên Leaflet ============
        function loadLeafletResources(iframeDoc, callback) {
            // Kiểm tra xem đã tải chưa
            if (iframeDoc.getElementById('leaflet-css')) {
                callback();
                return;
            }

            // Tải CSS
            const css = iframeDoc.createElement('link');
            css.id = 'leaflet-css';
            css.rel = 'stylesheet';
            css.href = '/scripts/extensions/third-party/kaiz-collection/assets/libs/leaflet/leaflet.css';
            css.onerror = () => { css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; };
            iframeDoc.head.appendChild(css);

            // Tải JS
            const script = iframeDoc.createElement('script');
            script.id = 'leaflet-js';
            script.src = '/scripts/extensions/third-party/kaiz-collection/assets/libs/leaflet/leaflet.js';
            script.onerror = () => {
                console.warn('[WorldMap] Không tải được local leaflet.js, dùng CDN dự phòng');
                const cdnS = iframeDoc.createElement('script');
                cdnS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                cdnS.onload = callback;
                iframeDoc.head.appendChild(cdnS);
            };
            script.onload = callback;
            iframeDoc.head.appendChild(script);
        }

        // ============ Khởi tạo bản đồ ============
        function initMap(iframeDoc, iframeWindow) {
            const container = iframeDoc.getElementById('worldmap-container');
            if (!container) return;

            // Tạo div bản đồ
            const mapDiv = iframeDoc.createElement('div');
            mapDiv.id = 'leaflet-map';
            mapDiv.style.cssText = 'width:100%;height:100%';
            container.appendChild(mapDiv);

            // Khởi tạo bản đồ Leaflet
            const L = iframeWindow.L;
            if (!L) {
                console.error('[Bản đồ thế giới] Leaflet chưa được tải');
                return;
            }

            // Cấu hình đường dẫn marker icon Leaflet chuẩn xác từ local assets
            try {
                if (L.Icon && L.Icon.Default) {
                    delete L.Icon.Default.prototype._getIconUrl;
                    L.Icon.Default.mergeOptions({
                        iconRetinaUrl: '/scripts/extensions/third-party/kaiz-collection/assets/libs/leaflet/images/marker-icon-2x.png',
                        iconUrl: '/scripts/extensions/third-party/kaiz-collection/assets/libs/leaflet/images/marker-icon.png',
                        shadowUrl: '/scripts/extensions/third-party/kaiz-collection/assets/libs/leaflet/images/marker-shadow.png',
                    });
                }
            } catch (e) {}

            mapInstance = L.map('leaflet-map', {
                zoomControl: false
            }).setView([16.0544, 108.2022], 5); // Tọa độ trung tâm Việt Nam / Đông Nam Á

            // Layer chính: CARTO Voyager (Hiện đại, mượt mà, công khai, 100% không bị chặn 403 OSM Policy)
            const streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
                subdomains: 'abcd',
                maxZoom: 19
            });

            // Layer vệ tinh: Esri World Imagery
            const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri',
                maxZoom: 19
            });

            // Layer địa hình: OpenTopoMap
            const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                attribution: 'Map &copy; OpenTopoMap',
                maxZoom: 17
            });

            streetLayer.addTo(mapInstance);

            // Thêm bộ chọn chuyển đổi giao diện bản đồ ở góc trên bên phải
            const baseLayers = {
                "🗺️ Đường phố": streetLayer,
                "🛰️ Vệ tinh": satelliteLayer,
                "🏔️ Địa hình": topoLayer
            };
            L.control.layers(baseLayers, null, { position: 'topright' }).addTo(mapInstance);

            // Thêm nút điều khiển thu phóng vào góc dưới bên phải
            L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

            // Nhấp vào bản đồ để chọn vị trí
            mapInstance.on('click', function (e) {
                setMarker(e.latlng.lat, e.latlng.lng, 'Vị trí tùy chỉnh', iframeDoc, L);
            });

            console.log('[Bản đồ thế giới] Khởi tạo bản đồ hoàn tất');
        }

        // ============ Đặt điểm đánh dấu ============
        function setMarker(lat, lng, name, iframeDoc, L) {
            if (!mapInstance || !L) return;

            // Xóa điểm đánh dấu cũ
            if (currentMarker) {
                mapInstance.removeLayer(currentMarker);
            }

            // Tạo điểm đánh dấu mới
            currentMarker = L.marker([lat, lng]).addTo(mapInstance);
            currentMarker.bindPopup(`<b>${name}</b><br>📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}`).openPopup();

            // Cập nhật vị trí đã chọn
            selectedLocation = { name, lat, lng };

            // Hiển thị thanh thông tin
            const infoBar = iframeDoc.getElementById('worldmap-info-bar');
            const locationName = iframeDoc.getElementById('worldmap-location-name');
            const coords = iframeDoc.getElementById('worldmap-coords');

            if (infoBar) infoBar.style.display = 'block';
            if (locationName) locationName.textContent = name;
            if (coords) coords.textContent = `📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

            // Di chuyển bản đồ đến vị trí điểm đánh dấu
            mapInstance.setView([lat, lng], Math.max(mapInstance.getZoom(), 10));
        }

        // ============ Tìm kiếm địa điểm (Open-Meteo & Photon API đa ngôn ngữ) ============
        async function searchLocation(query, iframeDoc, iframeWindow) {
            const resultsDiv = iframeDoc.getElementById('worldmap-search-results');
            if (!resultsDiv) return;

            if (!query || !query.trim()) {
                resultsDiv.style.display = 'none';
                return;
            }

            resultsDiv.innerHTML = '<div style="padding:12px;text-align:center;color:#666">🔍 Đang tìm kiếm địa điểm...</div>';
            resultsDiv.style.display = 'block';

            try {
                let list = [];

                // 1. Thử Open-Meteo Geocoding API (hỗ trợ tiếng Việt tự nhiên, phản hồi dưới 2ms, không bị chặn)
                try {
                    const omRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=vi&format=json`);
                    if (omRes.ok) {
                        const omData = await omRes.json();
                        if (omData.results && omData.results.length > 0) {
                            list = omData.results.map(r => ({
                                name: r.name,
                                fullName: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
                                lat: r.latitude,
                                lng: r.longitude
                            }));
                        }
                    }
                } catch (e) {}

                // 2. Dự phòng qua Photon Geocoding (dữ liệu OSM toàn cầu mở, không bị chặn User-Agent/Policy)
                if (list.length === 0) {
                    try {
                        const ptRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query.trim())}&limit=6`);
                        if (ptRes.ok) {
                            const ptData = await ptRes.json();
                            if (ptData.features && ptData.features.length > 0) {
                                list = ptData.features.map(f => {
                                    const p = f.properties || {};
                                    const name = p.name || p.city || 'Địa điểm';
                                    const fullName = [p.name, p.district, p.city, p.state, p.country].filter((v, i, a) => v && a.indexOf(v) === i).join(', ');
                                    return {
                                        name: name,
                                        fullName: fullName,
                                        lat: f.geometry.coordinates[1],
                                        lng: f.geometry.coordinates[0]
                                    };
                                });
                            }
                        }
                    } catch (e) {}
                }

                if (list.length === 0) {
                    resultsDiv.innerHTML = '<div style="padding:12px;text-align:center;color:#999">Không tìm thấy kết quả phù hợp</div>';
                    return;
                }

                resultsDiv.innerHTML = list.map(item => `
                    <div class="search-result-item" data-lat="${item.lat}" data-lng="${item.lng}" data-name="${item.name.replace(/"/g, '&quot;')}" 
                         style="padding:10px 12px;border-bottom:1px solid #eee;cursor:pointer;font-size:13px">
                        <div style="font-weight:500;color:#1e88e5">📍 ${item.name}</div>
                        <div style="font-size:11px;color:#64748b;margin-top:2px">${item.fullName}</div>
                    </div>
                `).join('');

                // Gắn sự kiện nhấp chuột
                resultsDiv.querySelectorAll('.search-result-item').forEach(item => {
                    item.onclick = () => {
                        const lat = parseFloat(item.dataset.lat);
                        const lng = parseFloat(item.dataset.lng);
                        const name = item.dataset.name;
                        setMarker(lat, lng, name, iframeDoc, iframeWindow.L);
                        resultsDiv.style.display = 'none';
                        iframeDoc.getElementById('worldmap-search-input').value = name;
                    };
                });

            } catch (e) {
                console.error('[Bản đồ thế giới] Tìm kiếm thất bại:', e);
                resultsDiv.innerHTML = '<div style="padding:12px;text-align:center;color:#e53935">Tìm kiếm thất bại, vui lòng thử lại sau</div>';
            }
        }

        // ============ Lấy Danh_sách_khách_thuê (từ Trạng_thái MVU Zod) ============
        function getCompanionList() {
            try {
                const Mvu = window.parent.Mvu;
                if (Mvu && typeof Mvu.getMvuData === 'function') {
                    // Lấy ID tin nhắn mục tiêu
                    let targetMessageId = 'latest';
                    if (typeof window.parent.getLastMessageId === 'function') {
                        targetMessageId = window.parent.getLastMessageId();
                    } else {
                        const $ = window.parent.$;
                        if ($) {
                            const lastMes = $('#chat .mes').last();
                            if (lastMes.length) {
                                targetMessageId = lastMes.attr('mesid') || 'latest';
                            }
                        }
                    }

                    const result = Mvu.getMvuData({ type: 'message', message_id: targetMessageId });
                    if (result && result.stat_data) {
                        const tenantList = result.stat_data.Danh_sách_khách_thuê;
                        const roomList = result.stat_data.Căn_hộ?.Danh_sách_phòng;

                        // Xây dựng ánh xạ khách thuê -> phòng (Tra ngược từ trường Người_ở của phòng, hỗ trợ ở ghép phân cách bằng dấu phẩy ngược)
                        const tenantRoomMap = {};
                        if (roomList && typeof roomList === 'object') {
                            for (const [roomKey, roomData] of Object.entries(roomList)) {
                                const occupant = roomData?.Người_ở;
                                if (occupant && occupant !== '无') {
                                    const roomName = roomData?.Tên || roomKey;
                                    const floor = roomData?.Tầng || '';
                                    const displayName = roomName !== roomKey ? roomName : `${floor}`;
                                    // Hỗ trợ ở ghép: trường Người_ở có thể là định dạng "Trương Tiểu Tuyết、Lâm Thi Hàm"
                                    const names = occupant.split('、').map(s => s.trim()).filter(Boolean);
                                    for (const name of names) {
                                        if (name !== '<user>') tenantRoomMap[name] = displayName;
                                    }
                                }
                            }
                        }

                        if (tenantList && typeof tenantList === 'object') {
                            return Object.entries(tenantList).map(([name, data]) => ({
                                id: name,
                                name: name,
                                room: tenantRoomMap[name] || 'Chưa phân phòng'
                            }));
                        }
                    }
                }
            } catch (e) {
                console.log('[Bản đồ thế giới] Không thể lấy Danh_sách_khách_thuê MVU Zod:', e);
            }

            // Trả về mảng rỗng khi không có dữ liệu
            return [];
        }

        // ============ Trạng_thái chọn nhiều tạm thời ============
        let tempSelectedCompanions = [];

        // ============ Hiển thị chọn người đi cùng (Hỗ trợ chọn nhiều) ============
        function showCompanionModal(iframeDoc, isRefresh = false) {
            const modal = iframeDoc.getElementById('worldmap-companion-modal');
            const listDiv = iframeDoc.getElementById('worldmap-companion-list');
            if (!modal || !listDiv) return;

            const companions = getCompanionList();

            // Chỉ đặt lại lựa chọn tạm thời khi mở lần đầu, giữ nguyên Trạng_thái khi làm mới
            if (!isRefresh) {
                tempSelectedCompanions = [...selectedCompanions];
            }

            if (companions.length === 0) {
                listDiv.innerHTML = '<div style="padding:20px;text-align:center;color:#999">Tạm thời chưa có khách thuê để chọn</div>';
            } else {
                listDiv.innerHTML = companions.map(c => {
                    const isSelected = tempSelectedCompanions.some(s => s.id === c.id);
                    return `
                    <div class="companion-item" data-id="${c.id}" data-name="${c.name}" 
                         style="padding:12px;border:2px solid ${isSelected ? '#43a047' : '#ddd'};border-radius:8px;margin-bottom:8px;cursor:pointer;display:flex;align-items:center;gap:10px;background:${isSelected ? '#e8f5e9' : '#fff'};user-select:none">
                        <div style="width:40px;height:40px;background:${isSelected ? '#43a047' : '#e3f2fd'};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;color:${isSelected ? '#fff' : '#333'}">${isSelected ? '✓' : '👤'}</div>
                        <div style="flex:1">
                            <div style="font-weight:500">${c.name}</div>
                            <div style="font-size:12px;color:#999">${c.room}</div>
                        </div>
                    </div>
                `}).join('');

                // Gắn sự kiện chọn nhiều
                listDiv.querySelectorAll('.companion-item').forEach(item => {
                    item.addEventListener('click', function (e) {
                        e.preventDefault();
                        e.stopPropagation();

                        const id = this.dataset.id;
                        const name = this.dataset.name;
                        const index = tempSelectedCompanions.findIndex(s => s.id === id);

                        if (index >= 0) {
                            tempSelectedCompanions.splice(index, 1);
                        } else {
                            tempSelectedCompanions.push({ id, name });
                        }

                        // Làm mới hiển thị danh sách (Đánh dấu là chế độ làm mới)
                        showCompanionModal(iframeDoc, true);
                    });
                });
            }

            // Cập nhật số lượng đã chọn
            const countDiv = iframeDoc.getElementById('worldmap-selected-count');
            if (countDiv) {
                countDiv.textContent = `Đã chọn: ${tempSelectedCompanions.length} người`;
            }

            modal.style.display = 'flex';
        }

        // ============ Cập nhật hiển thị nút người đi cùng ============
        function updateCompanionButton(iframeDoc) {
            const btn = iframeDoc.getElementById('worldmap-companion-btn');
            if (!btn) return;

            if (selectedCompanions.length === 0) {
                btn.textContent = '👥 Chọn người đi cùng';
            } else if (selectedCompanions.length === 1) {
                btn.textContent = `👥 ${selectedCompanions[0].name}`;
            } else {
                btn.textContent = `👥 ${selectedCompanions.length} người đi cùng`;
            }
        }

        // ============ Thực thi xuất phát du lịch ============
        function goTravel(iframeDoc) {
            if (!selectedLocation) {
                if (window.parent.toastr) window.parent.toastr.warning('Vui lòng chọn đích đến trước');
                return;
            }

            const destination = selectedLocation.name;
            const coords = `(${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)})`;

            // Xây dựng mô tả chuyến đi (Hỗ trợ nhiều người đi cùng)
            let travelText;
            if (selectedCompanions.length === 0) {
                travelText = `Tôi đã đi một mình đến ${destination}${coords}`;
            } else if (selectedCompanions.length === 1) {
                travelText = `Tôi đã đưa ${selectedCompanions[0].name} cùng đi đến ${destination}${coords}`;
            } else {
                const names = selectedCompanions.map(c => c.name).join('、');
                travelText = `Tôi đã đưa ${names} cùng đi đến ${destination}${coords}`;
            }

            try {
                const stDoc = window.parent.document;
                const textarea = stDoc.getElementById('send_textarea');
                if (textarea) {
                    textarea.value = travelText;
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));

                    if (window.parent.toastr) {
                        window.parent.toastr.success(`✈️ Đã điền thông tin chuyến đi`);
                    }

                    // Đóng APP và điện thoại
                    closeApp();
                    window.parent.PhoneSystem.goHome();

                    const container = stDoc.getElementById('tavern-phone-system-container');
                    const overlay = stDoc.getElementById('tavern-phone-system-overlay');
                    if (container) container.classList.remove('show');
                    if (overlay) overlay.classList.remove('show');
                    window.parent.PhoneSystem.isOpen = false;
                }
            } catch (e) {
                console.error('[Bản đồ thế giới] Điền thất bại:', e);
            }
        }

        // ============ Xử lý khi mở APP ============
        function openApp() {
            console.log('[Bản đồ thế giới] openApp được gọi');

            const phoneSystem = window.parent.PhoneSystem;
            if (!phoneSystem || !phoneSystem.iframeWindow) {
                setTimeout(openApp, 200);
                return;
            }

            const iframeWindow = phoneSystem.iframeWindow;
            let iframeDoc;
            try {
                iframeDoc = iframeWindow.document;
            } catch (e) {
                console.error('[Bản đồ thế giới] Không thể truy cập iframeDoc:', e);
                return;
            }

            // Ẩn trang chủ
            const homeScreen = iframeDoc.getElementById('home-screen');
            if (homeScreen) homeScreen.style.display = 'none';

            // Lấy app-container
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

            // Tiêm APP
            appContainer.innerHTML = generateAppHTML();
            appContainer.style.pointerEvents = 'auto';

            // Đặt lại Trạng_thái
            selectedLocation = null;
            selectedCompanions = [];
            tempSelectedCompanions = [];
            mapInstance = null;
            currentMarker = null;

            // Tải Leaflet và khởi tạo bản đồ
            loadLeafletResources(iframeDoc, () => {
                setTimeout(() => initMap(iframeDoc, iframeWindow), 100);
            });

            // Gắn sự kiện
            setTimeout(() => {
                // Nút trở về
                const backBtn = iframeDoc.getElementById('worldmap-back-btn');
                if (backBtn) {
                    backBtn.onclick = () => {
                        closeApp();
                        window.parent.PhoneSystem.goHome();
                    };
                }

                // Nút tìm kiếm
                const searchBtn = iframeDoc.getElementById('worldmap-search-btn');
                const searchInput = iframeDoc.getElementById('worldmap-search-input');
                if (searchBtn && searchInput) {
                    searchBtn.onclick = () => searchLocation(searchInput.value, iframeDoc, iframeWindow);
                    searchInput.onkeypress = (e) => {
                        if (e.key === 'Enter') searchLocation(searchInput.value, iframeDoc, iframeWindow);
                    };
                }

                // Nút người đi cùng
                const companionBtn = iframeDoc.getElementById('worldmap-companion-btn');
                if (companionBtn) {
                    companionBtn.onclick = () => showCompanionModal(iframeDoc);
                }

                // Đi một mình
                const companionAlone = iframeDoc.getElementById('worldmap-companion-alone');
                if (companionAlone) {
                    companionAlone.onclick = () => {
                        selectedCompanions = [];
                        tempSelectedCompanions = [];
                        iframeDoc.getElementById('worldmap-companion-modal').style.display = 'none';
                        updateCompanionButton(iframeDoc);
                    };
                }

                // Xác nhận chọn
                const companionConfirm = iframeDoc.getElementById('worldmap-companion-confirm');
                if (companionConfirm) {
                    companionConfirm.onclick = () => {
                        selectedCompanions = [...tempSelectedCompanions];
                        iframeDoc.getElementById('worldmap-companion-modal').style.display = 'none';
                        updateCompanionButton(iframeDoc);
                    };
                }

                // Nút xuất phát
                const goBtn = iframeDoc.getElementById('worldmap-go-btn');
                if (goBtn) {
                    goBtn.onclick = () => goTravel(iframeDoc);
                }

            }, 50);

            // Thanh Trạng_thái
            const statusBar = iframeDoc.getElementById('status-bar');
            if (statusBar) {
                statusBar.classList.remove('light');
                statusBar.classList.add('dark');
            }
        }

        // ============ Xử lý khi đóng APP ============
        function closeApp() {
            const phoneSystem = window.parent?.PhoneSystem;
            if (!phoneSystem?.iframeWindow) return;

            try {
                const iframeDoc = phoneSystem.iframeWindow.document;

                // Hủy phiên bản bản đồ
                if (mapInstance) {
                    mapInstance.remove();
                    mapInstance = null;
                }
                currentMarker = null;

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
                console.error('[Bản đồ thế giới] closeApp thất bại:', e);
            }
        }

        // ============ Đăng ký APP ============
        window.parent.PhoneSystem.registerApp({
            id: APP_ID,
            name: APP_NAME,
            icon: APP_ICON,
            color: APP_COLOR,
            order: 6
        });

        // ============ Lắng nghe sự kiện ============
        window.parent.PhoneSystem.on('app-opened', function (data) {
            if (data.id === APP_ID) openApp();
        });

        window.parent.PhoneSystem.on('go-home', function () {
            closeApp();
        });

        console.log('[Bản đồ thế giới] Module đã tải xong');
    });
})();