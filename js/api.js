/**
 * api.js — API 호출 래퍼
 * OpenAI (GPT, STT, TTS), Google Gemini 통합
 */

const API = {

    // ===== OpenAI Chat Completion =====
    async chatOpenAI(messages, model = 'gpt-4o-mini') {
        const key = Storage.getApiKey('openai');
        if (!key) throw new Error('OpenAI API 키가 설정되지 않았습니다.');

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`,
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: 0.8,
                max_tokens: 1024,
            }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(`OpenAI 오류 (${res.status}): ${err.error?.message || '알 수 없는 오류'}`);
        }

        const data = await res.json();
        return data.choices[0].message.content;
    },

    // ===== Google Gemini =====
    async chatGemini(messages, model = 'gemini-2.0-flash') {
        const key = Storage.getApiKey('google');
        if (!key) throw new Error('Google AI API 키가 설정되지 않았습니다.');

        // OpenAI 메시지 형식 → Gemini 형식 변환
        const geminiContents = [];
        let systemInstruction = null;

        for (const msg of messages) {
            if (msg.role === 'system') {
                systemInstruction = msg.content;
            } else {
                geminiContents.push({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                });
            }
        }

        const body = {
            contents: geminiContents,
            generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 1024,
            },
        };

        if (systemInstruction) {
            body.systemInstruction = {
                parts: [{ text: systemInstruction }]
            };
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(`Gemini 오류 (${res.status}): ${err.error?.message || '알 수 없는 오류'}`);
        }

        const data = await res.json();
        return data.candidates[0].content.parts[0].text;
    },

    // ===== 통합 Chat — 선택된 LLM으로 자동 라우팅 =====
    async chat(messages, modelOverride = null) {
        const model = modelOverride || Storage.getSelectedLLM();
        const provider = Storage.getProviderForLLM(model);

        if (provider === 'openai') {
            return this.chatOpenAI(messages, model);
        } else if (provider === 'google') {
            return this.chatGemini(messages, model);
        }

        throw new Error(`지원되지 않는 모델: ${model}`);
    },

    // ===== STT: 음성 → 텍스트 (gpt-4o-mini-transcribe) =====
    async transcribe(audioBlob) {
        const key = Storage.getApiKey('openai');
        if (!key) throw new Error('OpenAI API 키가 설정되지 않았습니다.');

        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        formData.append('model', 'gpt-4o-mini-transcribe');
        formData.append('language', 'ru');

        const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
            },
            body: formData,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(`STT 오류 (${res.status}): ${err.error?.message || '알 수 없는 오류'}`);
        }

        const data = await res.json();
        return data.text;
    },

    // ===== TTS: 텍스트 → 음성 (OpenAI) =====
    async speak(text) {
        const key = Storage.getApiKey('openai');
        if (!key) throw new Error('OpenAI API 키가 설정되지 않았습니다.');

        const model = Storage.getSelectedTTS();
        const voice = Storage.getSelectedTTSVoice();

        const res = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`,
            },
            body: JSON.stringify({
                model: model,
                input: text,
                voice: voice,
                response_format: 'mp3',
            }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(`TTS 오류 (${res.status}): ${err.error?.message || '알 수 없는 오류'}`);
        }

        const blob = await res.blob();
        return blob;
    },

    // ===== API 키 테스트 =====
    async testOpenAIKey() {
        const key = Storage.getApiKey('openai');
        if (!key) return { ok: false, msg: '키가 입력되지 않았습니다.' };

        try {
            const res = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${key}` },
            });
            if (res.ok) {
                return { ok: true, msg: '✅ 연결 성공!' };
            } else {
                const err = await res.json().catch(() => ({}));
                return { ok: false, msg: `❌ ${err.error?.message || `오류 ${res.status}`}` };
            }
        } catch (e) {
            return { ok: false, msg: `❌ 네트워크 오류: ${e.message}` };
        }
    },

    async testGoogleKey() {
        const key = Storage.getApiKey('google');
        if (!key) return { ok: false, msg: '키가 입력되지 않았습니다.' };

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
            const res = await fetch(url);
            if (res.ok) {
                return { ok: true, msg: '✅ 연결 성공!' };
            } else {
                const err = await res.json().catch(() => ({}));
                return { ok: false, msg: `❌ ${err.error?.message || `오류 ${res.status}`}` };
            }
        } catch (e) {
            return { ok: false, msg: `❌ 네트워크 오류: ${e.message}` };
        }
    },
};
