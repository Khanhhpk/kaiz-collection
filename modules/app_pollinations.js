/**
 * Module: App AI Image Generator Super (Bản Siêu cấp - VÁ LỖI KHO ẢNH)
 * Phụ thuộc: Lõi Điện thoại (Phone Core)
 */

(function initAIImageAppSuper() {
    if (!window.parent.PhoneSystem) {
        setTimeout(initAIImageAppSuper, 1000);
        return;
    }

    const APP_ID = 'pollinations-ai-app';
    const STORAGE_KEY = 'tavernPhoneApp_AIArt_Gallery';

    var currentGeneratedImageData = null;

    window.parent.PhoneSystem.registerApp({
        id: APP_ID,
        name: 'AI Art Studio',
        icon: '🎨', 
        color: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)', 
        order: 15 
    });

    // --- HÀM TIỆN ÍCH CHO KHO ẢNH (Dùng window.parent.localStorage để bảo toàn dữ liệu) ---
    function getGallery() {
        try {
            var stored = window.parent.localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) { return []; }
    }

    function saveToGallery(imageData) {
        var gallery = getGallery();
        if (gallery.some(function(img){ return img.url === imageData.url })) {
            if(window.parent.toastr) window.parent.toastr.info("Ảnh này đã có trong Kho ảnh");
            return false;
        }
        gallery.unshift(imageData); 
        try {
            window.parent.localStorage.setItem(STORAGE_KEY, JSON.stringify(gallery));
            if(window.parent.toastr) window.parent.toastr.success("Đã lưu vào Kho ảnh (" + gallery.length + ")");
            return true;
        } catch (e) {
            if(window.parent.toastr) window.parent.toastr.error("Không thể lưu ảnh (Bộ nhớ đầy?)");
            return false;
        }
    }

    function deleteFromGallery(index) {
        var gallery = getGallery();
        gallery.splice(index, 1);
        try {
            window.parent.localStorage.setItem(STORAGE_KEY, JSON.stringify(gallery));
            return true;
        } catch (e) { return false; }
    }

    window.parent.PhoneSystem.registerRenderer(APP_ID, function(container) {
        container.innerHTML = '';
        
        var appWrapper = document.createElement('div');
        appWrapper.style.cssText = 'display:flex; flex-direction:column; height:100%; width:100%; background:#f1f3f5; color:#333; font-family:-apple-system, sans-serif; position:absolute; top:0; left:0; z-index:10; overflow:hidden;';

        // --- 1. HEADER ---
        var header = document.createElement('div');
        header.style.cssText = 'height: clamp(40px, 7vh, 50px); width: 100%; background: #ffffff; display: flex; align-items: center; justify-content: space-between; padding: 20px 16px 0; border-bottom: 1px solid #e0e0e0; z-index: 10; box-sizing: border-box; flex-shrink: 0;';

        var backBtn = document.createElement('div');
        backBtn.innerHTML = '‹ Trang chủ';
        backBtn.style.cssText = 'color: #007AFF; font-size: 16px; font-weight: 500; cursor: pointer; user-select: none;';
        backBtn.onclick = function() { window.parent.PhoneSystem.goHome(); };

        var title = document.createElement('div');
        title.innerHTML = 'AI Art Studio';
        title.style.cssText = 'font-size: 17px; font-weight: 600; color: #000; position: absolute; left: 50%; transform: translateX(-50%);';

        var placeholder = document.createElement('div');
        placeholder.style.width = '70px'; 

        header.appendChild(backBtn);
        header.appendChild(title);
        header.appendChild(placeholder);
        appWrapper.appendChild(header);

        // --- 2. TAB BAR ---
        var tabBar = document.createElement('div');
        tabBar.style.cssText = 'display:flex; width:100%; height:40px; background:#fff; border-bottom:1px solid #e0e0e0; flex-shrink:0;';

        var tabCreate = document.createElement('div');
        tabCreate.innerHTML = '✨ Tạo ảnh';
        tabCreate.style.cssText = 'flex:1; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:600; color:#007AFF; border-bottom:2px solid #007AFF; cursor:pointer;';

        var tabGallery = document.createElement('div');
        tabGallery.innerHTML = '🖼️ Kho Ảnh';
        tabGallery.style.cssText = 'flex:1; display:flex; align-items:center; justify-content:center; font-size:14px; color:#555; border-bottom:2px solid transparent; cursor:pointer;';

        tabBar.appendChild(tabCreate);
        tabBar.appendChild(tabGallery);
        appWrapper.appendChild(tabBar);

        // --- 3. CONTAINER CHỨA NỘI DUNG ---
        var contentContainer = document.createElement('div');
        contentContainer.style.cssText = 'flex: 1; width: 100%; position: relative; overflow: hidden;';
        appWrapper.appendChild(contentContainer);

        // ========================================
        // [VIEW 1] GIAO DIỆN TẠO ẢNH (Bắt đầu ở x=0)
        // ========================================
        var viewCreate = document.createElement('div');
        viewCreate.style.cssText = 'display: flex; flex-direction: column; padding: 16px; overflow-y: auto; box-sizing: border-box; gap: 10px; height:100%; width:100%; position:absolute; top:0; left:0; transform: translateX(0); transition: transform 0.3s; background:#f1f3f5;';

        var promptInput = document.createElement('textarea');
        promptInput.placeholder = 'Miêu tả ảnh bạn muốn (Tiếng Anh)... Ví dụ: anime girl smiling...';
        promptInput.style.cssText = 'width: 100%; height: 60px; padding: 10px; border: 1px solid #ccc; border-radius: 8px; font-size: 13px; box-sizing: border-box; resize: none; outline: none; font-family: inherit; background:#fff;';

        var negPromptInput = document.createElement('textarea');
        negPromptInput.placeholder = 'Negative Prompt (ugly, bad anatomy, blur...)';
        negPromptInput.style.cssText = 'width: 100%; height: 40px; padding: 8px; border: 1px solid #ccc; border-radius: 8px; font-size: 13px; box-sizing: border-box; resize: none; outline: none; font-family: inherit; background:#fff;';

        var advOptions = document.createElement('div');
        advOptions.style.cssText = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; background:#e9ecef; padding: 10px; border-radius: 8px;';

        var modelCol = document.createElement('div');
        modelCol.innerHTML = '<div style="font-size:11px; font-weight:600; color:#555;">Model:</div>';
        var modelSelect = document.createElement('select');
        modelSelect.style.cssText = 'width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 6px; font-size: 12px; background: #fff;';
        modelSelect.innerHTML = `
            <option value="flux">Flux (Mặc định)</option>
            <option value="flux-realism">Tả Thực</option>
            <option value="flux-anime">Anime</option>
            <option value="any-dark">Any Dark</option>
            <option value="turbo">Turbo (Nhanh)</option>
        `;
        modelCol.appendChild(modelSelect);

        var sizeCol = document.createElement('div');
        sizeCol.innerHTML = '<div style="font-size:11px; font-weight:600; color:#555;">Kích thước:</div>';
        var sizeSelect = document.createElement('select');
        sizeSelect.style.cssText = 'width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 6px; font-size: 12px; background: #fff;';
        sizeSelect.innerHTML = `
            <option value="512x768">Dọc (512x768)</option>
            <option value="1024x1024">Vuông (1:1)</option>
            <option value="768x512">Ngang (768x512)</option>
        `;
        sizeCol.appendChild(sizeSelect);

        var seedCol = document.createElement('div');
        seedCol.style.cssText = 'grid-column: span 2;';
        seedCol.innerHTML = '<div style="font-size:11px; font-weight:600; color:#555;">Seed (Để trống để ngẫu nhiên):</div>';
        var seedInput = document.createElement('input');
        seedInput.type = 'text'; 
        seedInput.placeholder = 'Ngẫu nhiên';
        seedInput.style.cssText = 'width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 6px; font-size: 12px; background: #fff; box-sizing: border-box;';

        advOptions.appendChild(modelCol);
        advOptions.appendChild(sizeCol);
        advOptions.appendChild(seedCol);

        var actionRow = document.createElement('div');
        actionRow.style.cssText = 'display:flex; gap:10px; flex-shrink:0;';

        var generateBtn = document.createElement('button');
        generateBtn.innerHTML = 'Tạo Ảnh Ngay 🚀';
        generateBtn.style.cssText = 'flex:2; background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: #fff; border: none; padding: 12px; border-radius: 12px; font-size: 15px; font-weight:bold; cursor:pointer;';

        var saveBtn = document.createElement('button');
        saveBtn.innerHTML = '💾 Lưu Kho';
        saveBtn.style.cssText = 'flex:1; background:#e0e0e0; color:#333; border: none; padding: 12px; border-radius: 12px; font-size: 14px; cursor:default; opacity:0.5;';
        saveBtn.disabled = true; 

        actionRow.appendChild(generateBtn);
        actionRow.appendChild(saveBtn);

        var resultContainer = document.createElement('div');
        resultContainer.style.cssText = 'display:flex; align-items:center; justify-content:center; background:#fff; border-radius:12px; min-height:220px; border:1px dashed #bbb; overflow:hidden;';

        var resultImg = document.createElement('img');
        resultImg.style.cssText = 'max-width:100%; max-height:100%; display:none; object-fit:contain;';
        
        var loadingText = document.createElement('div');
        loadingText.innerHTML = 'Ảnh vẽ xong sẽ hiện ở đây...';
        loadingText.style.cssText = 'color:#888; font-size:13px; padding:20px; text-align:center;';

        resultContainer.appendChild(loadingText);
        resultContainer.appendChild(resultImg);

        viewCreate.appendChild(promptInput);
        viewCreate.appendChild(negPromptInput);
        viewCreate.appendChild(advOptions);
        viewCreate.appendChild(actionRow);
        viewCreate.appendChild(resultContainer);
        contentContainer.appendChild(viewCreate);

        // ========================================
        // [VIEW 2] KHO ẢNH (Bắt đầu ở x=100%, bị đẩy ra phải)
        // ========================================
        var viewGallery = document.createElement('div');
        viewGallery.style.cssText = 'display:flex; flex-direction:column; padding:16px; overflow-y:auto; box-sizing:border-box; height:100%; width:100%; position:absolute; top:0; left:0; transform: translateX(100%); transition:transform 0.3s; background:#f1f3f5;';
        contentContainer.appendChild(viewGallery);

        var galleryGrid = document.createElement('div');
        galleryGrid.style.cssText = 'display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px;';
        viewGallery.appendChild(galleryGrid);

        function renderGalleryGrid() {
            galleryGrid.innerHTML = '';
            var images = getGallery();
            
            if (images.length === 0) {
                galleryGrid.innerHTML = '<div style="grid-column: span 3; text-align:center; padding: 50px 0; color:#888; font-size:14px;">Kho ảnh đang trống...<br><br>Vẽ ảnh và bấm "Lưu Kho" để tích trữ tại đây</div>';
                return;
            }

            images.forEach(function(imgData, index) {
                var item = document.createElement('div');
                item.style.cssText = 'aspect-ratio:1; background:#fff; border-radius:8px; overflow:hidden; position:relative; cursor:pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.1);';
                
                var img = document.createElement('img');
                img.src = imgData.url;
                img.style.cssText = 'width:100%; height:100%; object-fit:cover;';
                
                var delBtn = document.createElement('div');
                delBtn.innerHTML = '🗑️';
                delBtn.style.cssText = 'position:absolute; top:2px; right:2px; width:22px; height:22px; background:rgba(255,255,255,0.7); display:flex; align-items:center; justify-content:center; border-radius:5px; font-size:12px; z-index:5;';
                
                delBtn.onclick = function(e) {
                    e.stopPropagation();
                    if(confirm("Xóa ảnh này khỏi Kho ảnh?")) {
                        if(deleteFromGallery(index)) { renderGalleryGrid(); }
                    }
                };

                item.onclick = function() { showFullScreen(imgData); };
                item.appendChild(img);
                item.appendChild(delBtn);
                galleryGrid.appendChild(item);
            });
        }

        // --- GIAO DIỆN XEM ẢNH TOÀN MÀN HÌNH ---
        var fsOverlay = document.createElement('div');
        fsOverlay.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:9999; display:none; flex-direction:column; align-items:center; justify-content:center; color:#fff; font-family:-apple-system, sans-serif; opacity:0; transition: opacity 0.3s;';
        
        var fsClose = document.createElement('div');
        fsClose.innerHTML = '✕';
        fsClose.style.cssText = 'position:absolute; top:30px; right:20px; font-size:28px; cursor:pointer; color:#fff; z-index:10; font-weight:bold;';
        
        var fsImg = document.createElement('img');
        fsImg.style.cssText = 'max-width:95%; max-height:80%; object-fit:contain; border-radius:10px; border: 2px solid #333;';
        
        var fsPrompt = document.createElement('div');
        fsPrompt.style.cssText = 'width:90%; padding:15px; background:rgba(255,255,255,0.1); border-radius:10px; margin-top:20px; font-size:13px; line-height:1.4; max-height:15vh; overflow-y:auto; color:#ccc; text-align:left;';
        
        fsOverlay.appendChild(fsClose);
        fsOverlay.appendChild(fsImg);
        fsOverlay.appendChild(fsPrompt);
        appWrapper.appendChild(fsOverlay); // Đính hẳn vào App để không dính lỗi ra ngoài

        function showFullScreen(imgData) {
            fsImg.src = imgData.url;
            fsPrompt.innerHTML = '<div style="color:#fff; font-weight:600; margin-bottom:5px;">Prompt & Seed:</div>' + imgData.prompt + '<div style="color:#888; font-size:11px; margin-top:5px;">Seed: '+imgData.seed+' | Model: '+imgData.model+'</div>';
            fsOverlay.style.display = 'flex';
            setTimeout(function(){ fsOverlay.style.opacity = '1'; }, 10);
        }

        fsClose.onclick = function() {
            fsOverlay.style.opacity = '0';
            setTimeout(function(){ fsOverlay.style.display = 'none'; }, 300);
        };

        // ========================================
        // LOGIC CHUYỂN TAB VÁ LỖI TẠI ĐÂY
        // ========================================
        tabCreate.onclick = function() {
            tabCreate.style.color = '#007AFF'; tabCreate.style.borderBottomColor = '#007AFF';
            tabGallery.style.color = '#555'; tabGallery.style.borderBottomColor = 'transparent';
            viewCreate.style.transform = 'translateX(0)';      // Đưa View Tạo ảnh vào giữa
            viewGallery.style.transform = 'translateX(100%)';  // Đẩy Gallery ra lề phải
        };

        tabGallery.onclick = function() {
            tabGallery.style.color = '#007AFF'; tabGallery.style.borderBottomColor = '#007AFF';
            tabCreate.style.color = '#555'; tabCreate.style.borderBottomColor = 'transparent';
            viewCreate.style.transform = 'translateX(-100%)'; // Đẩy View Tạo ảnh ra lề trái
            viewGallery.style.transform = 'translateX(0)';    // Kéo Gallery vào giữa
            renderGalleryGrid(); 
        };

        // ========================================
        // LOGIC XỬ LÝ TẠO ẢNH
        // ========================================
        generateBtn.onclick = function() {
            var prompt = promptInput.value.trim();
            if (!prompt) {
                if(window.parent.toastr) window.parent.toastr.warning('Vui lòng nhập miêu tả ảnh!');
                return;
            }

            generateBtn.innerHTML = 'AI đang vẽ...';
            generateBtn.disabled = true; generateBtn.style.opacity = '0.7';
            saveBtn.disabled = true; saveBtn.style.opacity = '0.5'; saveBtn.style.background = '#e0e0e0'; saveBtn.style.color = '#333'; saveBtn.style.cursor = 'default';
            loadingText.style.display = 'block'; loadingText.innerHTML = 'Đang sinh ảnh, vui lòng đợi vài giây...';
            resultImg.style.display = 'none';

            var negPrompt = negPromptInput.value.trim();
            var selectedModel = modelSelect.value;
            var sizeVals = sizeSelect.value.split('x');
            var width = sizeVals[0]; var height = sizeVals[1];

            var finalSeed = Math.floor(Math.random() * 9999999999);
            var userSeed = seedInput.value.trim();
            if (userSeed) {
                var parsed = parseInt(userSeed);
                if (!isNaN(parsed)) finalSeed = parsed;
            }
            seedInput.value = finalSeed;

            var imageUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt) + 
                           '?seed=' + finalSeed + '&width=' + width + '&height=' + height + 
                           '&model=' + selectedModel + '&nologo=true';
            
            if (negPrompt) { imageUrl += '&negative_prompt=' + encodeURIComponent(negPrompt); }

            currentGeneratedImageData = {
                url: imageUrl,
                prompt: prompt,
                negative: negPrompt,
                seed: finalSeed,
                model: selectedModel,
                size: sizeSelect.value
            };

            var tempImg = new Image();
            tempImg.onload = function() {
                resultImg.src = imageUrl;
                resultImg.style.display = 'block';
                loadingText.style.display = 'none';
                
                generateBtn.innerHTML = 'Vẽ Ảnh Khác 🚀';
                generateBtn.disabled = false; generateBtn.style.opacity = '1';

                saveBtn.disabled = false;
                saveBtn.style.opacity = '1';
                saveBtn.style.background = 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)';
                saveBtn.style.color = '#000';
                saveBtn.style.cursor = 'pointer';
                saveBtn.style.fontWeight = '600';
            };
            tempImg.onerror = function() {
                loadingText.innerHTML = '❌ Lỗi tải ảnh. Máy chủ quá tải hoặc Prompt vi phạm.';
                generateBtn.innerHTML = 'Thử Lại 🚀';
                generateBtn.disabled = false; generateBtn.style.opacity = '1';
                currentGeneratedImageData = null;
            };
            tempImg.src = imageUrl;
        };

        saveBtn.onclick = function() {
            if (!currentGeneratedImageData || saveBtn.disabled) return;
            if (saveToGallery(currentGeneratedImageData)) {
                saveBtn.innerHTML = '✅ Đã lưu';
                saveBtn.disabled = true;
                saveBtn.style.opacity = '0.5';
                saveBtn.style.background = '#e0e0e0';
                saveBtn.style.color = '#333';
                saveBtn.style.cursor = 'default';
                saveBtn.style.fontWeight = 'normal';
            }
        };

        container.appendChild(appWrapper);
    });

    console.log('[App AI Art Super] Đã cài đặt Bản Vá Lỗi Kho Ảnh');
})();