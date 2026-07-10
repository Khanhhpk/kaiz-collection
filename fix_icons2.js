const fs = require('fs');
let html = fs.readFileSync('modules/st_multitool/panel.html', 'utf8');

// 1. Replace remaining <i data-lucide="circle"></i> collapse icons for Script/Regex/WB cards
// Since they are right before </div> in card-header-actions
html = html.replace(/<i data-lucide="circle"><\/i>\s*<\/div>/g, '<i data-lucide="chevron-down" class="st-multitool-manage-script-collapse-icon"></i>\n                </div>');

// 2. Replace emojis with Lucide icons
html = html.replace(/⚡ Đồng bộ Sổ thế giới/g, '<i data-lucide="zap"></i> Đồng bộ Sổ thế giới');
html = html.replace(/⚙️ Cài đặt tiện ích/g, '<i data-lucide="settings"></i> Cài đặt tiện ích');
html = html.replace(/⬇️ Tải xuống thành script regex/g, '<i data-lucide="download"></i> Tải xuống thành script regex');
html = html.replace(/⬇️ Tải script/g, '<i data-lucide="download"></i> Tải script');

// The ➕ icon in "Đồng bộ sổ thế giới" section
html = html.replace(/title="Tạo Sổ thế giới">\s*➕\s*<\/button>/g, 'title="Tạo Sổ thế giới">\n                  <i data-lucide="plus"></i>\n                </button>');

// 3. Remove "Hiển thị nút nổi" checkbox
const floatingBtnBlock = `<div class="st-multitool-row">
                <label class="st-multitool-checkbox-label">
                    <input type="checkbox" id="st-multitool-setting-show-floating-btn" />
                    Hiển thị nút nổi
                </label>
            </div>`;
html = html.replace(floatingBtnBlock, '');

fs.writeFileSync('modules/st_multitool/panel.html', html);
console.log('Fixed panel.html successfully!');
