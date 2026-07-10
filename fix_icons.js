const fs = require('fs');
let html = fs.readFileSync('modules/st_multitool/panel.html', 'utf8');

// Replace settings icon
html = html.replace(/<i data-lucide="circle"><\/i> Cài đặt tiện ích/g, '<i data-lucide="settings"></i> Cài đặt tiện ích');

// Replace card headers icons
html = html.replace(/<i data-lucide="circle"><\/i> Danh sách Sổ thế giới/g, '<i data-lucide="book"></i> Danh sách Sổ thế giới');
html = html.replace(/<i data-lucide="circle"><\/i> Danh sách mục/g, '<i data-lucide="list"></i> Danh sách mục');
html = html.replace(/<i data-lucide="circle"><\/i> Script preset/g, '<i data-lucide="bookmark"></i> Script preset');
html = html.replace(/<i data-lucide="circle"><\/i> Script nhân vật/g, '<i data-lucide="user"></i> Script nhân vật');
html = html.replace(/<i data-lucide="circle"><\/i> Regex preset/g, '<i data-lucide="bookmark"></i> Regex preset');
html = html.replace(/<i data-lucide="circle"><\/i> Regex cục bộ/g, '<i data-lucide="user"></i> Regex cục bộ');

// Replace empty circle collapse icon for cards
html = html.replace(/<div class="st-multitool-card-header-actions">\s*(.*)<i data-lucide="circle"><\/i>\s*<\/div>/g, '<div class="st-multitool-card-header-actions">\n$1<i data-lucide="chevron-down" class="st-multitool-manage-script-collapse-icon"></i>\n                </div>');

// Replace the fallback circle with proper fa-chevron-up for main headers
html = html.replace(/<i data-lucide="circle" style="margin-left: 8px; font-size: 0.8em; color: var\(--st-multitool-text-muted\)"><\/i>/g, '<i class="fa-solid fa-chevron-up st-multitool-collapse-icon" style="margin-left: 8px; font-size: 0.8em; color: var(--st-multitool-text-muted)"></i>');

fs.writeFileSync('modules/st_multitool/panel.html', html);
console.log('Icons fixed!');
