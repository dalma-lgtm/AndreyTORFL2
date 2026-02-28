/**
 * quiz.js — 📝 모의시험 모듈
 * 문법, 읽기 시험 + AI 해설
 */

const Quiz = {
    questions: [],
    currentIndex: 0,
    answers: [],
    isActive: false,

    init() {
        document.getElementById('btn-start-quiz').addEventListener('click', () => this.startQuiz());
    },

    // ===== 문제 데이터 로드 =====
    async loadQuiz(type) {
        try {
            const res = await fetch(`data/exams/${type}-01.json`);
            if (!res.ok) throw new Error('파일을 찾을 수 없습니다.');
            const data = await res.json();
            this.questions = data.questions || [];
            return true;
        } catch (e) {
            console.error('시험 로드 실패:', e);
            App.toast('시험 데이터를 불러올 수 없습니다.', 'error');
            return false;
        }
    },

    // ===== 시험 시작 =====
    async startQuiz() {
        const type = document.getElementById('quiz-type-select').value;
        const loaded = await this.loadQuiz(type);
        if (!loaded || this.questions.length === 0) {
            App.toast('시험 데이터가 없습니다. data/exams/ 폴더를 확인하세요.', 'error');
            return;
        }

        this.currentIndex = 0;
        this.answers = [];
        this.isActive = true;
        this.showQuestion();
    },

    // ===== 문제 표시 =====
    showQuestion() {
        if (this.currentIndex >= this.questions.length) {
            this.showResults();
            return;
        }

        const q = this.questions[this.currentIndex];
        const container = document.getElementById('quiz-content');

        container.innerHTML = `
            <div class="vocab-question">
                <div class="word-hint" style="margin-bottom:8px;">문제 ${this.currentIndex + 1} / ${this.questions.length}</div>
                ${q.passage ? `<p style="text-align:left;margin-bottom:16px;line-height:1.7;font-size:14px;color:var(--text-secondary);">${q.passage}</p>` : ''}
                <div class="word-display" style="font-size:18px;line-height:1.6;">${q.question}</div>
            </div>
            <div class="vocab-options">
                ${q.options.map((opt, i) => `
                    <button class="vocab-option" data-index="${i}">${i + 1}. ${opt}</button>
                `).join('')}
            </div>
        `;

        container.querySelectorAll('.vocab-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const selectedIndex = parseInt(btn.dataset.index);
                this.handleQuizAnswer(btn, selectedIndex, q);
            });
        });
    },

    // ===== 정답 처리 =====
    handleQuizAnswer(btn, selectedIndex, question) {
        const buttons = btn.parentElement.querySelectorAll('.vocab-option');
        buttons.forEach(b => {
            b.style.pointerEvents = 'none';
            if (parseInt(b.dataset.index) === question.correctIndex) {
                b.classList.add('correct');
            }
        });

        const isCorrect = selectedIndex === question.correctIndex;
        if (!isCorrect) {
            btn.classList.add('wrong');
        }

        this.answers.push({
            questionIndex: this.currentIndex,
            selected: selectedIndex,
            correct: question.correctIndex,
            isCorrect: isCorrect,
        });

        setTimeout(() => {
            this.currentIndex++;
            this.showQuestion();
        }, isCorrect ? 600 : 1500);
    },

    // ===== 결과 표시 =====
    async showResults() {
        this.isActive = false;
        const correct = this.answers.filter(a => a.isCorrect).length;
        const total = this.answers.length;
        const pct = total > 0 ? Math.round(correct / total * 100) : 0;

        const container = document.getElementById('quiz-content');
        container.innerHTML = `
            <div class="vocab-question" style="padding:32px;">
                <div class="word-display">📊 시험 결과</div>
                <div style="font-size:48px;font-weight:700;color:var(--accent);margin:16px 0;">${pct}%</div>
                <div style="color:var(--text-secondary);margin-bottom:16px;">
                    ✅ 정답: ${correct} / ${total}
                </div>
                <button class="btn-primary" id="btn-quiz-explain" style="margin-bottom:8px;">🤖 AI 해설 보기</button>
                <button class="btn-secondary" onclick="Quiz.startQuiz()" style="width:100%;">다시 풀기 🔄</button>
            </div>
            <div id="quiz-explanation" style="margin-top:16px;"></div>
        `;

        document.getElementById('btn-quiz-explain').addEventListener('click', () => this.getAIExplanation());

        // 학습 기록
        Storage.addStudyTime(Math.round(total * 30 / 60));
        Dashboard.refresh();
    },

    // ===== AI 해설 =====
    async getAIExplanation() {
        if (!Storage.hasRequiredKeys()) {
            App.toast('AI 해설을 위해 API 키를 설정해주세요.', 'error');
            return;
        }

        const explDiv = document.getElementById('quiz-explanation');
        explDiv.innerHTML = '<div class="chat-msg ai"><div class="chat-bubble"><div class="loading-dots"><span></span><span></span><span></span></div></div></div>';

        try {
            const wrongOnes = this.answers
                .filter(a => !a.isCorrect)
                .map(a => {
                    const q = this.questions[a.questionIndex];
                    return `문제: ${q.question}\n학생 답: ${q.options[a.selected]}\n정답: ${q.options[a.correct]}`;
                })
                .join('\n\n');

            if (!wrongOnes) {
                explDiv.innerHTML = '<div class="chat-msg ai"><div class="chat-bubble"><p>🎉 전부 맞았습니다! Отлично!</p></div></div>';
                return;
            }

            const messages = [
                {
                    role: 'system',
                    content: 'Ты — преподаватель РКИ. Объясни ошибки студента. Отвечай на корейском с примерами на русском.'
                },
                {
                    role: 'user',
                    content: `다음 틀린 문제들을 해설해줘. 왜 정답이 맞는지, 학생이 왜 틀렸을 수 있는지 설명해줘:\n\n${wrongOnes}`
                }
            ];

            const explanation = await API.chat(messages);
            explDiv.innerHTML = `<div class="chat-msg ai"><div class="chat-bubble"><p style="white-space:pre-wrap;line-height:1.7;">${explanation}</p></div></div>`;

        } catch (e) {
            explDiv.innerHTML = `<div class="chat-msg ai"><div class="chat-bubble"><p>해설 생성 실패: ${e.message}</p></div></div>`;
        }
    },
};
