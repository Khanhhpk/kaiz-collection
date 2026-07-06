/**
 * Module: App Trạm Bơm Prompt (Prompt Booster & Injection Lab)
 * Phụ thuộc: Lõi Điện thoại (Phone Core) & SillyTavern Extension Prompts API
 * Chức năng: Thử nghiệm bơm prompt chuẩn chỉ theo cơ chế hỗ trợ riêng cho Extension của SillyTavern (extension_prompts).
 */

(function initPromptBoosterApp() {
    if (!window.parent.PhoneSystem) {
        setTimeout(initPromptBoosterApp, 1000);
        return;
    }

    const APP_ID = 'prompt-booster-app';
    const STORAGE_KEY = 'Kaiz_PromptBooster_Settings_v2';
    const parentWin = window.parent || window;
    const PROMPT_KEY = 'kaiz_prompt_booster_app';

    // Cấu hình mặc định theo chuẩn SillyTavern Extension Prompts
    let settings = {
        enabled: true,
        target: 'in_chat', // 'in_prompt' (System/Before) | 'in_chat' (Depth) | 'after_prompt' (After)
        role: 'system', // 'system' | 'user' | 'assistant'
        depth: 0, // Độ sâu (Depth) khi chọn in_chat (0 = ngay trước câu cuối)
        promptText: 'Hãy trả lời bằng thái độ ngoài lạnh trong nóng (tsundere), đỏ mặt và hơi gắt gỏng nhưng vẫn quan tâm.',
        logs: []
    };

    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            settings = Object.assign(settings, JSON.parse(saved));
        }
    } catch (e) {}

    function saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (e) {}
    }

    function addLog(msg, type = 'info') {
        const time = new Date().toTimeString().split(' ')[0];
        settings.logs.unshift({ time, msg, type });
        if (settings.logs.length > 50) settings.logs.pop();
        saveSettings();
        updateLogUI();
        if (typeof logToKaiz === 'function') {
            logToKaiz(`[PromptBooster] ${msg}`, type);
        } else {
            console.log(`[PromptBooster] [${type}] ${msg}`);
        }
    }

    // =========================================================================
    // CƠ CHẾ BƠM PROMPT CHUẨN SILLYTAVERN (EXTENSION PROMPTS API)
    // =========================================================================
    function updateSillyTavernExtensionPrompt() {
        const ctx = parentWin.SillyTavern?.getContext?.() || parentWin;
        const extPrompts = ctx.extension_prompts || parentWin.extension_prompts;
        const extTypes = ctx.extension_prompt_types || parentWin.extension_prompt_types || {};
        const extRoles = ctx.extension_prompt_roles || parentWin.extension_prompt_roles || {};
        
        // SillyTavern hỗ trợ depth qua extension_prompt_depth hoặc extension_prompt_depths
        let extDepths = ctx.extension_prompt_depth || ctx.extension_prompt_depths || parentWin.extension_prompt_depth || parentWin.extension_prompt_depths;
        if (!extDepths && extPrompts) {
            // Tự khởi tạo nếu chưa có
            extDepths = {};
            if (ctx.extension_prompts) ctx.extension_prompt_depth = extDepths;
            else parentWin.extension_prompt_depth = extDepths;
        }

        if (!extPrompts) {
            addLog('⚠️ Không tìm thấy đối tượng extension_prompts của SillyTavern. Hãy đảm bảo bạn đang chạy trong môi trường SillyTavern chuẩn.', 'warn');
            return;
        }

        if (!settings.enabled || !settings.promptText.trim()) {
            // Gỡ bỏ prompt khỏi SillyTavern
            delete extPrompts[PROMPT_KEY];
            if (extTypes) delete extTypes[PROMPT_KEY];
            if (extRoles) delete extRoles[PROMPT_KEY];
            if (extDepths) delete extDepths[PROMPT_KEY];
            addLog('⏸️ Đã gỡ Prompt khỏi hệ thống SillyTavern (extension_prompts).', 'warn');
            return;
        }

        // 1. Đăng ký nội dung Prompt
        extPrompts[PROMPT_KEY] = settings.promptText.trim();

        // 2. Đăng ký vị trí bơm (Position / Type)
        if (extTypes) {
            if (settings.target === 'in_prompt') {
                extTypes[PROMPT_KEY] = extTypes.IN_PROMPT !== undefined ? extTypes.IN_PROMPT : 1;
            } else if (settings.target === 'in_chat') {
                extTypes[PROMPT_KEY] = extTypes.IN_CHAT !== undefined ? extTypes.IN_CHAT : 0;
            } else if (settings.target === 'after_prompt') {
                extTypes[PROMPT_KEY] = extTypes.AFTER_PROMPT !== undefined ? extTypes.AFTER_PROMPT : 2;
            }
        }

        // 3. Đăng ký vai trò (Role)
        if (extRoles) {
            if (settings.role === 'system') {
                extRoles[PROMPT_KEY] = extRoles.SYSTEM !== undefined ? extRoles.SYSTEM : 0;
            } else if (settings.role === 'user') {
                extRoles[PROMPT_KEY] = extRoles.USER !== undefined ? extRoles.USER : 1;
            } else if (settings.role === 'assistant') {
                extRoles[PROMPT_KEY] = extRoles.ASSISTANT !== undefined ? extRoles.ASSISTANT : 2;
            }
        }

        // 4. Đăng ký độ sâu (Depth - chỉ áp dụng khi Type là IN_CHAT)
        if (extDepths && settings.target === 'in_chat') {
            extDepths[PROMPT_KEY] = parseInt(settings.depth, 10) || 0;
        }

        addLog(`✅ Đã đồng bộ vào SillyTavern extension_prompts [Key: ${PROMPT_KEY}, Vị trí: ${settings.target.toUpperCase()}, Role: ${settings.role.toUpperCase()}${settings.target === 'in_chat' ? ', Depth: ' + settings.depth : ''}]`, 'success');
    }

    // Lắng nghe sự kiện để ghi log theo thời gian thực
    let isHooked = false;
    function setupEventListeners() {
        if (isHooked) return;
        const ctx = parentWin.SillyTavern?.getContext?.() || parentWin;
        const eventSource = ctx.eventSource;
        const event_types = ctx.event_types || parentWin.event_types;

        if (eventSource && event_types) {
            isHooked = true;
            // Ghi log khi bắt đầu tạo AI response
            const genEvt = event_types.GENERATION_STARTED || event_types.CHAT_COMPLETION_PROMPT_READY;
            if (genEvt) {
                eventSource.on(genEvt, () => {
                    if (settings.enabled && settings.promptText.trim()) {
                        addLog(`🚀 AI đang tạo phản hồi! SillyTavern đã tự động chèn prompt [${PROMPT_KEY}] vào luồng.`, 'success');
                    }
                });
            }
        } else {
            setTimeout(setupEventListeners, 2000);
        }
    }

    setupEventListeners();
    // Khởi tạo đồng bộ ngay khi load script
    setTimeout(updateSillyTavernExtensionPrompt, 500);

    // Đăng ký App vào hệ sinh thái
    parentWin.PhoneSystem.registerApp({
        id: APP_ID,
        name: 'Trạm Bơm Prompt',
        icon: '💉',
        color: 'linear-gradient(135deg, #f43f5e 0%, #8b5cf6 100%)',
        order: 3
    });

    let activeContainer = null;
    function updateLogUI() {
        if (!activeContainer) return;
        const logBox = activeContainer.querySelector('#pb-log-box');
        if (!logBox) return;
        if (settings.logs.length === 0) {
            logBox.innerHTML = `<div style="color: #64748b; text-align: center; padding: 20px 0; font-size: 0.85em;">Chưa có hoạt động bơm prompt nào.</div>`;
            return;
        }
        logBox.innerHTML = settings.logs.map(item => {
            let color = '#38bdf8';
            if (item.type === 'success') color = '#4ade80';
            if (item.type === 'error' || item.type === 'warn') color = '#fb7185';
            return `
                <div style="padding: 8px 10px; margin-bottom: 6px; background: rgba(0,0,0,0.3); border-left: 3px solid ${color}; border-radius: 6px; font-size: 0.82em; line-height: 1.4;">
                    <div style="display: flex; justify-content: space-between; color: #64748b; font-size: 0.9em; margin-bottom: 2px;">
                        <span>${item.time}</span>
                        <span style="color: ${color}; font-weight: 600; text-transform: uppercase;">${item.type}</span>
                    </div>
                    <div style="color: #e2e8f0; word-break: break-word;">${item.msg}</div>
                </div>
            `;
        }).join('');
    }

    // Đăng ký Giao diện App (Renderer)
    parentWin.PhoneSystem.registerRenderer(APP_ID, function(container) {
        activeContainer = container;
        container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display: flex; flex-direction: column; height: 100%; width: 100%; background: #0f172a; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; position: absolute; top: 0; left: 0; z-index: 10; overflow: hidden;';

        // Header
        const header = document.createElement('div');
        header.style.cssText = 'height: 54px; width: 100%; background: #1e293b; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0; box-sizing: border-box;';
        header.innerHTML = `
            <div id="pb-back-btn" style="color: #38bdf8; font-size: 15px; cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 4px;">‹ Trang chủ</div>
            <div style="font-size: 16px; font-weight: 700; color: #f8fafc; display: flex; align-items: center; gap: 6px;">💉 Trạm Bơm Prompt</div>
            <div style="width: 60px; text-align: right;">
                <span id="pb-status-badge" style="padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; background: ${settings.enabled ? 'rgba(74, 222, 128, 0.2)' : 'rgba(244, 63, 94, 0.2)'}; color: ${settings.enabled ? '#4ade80' : '#fb7185'};">${settings.enabled ? 'ON' : 'OFF'}</span>
            </div>
        `;
        wrapper.appendChild(header);

        header.querySelector('#pb-back-btn').onclick = () => parentWin.PhoneSystem.goHome();

        // Content
        const content = document.createElement('div');
        content.style.cssText = 'flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 14px; box-sizing: border-box;';

        // 1. Control Card
        const controlCard = document.createElement('div');
        controlCard.style.cssText = 'background: #1e293b; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 12px;';
        controlCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 600; font-size: 0.95em;">Bơm Prompt Chuản ST API</div>
                    <div style="font-size: 0.78em; color: #94a3b8;">Đồng bộ vào hệ thống extension_prompts</div>
                </div>
                <label style="position: relative; display: inline-block; width: 44px; height: 24px; cursor: pointer;">
                    <input type="checkbox" id="pb-enable-toggle" ${settings.enabled ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                    <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${settings.enabled ? '#38bdf8' : '#475569'}; border-radius: 24px; transition: .3s; display: flex; align-items: center; padding: 2px; box-sizing: border-box;">
                        <span style="width: 20px; height: 20px; background-color: white; border-radius: 50%; transition: .3s; transform: translateX(${settings.enabled ? '20px' : '0'});"></span>
                    </span>
                </label>
            </div>

            <div style="height: 1px; background: rgba(255,255,255,0.06);"></div>

            <div style="display: flex; flex-direction: column; gap: 10px;">
                <div>
                    <div style="font-size: 0.8em; color: #94a3b8; margin-bottom: 4px; font-weight: 600;">VỊ TRÍ BƠM (POSITION TYPE):</div>
                    <select id="pb-target-select" style="width: 100%; padding: 8px 10px; background: #0f172a; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #f8fafc; font-size: 0.85em; outline: none; cursor: pointer;">
                        <option value="in_prompt" ${settings.target === 'in_prompt' ? 'selected' : ''}>🛡️ In Prompt (Đầu hồ sơ / System area)</option>
                        <option value="in_chat" ${settings.target === 'in_chat' ? 'selected' : ''}>🎯 In Chat (Trong lịch sử chat theo Depth)</option>
                        <option value="after_prompt" ${settings.target === 'after_prompt' ? 'selected' : ''}>📌 After Prompt (Cuối cùng toàn bộ prompt)</option>
                    </select>
                </div>

                <div style="display: flex; gap: 10px;">
                    <div style="flex: 1;">
                        <div style="font-size: 0.8em; color: #94a3b8; margin-bottom: 4px; font-weight: 600;">VAI TRÒ (ROLE):</div>
                        <select id="pb-role-select" style="width: 100%; padding: 8px 10px; background: #0f172a; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #f8fafc; font-size: 0.85em; outline: none; cursor: pointer;">
                            <option value="system" ${settings.role === 'system' ? 'selected' : ''}>🤖 System</option>
                            <option value="user" ${settings.role === 'user' ? 'selected' : ''}>👤 User</option>
                            <option value="assistant" ${settings.role === 'assistant' ? 'selected' : ''}>💬 Assistant</option>
                        </select>
                    </div>

                    <div id="pb-depth-container" style="flex: 1; display: ${settings.target === 'in_chat' ? 'block' : 'none'};">
                        <div style="font-size: 0.8em; color: #94a3b8; margin-bottom: 4px; font-weight: 600;">ĐỘ SÂU (DEPTH):</div>
                        <input type="number" id="pb-depth-input" value="${settings.depth}" min="0" max="100" style="width: 100%; padding: 7px 10px; background: #0f172a; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #f8fafc; font-size: 0.85em; outline: none; box-sizing: border-box;" title="0 = Ngay trước tin nhắn cuối">
                    </div>
                </div>
            </div>
        `;
        content.appendChild(controlCard);

        // 2. Prompt Editor Card
        const editorCard = document.createElement('div');
        editorCard.style.cssText = 'background: #1e293b; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px;';
        editorCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-weight: 600; font-size: 0.9em;">NỘI DUNG CHỈ LỆNH BƠM (PROMPT):</div>
                <span id="pb-save-hint" style="font-size: 0.75em; color: #4ade80; opacity: 0; transition: opacity 0.3s;">Đã đồng bộ!</span>
            </div>
            <textarea id="pb-prompt-input" rows="4" placeholder="Nhập chỉ lệnh hoặc kịch bản muốn bơm vào luồng AI..." style="width: 100%; padding: 10px; background: #0f172a; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #f8fafc; font-size: 0.85em; resize: vertical; outline: none; box-sizing: border-box; line-height: 1.4;">${settings.promptText}</textarea>
            
            <div style="font-size: 0.78em; color: #94a3b8; font-weight: 600;">PRESETS MẪU NHANH:</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                <button class="pb-preset-btn" data-text="Hãy trả lời bằng thái độ ngoài lạnh trong nóng (tsundere), đỏ mặt và hơi gắt gỏng nhưng vẫn quan tâm." style="padding: 5px 10px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 6px; color: #38bdf8; font-size: 0.78em; cursor: pointer; transition: all 0.2s;">🔮 Tsundere</button>
                <button class="pb-preset-btn" data-text="Miêu tả chi tiết các động tác chiến đấu kịch tính, tiếng va chạm vũ khí, nhịp thở và sự căng thẳng tuyệt đối." style="padding: 5px 10px; background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.3); border-radius: 6px; color: #fb7185; font-size: 0.78em; cursor: pointer; transition: all 0.2s;">⚔️ Chiến đấu</button>
                <button class="pb-preset-btn" data-text="Bối cảnh trời đang mưa to ngoài cửa sổ. Thêm chi tiết tiếng mưa rơi, không khí lạnh lẽo và cảm xúc trầm lắng." style="padding: 5px 10px; background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 6px; color: #c084fc; font-size: 0.78em; cursor: pointer; transition: all 0.2s;">🌧️ Mưa buồn</button>
                <button class="pb-preset-btn" data-text="Chỉ trả lời ngắn gọn, súc tích trong tối đa 2 câu. Đi thẳng vào vấn đề không dài dòng." style="padding: 5px 10px; background: rgba(234, 179, 8, 0.15); border: 1px solid rgba(234, 179, 8, 0.3); border-radius: 6px; color: #facc15; font-size: 0.78em; cursor: pointer; transition: all 0.2s;">⚡ Ngắn gọn</button>
            </div>

            <div style="display: flex; gap: 8px; margin-top: 6px;">
                <button id="pb-test-inject-btn" style="flex: 1; padding: 10px; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); border: none; border-radius: 8px; color: white; font-weight: 600; font-size: 0.85em; cursor: pointer; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3); transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <span>🧪 Bơm Thử Vào Khung Chat</span>
                </button>
            </div>
        `;
        content.appendChild(editorCard);

        // 3. Monitor Card
        const monitorCard = document.createElement('div');
        monitorCard.style.cssText = 'background: #1e293b; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px; flex: 1; min-height: 180px;';
        monitorCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-weight: 600; font-size: 0.9em; display: flex; align-items: center; gap: 6px;">
                    <span style="display: inline-block; width: 8px; height: 8px; background: #4ade80; border-radius: 50%; box-shadow: 0 0 8px #4ade80;"></span>
                    <span>LỊCH SỬ ĐỒNG BỘ (LIVE MONITOR):</span>
                </div>
                <button id="pb-clear-log-btn" style="background: none; border: none; color: #64748b; font-size: 0.78em; cursor: pointer;">Xóa Log</button>
            </div>
            <div id="pb-log-box" style="flex: 1; overflow-y: auto; background: #0f172a; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 8px; max-height: 220px;"></div>
        `;
        content.appendChild(monitorCard);
        wrapper.appendChild(content);
        container.appendChild(wrapper);

        // --- Event Listeners ---
        const toggleBtn = wrapper.querySelector('#pb-enable-toggle');
        const badge = wrapper.querySelector('#pb-status-badge');
        toggleBtn.onchange = (e) => {
            settings.enabled = e.target.checked;
            badge.innerText = settings.enabled ? 'ON' : 'OFF';
            badge.style.background = settings.enabled ? 'rgba(74, 222, 128, 0.2)' : 'rgba(244, 63, 94, 0.2)';
            badge.style.color = settings.enabled ? '#4ade80' : '#fb7185';
            saveSettings();
            updateSillyTavernExtensionPrompt();
            addLog(`Đã ${settings.enabled ? 'BẬT' : 'TẮT'} chế độ Bơm Prompt.`, settings.enabled ? 'success' : 'warn');
        };

        const targetSelect = wrapper.querySelector('#pb-target-select');
        const depthContainer = wrapper.querySelector('#pb-depth-container');
        targetSelect.onchange = (e) => {
            settings.target = e.target.value;
            depthContainer.style.display = settings.target === 'in_chat' ? 'block' : 'none';
            saveSettings();
            updateSillyTavernExtensionPrompt();
        };

        wrapper.querySelector('#pb-role-select').onchange = (e) => {
            settings.role = e.target.value;
            saveSettings();
            updateSillyTavernExtensionPrompt();
        };

        wrapper.querySelector('#pb-depth-input').oninput = (e) => {
            settings.depth = parseInt(e.target.value, 10) || 0;
            saveSettings();
            updateSillyTavernExtensionPrompt();
        };

        const promptInput = wrapper.querySelector('#pb-prompt-input');
        const saveHint = wrapper.querySelector('#pb-save-hint');
        let saveTimeout;
        promptInput.oninput = () => {
            settings.promptText = promptInput.value;
            saveSettings();
            updateSillyTavernExtensionPrompt();
            clearTimeout(saveTimeout);
            saveHint.style.opacity = '1';
            saveTimeout = setTimeout(() => { saveHint.style.opacity = '0'; }, 1500);
        };

        wrapper.querySelectorAll('.pb-preset-btn').forEach(btn => {
            btn.onclick = () => {
                const text = btn.getAttribute('data-text');
                promptInput.value = text;
                settings.promptText = text;
                saveSettings();
                updateSillyTavernExtensionPrompt();
                addLog('Đã chọn Preset mẫu: ' + btn.innerText, 'info');
                saveHint.style.opacity = '1';
                setTimeout(() => { saveHint.style.opacity = '0'; }, 1500);
            };
        });

        wrapper.querySelector('#pb-test-inject-btn').onclick = () => {
            const sendTextarea = parentWin.document.getElementById('send_textarea');
            if (sendTextarea) {
                const injectNote = `[System note: ${settings.promptText.trim()}] `;
                sendTextarea.value = injectNote + sendTextarea.value;
                sendTextarea.focus();
                sendTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                addLog('💥 Đã bơm trực tiếp chỉ lệnh vào ô nhập tin nhắn SillyTavern!', 'success');
                if (parentWin.toastr) parentWin.toastr.success('Đã bơm chỉ lệnh vào ô nhập tin nhắn!');
            } else {
                addLog('❌ Không tìm thấy ô nhập tin nhắn SillyTavern (#send_textarea).', 'error');
            }
        };

        wrapper.querySelector('#pb-clear-log-btn').onclick = () => {
            settings.logs = [];
            saveSettings();
            updateLogUI();
        };

        updateLogUI();
    });

    console.log('[App Prompt Booster] Đã khởi tạo Trạm Bơm Prompt thành công theo chuẩn SillyTavern API.');
})();
