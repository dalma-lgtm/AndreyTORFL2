import { transcribeAudio, getAIResponse, generateSpeech } from './api.js';

// ==========================================
// 1. State Management (설정값 로드)
// ==========================================
const state = {
    apiKey: localStorage.getItem('openai_key') || '',
    model: localStorage.getItem('selected_model') || 'gpt-4o',
    voice: localStorage.getItem('selected_voice') || 'onyx',
    systemPrompt: localStorage.getItem('system_prompt') || document.getElementById('system-prompt').value
};

// 초기값 UI 반영
document.getElementById('api-key-input').value = state.apiKey;
document.getElementById('model-select').value = state.model;
document.getElementById('voice-select').value = state.voice;
document.getElementById('system-prompt').value = state.systemPrompt;
document.getElementById('current-model-display').innerText = state.model;

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
    state.apiKey = document.getElementById('api-key-input').value;
    state.model = document.getElementById('model-select').value;
    state.voice = document.getElementById('voice-select').value;
    
    localStorage.setItem('openai_key', state.apiKey);
    localStorage.setItem('selected_model', state.model);
    localStorage.setItem('selected_voice', state.voice);
    
    alert("✅ Settings Saved!");
    document.getElementById('current-model-display').innerText = state.model;
});

document.getElementById('save-prompt-btn').addEventListener('click', () => {
    state.systemPrompt = document.getElementById('system-prompt').value;
    localStorage.setItem('system_prompt', state.systemPrompt);
    alert("🧠 Brain Updated!");
});

// ==========================================
// 4. Chat Engine
// ==========================================
async function handleInput(text) {
    if(!state.apiKey) return alert("Please set API Key in Settings first.");
    
    addLog(`[USER] ${text}`, 'user');
    addLog(`[SYSTEM] Processing with ${state.model}...`, 'system');

    try {
        const messages = [
            { role: "system", content: state.systemPrompt },
            { role: "user", content: text }
        ];

        // 1. GPT Call
        const gptData = await getAIResponse(messages, state.apiKey, state.model);
        const aiResponse = JSON.parse(gptData.choices[0].message.content);

        // 2. Display
        addLog(`[AI] ${aiResponse.reply}`, 'ai', aiResponse.correction);

        // 3. TTS (Auto-play option check)
        if(document.getElementById('auto-tts').checked) {
            const audioBlob = await generateSpeech(aiResponse.reply, state.apiKey, state.voice);
            new Audio(URL.createObjectURL(audioBlob)).play();
        }

    } catch (e) {
        addLog(`[ERROR] ${e.message}`, 'system');
    }
}

function addLog(text, type, correction = null) {
    const box = document.getElementById('chat-box');
    const div = document.createElement('div');
    div.className = `msg ${type}`;
    
    if(correction && correction !== "null") {
        div.innerHTML = `<span class="correction">⚠️ CORRECTION: ${correction}</span>${text}`;
    } else {
        div.innerText = text;
    }
    
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
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
