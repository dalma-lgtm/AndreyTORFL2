import { transcribeAudio, getAIResponse, generateSpeech } from './api.js';

// ==========================================
// 1. State Management (설정값 로드)
// ==========================================
const state = {
    provider: localStorage.getItem('provider') || 'openai', // 'openai' or 'google'
    openaiKey: localStorage.getItem('openai_key') || '',
    googleKey: localStorage.getItem('google_key') || '',
    openaiModel: localStorage.getItem('openai_model') || 'gpt-5.2',
    googleModel: localStorage.getItem('google_model') || 'gemini-3-flash',
    systemPrompt: localStorage.getItem('system_prompt') || document.getElementById('system-prompt').value
};

// 초기값 UI 반영
document.getElementById('active-provider').value = state.provider;
document.getElementById('openai-key-input').value = state.openaiKey;
document.getElementById('google-key-input').value = state.googleKey;
document.getElementById('openai-model-select').value = state.openaiModel;
document.getElementById('google-model-select').value = state.googleModel;

updateDashboard();

// ==========================================
// 2. Navigation (사이드바 탭 전환)
// ==========================================
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
    });
});

// ==========================================
// 3. Settings & Prompt Save
// ==========================================
document.getElementById('save-settings-btn').addEventListener('click', () => {
    state.provider = document.getElementById('active-provider').value;
    state.openaiKey = document.getElementById('openai-key-input').value;
    state.googleKey = document.getElementById('google-key-input').value;
    state.openaiModel = document.getElementById('openai-model-select').value;
    state.googleModel = document.getElementById('google-model-select').value;
    
    localStorage.setItem('provider', state.provider);
    localStorage.setItem('openai_key', state.openaiKey);
    localStorage.setItem('google_key', state.googleKey);
    localStorage.setItem('openai_model', state.openaiModel);
    localStorage.setItem('google_model', state.googleModel);
    
    alert("✅ Settings Saved!");
    updateDashboard();
});

function updateDashboard() {
    const modelDisplay = state.provider === 'openai' ? state.openaiModel : state.googleModel;
    document.getElementById('current-model-display').innerText = `${state.provider.toUpperCase()} / ${modelDisplay}`;
}

// ==========================================
// 4. Chat Engine
// ==========================================
async function handleInput(text) {
    // 키 확인
    const activeKey = state.provider === 'openai' ? state.openaiKey : state.googleKey;
    if(!activeKey) return alert(`Please set ${state.provider.toUpperCase()} API Key first.`);
    
    addLog(`[USER] ${text}`, 'user');
    addLog(`[SYSTEM] Thinking with ${state.provider}...`, 'system');

    try {
        const messages = [
            { role: "system", content: state.systemPrompt },
            { role: "user", content: text }
        ];

        let responseData;
        
        // 공급자에 따라 다른 함수 호출
        if (state.provider === 'openai') {
            responseData = await getOpenAIResponse(messages, state.openaiKey, state.openaiModel);
        } else {
            responseData = await getGeminiResponse(messages, state.googleKey, state.googleModel);
        }

        const aiResponse = JSON.parse(responseData.choices[0].message.content);

        addLog(`[AI] ${aiResponse.reply}`, 'ai', aiResponse.correction);

        // TTS는 OpenAI API를 빌려 씀 (Gemini TTS보다 접근성이 좋아서)
        // 주의: Google 모드여도 TTS를 쓰려면 OpenAI 키가 필요함! (없으면 스킵)
        if(document.getElementById('auto-tts').checked && state.openaiKey) {
            const audioBlob = await generateSpeech(aiResponse.reply, state.openaiKey, "onyx");
            new Audio(URL.createObjectURL(audioBlob)).play();
        }

    } catch (e) {
        console.error(e);
        addLog(`[ERROR] ${e.message}`, 'system');
    }
}   

// ==========================================
// 5. Event Listeners (Input)
// ==========================================
document.getElementById('send-btn').addEventListener('click', () => {
    const input = document.getElementById('text-input');
    if(input.value) {
        handleInput(input.value);
        input.value = "";
    }
});

// Recorder Logic (간소화)
const recBtn = document.getElementById('rec-btn');
let mediaRecorder;
let audioChunks = [];

if(navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = async () => {
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            audioChunks = [];
            addLog("[SYSTEM] Transcribing audio...", 'system');
            
            const stt = await transcribeAudio(blob, state.apiKey);
            handleInput(stt.text);
        };
    });
}

recBtn.addEventListener('mousedown', () => {
    audioChunks = [];
    mediaRecorder?.start();
    recBtn.classList.add('active');
    recBtn.innerHTML = '<i class="ri-record-circle-line"></i> REC';
});

recBtn.addEventListener('mouseup', () => {
    mediaRecorder?.stop();
    recBtn.classList.remove('active');
    recBtn.innerHTML = '<i class="ri-mic-line"></i> REC';
});
