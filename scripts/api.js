// 기존 함수 수정
export async function getAIResponse(messages, apiKey, modelName = "gpt-4o") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: modelName, // 🔥 여기가 동적으로 변함
            messages: messages,
            response_format: { type: "json_object" }
        })
    });
    return await res.json();
}

export async function generateSpeech(text, apiKey, voiceName = "onyx") {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "tts-1", input: text, voice: voiceName }) // 🔥 목소리 동적 변경
    });
    return await res.blob();
}

// transcribeAudio는 그대로...
export async function transcribeAudio(audioBlob, apiKey) {
    const formData = new FormData();
    formData.append("file", audioBlob, "input.webm");
    formData.append("model", "whisper-1");
    // formData.append("language", "ru"); // 필요시 주석 해제
    
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST", headers: { "Authorization": `Bearer ${apiKey}` }, body: formData
    });
    return await res.json();
}
