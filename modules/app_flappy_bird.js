/**
 * Điện thoại nhỏ - APP Game Flappy Bird v1.3
 * * Tính năng:
 * - Chơi bằng cách Click chuột, Chạm màn hình hoặc nhấn phím Space
 * - Tự động lưu điểm cao nhất (High Score)
 * - [CẬP NHẬT] Cân bằng lại độ khó (Harder & Classic feel): Tăng tốc độ, thu hẹp khoảng cách ống, chim rơi thực tế hơn.
 */

(function () {
    'use strict';

    function waitForPhoneSystem(cb) {
        if (window.parent.PhoneSystem) {
            cb();
        } else {
            setTimeout(function () { waitForPhoneSystem(cb); }, 100);
        }
    }

    waitForPhoneSystem(function () {
        console.log('[Flappy Bird APP] Khởi tạo v1.3');

        // ============ Cấu hình ============
        var APP_ID = 'flappybird';
        var STORAGE_KEY = 'phone_flappy_bird_data';

        var APP_ICON = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg, #70c5ce, #54a8b1);border-radius:20%;box-shadow:inset 0 2px 4px rgba(255,255,255,0.3);"><img src="https://api.iconify.design/twemoji:bird.svg" style="width:65%;height:65%;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2));"></div>';

        // ============ Trạng thái & Biến Game ============
        var doc = null;
        var iframeWin = null;
        var canvas, ctx, animationId;
        var bestScore = 0;
        
        var frames = 0;
        var gameState = 'start'; 
        var score = 0;
        
        var bird = {
            x: 50,
            y: 150,
            width: 34,
            height: 24,
            velocity: 0,
            gravity: 0.3,    // [HARDER] Trọng lực mạnh hơn (cũ: 0.25)
            jump: -5.2,      // [HARDER] Lực nhảy mạnh hơn để bù lại trọng lực (cũ: -4.5)
            rotation: 0,
            draw: function() {
                ctx.save();
                ctx.translate(this.x, this.y);
                // Xoay chim theo vận tốc
                this.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.12)));
                ctx.rotate(this.rotation);
                
                // Vẽ thân
                ctx.fillStyle = '#f2b733';
                ctx.beginPath();
                ctx.arc(0, 0, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#543847';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Vẽ mắt
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(6, -4, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(8, -4, 2, 0, Math.PI * 2);
                ctx.fill();

                // Vẽ mỏ
                ctx.fillStyle = '#e76e55';
                ctx.beginPath();
                ctx.ellipse(8, 4, 8, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Vẽ cánh
                ctx.fillStyle = '#f2b733';
                ctx.beginPath();
                ctx.ellipse(-6, 2, 6, 4, Math.PI / 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.restore();
            },
            update: function() {
                if (gameState === 'start') {
                    this.y = 150 + Math.cos(frames * 0.1) * 5; 
                } else {
                    this.velocity += this.gravity;
                    this.y += this.velocity;
                    
                    if (this.y + 12 >= canvas.height - 40) {
                        this.y = canvas.height - 40 - 12;
                        if (gameState === 'playing') gameOver();
                    }
                    if (this.y - 12 <= 0) {
                        this.y = 12;
                        this.velocity = 0;
                    }
                }
            },
            flap: function() {
                this.velocity = this.jump;
            }
        };

        var pipes = {
            list: [],
            width: 50,
            gap: 130, // [HARDER] Thu hẹp khe hở (cũ: 145)
            dx: 2.5,  // [HARDER] Tốc độ bay nhanh hơn (cũ: 2)
            draw: function() {
                for (var i = 0; i < this.list.length; i++) {
                    var p = this.list[i];
                    
                    ctx.fillStyle = '#73bf2e';
                    ctx.fillRect(p.x, 0, this.width, p.y);
                    ctx.strokeStyle = '#543847';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(p.x, 0, this.width, p.y);
                    ctx.fillRect(p.x - 2, p.y - 20, this.width + 4, 20);
                    ctx.strokeRect(p.x - 2, p.y - 20, this.width + 4, 20);

                    var bottomY = p.y + this.gap;
                    ctx.fillRect(p.x, bottomY, this.width, canvas.height - bottomY - 40);
                    ctx.strokeRect(p.x, bottomY, this.width, canvas.height - bottomY - 40);
                    ctx.fillRect(p.x - 2, bottomY, this.width + 4, 20);
                    ctx.strokeRect(p.x - 2, bottomY, this.width + 4, 20);
                }
            },
            update: function() {
                if (gameState !== 'playing') return;

                // [HARDER] Sinh ống nhanh hơn do tốc độ bay tăng
                if (frames % 85 === 0) {
                    var minPos = 50;
                    var maxPos = canvas.height - 40 - this.gap - 50;
                    var yPos;

                    if (this.list.length > 0) {
                        var lastY = this.list[this.list.length - 1].y;
                        var maxDelta = 120; // [HARDER] Cho phép ống giật cao/thấp hơn (cũ: 90)
                        var newMin = Math.max(minPos, lastY - maxDelta);
                        var newMax = Math.min(maxPos, lastY + maxDelta);
                        yPos = Math.floor(Math.random() * (newMax - newMin + 1) + newMin);
                    } else {
                        yPos = Math.floor(Math.random() * (maxPos - minPos + 1) + minPos);
                    }
                    
                    this.list.push({
                        x: canvas.width,
                        y: yPos,
                        passed: false
                    });
                }

                for (var i = 0; i < this.list.length; i++) {
                    var p = this.list[i];
                    p.x -= this.dx;

                    // Hitbox tinh chỉnh lại xíu cho khớp
                    var birdBox = {
                        x: bird.x - 7,
                        y: bird.y - 7,
                        w: 14,
                        h: 14
                    };

                    if (birdBox.x + birdBox.w > p.x && 
                        birdBox.x < p.x + this.width && 
                        birdBox.y < p.y) {
                        gameOver();
                    }
                    if (birdBox.x + birdBox.w > p.x && 
                        birdBox.x < p.x + this.width && 
                        birdBox.y + birdBox.h > p.y + this.gap) {
                        gameOver();
                    }

                    if (p.x + this.width < bird.x && !p.passed) {
                        score++;
                        p.passed = true;
                    }

                    if (p.x + this.width < 0) {
                        this.list.shift();
                        i--;
                    }
                }
            },
            reset: function() {
                this.list = [];
            }
        };

        var bg = {
            draw: function() {
                ctx.fillStyle = '#70c5ce';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.beginPath();
                ctx.arc(100, 100, 30, 0, Math.PI * 2);
                ctx.arc(140, 100, 40, 0, Math.PI * 2);
                ctx.arc(180, 100, 30, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#ded895';
                ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
                ctx.strokeStyle = '#543847';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, canvas.height - 40);
                ctx.lineTo(canvas.width, canvas.height - 40);
                ctx.stroke();
                
                ctx.strokeStyle = '#d0c878';
                ctx.lineWidth = 3;
                var offset = (frames * pipes.dx) % 20; 
                for (var i = -offset; i < canvas.width + 20; i += 20) {
                    ctx.beginPath();
                    ctx.moveTo(i, canvas.height - 40);
                    ctx.lineTo(i - 10, canvas.height);
                    ctx.stroke();
                }
            }
        };

        // ============ Logic Game ============
        function loadData() {
            try {
                var d = localStorage.getItem(STORAGE_KEY);
                if (d) bestScore = parseInt(d) || 0;
            } catch (e) {}
        }

        function saveData() {
            try {
                localStorage.setItem(STORAGE_KEY, bestScore.toString());
            } catch (e) {}
        }

        function drawScore() {
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 4;
            ctx.font = 'bold 40px Impact, sans-serif';
            ctx.textAlign = 'center';

            if (gameState === 'playing' || gameState === 'start') {
                ctx.strokeText(score, canvas.width / 2, 50);
                ctx.fillText(score, canvas.width / 2, 50);
            }

            if (gameState === 'start') {
                ctx.font = 'bold 20px Arial';
                ctx.strokeText("Nhấn Space hoặc Click", canvas.width / 2, canvas.height / 2 + 50);
                ctx.fillText("Nhấn Space hoặc Click", canvas.width / 2, canvas.height / 2 + 50);
            }
        }

        function handleInput(e) {
            if (e.type === 'keydown' && e.code !== 'Space') return;
            if (e.type === 'keydown') e.preventDefault(); 

            if (gameState === 'start') {
                gameState = 'playing';
                bird.flap();
            } else if (gameState === 'playing') {
                bird.flap();
            } else if (gameState === 'gameover') {
                resetGame();
            }
        }

        function gameOver() {
            gameState = 'gameover';
            if (score > bestScore) {
                bestScore = score;
                saveData();
            }
            
            var overlay = doc.getElementById('flappy-overlay');
            if (overlay) {
                doc.getElementById('flappy-score').innerText = score;
                doc.getElementById('flappy-best').innerText = bestScore;
                overlay.style.display = 'flex';
            }
        }

        function resetGame() {
            bird.y = 150;
            bird.velocity = 0;
            bird.rotation = 0;
            pipes.reset();
            score = 0;
            frames = 0;
            gameState = 'start';
            
            var overlay = doc.getElementById('flappy-overlay');
            if (overlay) overlay.style.display = 'none';
        }

        function loop() {
            if (!ctx) return;
            
            bird.update();
            pipes.update();

            bg.draw();
            pipes.draw();
            bird.draw();
            drawScore();

            if (gameState !== 'gameover') frames++;
            animationId = requestAnimationFrame(loop);
        }

        // ============ Giao diện (HTML) ============
        function genHTML() {
            var html = '<div id="flappy-app" style="position:absolute;inset:0;background:#70c5ce;display:flex;flex-direction:column;overflow:hidden;z-index:400;font-family:Arial, sans-serif;user-select:none;">';
            
            html += '<div style="height:50px;display:flex;align-items:center;padding:0 16px;background:rgba(0,0,0,0.1);z-index:10;position:absolute;top:0;left:0;right:0;">';
            html += '<div id="flappy-back" style="color:white;cursor:pointer;display:flex;align-items:center;font-weight:bold;text-shadow:1px 1px 2px rgba(0,0,0,0.5);"><i class="ri-arrow-left-line" style="font-size:20px;margin-right:4px;"></i> Trở về</div>';
            html += '</div>';

            html += '<div id="canvas-container" style="flex:1;display:flex;justify-content:center;align-items:center;position:relative;">';
            html += '<canvas id="flappy-canvas"></canvas>';
            html += '</div>';

            html += '<div id="flappy-overlay" style="position:absolute;inset:0;background:rgba(0,0,0,0.6);display:none;flex-direction:column;align-items:center;justify-content:center;z-index:20;">';
            html += '<h1 style="color:white;font-size:40px;margin:0 0 20px;text-shadow:2px 2px 0 #000;font-family:Impact,sans-serif;letter-spacing:2px;">GAME OVER</h1>';
            
            html += '<div style="background:#ded895;border:4px solid #543847;border-radius:10px;padding:20px 40px;text-align:center;margin-bottom:30px;box-shadow:0 8px 0 rgba(0,0,0,0.2);">';
            html += '<div style="color:#e76e55;font-weight:bold;font-size:18px;margin-bottom:5px;">ĐIỂM SỐ</div>';
            html += '<div id="flappy-score" style="font-size:36px;font-weight:bold;color:white;text-shadow:2px 2px 0 #000;font-family:Impact,sans-serif;margin-bottom:15px;">0</div>';
            html += '<div style="color:#e76e55;font-weight:bold;font-size:18px;margin-bottom:5px;">KỶ LỤC</div>';
            html += '<div id="flappy-best" style="font-size:36px;font-weight:bold;color:white;text-shadow:2px 2px 0 #000;font-family:Impact,sans-serif;">0</div>';
            html += '</div>';

            html += '<button id="flappy-restart" style="background:#f2b733;border:4px solid #543847;color:white;font-size:24px;font-weight:bold;padding:10px 30px;border-radius:8px;cursor:pointer;text-shadow:2px 2px 0 #000;font-family:Impact,sans-serif;box-shadow:0 6px 0 #d9a022;transform:translateY(0);transition:transform 0.1s, box-shadow 0.1s;">CHƠI LẠI</button>';
            html += '</div></div>';
            return html;
        }

        // ============ Quản lý App ============
        var inputHandlerRef = null;

        function openApp() {
            var ps = window.parent ? window.parent.PhoneSystem : null;
            if (!ps || !ps.iframeWindow) {
                setTimeout(openApp, 200);
                return;
            }

            try { doc = ps.iframeWindow.document; iframeWin = ps.iframeWindow; } catch (e) { return; }

            var home = doc.getElementById('home-screen');
            if (home) home.style.display = 'none';

            var container = doc.getElementById('app-container');
            if (!container) {
                var screen = doc.querySelector('.screen');
                if (screen) {
                    container = doc.createElement('div');
                    container.id = 'app-container';
                    container.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:300;';
                    screen.appendChild(container);
                }
            }

            if (container) {
                container.innerHTML = genHTML();
                
                canvas = doc.getElementById('flappy-canvas');
                ctx = canvas.getContext('2d');
                
                var cContainer = doc.getElementById('canvas-container');
                canvas.width = cContainer.clientWidth;
                canvas.height = cContainer.clientHeight;

                loadData();
                resetGame();

                doc.getElementById('flappy-back').onclick = function() {
                    closeApp();
                    window.parent.PhoneSystem.goHome();
                };

                var restartBtn = doc.getElementById('flappy-restart');
                restartBtn.onmousedown = function() {
                    this.style.transform = 'translateY(6px)';
                    this.style.boxShadow = 'none';
                };
                restartBtn.onmouseup = function() {
                    this.style.transform = 'translateY(0)';
                    this.style.boxShadow = '0 6px 0 #d9a022';
                    resetGame();
                };
                restartBtn.addEventListener('touchstart', restartBtn.onmousedown);
                restartBtn.addEventListener('touchend', restartBtn.onmouseup);

                inputHandlerRef = handleInput;
                canvas.addEventListener('mousedown', handleInput);
                canvas.addEventListener('touchstart', function(e) { e.preventDefault(); handleInput(e); }, {passive: false});
                doc.addEventListener('keydown', inputHandlerRef);
                
                iframeWin.focus();

                if (animationId) cancelAnimationFrame(animationId);
                loop();
            }

            var statusBar = doc.getElementById('status-bar');
            if (statusBar) {
                statusBar.classList.remove('dark');
                statusBar.classList.add('light'); 
            }
        }

        function closeApp() {
            if (animationId) cancelAnimationFrame(animationId);
            if (doc && inputHandlerRef) doc.removeEventListener('keydown', inputHandlerRef);

            var ps = window.parent ? window.parent.PhoneSystem : null;
            var iframeWindow = ps ? ps.iframeWindow : null;

            if (!iframeWindow) {
                doc = null;
                return;
            }

            try {
                var d = iframeWindow.document;
                var container = d.getElementById('app-container');
                if (container) {
                    container.innerHTML = '';
                    container.style.pointerEvents = 'none';
                }
                var home = d.getElementById('home-screen');
                if (home) home.style.display = 'block';
            } catch (e) {}

            doc = null;
        }

        // ============ Đăng ký App ============
        window.parent.PhoneSystem.registerApp({
            id: APP_ID,
            name: 'Flappy Bird',
            icon: APP_ICON,
            color: 'transparent',
            order: 12
        });

        window.parent.PhoneSystem.on('app-opened', function (data) {
            if (data.id === APP_ID) openApp();
        });

        window.parent.PhoneSystem.on('go-home', closeApp);
        console.log('[Flappy Bird APP] Đã tải thành công v1.3');
    });
})();