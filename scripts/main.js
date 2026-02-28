import { transcribeAudio, getAIResponse, generateSpeech } from './api.js';
import { fetchVocabulary } from './dataLoader.js';

// ==========================================
// 1. 설정 및 초기화
// ==========================================
const apiKey = localStorage.getItem('openai_key') || prompt("OpenAI API Key를 입력하세요 (sk-...):");
if (apiKey) localStorage.setItem('openai_key', apiKey);

let vocabList = []; // 단어장 데이터

// 탭 전환 로직
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        document.getElementById(`${tabId}-tab`).classList.add('active');
    });
});


// ==========================================
// 2. 공통 AI 처리 함수 (말하기 & 채팅 겸용)
// ==========================================
async function handleUserInput(userText) {
    if (!userText.trim()) return;

    // 사용자 메시지 표시
    addMessage(userText, 'user');
    
    // 로딩 표시
    const loadingId = addMessage("🤔 생각 중...", 'system');

    try {
        // GPT (토르플 감독관 모드)
        const messages = [
            { 
                role: "system", 
                content: `You are a strict TORFL-2 (B2) Russian examiner. 
                          User Input: "${userText}".
                          Rules:
                          1. If grammar/expression is unnatural, provide correction in JSON 'correction'.
                          2. Reply formally in Russian as an examiner in 'reply'.
                          3. Output JSON: { "correction": "string or null", "reply": "string" }` 
            },
            { role: "user", content: userText }
        ];

        const gptData = await getAIResponse(messages, apiKey);
        const aiContent = JSON.parse(gptData.choices[0].message.content);

        // 로딩 삭제
        document.getElementById(loadingId)?.remove();

        // AI 응답 표시
        addMessage(aiContent.reply, 'ai', aiContent.correction);

        // TTS 재생
        const ttsBlob = await generateSpeech(aiContent.reply, apiKey);
        const audio = new Audio(URL.createObjectURL(ttsBlob));
        audio.play();

    } catch (e) {
        console.error(e);
        document.getElementById(loadingId)?.remove();
        addMessage("❌ 오류: " + e.message, 'system');
    }
}


// ==========================================
// 3. 채팅 (Text Chat) 이벤트
// ==========================================
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');

if (sendBtn && textInput) {
    sendBtn.addEventListener('click', () => {
        const text = textInput.value;
        if (text) {
            handleUserInput(text);
            textInput.value = "";
        }
    });

    textInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendBtn.click();
    });
}


// ==========================================
// 4. 말하기 (Speaking) 이벤트
// ==========================================
const recBtn = document.getElementById('rec-btn');
let mediaRecorder;
let audioChunks = [];

if (navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            audioChunks = [];
            
            // 임시 로딩 메시지
            const loadingId = addMessage("⏳ 음성 변환 중...", 'system');

            try {
                // Whisper API 호출 (러시아어 인식)
                const sttData = await transcribeAudio(audioBlob, apiKey);
                document.getElementById(loadingId)?.remove();

                if (!sttData.text) throw new Error("음성 인식 실패");
                
                // 텍스트와 동일한 처리 로직 실행
                await handleUserInput(sttData.text);

            } catch (e) {
                console.error(e);
                document.getElementById(loadingId)?.remove();
                addMessage("❌ 오류: " + e.message, 'system');
            }
        };
    });
}

recBtn.addEventListener('mousedown', () => {
    if (!mediaRecorder) return alert("마이크 권한이 필요합니다.");
    audioChunks = [];
    mediaRecorder.start();
    recBtn.innerText = "👂 듣는 중...";
    recBtn.style.background = "#fa5252";
});

recBtn.addEventListener('mouseup', () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        recBtn.innerText = "🎤 말하기 (Hold)";
        recBtn.style.background = "#40c057";
    }
});


// ==========================================
// 5. UI 유틸리티 (메시지 추가)
// ==========================================
function addMessage(text, type, correction = null) {
    const chatBox = document.getElementById('chat-box');
    const div = document.createElement('div');
    const msgId = 'msg-' + Date.now() + Math.random();
    div.id = msgId;
    div.className = `message ${type}`;
    
    if (correction && correction !== "null") {
        div.innerHTML = `<span style="display:block; color:#e03131; font-size:0.85em; font-weight:bold; margin-bottom:5px; background:#fff5f5; padding:4px; border-radius:4px;">💡 ${correction}</span>${text}`;
    } else {
        div.innerText = text;
    }
    
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return msgId;
}


// ==========================================
// 6. 단어장 (Vocabulary) 모드
// ==========================================
const syncBtn = document.getElementById('sync-btn');
if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
        const display = document.getElementById('vocab-display');
        display.innerText = "⏳ GitHub에서 단어장 불러오는 중...";
        
        vocabList = await fetchVocabulary();
        
        if (vocabList.length > 0) {
            display.innerHTML = `✅ <b>${vocabList.length}개</b>의 단어를 불러왔습니다!<br><br>`;
            
            const quizBtn = document.createElement('button');
            quizBtn.innerText = "🎯 랜덤 퀴즈 시작";
            quizBtn.className = "action-btn";
            quizBtn.style.marginTop = "10px";
            quizBtn.onclick = startQuiz;
            display.appendChild(quizBtn);
        } else {
            display.innerText = "❌ 단어를 불러오지 못했습니다. (경로 확인 필요)";
        }
    });
}

function startQuiz() {
    if (vocabList.length === 0) return;
    
    const randomWord = vocabList[Math.floor(Math.random() * vocabList.length)];
    const display = document.getElementById('vocab-display');
    
    display.innerHTML = `
        <div style="font-size: 1.8em; font-weight: bold; margin: 30px 0; color: #228be6;">
            ${randomWord.word}
        </div>
        <div id="answer-area" style="display:none; background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: left;">
            <p><b>뜻:</b> ${randomWord.meaning}</p>
            <p><b>예문:</b> <span style="color:#868e96">${randomWord.example}</span></p>
        </div>
        <button id="show-ans-btn" class="action-btn secondary" style="margin-top:20px;">정답 확인</button>
        <button id="next-quiz-btn" class="action-btn" style="display:none; margin-top:20px;">다음 문제</button>
    `;

    document.getElementById('show-ans-btn').onclick = function() {
        document.getElementById('answer-area').style.display = 'block';
        this.style.display = 'none';
        document.getElementById('next-quiz-btn').style.display = 'block';
    };

    document.getElementById('next-quiz-btn').onclick = startQuiz;
}
