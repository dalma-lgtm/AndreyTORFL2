import { transcribeAudio, getAIResponse, generateSpeech } from './api.js';
import { fetchVocabulary } from './dataLoader.js'; // 같은 폴더에 있어야 함

// 1. 설정 및 상태 관리
const apiKey = localStorage.getItem('openai_key') || prompt("OpenAI API Key를 입력하세요 (sk-...):");
if (apiKey) localStorage.setItem('openai_key', apiKey);

let vocabList = []; // 단어장 데이터 담을 곳

// 2. 탭 전환 로직
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // 버튼 스타일 초기화
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // 선택된 탭 활성화
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab'); // data-tab="chat" or "vocab"
        document.getElementById(`${tabId}-tab`).classList.add('active');
    });
});

// ==========================================
// 🗣️ [기능 1] 말하기 (Speaking) 모드
// ==========================================
const recBtn = document.getElementById('rec-btn');
let mediaRecorder;
let audioChunks = [];

// 마이크 권한 요청
if (navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            audioChunks = [];
            
            // UI 업데이트: 처리 중
            addMessage("⏳ 처리 중...", 'system');

            try {
                // 1. Whisper (STT)
                const sttData = await transcribeAudio(audioBlob, apiKey);
                if (!sttData.text) throw new Error("음성 인식 실패");
                
                // 유저 메시지 표시 (기존 시스템 메시지 삭제 후)
                document.querySelector('.message.system')?.remove();
                addMessage(sttData.text, 'user');

                // 2. GPT (LLM) - 토르플 감독관 모드
                const messages = [
                    { 
                        role: "system", 
                        content: `You are a strict TORFL-2 (B2) Russian examiner. 
                                  User Input: "${sttData.text}".
                                  1. If grammar is wrong, provide correction in JSON 'correction'.
                                  2. Reply formally in Russian as an examiner in 'reply'.
                                  3. Output JSON: { "correction": "string", "reply": "string" }` 
                    },
                    { role: "user", content: sttData.text }
                ];
                
                const gptData = await getAIResponse(messages, apiKey);
                const aiContent = JSON.parse(gptData.choices[0].message.content);

                addMessage(aiContent.reply, 'ai', aiContent.correction);

                // 3. TTS (음성 재생)
                const ttsBlob = await generateSpeech(aiContent.reply, apiKey);
                const audio = new Audio(URL.createObjectURL(ttsBlob));
                audio.play();

            } catch (e) {
                console.error(e);
                addMessage("❌ 오류: " + e.message, 'system');
            }
        };
    });
}

// 버튼 이벤트
recBtn.addEventListener('mousedown', () => {
    if (!mediaRecorder) return alert("마이크 권한이 필요합니다.");
    audioChunks = [];
    mediaRecorder.start();
    recBtn.innerText = "👂 듣는 중...";
    recBtn.style.background = "#fa5252"; // 빨간색
});

recBtn.addEventListener('mouseup', () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        recBtn.innerText = "🎤 말하기 (Hold)";
        recBtn.style.background = "#40c057"; // 초록색
    }
});

function addMessage(text, type, correction = null) {
    const chatBox = document.getElementById('chat-box');
    const div = document.createElement('div');
    div.className = `message ${type}`;
    
    if (correction) {
        div.innerHTML = `<span style="display:block; color:#e03131; font-size:0.8em; margin-bottom:5px;">💡 ${correction}</span>${text}`;
    } else {
        div.innerText = text;
    }
    
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}


// ==========================================
// 📚 [기능 2] 단어장 (Vocabulary) 모드
// ==========================================
document.getElementById('sync-btn').addEventListener('click', async () => {
    const display = document.getElementById('vocab-display');
    display.innerText = "⏳ GitHub에서 단어장 불러오는 중...";
    
    // dataLoader.js의 함수 사용
    vocabList = await fetchVocabulary();
    
    if (vocabList.length > 0) {
        display.innerHTML = `✅ <b>${vocabList.length}개</b>의 단어를 불러왔습니다!<br><br>`;
        
        // 퀴즈 시작 버튼 생성
        const quizBtn = document.createElement('button');
        quizBtn.innerText = "🎯 랜덤 퀴즈 시작";
        quizBtn.className = "action-btn";
        quizBtn.style.marginTop = "10px";
        quizBtn.onclick = startQuiz;
        display.appendChild(quizBtn);
    } else {
        display.innerText = "❌ 단어를 불러오지 못했습니다. (data/vocabulary.json 경로 확인)";
    }
});

function startQuiz() {
    if (vocabList.length === 0) return;
    
    const randomWord = vocabList[Math.floor(Math.random() * vocabList.length)];
    const display = document.getElementById('vocab-display');
    
    display.innerHTML = `
        <div style="font-size: 1.5em; font-weight: bold; margin: 20px 0;">
            ${randomWord.word}
        </div>
        <div id="answer-area" style="display:none; color: #495057;">
            <b>뜻:</b> ${randomWord.meaning}<br>
            <b>예문:</b> ${randomWord.example}
        </div>
        <button id="show-ans-btn" class="action-btn secondary" style="margin-top:10px;">정답 확인</button>
        <button id="next-quiz-btn" class="action-btn" style="display:none; margin-top:10px;">다음 문제</button>
    `;

    document.getElementById('show-ans-btn').onclick = function() {
        document.getElementById('answer-area').style.display = 'block';
        this.style.display = 'none';
        document.getElementById('next-quiz-btn').style.display = 'block';
    };

    document.getElementById('next-quiz-btn').onclick = startQuiz;
}
