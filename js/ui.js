// js/ui.js

class UI {
    constructor() {
        console.log("UI 초기화 시작...");
        this.canvas = document.getElementById('orb-canvas');
        this.chatScroller = document.getElementById('chat-scroller');
        this.modal = document.getElementById('settings-modal');
        
        // 캔버스 에러 방지
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.resize();
            window.addEventListener('resize', () => this.resize());
            this.orbState = 'idle';
            this.time = 0;
            this.animate();
        } else {
            console.error("Canvas 요소를 찾을 수 없습니다.");
        }
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
    }

    setOrbState(state) {
        this.orbState = state;
        const micBtn = document.getElementById('mic-btn');
        if (micBtn) {
            if (state === 'listening') micBtn.classList.add('listening');
            else micBtn.classList.remove('listening');
        }
    }

    addMessage(text, sender) {
        const div = document.createElement('div');
        div.className = `message ${sender === 'user' ? 'user-message' : 'ai-message'}`;
        div.innerText = text;
        this.chatScroller.appendChild(div);
        this.chatScroller.scrollTop = this.chatScroller.scrollHeight;
    }

    toggleSettings(show) {
        if (show) this.modal.classList.remove('hidden');
        else this.modal.classList.add('hidden');
    }

    animate() {
        if (!this.ctx) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.time += 0.05;

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        let baseRadius = 50;
        let intensity = 5;
        let color = 'rgba(112, 0, 255, 0.5)';

        if (this.orbState === 'listening') {
            intensity = 20; color = '#ff0055'; baseRadius = 60;
        } else if (this.orbState === 'speaking') {
            intensity = 25; color = '#00f0ff'; baseRadius = 70;
        } else if (this.orbState === 'processing') {
            color = '#ffffff'; intensity = 10;
        }

        this.ctx.beginPath();
        for (let i = 0; i < 360; i += 5) {
            const angle = (i * Math.PI) / 180;
            const noise = Math.sin(angle * 5 + this.time) * Math.cos(angle * 2 - this.time);
            const r = baseRadius + noise * intensity;
            const x = centerX + r * Math.cos(angle);
            const y = centerY + r * Math.sin(angle);
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        this.ctx.fillStyle = color;
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = color;
        this.ctx.fill();

        requestAnimationFrame(() => this.animate());
    }
}

// 전역 변수로 할당 (App에서 쓰기 위해)
window.ui = new UI();
