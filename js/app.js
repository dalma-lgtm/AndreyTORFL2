// js/app.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("App 로드 완료, 이벤트 리스너 연결 중...");
    
    // UI가 혹시 초기화 안 됐을 경우 대비
    if (!window.ui) window.ui = new UI();

    const app = {
        apiKey: localStorage.getItem('openai_api_key') || '',
        systemPrompt: localStorage.getItem('system_prompt') || '',
        isRecording: false,
        mediaRecorder: null,
        audioChunks: [],

        init: function() {
            // 1. 버튼 요소 찾기
            const settingsBtn = document.getElementById('settings-btn');
            const saveBtn = document.getElementById('save-settings');
            const closeBtn = document.getElementById('close-settings');
            const micBtn = document.getElementById('mic-btn');
            const textInput = document.getElementById('text-input');

            // 2. 이벤트 리스너 연결 (null 체크 포함)
            if (settingsBtn) settingsBtn.onclick = () => window.ui.toggleSettings(true);
            
            if (closeBtn) closeBtn.onclick = () => window.ui.toggleSettings(false);

            if (saveBtn) {
                saveBtn.onclick = () => {
                    const key = document.getElementById('api-key-input').value.trim();
                    const prompt = document.getElementById('system-prompt').value;
                    
                    if (!key) {
                        alert("API Key를 입력해주세요!");
                        return;
                    }

                    this.apiKey = key;
                    this.systemPrompt = prompt;
                    localStorage.setItem('openai_api_key', key);
                    localStorage.setItem('system_prompt', prompt);
                    
                    window.ui.toggleSettings(false);
                    this.updateStatus(true);
                    alert("설정 저장 완료! 이제 대화해보세요.");
                };
            }

            if (micBtn) {
                micBtn.onclick = () => {
                    if (!this.apiKey) {
                        alert("설정(⚙️)에서 API Key를 먼저 입력해주세요.");
                        window.ui.toggleSettings(true);
                        return;
                    }
                    if (!this.isRecording) this.startRecording();
                    else this.stopRecording();
                };
            }

            if (textInput) {
                textInput.onkeypress = (e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                        if (!this.apiKey) {
                            alert("API Key가 필요합니다.");
                            return;
                        }
                        const text = e.target.value;
                        window.ui.addMessage(text, 'user');
                        e.target.value = '';
                        this.processText(text);
                    }
                };
            }

            // 초기 상태 확인
            if (this.apiKey) {
                document.getElementById('api-key-input').value = this.apiKey;
                this.updateStatus(true);
            }
        },

        updateStatus: function(ready) {
            const statusText = document.getElementById('connection-status');
            const statusDot = document.getElementById('status-dot');
            if (ready) {
                statusText.innerText = 'Ready (GPT-4o)';
                statusDot.classList.add('active');
            }
        },

        // --- 녹음 로직 ---
        startRecording: async function() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.mediaRecorder = new MediaRecorder(stream);
                this.audioChunks = [];

                this.mediaRecorder.ondataavailable = (e) => this.audioChunks.push(e.data);
                this.mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/mp3' });
                    await this.sendAudioToWhisper(audioBlob);
                };

                this.mediaRecorder.start();
                this.isRecording = true;
                window.ui.setOrbState('listening');
            } catch (err) {
                console.error("마이크 에러:", err);
                alert("마이크 권한을 허용해주세요. (https 환경 필수)");
            }
        },

        stopRecording: function() {
            if (this.mediaRecorder && this.isRecording) {
                this.mediaRecorder.stop();
                this.isRecording = false;
                window.ui.setOrbState('processing');
            }
        },

        // --- API 통신 로직 ---
        sendAudioToWhisper: async function(audioBlob) {
            const formData = new FormData();
            formData.append('file', audioBlob, 'voice.mp3');
            formData.append('model', 'whisper-1');

            try {
                const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${this.apiKey}` },
                    body: formData
                });
                const data = await res.json();
                if (data.text) {
                    window.ui.addMessage(data.text, 'user');
                    this.processText(data.text);
                } else {
                    throw new Error(data.error?.message || "인식 실패");
                }
            } catch (err) {
                console.error(err);
                window.ui.setOrbState('idle');
                alert("음성 인식 오류: " + err.message);
            }
        },

        processText: async function(text) {
            window.ui.setOrbState('processing');
            try {
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify({
                        model: "gpt-4o",
                        messages: [
                            { role: "system", content: this.systemPrompt },
                            { role: "user", content: text }
                        ]
                    })
                });
                const data = await res.json();
                const aiResponse = data.choices[0].message.content;
                
                window.ui.addMessage(aiResponse, 'ai');
                this.speakTTS(aiResponse);

            } catch (err) {
                console.error(err);
                window.ui.setOrbState('idle');
            }
        },

        speakTTS: async function(text) {
            window.ui.setOrbState('speaking');
            try {
                const res = await fetch('https://api.openai.com/v1/audio/speech', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify({
                        model: "tts-1",
                        voice: "nova",
                        input: text
                    })
                });
                const blob = await res.blob();
                const audio = new Audio(URL.createObjectURL(blob));
                audio.onended = () => window.ui.setOrbState('idle');
                audio.play();
            } catch (err) {
                console.error(err);
                window.ui.setOrbState('idle');
            }
        }
    };

    // 앱 실행
    app.init();
});
