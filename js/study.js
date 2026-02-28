// js/study.js

let vocabList = [
    { ru: "пренебрегать", ko: "무시하다, 경시하다", example: "Он пренебрегает советами." },
    { ru: "возражать", ko: "반대하다", example: "Я не возражаю." },
    { ru: "способствовать", ko: "촉진하다, 기여하다", example: "Это способствует развитию." }
];

let currentIndex = 0;
let isFlipped = false;

const cardFront = document.querySelector('.card-front h3'); // 선택자 수정 필요할 수 있음 (HTML 구조 확인)
const cardStack = document.getElementById('card-stack');

document.addEventListener('DOMContentLoaded', () => {
    renderCard();

    // 버튼 이벤트
    document.getElementById('btn-next').addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % vocabList.length;
        isFlipped = false;
        renderCard();
    });

    document.getElementById('btn-prev').addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + vocabList.length) % vocabList.length;
        isFlipped = false;
        renderCard();
    });

    document.getElementById('btn-flip').addEventListener('click', () => {
        isFlipped = !isFlipped;
        renderCard();
    });
    
    // GitHub 연동 버튼 (나중에 활성화)
    document.getElementById('btn-refresh-vocab').addEventListener('click', () => {
        alert("GitHub에서 최신 단어장을 가져옵니다... (기능 구현 예정)");
    });
});

function renderCard() {
    const word = vocabList[currentIndex];
    const cardHtml = `
        <div class="flashcard" style="transform: ${isFlipped ? 'rotateY(180deg)' : 'rotateY(0)'}; transition: transform 0.6s;">
            <div style="position: absolute; backface-visibility: hidden;">
                <h3 style="font-size: 2rem; margin-bottom: 10px;">${word.ru}</h3>
                <p style="color: #888;">클릭하여 뜻 확인</p>
            </div>
            <div style="position: absolute; backface-visibility: hidden; transform: rotateY(180deg);">
                <h3 style="font-size: 1.5rem; color: #3b82f6;">${word.ko}</h3>
                <p style="margin-top: 15px; font-style: italic;">"${word.example}"</p>
            </div>
        </div>
    `;
    
    // 기존 내용을 싹 지우고 새로 그림 (간단 구현)
    cardStack.innerHTML = cardHtml;
}
