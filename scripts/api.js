// scripts/api.js

// 1. OpenAI (기존 유지)
export async function getOpenAIResponse(messages, apiKey, modelName) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: modelName,
            messages: messages,
            response_format: { type: "json_object" }
        })
    });
    return await res.json();
}

// 2. Google Gemini (신규 추가)
export async function getGeminiResponse(messages, apiKey, modelName) {
    // Gemini는 메시지 구조가 다름 (user/model)
    const geminiContent = messages.map(msg => {
        return {
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }]
        };
    });

    // 시스템 프롬프트는 별도 처리 필요하지만, 간편하게 user 메시지 앞에 붙이는 방식 사용 (Gemini 1.5/3 공통)
    // 혹은 v1beta API의 systemInstruction 사용 가능. 여기선 호환성 위해 메시지로 병합.
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: geminiContent,
            generationConfig: { responseMimeType: "application/json" } // JSON 모드
        })
    });
    
    const data = await res.json();
    
    // OpenAI 포맷으로 변환해서 리턴 (그래야 main.js가 안 헷갈림)
    if (data.candidates && data.candidates[0].content) {
        return {
            choices: [{
                message: {
                    content: data.candidates[0].content.parts[0].text
                }
            }]
        };
    } else {
        throw new Error(JSON.stringify(data));
    }
}

// ... (transcribeAudio, generateSpeech는 OpenAI 꺼 계속 씀 - Gemini TTS/STT는 복잡해서)
export async function transcribeAudio(audioBlob, apiKey) {
    // Whisper는 성능이 좋으니 계속 OpenAI 씁시다
    const formData = new FormData();
    formData.append("file", audioBlob, "input.webm");
    formData.append("model", "whisper-1");
    
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST", headers: { "Authorization": `Bearer ${apiKey}` }, body: formData
    });
    return await res.json();
}

export async function generateSpeech(text, apiKey, voiceName) {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "tts-1", input: text, voice: voiceName })
    });
    return await res.blob();
}
