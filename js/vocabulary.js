/**
 * vocabulary.js — 📚 단어 테스트 모듈
 * 객관식, 빈칸 채우기, 듣고 쓰기, 뜻 매칭
 */

const Vocabulary = {
    words: [],           // 현재 유닛 단어 목록
    currentIndex: 0,     // 현재 문제 인덱스
    testWords: [],       // 셔플된 테스트 단어
    score: { correct: 0, wrong: 0 },
    isActive: false,

    // ===== 초기화 =====
    init() {
        document.getElementById('btn-start-vocab').addEventListener('click', () => this.startTest());
    },

    // ===== 단어 데이터 로드 =====
    async loadUnit(unitId) {
        try {
            const res = await fetch(`data/vocab/${unitId}.json`);
            if (!res.ok) throw new Error('파일을 찾을 수 없습니다.');
            const data = await res.json();
            this.words = data.words || [];
            return true;
        } catch (e) {
            console.error('단어 로드 실패:', e);
            App.toast('단어 데이터를 불러올 수 없습니다.', 'error');
            return false;
        }
    },

    // ===== 테스트 시작 =====
    async startTest() {
        const unitId = document.getElementById('vocab-unit-select').value;
        const loaded = await this.loadUnit(unitId);
        if (!loaded || this.words.length === 0) {
            App.toast('단어 데이터가 없습니다.', 'error');
            return;
        }

        // 셔플
        this.testWords = [...this.words].sort(() => Math.random() - 0.5);
        this.currentIndex = 0;
        this.score = { correct: 0, wrong: 0 };
        this.isActive = true;

        // 프로그레스 바 표시
        document.getElementById('vocab-progress').style.display = 'flex';
        this.updateProgress();
        this.showQuestion();
    },

    // ===== 문제 표시 =====
    showQuestion() {
        if (this.currentIndex >= this.testWords.length) {
            this.showResults();
            return;
        }

        const mode = document.getElementById('vocab-mode-select').value;
        const word = this.testWords[this.currentIndex];
        const container = document.getElementById('vocab-content');

        switch (mode) {
            case 'multiple-choice':
                this.renderMultipleChoice(container, word);
                break;
            case 'fill-blank':
                this.renderFillBlank(container, word);
                break;
            case 'listening':
                this.renderListening(container, word);
                break;
            case 'matching':
                this.renderMultipleChoice(container, word, true); // reverse
                break;
        }

        this.updateProgress();
    },

    // ===== 객관식 =====
    renderMultipleChoice(container, word, reverse = false) {
        // 정답 + 오답 3개 섞기
        const otherWords = this.words.filter(w => w.id !== word.id);
        const shuffled = otherWords.sort(() => Math.random() - 0.5).slice(0, 3);
        const options = [...shuffled.map(w => reverse ? w.ru : w.ko), reverse ? word.ru : word.ko]
            .sort(() => Math.random() - 0.5);

        const correctAnswer = reverse ? word.ru : word.ko;

        container.innerHTML = `
            <div class="vocab-question">
                <div class="word-display">${reverse ? word.ko : word.ru}</div>
                <div class="word-hint">${reverse ? '러시아어를 고르세요' : '뜻을 고르세요'}</div>
            </div>
            <div class="vocab-options">
                ${options.map(opt => `
                    <button class="vocab-option" data-answer="${opt}">${opt}</button>
                `).join('')}
            </div>
        `;

        // TTS 버튼 (러시아어 발음)
        if (!reverse) {
            const questionDiv = container.querySelector('.vocab-question');
            const ttsBtn = document.createElement('button');
            ttsBtn.className = 'btn-small';
            ttsBtn.textContent = '🔊 발음 듣기';
            ttsBtn.style.marginTop = '12px';
            ttsBtn.onclick = (e) => {
                e.stopPropagation();
                Audio_.speakText(word.ru).catch(() => {});
            };
            questionDiv.appendChild(ttsBtn);
        }

        // 옵션 클릭 이벤트
        container.querySelectorAll('.vocab-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const isCorrect = btn.dataset.answer === correctAnswer;
                this.handleAnswer(btn, isCorrect, correctAnswer, word.id);
            });
        });
    },

    // ===== 빈칸 채우기 =====
    renderFillBlank(container, word) {
        container.innerHTML = `
            <div class="vocab-question">
                <div class="word-display">${word.ko}</div>
                <div class="word-hint">러시아어로 입력하세요</div>
                ${word.example_ru ? `<div class="word-hint" style="margin-top:8px;font-style:italic;">예문: ${word.example_ru.replace(word.ru, '______')}</div>` : ''}
            </div>
            <input type="text" class="vocab-fill-input" id="fill-input" placeholder="러시아어 입력..." autocomplete="off" autocapitalize="off">
            <button class="btn-primary" id="btn-check-fill" style="margin-top:12px;">확인</button>
        `;

        const input = document.getElementById('fill-input');
        const btnCheck = document.getElementById('btn-check-fill');

        input.focus();

        const checkAnswer = () => {
            const answer = input.value.trim().toLowerCase();
            const correct = word.ru.toLowerCase();
            const isCorrect = answer === correct;

            if (!isCorrect) {
                input.style.borderColor = 'var(--danger)';
                App.toast(`정답: ${word.ru}`, 'error');
            }

            Storage.updateWordProgress(word.id, isCorrect);
            if (isCorrect) this.score.correct++;
            else this.score.wrong++;

            setTimeout(() => {
                this.currentIndex++;
                this.showQuestion();
            }, isCorrect ? 500 : 1500);
        };

        btnCheck.addEventListener('click', checkAnswer);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') checkAnswer();
        });
    },

    // ===== 듣고 쓰기 =====
    renderListening(container, word) {
        container.innerHTML = `
            <div class="vocab-question">
                <div class="word-display">🔊</div>
                <div class="word-hint">듣고 러시아어로 입력하세요</div>
                <button class="btn-primary" id="btn-play-word" style="margin-top:12px;">🔊 단어 듣기</button>
            </div>
            <input type="text" class="vocab-fill-input" id="listen-input" placeholder="들은 단어 입력..." autocomplete="off" autocapitalize="off">
            <button class="btn-primary" id="btn-check-listen" style="margin-top:12px;">확인</button>
        `;

        const btnPlay = document.getElementById('btn-play-word');
        const input = document.getElementById('listen-input');
        const btnCheck = document.getElementById('btn-check-listen');

        // 자동 재생
        Audio_.speakText(word.ru).catch(() => {});

        btnPlay.addEventListener('click', () => {
            Audio_.speakText(word.ru).catch(() => {});
        });

        const checkAnswer = () => {
            const answer = input.value.trim().toLowerCase();
            const correct = word.ru.toLowerCase();
            const isCorrect = answer === correct;

            if (!isCorrect) {
                App.toast(`정답: ${word.ru} — ${word.ko}`, 'error');
            } else {
                App.toast('정답! ✅', 'success');
            }

            Storage.updateWordProgress(word.id, isCorrect);
            if (isCorrect) this.score.correct++;
            else this.score.wrong++;

            setTimeout(() => {
                this.currentIndex++;
                this.showQuestion();
            }, isCorrect ? 500 : 2000);
        };

        btnCheck.addEventListener('click', checkAnswer);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') checkAnswer();
        });
    },

    // ===== 정답 처리 (객관식용) =====
    handleAnswer(btn, isCorrect, correctAnswer, wordId) {
        // 모든 버튼 비활성화
        const buttons = btn.parentElement.querySelectorAll('.vocab-option');
        buttons.forEach(b => {
            b.style.pointerEvents = 'none';
            if (b.dataset.answer === correctAnswer) {
                b.classList.add('correct');
            }
        });

        if (!isCorrect) {
            btn.classList.add('wrong');
        }

        Storage.updateWordProgress(wordId, isCorrect);
        if (isCorrect) this.score.correct++;
        else this.score.wrong++;

        setTimeout(() => {
            this.currentIndex++;
            this.showQuestion();
        }, isCorrect ? 600 : 1500);
    },

    // ===== 프로그레스 업데이트 =====
    updateProgress() {
        const total = this.testWords.length;
        const current = this.currentIndex;
        const pct = total > 0 ? (current / total * 100) : 0;

        document.getElementById('vocab-progress-fill').style.width = `${pct}%`;
        document.getElementById('vocab-progress-text').textContent = `${current} / ${total}`;
    },

    // ===== 결과 표시 =====
    showResults() {
        this.isActive = false;
        const total = this.score.correct + this.score.wrong;
        const pct = total > 0 ? Math.round(this.score.correct / total * 100) : 0;

        const container = document.getElementById('vocab-content');
        container.innerHTML = `
            <div class="vocab-question" style="padding:32px;">
                <div class="word-display">📊 테스트 결과</div>
                <div style="font-size:48px;font-weight:700;color:var(--accent);margin:16px 0;">${pct}%</div>
                <div style="color:var(--text-secondary);margin-bottom:16px;">
                    ✅ 정답: ${this.score.correct} &nbsp;&nbsp; ❌ 오답: ${this.score.wrong} &nbsp;&nbsp; 총: ${total}문제
                </div>
                <button class="btn-primary" onclick="Vocabulary.startTest()">다시 풀기 🔄</button>
            </div>
        `;

        document.getElementById('vocab-progress').style.display = 'none';

        // 학습 시간 기록 (대략 문제당 15초 가정)
        Storage.addStudyTime(Math.round(total * 15 / 60));

        // 마스터 단어 수 업데이트
        const progress = Storage.getVocabProgress();
        const mastered = Object.values(progress).filter(p => p.mastered).length;
        Storage.updateStats({ wordsMastered: mastered });
        Dashboard.refresh();
    },
};
