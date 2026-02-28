import { transcribeAudio, getAIResponse, generateSpeech } from './api.js';
import { fetchVocabulary } from './dataLoader.js';

// ==========================================
// 0. 안전장치: 화면 로드 대기
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 App Initialized");
    initApp();
});

function initApp() {
    // 1. 설정값 불러오기
    const state = {
        apiKey: localStorage.getItem('openai_key') || '',
        model: localStorage.getItem('selected_model') || 'gpt-4o',
        voice: localStorage.getItem('selected_voice') || 'onyx',
        systemPrompt: localStorage.getItem('system_prompt') || document.getElementById('system-prompt').value
    };

    // UI 초기값 반영
    if(document.getElementById('api-key-input')) document.getElementById('api-key-input').value = state.apiKey;
    if(document.getElementById('model-select')) document.getElementById('model-select').value = state.model;
    if(document.getElementById('voice-select')) document.getElementById('voice-select').value = state.voice;
    if(document.getElementById('system-prompt')) document.getElementById('system-prompt').value = state.systemPrompt;
    
    const modelDisplay = document.getElementById('current-model-display');
    if(modelDisplay) modelDisplay.innerText = state.model;

    // ==========================================
    // 2. 탭 전환 로직 (사이드바)
    // ==========================================
    const navBtns = document.querySelectorAll('.nav-btn');
    const panels = document.querySelectorAll('.panel');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 모든 버튼/패널 비활성화
            navBtns.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            
            // 클릭한 것만 활성화
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            const targetPanel = document.getElementById(targetId);
            
            if(targetPanel) {
                targetPanel.classList.add('active');
                console.log(`Tab switched to: ${targetId}`);
            } else {
                console.error(`Panel not found: ${targetId}`);
            }
        });
    });

    // ==========================================
    // 3. 채팅 & 녹음 로직
    // ==========================================
    const sendBtn = document.getElementById('send-btn');
    const textInput = document.getElementById('text-input');
    const recBtn = document.getElementById('rec-btn');

    // 전송 버튼
    if(sendBtn && textInput) {
        sendBtn.addEventListener('click', () => {
            const text = textInput.value;
            if(text) {
                handleInput(text, state);
                textInput.value = "";
            }
        });

        textInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') sendBtn.click();
        });
    }

    // 녹음 버튼
    let mediaRecorder;
    let audioChunks = [];

    if(recBtn) {
        if(navigator.mediaDevices) {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
                mediaRecorder.onstop = async () => {
                    const blob = new Blob(audioChunks, { type: 'audio/webm' });
                    audioChunks = [];
                    
                    addLog("[SYSTEM] Transcribing...", 'system');
                    try {
                        const stt = await transcribeAudio(blob, state.apiKey);
                        if(stt.text) handleInput(stt.text, state);
                        else throw new Error("No speech detected");
                    } catch(e) {
                        addLog(`[ERROR] STT Failed: ${e.message}`, 'system');
                    }
                };
            }).catch(err => {
                console.error("Mic Error:", err);
                addLog("[ERROR] Microphone access denied.", 'system');
            });
        }

        recBtn.addEventListener('mousedown', () => {
            if(!mediaRecorder) return alert("Microphone not ready.");
            audioChunks = [];
            mediaRecorder.start();
            recBtn.classList.add('recording'); // 스타일 클래스 추가
            recBtn.innerHTML = '<i class="ri-record-circle-line"></i> REC...';
        });

        recBtn.addEventListener('mouseup', () => {
            if(mediaRecorder && mediaRecorder.state === "recording") {
                mediaRecorder.stop();
                recBtn.classList.remove('recording');
                recBtn.innerHTML = '<i class="ri-mic-line"></i> REC';
            }
        });
    }

    // ==========================================
    // 4. 설정 저장 로직
    // ==========================================
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if(saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            state.apiKey = document.getElementById('api-key-input').value;
            state.model = document.getElementById('model-select').value;
            state.voice = document.getElementById('voice-select').value;
            
            localStorage.setItem('openai_key', state.apiKey);
            localStorage.setItem('selected_model', state.model);
            localStorage.setItem('selected_voice', state.voice);
            
            alert("✅ Settings Saved!");
            if(modelDisplay) modelDisplay.innerText = state.model;
        });
    }

    const savePromptBtn = document.getElementById('save-prompt-btn');
    if(savePromptBtn) {
        savePromptBtn.addEventListener('click', () => {
            state.systemPrompt = document.getElementById('system-prompt').value;
            localStorage.setItem('system_prompt', state.systemPrompt);
            alert("🧠 Brain Updated!");
        });
    }
}

// ==========================================
// Helper Functions
// ==========================================
async function handleInput(text, state) {
    if(!state.apiKey) return alert("Please set API Key in Settings first.");
    
    addLog(`[USER] ${text}`, 'user');
    addLog(`[SYSTEM] Thinking with ${state.model}...`, 'system');

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
        const autoTTS = document.getElementById('auto-tts');
        if(autoTTS && autoTTS.checked) {
            const audioBlob = await generateSpeech(aiResponse.reply, state.apiKey, state.voice);
            new Audio(URL.createObjectURL(audioBlob)).play();
        }

    } catch (e) {
        console.error(e);
        addLog(`[ERROR] ${e.message}`, 'system');
    }
}

function addLog(text, type, correction = null) {
    const box = document.getElementById('chat-box');
    if(!box) return console.error("Chat box not found!");

    const div = document.createElement('div');
    div.className = `msg ${type}`;
    
    if(correction && correction !== "null") {
        div.innerHTML = `<span class="correction" style="color:#ff6b6b; display:block; font-size:0.8em; margin-bottom:5px;">⚠️ CORRECTION: ${correction}</span>${text}`;
    } else {
        div.innerText = text;
    }
    
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}
