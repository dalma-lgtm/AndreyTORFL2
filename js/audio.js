// js/audio.js

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

const micBtn = document.getElementById('btn-mic');
const orb = document.getElementById('ai-orb');
const orbText = document.getElementById('orb-status-text');

// 마이크 버튼 클릭 이벤트
micBtn.addEventListener('click', () => {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
});

async function startRecording() {
    const apiKey = localStorage.getItem('torfl_apikey');
    if (!apiKey) {
        alert('설정 탭에서 API 키를 먼저 입력해주세요!');
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            // 녹음 끝 -> 처리 중 표시
            setOrbState('processing', 'Thinking...');
            
            const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
            
            // API 호출 (api.js의 함수 사용)
            if (window.api) {
                await window.api.processVoiceInteraction(audioBlob);
            } else {
                console.error("api.js가 로드되지 않았습니다.");
                setOrbState('idle', 'Error');
            }
        };

        mediaRecorder.start();
        isRecording = true;
        setOrbState('listening', 'Listening...');
        
    } catch (err) {
        console.error('마이크 권한 오류:', err);
        alert('마이크 사용 권한이 필요합니다.');
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
    }
}

// Orb 상태 변경 헬퍼 함수
function setOrbState(state, text) {
    // 클래스 초기화
    orb.classList.remove('listening', 'talking', 'processing');
    micBtn.classList.remove('active');

    if (state === 'listening') {
        orb.classList.add('listening');
        micBtn.classList.add('active'); // 마이크 버튼도 활성화 표시
    } else if (state === 'talking') {
        orb.classList.add('talking');
    }

    if (text) orbText.innerText = text;
}

// 전역에서 접근 가능하게 노출
window.audioController = {
    setOrbState,
    playAudio: (blob) => {
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        setOrbState('talking', 'Speaking...');
        audio.play();
        audio.onended = () => setOrbState('idle', 'Ready');
    }
};
