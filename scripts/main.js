import { transcribeAudio, getAIResponse, generateSpeech } from './api.js';
import { fetchVocabulary } from './dataLoader.js';

// 상태 관리
let apiKey = localStorage.getItem('openai_key') || prompt("OpenAI API Key를 입력하세요:");
if(apiKey) localStorage.setItem('openai_key', apiKey);

// 탭 전환 로직
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
    });
});

// 단어장 불러오기 버튼
document.getElementById('sync-btn').addEventListener('click', async () => {
    const vocab = await fetchVocabulary();
    const display = document.getElementById('vocab-display');
    
    if(vocab.length > 0) {
        display.innerHTML = `✅ ${vocab.length}개의 단어를 불러왔습니다!<br>예시: ${vocab[0].word} - ${vocab[0].meaning}`;
    } else {
        display.innerText = "❌ 데이터를 불러오지 못했습니다. (GitHub 경로 확인)";
    }
});

// 녹음 로직 (간소화)
// 실제 구현 시 audio.js로 분리 권장
const recBtn = document.getElementById('rec-btn');
let mediaRecorder;
let audioChunks = [];

navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        audioChunks = [];
        
        // 1. Whisper API 호출
        const sttData = await transcribeAudio(blob, apiKey);
        addMessage(sttData.text, 'user');
        
        // 2. GPT 호출 (임시 메시지)
        const messages = [{ role: "user", content: sttData.text }];
        const gptData = await getAIResponse(messages, apiKey);
        const aiResponse = JSON.parse(gptData.choices[0].message.content);
        
        addMessage(aiResponse.reply, 'ai');
        
        // 3. TTS 재생
        const audioBlob = await generateSpeech(aiResponse.reply, apiKey);
        new Audio(URL.createObjectURL(audioBlob)).play();
    };
});

recBtn.addEventListener('mousedown', () => {
    audioChunks = [];
    mediaRecorder.start();
    recBtn.innerText = "👂 듣는 중...";
});

recBtn.addEventListener('mouseup', () => {
    mediaRecorder.stop();
    recBtn.innerText = "🎤 말하기 (Hold)";
});

function addMessage(text, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerText = text;
    document.getElementById('chat-box').appendChild(div);
}
