// OpenAI API 호출 담당
export async function transcribeAudio(audioBlob, apiKey) {
    const formData = new FormData();
    formData.append("file", audioBlob, "input.webm");
    formData.append("model", "whisper-1");
    
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST", headers: { "Authorization": `Bearer ${apiKey}` }, body: formData
    });
    return await res.json();
}

export async function getAIResponse(messages, apiKey) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: "gpt-4o",
            messages: messages,
            response_format: { type: "json_object" }
        })
    });
    return await res.json();
}

export async function generateSpeech(text, apiKey) {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "tts-1", input: text, voice: "shimmer" })
    });
    return await res.blob();
}
