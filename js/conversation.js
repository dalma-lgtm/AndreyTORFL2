/**
 * conversation.js — 🗣️ 회화 연습 모듈
 * 파이프라인: 🎤 녹음 → STT → LLM → TTS → 🔊
 */

const Conversation = {
    messages: [],          // LLM 대화 히스토리
    isProcessing: false,   // 처리 중 플래그
    scenarios: {},         // 시나리오 데이터 (나중에 JSON에서 로드)
    startTime: null,       // 대화 시작 시간

    // ===== 시스템 프롬프트 =====
    SYSTEM_PROMPT: `Ты — опытный преподаватель русского языка как иностранного (РКИ).
Уровень студента: B2 (подготовка к ТРКИ-2).

ВАЖНЫЕ ПРАВИЛА:
1. Веди диалог ТОЛЬКО на русском языке.
2. После каждого ответа студента сначала ЕСТЕСТВЕННО ПРОДОЛЖИ диалог, затем дай обратную связь.
3. Используй лексику и грамматику уровня B2-C1.
4. Если студент делает грамматическую ошибку — исправь её и КРАТКО объясни на корейском (한국어).
5. Предлагай более естественные варианты фраз, если студент говорит слишком просто.

ФОРМАТ ОТВЕТА (СТРОГО СОБЛЮДАЙ):
[RESPONSE]
(твой ответ в диалоге — на русском)

[FEEDBACK]
(грамматические исправления и комментарии — смешай русский и корейский для пояснений)`,

    // ===== 초기화 =====
    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        const btnRecord = document.getElementById('btn-record');
        const btnEndConv = document.getElementById('btn-end-conv');
        const scenarioSelect = document.getElementById('scenario-select');

        // 녹음 버튼 — 누르면 시작, 다시 누르면 중지
        btnRecord.addEventListener('click', () => this.toggleRecording());

        // 대화 종료 & 피드백
        btnEndConv.addEventListener('click', () => this.endConversation());

        // 시나리오 변경
        scenarioSelect.addEventListener('change', () => this.resetConversation());
    },

    // ===== 녹음 토글 =====
    async toggleRecording() {
        if (this.isProcessing) return;

        const btnRecord = document.getElementById('btn-record');
        const recordingStatus = document.getElementById('recording-status');

        if (Audio_.isRecording) {
            // 녹음 중지 → 처리 시작
            btnRecord.classList.remove('recording');
            recordingStatus.style.display = 'none';
            const blob = await Audio_.stopRecording();
            if (blob && blob.size > 0) {
                await this.processVoiceInput(blob);
            }
        } else {
            // 녹음 시작
            try {
                if (!Storage.hasOpenAIKey()) {
                    App.toast('OpenAI API 키를 먼저 설정해주세요! ⚙️', 'error');
                    return;
                }
                await Audio_.startRecording();
                btnRecord.classList.add('recording');
                recordingStatus.style.display = 'flex';
            } catch (e) {
                App.toast(e.message, 'error');
            }
        }
    },

    // ===== 음성 입력 처리 파이프라인 =====
    async processVoiceInput(audioBlob) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        // 대화 시작 시간 기록
        if (!this.startTime) this.startTime = Date.now();

        try {
            // 1️⃣ STT: 음성 → 텍스트
            this.showLoading('user', '음성 인식 중...');
            const userText = await API.transcribe(audioBlob);

            if (!userText || userText.trim().length === 0) {
                this.removeLoading();
                App.toast('음성을 인식하지 못했습니다. 다시 시도해주세요.', 'error');
                this.isProcessing = false;
                return;
            }

            this.removeLoading();
            this.addMessage('user', userText);

            // 2️⃣ LLM: 대화 응답 생성
            this.showLoading('ai');

            // 첫 메시지면 시스템 프롬프트 추가
            if (this.messages.length === 0) {
                const scenario = document.getElementById('scenario-select').value;
                let systemPrompt = this.SYSTEM_PROMPT;

                if (scenario !== 'free') {
                    systemPrompt += `\n\nСЦЕНАРИЙ: ${this.getScenarioDescription(scenario)}`;
                }

                this.messages.push({ role: 'system', content: systemPrompt });
            }

            this.messages.push({ role: 'user', content: userText });

            const aiResponse = await API.chat(this.messages);
            this.messages.push({ role: 'assistant', content: aiResponse });

            this.removeLoading();

            // 3️⃣ 응답 파싱 ([RESPONSE] / [FEEDBACK] 분리)
            const parsed = this.parseResponse(aiResponse);
            this.addAIMessage(parsed.response, parsed.feedback);

            // 4️⃣ TTS: 텍스트 → 음성 (응답 부분만)
            if (parsed.response) {
                try {
                    await Audio_.speakText(parsed.response);
                } catch (e) {
                    console.warn('TTS 실패, 텍스트만 표시:', e);
                }
            }

        } catch (e) {
            this.removeLoading();
            App.toast(`오류: ${e.message}`, 'error');
            console.error('Pipeline error:', e);
        }

        this.isProcessing = false;
    },

    // ===== 응답 파싱 =====
    parseResponse(text) {
        let response = text;
        let feedback = '';

        // [RESPONSE]와 [FEEDBACK] 분리
        const responseMatch = text.match(/\[RESPONSE\]\s*([\s\S]*?)(?=\[FEEDBACK\]|$)/i);
        const feedbackMatch = text.match(/\[FEEDBACK\]\s*([\s\S]*?)$/i);

        if (responseMatch) {
            response = responseMatch[1].trim();
        }
        if (feedbackMatch) {
            feedback = feedbackMatch[1].trim();
        }

        // 태그가 없는 경우 전체를 response로
        if (!responseMatch && !feedbackMatch) {
            response = text;
        }

        return { response, feedback };
    },

    // ===== 메시지 UI 추가 =====
    addMessage(role, text) {
        const container = document.getElementById('chat-messages');

        // 플레이스홀더 제거
        const placeholder = container.querySelector('.chat-placeholder');
        if (placeholder) placeholder.remove();

        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${role}`;

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.textContent = text;

        msgDiv.appendChild(bubble);
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    },

    addAIMessage(response, feedback) {
        const container = document.getElementById('chat-messages');

        const placeholder = container.querySelector('.chat-placeholder');
        if (placeholder) placeholder.remove();

        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-msg ai';

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';

        // 응답 텍스트
        const responseP = document.createElement('p');
        responseP.textContent = response;
        bubble.appendChild(responseP);

        // 피드백이 있으면 추가
        if (feedback) {
            const feedbackDiv = document.createElement('div');
            feedbackDiv.className = 'feedback';
            feedbackDiv.innerHTML = this.formatFeedback(feedback);
            bubble.appendChild(feedbackDiv);
        }

        // 🔊 다시 듣기 버튼
        const replayBtn = document.createElement('button');
        replayBtn.className = 'btn-small';
        replayBtn.textContent = '🔊 다시 듣기';
        replayBtn.style.marginTop = '8px';
        replayBtn.onclick = () => Audio_.speakText(response);
        bubble.appendChild(replayBtn);

        msgDiv.appendChild(bubble);
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    },

    formatFeedback(feedback) {
        // 간단한 포매팅: 줄바꿈 → <br>
        return feedback
            .replace(/\n/g, '<br>')
            .replace(/(ошибк[аи]|ошибку|ошибок)/gi, '<span class="correction">$1</span>')
            .replace(/(правильн[оа]|отлично|хорошо|молодец)/gi, '<span class="praise">$1</span>');
    },

    // ===== 로딩 표시 =====
    showLoading(role, text = '') {
        const container = document.getElementById('chat-messages');

        const placeholder = container.querySelector('.chat-placeholder');
        if (placeholder) placeholder.remove();

        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${role}`;
        msgDiv.id = 'loading-msg';

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';

        if (text) {
            bubble.textContent = text;
        } else {
            bubble.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
        }

        msgDiv.appendChild(bubble);
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    },

    removeLoading() {
        const loading = document.getElementById('loading-msg');
        if (loading) loading.remove();
    },

    // ===== 시나리오 설명 =====
    getScenarioDescription(id) {
        const descriptions = {
            'daily-cafe': 'Студент заказывает кофе и десерт в московском кафе. Ты — бариста. Задавай вопросы о заказе.',
            'daily-market': 'Студент покупает продукты на рынке. Ты — продавец. Обсуди цены, вес, свежесть.',
            'opinion-culture': 'Обсуди с студентом русскую или корейскую культуру. Спрашивай его мнение, соглашайся или спорь.',
            'travel-hotel': 'Студент заселяется в гостиницу в Санкт-Петербурге. Ты — администратор. Обсуди номер, цену, завтрак.',
        };
        return descriptions[id] || 'Свободный диалог на русском языке уровня B2.';
    },

    // ===== 대화 초기화 =====
    resetConversation() {
        this.messages = [];
        this.startTime = null;
        const container = document.getElementById('chat-messages');
        container.innerHTML = `
            <div class="chat-placeholder">
                <p>🎤 아래 버튼을 눌러 러시아어로 말해보세요</p>
                <p class="hint">시나리오를 선택하거나 자유롭게 대화하세요</p>
            </div>
        `;
    },

    // ===== 대화 종료 → 종합 피드백 =====
    async endConversation() {
        if (this.messages.length < 3) {
            App.toast('대화를 좀 더 진행한 후 피드백을 받아보세요!', 'error');
            return;
        }

        this.isProcessing = true;
        this.showLoading('ai');

        try {
            const feedbackMessages = [
                ...this.messages,
                {
                    role: 'user',
                    content: `이 대화를 종합 평가해줘. 다음 항목을 한국어로 작성해줘:
1. 📊 전체 평가 (A~D 등급)
2. ✅ 잘한 점
3. ⚠️ 개선할 점 (구체적 문법 오류 포함)
4. 📚 이 대화에서 배울 수 있는 새 단어/표현 5개
5. 💡 다음에 연습할 때 팁`
                }
            ];

            const feedback = await API.chat(feedbackMessages);
            this.removeLoading();
            this.addMessage('ai', feedback);

            // 학습 시간 기록
            if (this.startTime) {
                const minutes = Math.round((Date.now() - this.startTime) / 60000);
                Storage.addStudyTime(minutes);
                const stats = Storage.getStats();
                stats.totalConversations += 1;
                Storage.updateStats(stats);
                Dashboard.refresh();
            }

        } catch (e) {
            this.removeLoading();
            App.toast(`피드백 생성 실패: ${e.message}`, 'error');
        }

        this.isProcessing = false;
    },
};
