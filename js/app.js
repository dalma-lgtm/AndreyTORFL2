/**
 * app.js — 앱 초기화 + 페이지 라우팅
 * 모든 모듈을 연결하는 메인 진입점
 */

const App = {
    currentPage: 'dashboard',

    // ===== 앱 초기화 =====
    init() {
        // 각 모듈 초기화
        Settings.init();
        Dashboard.init();
        Conversation.init();
        Vocabulary.init();
        Quiz.init();

        // 네비게이션 이벤트
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                this.navigate(page);
            });
        });

        // 마지막 페이지 복원
        const lastPage = Storage.get(Storage.KEYS.LAST_PAGE, 'dashboard');
        this.navigate(lastPage);

        console.log('🚀 ТРКИ-2 Study App initialized');
    },

    // ===== 페이지 전환 =====
    navigate(pageName) {
        // 현재 페이지 숨기기
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

        // 새 페이지 표시
        const page = document.getElementById(`page-${pageName}`);
        if (page) {
            page.classList.add('active');
            this.currentPage = pageName;
            Storage.set(Storage.KEYS.LAST_PAGE, pageName);
        }

        // 네비게이션 활성화
        const navBtn = document.querySelector(`.nav-btn[data-page="${pageName}"]`);
        if (navBtn) navBtn.classList.add('active');

        // 페이지별 진입 로직
        if (pageName === 'dashboard') Dashboard.refresh();
        if (pageName === 'settings') Settings.init();
        if (pageName === 'conversation') Settings.syncConvLLMSelect();

        // 회화 페이지의 채팅 입력 영역 표시/숨기기
        const chatInput = document.querySelector('.chat-input-area');
        if (chatInput) {
            chatInput.style.display = pageName === 'conversation' ? 'block' : 'none';
        }
    },

    // ===== 토스트 알림 =====
    toast(message, type = 'success') {
        // 기존 토스트 제거
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        // 등장
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // 3초 후 사라짐
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },
};

// ===== DOM 준비 완료 후 시작 =====
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
