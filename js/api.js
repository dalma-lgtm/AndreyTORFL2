// js/api.js

window.api = {
    // 1. 통합 처리 (음성 -> 텍스트 -> GPT -> 오디오)
    processVoiceInteraction: async function(audioBlob) {
        const apiKey = localStorage.getItem('torfl_apikey');
        
        try {
            // Step 1: Whisper (STT)
            const formData = new FormData();
            formData.append('file', audioBlob, 'voice.mp3');
            formData.append('model', 'whisper-1');

            const sttRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}` },
                body: formData
            });
            const sttData = await sttRes.json();
            
            if (!sttData.text) throw new Error('음성 인식 실패');
            
            // 화면에 사용자 메시지 표시
            addChatMessage(sttData.text, 'user');

            // Step 2: GPT (LLM)
            const model = localStorage.getItem('torfl_model') || 'gpt-4o';
            const systemPrompt = localStorage.getItem('torfl_prompt') || 'You are a helpful tutor.';

            const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: sttData.text }
                    ]
                })
            });
            const chatData = await chatRes.json();
            const aiText = chatData.choices[0].message.content;

            // 화면에 AI 메시지 표시
            addChatMessage(aiText, 'ai');

            // Step 3: TTS (Text-to-Speech)
            const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "tts-1",
                    voice: "nova",
                    input: aiText
                })
            });
            const audioBlob = await ttsRes.blob();

            // 오디오 재생 요청
            window.audioController.playAudio(audioBlob);

        } catch (err) {
            console.error(err);
            window.audioController.setOrbState('idle', 'Error: ' + err.message);
            addChatMessage('오류가 발생했습니다: ' + err.message, 'ai');
        }
    }
};

// 채팅 UI 업데이트 함수
function addChatMessage(text, sender) {
    const log = document.getElementById('chat-log');
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${sender}`;
    msgDiv.innerText = text;
    log.appendChild(msgDiv);
    log.scrollTop = log.scrollHeight;
}
