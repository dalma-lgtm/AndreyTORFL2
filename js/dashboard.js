/**
 * dashboard.js — 홈 대시보드
 * 통계 표시, 셋업 경고
 */

const Dashboard = {

    init() {
        this.refresh();
    },

    refresh() {
        const stats = Storage.getStats();

        document.getElementById('streak-count').textContent = stats.streak;
        document.getElementById('today-minutes').textContent = `${stats.todayMinutes}분`;
        document.getElementById('conv-count').textContent = stats.totalConversations;
        document.getElementById('words-mastered').textContent = stats.wordsMastered;

        this.checkSetupWarning();
    },

    checkSetupWarning() {
        const warning = document.getElementById('setup-warning');
        if (!Storage.hasOpenAIKey()) {
            warning.style.display = 'flex';
        } else {
            warning.style.display = 'none';
        }
    },
};
