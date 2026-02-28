/**
 * audio.js — 마이크 녹음 + 오디오 재생
 * MediaRecorder API 사용
 */

const Audio_ = {
    mediaRecorder: null,
    audioChunks: [],
    isRecording: false,
    currentAudio: null,

    // ===== 마이크 녹음 시작 =====
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });

            this.audioChunks = [];

            // webm 선호, 안 되면 mp4, 마지막으로 기본값
            let mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/mp4';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = '';
                }
            }

            const options = mimeType ? { mimeType } : {};
            this.mediaRecorder = new MediaRecorder(stream, options);

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.audioChunks.push(e.data);
                }
            };

            this.mediaRecorder.start(100); // 100ms 간격으로 데이터 수집
            this.isRecording = true;
            return true;
        } catch (e) {
            console.error('마이크 접근 실패:', e);
            throw new Error('마이크 접근이 거부되었습니다. 브라우저 설정에서 마이크를 허용해주세요.');
        }
    },

    // ===== 녹음 중지 + Blob 반환 =====
    stopRecording() {
        return new Promise((resolve) => {
            if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
                resolve(null);
                return;
            }

            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.audioChunks, {
                    type: this.mediaRecorder.mimeType || 'audio/webm'
                });
                // 스트림 정리
                this.mediaRecorder.stream.getTracks().forEach(t => t.stop());
                this.isRecording = false;
                resolve(blob);
            };

            this.mediaRecorder.stop();
        });
    },

    // ===== TTS 오디오 재생 =====
    async playBlob(blob) {
        // 이전 재생 중지
        this.stopPlaying();

        const url = URL.createObjectURL(blob);
        this.currentAudio = new window.Audio(url);

        return new Promise((resolve, reject) => {
            this.currentAudio.onended = () => {
                URL.revokeObjectURL(url);
                this.currentAudio = null;
                resolve();
            };
            this.currentAudio.onerror = (e) => {
                URL.revokeObjectURL(url);
                this.currentAudio = null;
                reject(new Error('오디오 재생 실패'));
            };
            this.currentAudio.play().catch(reject);
        });
    },

    // ===== 재생 중지 =====
    stopPlaying() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
    },

    // ===== TTS로 텍스트 읽기 (API 호출 + 재생) =====
    async speakText(text) {
        try {
            const blob = await API.speak(text);
            await this.playBlob(blob);
        } catch (e) {
            console.error('TTS 오류:', e);
            throw e;
        }
    },
};
