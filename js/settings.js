/**
 * settings.js — 설정 페이지 로직
 * API 키 관리, 모델 선택, 데이터 관리
 */

const Settings = {

    // ===== 초기화: 저장된 값 불러오기 =====
    init() {
        // API 키 불러오기
        const openaiKey = Storage.getApiKey('openai');
        const googleKey = Storage.getApiKey('google');
        if (openaiKey) document.getElementById('api-key-openai').value = openaiKey;
        if (googleKey) document.getElementById('api-key-google').value = googleKey;

        // 모델 설정 불러오기
        document.getElementById('setting-llm').value = Storage.getSelectedLLM();
        document.getElementById('setting-tts').value = Storage.getSelectedTTS();
        document.getElementById('setting-tts-voice').value = Storage.getSelectedTTSVoice();

        // 회화 페이지의 LLM 선택 드롭다운도 동기화
        this.syncConvLLMSelect();
    },

    // ===== API 키 저장 =====
    saveKeys() {
        const openaiKey = document.getElementById('api-key-openai').value.trim();
        const googleKey = document.getElementById('api-key-google').value.trim();

        Storage.setApiKey('openai', openaiKey);
        Storage.setApiKey('google', googleKey);

        App.toast('API 키가 저장되었습니다! 💾', 'success');
        Dashboard.checkSetupWarning();
    },

    // ===== API 키 연결 테스트 =====
    async testKeys() {
        const statusOpenAI = document.getElementById('status-openai');
        const statusGoogle = document.getElementById('status-google');

        // 먼저 현재 입력값 저장
        this.saveKeys();

        // OpenAI 테스트
        if (Storage.hasApiKey('openai')) {
            statusOpenAI.textContent = '🔄 테스트 중...';
            statusOpenAI.className = 'key-status testing';
            const result = await API.testOpenAIKey();
            statusOpenAI.textContent = result.msg;
            statusOpenAI.className = `key-status ${result.ok ? 'success' : 'error'}`;
        } else {
            statusOpenAI.textContent = '⚪ 키 미입력';
            statusOpenAI.className = 'key-status';
        }

        // Google 테스트
        if (Storage.hasApiKey('google')) {
            statusGoogle.textContent = '🔄 테스트 중...';
            statusGoogle.className = 'key-status testing';
            const result = await API.testGoogleKey();
            statusGoogle.textContent = result.msg;
            statusGoogle.className = `key-status ${result.ok ? 'success' : 'error'}`;
        } else {
            statusGoogle.textContent = '⚪ 키 미입력';
            statusGoogle.className = 'key-status';
        }
    },

    // ===== 키 표시/숨기기 토글 =====
    toggleKeyVisibility(inputId) {
        const input = document.getElementById(inputId);
        input.type = input.type === 'password' ? 'text' : 'password';
    },

    // ===== 모델 설정 저장 =====
    saveModelSettings() {
        const llm = document.getElementById('setting-llm').value;
        const tts = document.getElementById('setting-tts').value;
        const voice = document.getElementById('setting-tts-voice').value;

        Storage.setSelectedLLM(llm);
        Storage.setSelectedTTS(tts);
        Storage.setSelectedTTSVoice(voice);

        this.syncConvLLMSelect();
        App.toast('모델 설정이 저장되었습니다! 🧠', 'success');
    },

    // ===== 회화 페이지 LLM 드롭다운 동기화 =====
    syncConvLLMSelect() {
        const select = document.getElementById('llm-select-conv');
        if (!select) return;

        const currentLLM = Storage.getSelectedLLM();

        // 2026년 3월 최신 모델 목록 (키가 있는 것만)
        const models = [];
        if (Storage.hasApiKey('openai')) {
            models.push({ value: 'gpt-5-mini', label: 'GPT-5 Mini ⚡' });
            models.push({ value: 'gpt-5', label: 'GPT-5' });
            models.push({ value: 'gpt-5.2', label: 'GPT-5.2 Thinking 🏆' });
        }
        if (Storage.hasApiKey('google')) {
            models.push({ value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash ⚡' });
            models.push({ value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro 🧠' });
            models.push({ value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' });
        }

        select.innerHTML = '';
        if (models.length === 0) {
            select.innerHTML = '<option value="">API 키를 먼저 설정하세요</option>';
            return;
        }

        for (const m of models) {
            const opt = document.createElement('option');
            opt.value = m.value;
            opt.textContent = m.label;
            if (m.value === currentLLM) opt.selected = true;
            select.appendChild(opt);
        }

        // 변경 시 저장
        select.onchange = () => {
            Storage.setSelectedLLM(select.value);
        };
    },

    // ===== TTS 미리듣기 =====
    async previewVoice() {
        try {
            if (!Storage.hasOpenAIKey()) {
                App.toast('OpenAI API 키를 먼저 설정해주세요.', 'error');
                return;
            }
            // 현재 선택값 임시 저장
            Storage.setSelectedTTS(document.getElementById('setting-tts').value);
            Storage.setSelectedTTSVoice(document.getElementById('setting-tts-voice').value);

            App.toast('🔊 음성 생성 중...', 'success');
            await Audio_.speakText('Привет! Я ваш преподаватель русского языка. Давайте начнём!');
        } catch (e) {
            App.toast(`미리듣기 실패: ${e.message}`, 'error');
        }
    },

    // ===== 데이터 관리 =====
    exportData() {
        const data = Storage.exportAll();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `torfl-study-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        App.toast('데이터가 내보내기 되었습니다! 📤', 'success');
    },

    resetData() {
        if (confirm('정말 학습 기록을 초기화하시겠습니까?\nAPI 키는 유지됩니다.')) {
            Storage.resetStudyData();
            Dashboard.refresh();
            App.toast('학습 기록이 초기화되었습니다.', 'success');
        }
    },
};
