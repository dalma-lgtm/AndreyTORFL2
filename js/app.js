// js/ui.js

class UI {
    constructor() {
        this.canvas = document.getElementById('orb-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.chatScroller = document.getElementById('chat-scroller');
        this.orbState = 'idle'; // idle, listening, speaking, processing
        this.animationId = null;
        this.time = 0;

        // 화면 크기에 맞게 캔버스 설정
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // 애니메이션 시작
        this.animate();
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
    }

    // Orb 상태 변경 (애니메이션 패턴 변경)
    setOrbState(state) {
        this.orbState = state;
        const micBtn = document.getElementById('mic-btn');
        
        // 버튼 스타일 업데이트
        if (state === 'listening') {
            micBtn.classList.add('listening');
        } else {
            micBtn.classList.remove('listening');
        }
    }

    // 채팅 메시지 추가
    addMessage(text, sender) {
        const div = document.createElement('div');
        div.classList.add('message', sender === 'user' ? 'user-message' : 'ai-message');
        div.innerText = text;
        
        this.chatScroller.appendChild(div);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.chatScroller.scrollTop = this.chatScroller.scrollHeight;
    }

    // 설정 모달 제어
    toggleSettings(show) {
        const modal = document.getElementById('settings-modal');
        if (show) modal.classList.remove('hidden');
        else modal.classList.add('hidden');
    }

    // ----------------------------------------------------
    // Orb 애니메이션 로직 (수학적 파형 그리기)
    // ----------------------------------------------------
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.time += 0.05;

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        let baseRadius = 50;
        let intensity = 0;
        let color = '#7000ff'; // 기본 보라색

        // 상태별 움직임 설정
        switch (this.orbState) {
            case 'idle':
                intensity = 5;
                color = 'rgba(112, 0, 255, 0.5)';
                break;
            case 'listening': // 듣는 중 (빠르고 붉은색)
                intensity = 20;
                baseRadius = 60;
                color = '#ff0055'; 
                this.time += 0.1; // 시간 가속
                break;
            case 'processing': // 생각 중 (회전하는 하얀색)
                intensity = 10;
                color = '#ffffff';
                break;
            case 'speaking': // 말하는 중 (커지는 청록색)
                intensity = 30;
                baseRadius = 65;
                color = '#00f0ff';
                break;
        }

        this.ctx.beginPath();
        
        // 원형 파동 그리기
        for (let i = 0; i < 360; i++) {
            const angle = (i * Math.PI) / 180;
            // 노이즈 함수 시뮬레이션 (울퉁불퉁한 원)
            const noise = Math.sin(angle * 5 + this.time) * Math.cos(angle * 3 - this.time);
            const r = baseRadius + noise * intensity + Math.sin(this.time * 2) * 5;
            
            const x = centerX + r * Math.cos(angle);
            const y = centerY + r * Math.sin(angle);
            
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }

        this.ctx.closePath();
        this.ctx.fillStyle = color;
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = color;
        this.ctx.fill();

        this.animationId = requestAnimationFrame(() => this.animate());
    }
}

// UI 인스턴스 생성
const ui = new UI();
