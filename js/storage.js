/**
 * storage.js — localStorage 관리
 * API 키, 설정, 학습 기록 모두 여기서 관리
 */

const Storage = {
    // ===== 키 이름 상수 =====
    KEYS: {
        API_OPENAI: 'torfl_api_openai',
        API_GOOGLE: 'torfl_api_google',
        SETTING_LLM: 'torfl_setting_llm',
        SETTING_TTS: 'torfl_setting_tts',
        SETTING_TTS_VOICE: 'torfl_setting_tts_voice',
        STATS: 'torfl_stats',
        VOCAB_PROGRESS: 'torfl_vocab_progress',
        CONV_HISTORY: 'torfl_conv_history',
        LAST_PAGE: 'torfl_last_page',
    },

    // ===== 기본 CRUD =====
    get(key, fallback = null) {
        try {
            const val = localStorage.getItem(key);
            if (val === null) return fallback;
            return JSON.parse(val);
        } catch {
            return fallback;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage.set error:', e);
            return false;
        }
    },

    remove(key) {
        localStorage.removeItem(key);
    },

    // ===== API 키 관리 =====
    getApiKey(provider) {
        if (provider === 'openai') return this.get(this.KEYS.API_OPENAI, '');
        if (provider === 'google') return this.get(this.KEYS.API_GOOGLE, '');
        return '';
    },

    setApiKey(provider, key) {
        if (provider === 'openai') return this.set(this.KEYS.API_OPENAI, key);
        if (provider === 'google') return this.set(this.KEYS.API_GOOGLE, key);
    },

    hasApiKey(provider) {
        return this.getApiKey(provider).length > 0;
    },

    // OpenAI 키가 있는지 (STT, TTS에 필수)
    hasOpenAIKey() {
        return this.hasApiKey('openai');
    },

    // 선택한 LLM에 필요한 키가 있는지
    hasRequiredKeys() {
        const llm = this.getSelectedLLM();
        if (llm.startsWith('gpt')) return this.hasApiKey('openai');
        if (llm.startsWith('gemini')) return this.hasApiKey('google');
        return false;
    },

    // ===== 모델 설정 =====
    getSelectedLLM() {
        return this.get(this.KEYS.SETTING_LLM, 'gpt-5-mini');
    },

    setSelectedLLM(model) {
        this.set(this.KEYS.SETTING_LLM, model);
    },

    getSelectedTTS() {
        return this.get(this.KEYS.SETTING_TTS, 'tts-1');
    },

    setSelectedTTS(model) {
        this.set(this.KEYS.SETTING_TTS, model);
    },

    getSelectedTTSVoice() {
        return this.get(this.KEYS.SETTING_TTS_VOICE, 'nova');
    },

    setSelectedTTSVoice(voice) {
        this.set(this.KEYS.SETTING_TTS_VOICE, voice);
    },

    // LLM 모델이 어느 프로바이더에 속하는지
    getProviderForLLM(model) {
        if (!model) model = this.getSelectedLLM();
        if (model.startsWith('gemini')) return 'google';
        // gpt-5, gpt-5.2, gpt-4o, o3, o4 등 OpenAI 모델 전부 커버
        if (model.startsWith('gpt') || model.startsWith('o')) return 'openai';
        return 'openai';
    },

    // ===== 학습 통계 =====
    getStats() {
        return this.get(this.KEYS.STATS, {
            streak: 0,
            lastStudyDate: null,
            todayMinutes: 0,
            totalConversations: 0,
            wordsMastered: 0,
            quizScores: [],
        });
    },

    updateStats(updates) {
        const stats = this.getStats();
        Object.assign(stats, updates);
        this.set(this.KEYS.STATS, stats);
        return stats;
    },

    // 오늘 학습 시간 추가
    addStudyTime(minutes) {
        const stats = this.getStats();
        const today = new Date().toISOString().split('T')[0];

        // 스트릭 체크
        if (stats.lastStudyDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (stats.lastStudyDate === yesterdayStr) {
                stats.streak += 1;
            } else if (stats.lastStudyDate !== today) {
                stats.streak = 1;
            }
            stats.todayMinutes = 0;
            stats.lastStudyDate = today;
        }

        stats.todayMinutes += minutes;
        this.set(this.KEYS.STATS, stats);
        return stats;
    },

    // ===== 단어 진행도 =====
    getVocabProgress() {
        return this.get(this.KEYS.VOCAB_PROGRESS, {});
    },

    updateWordProgress(wordId, correct) {
        const progress = this.getVocabProgress();
        if (!progress[wordId]) {
            progress[wordId] = { correct: 0, wrong: 0, lastSeen: null, mastered: false };
        }
        if (correct) {
            progress[wordId].correct += 1;
        } else {
            progress[wordId].wrong += 1;
        }
        progress[wordId].lastSeen = new Date().toISOString();
        // 3번 연속 맞추면 마스터
        progress[wordId].mastered = progress[wordId].correct >= 3;
        this.set(this.KEYS.VOCAB_PROGRESS, progress);
        return progress[wordId];
    },

    // ===== 데이터 내보내기/초기화 =====
    exportAll() {
        const data = {};
        for (const key of Object.values(this.KEYS)) {
            data[key] = this.get(key);
        }
        return data;
    },

    resetStudyData() {
        this.remove(this.KEYS.STATS);
        this.remove(this.KEYS.VOCAB_PROGRESS);
        this.remove(this.KEYS.CONV_HISTORY);
    },

    resetAll() {
        for (const key of Object.values(this.KEYS)) {
            this.remove(key);
        }
    }
};
