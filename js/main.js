// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. 탭 전환 로직
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(btn => {
        btn.addEventListener('click', () => {
            // 모든 탭 비활성화
            navItems.forEach(n => n.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));

            // 선택한 탭 활성화
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // 2. 초기 설정 로드 (localStorage)
    loadSettings();

    // 3. 설정 저장 버튼
    document.getElementById('btn-save-settings').addEventListener('click', () => {
        const model = document.getElementById('setting-model').value;
        const key = document.getElementById('setting-apikey-openai').value;
        const prompt = document.getElementById('setting-prompt').value;

        localStorage.setItem('torfl_model', model);
        localStorage.setItem('torfl_apikey', key);
        localStorage.setItem('torfl_prompt', prompt);

        // UI 즉시 반영
        document.getElementById('current-model-display').innerText = model.toUpperCase();
        alert('설정이 저장되었습니다.');
    });
});

function loadSettings() {
    const model = localStorage.getItem('torfl_model') || 'gpt-4o';
    const key = localStorage.getItem('torfl_apikey') || '';
    const prompt = localStorage.getItem('torfl_prompt') || '';

    // 인풋창에 채워넣기
    document.getElementById('setting-model').value = model;
    document.getElementById('setting-apikey-openai').value = key;
    document.getElementById('setting-prompt').value = prompt;

    // 헤더 모델명 업데이트
    document.getElementById('current-model-display').innerText = model.toUpperCase();

    // Orb 상태 텍스트 초기화
    document.getElementById('orb-status-text').innerText = "Ready";
}
