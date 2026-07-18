/**
 * Module: App FreeGen AI
 * Phụ thuộc: Lõi Điện thoại (Phone Core)
 */

(function initFreeGenApp() {
    if (!window.parent.PhoneSystem) {
        setTimeout(initFreeGenApp, 1000);
        return;
    }

    const APP_ID = 'freegen-ai-app';

    // Đăng ký thông tin App
    window.parent.PhoneSystem.registerApp({
        id: APP_ID,
        name: 'FreeGen',
        icon: '⚡', 
        color: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', // Nền gradient xanh lá
        order: 16 
    });

    // Đăng ký Giao diện App
    window.parent.PhoneSystem.registerRenderer(APP_ID, function(container) {
        container.innerHTML = '';
        
        // --- TẠO WRAPPER CỦA APP ---
        var appWrapper = document.createElement('div');
        appWrapper.style.cssText = 'display:flex; flex-direction:column; height:100%; width:100%; background:#fff; position:absolute; top:0; left:0; z-index:10;';

        // --- THANH ĐIỀU HƯỚNG HEADER ---
        var header = document.createElement('div');
        header.style.cssText = 'height: clamp(40px, 7vh, 50px); width: 100%; background: #F2F2F7; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; border-bottom: 0.5px solid #C7C7CC; z-index: 10; padding-top: 20px; box-sizing: border-box;';

        var backBtn = document.createElement('div');
        backBtn.innerHTML = '‹ Trang chủ';
        backBtn.style.cssText = 'color: #007AFF; font-size: 16px; font-family: -apple-system, sans-serif; cursor: pointer; user-select: none; font-weight: 500;';
        backBtn.onclick = function() {
            window.parent.PhoneSystem.goHome();
        };

        var title = document.createElement('div');
        title.innerHTML = 'FreeGen AI';
        title.style.cssText = 'font-size: 17px; font-weight: 600; font-family: -apple-system, sans-serif; color: #000; position: absolute; left: 50%; transform: translateX(-50%);';

        // Nút mở Tab ngoài phòng trường hợp Iframe bị chặn
        var openNewTab = document.createElement('div');
        openNewTab.innerHTML = 'Mở ↗';
        openNewTab.style.cssText = 'color: #007AFF; font-size: 14px; cursor: pointer; font-family: -apple-system, sans-serif;';
        openNewTab.onclick = function() {
            window.open('https://freegen.app/', '_blank');
        };

        header.appendChild(backBtn);
        header.appendChild(title);
        header.appendChild(openNewTab);
        appWrapper.appendChild(header);

        // --- KHUNG IFRAME NHÚNG TRANG WEB ---
        var contentWrapper = document.createElement('div');
        contentWrapper.style.cssText = 'flex: 1; width: 100%; position: relative;';
        appWrapper.appendChild(contentWrapper);

        var url = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://freegen.app/');

        // Gọi Sandbox an toàn để tránh kẹt màn hình
        if (window.parent.PhoneSystem.utils && window.parent.PhoneSystem.utils.createAppSandbox) {
            window.parent.PhoneSystem.utils.createAppSandbox(contentWrapper, url, true);
        } else {
            var iframe = document.createElement('iframe');
            iframe.src = url;
            iframe.style.cssText = 'width: 100%; height: 100%; border: none; background: #fff;';
            contentWrapper.appendChild(iframe);
        }

        container.appendChild(appWrapper);
    });

    console.log('[App FreeGen] Đã cài đặt thành công');
})();