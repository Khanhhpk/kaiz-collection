const fs = require('fs');
let html = fs.readFileSync('modules/st_multitool/panel.html', 'utf8');

// Replace floating btn setting block using regex
html = html.replace(/<div class="st-multitool-row">\s*<label class="st-multitool-checkbox-label">\s*<input type="checkbox" id="st-multitool-setting-show-floating-btn"\s*\/>\s*Hiển thị nút nổi\s*<\/label>\s*<\/div>/, '');

fs.writeFileSync('modules/st_multitool/panel.html', html);
console.log('Removed floating btn setting!');
