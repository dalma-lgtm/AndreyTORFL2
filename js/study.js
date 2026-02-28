// js/study.js

// [중요] 데이터는 이렇게 변수(const)에 담아야 에러가 안 납니다!
const vocabList = [
    {
        ru: "пренебрегать",
        ko: "무시하다, 경시하다",
        example: "Он пренебрегает здоровьем."
    },
    {
        ru: "возражать",
        ko: "반대하다",
        example: "Я не возражаю."
    }
];

let currentIndex = 0;
let isFlipped = false;

document.addEventListener('DOMContentLoaded', () => {
    const cardStack = document.getElementById('card-stack');
    
    // 에러 방지: 카드를 넣을 곳이 없으면 중단
    if (!cardStack) return;

    // 초기 카드 그리기
    renderCard();

    // 버튼 기능 연결
    const btnNext = document.getElementById('btn-next');
    const btnPrev = document.getElementById('btn-prev');
    const btnFlip = document.getElementById('btn-flip');

    if (btnNext) btnNext.onclick = () => {
        currentIndex = (currentIndex + 1) % vocabList.length;
        isFlipped = false;
        renderCard();
    };

    if (btnPrev) btnPrev.onclick = () => {
        currentIndex = (currentIndex - 1 + vocabList.length) % vocabList.length;
        isFlipped = false;
        renderCard();
    };

    if (btnFlip) btnFlip.onclick = () => {
        isFlipped = !isFlipped;
        renderCard();
    };
});

function renderCard() {
    const cardStack = document.getElementById('card-stack');
    if (!cardStack || vocabList.length === 0) return;

    const word = vocabList[currentIndex];
    
    // 카드 HTML 생성
    cardStack.innerHTML = `
        <div class="flashcard" style="
            width: 100%; height: 100%;
            display: flex; flex-direction: column;
            justify-content: center; align-items: center;
            background: #18181b; border: 1px solid #333; border-radius: 20px;
            text-align: center; padding: 20px;
        ">
            <!-- 상태에 따라 내용 바꾸기 -->
            ${!isFlipped ? 
                `<h2 style="font-size: 2.5rem; margin:0;">${word.ru}</h2>
                 <p style="color:#666; margin-top:20px;">(클릭해서 뜻 확인)</p>` 
                : 
                `<h2 style="font-size: 2rem; color:#3b82f6; margin:0;">${word.ko}</h2>
                 <p style="color:#aaa; margin-top:15px; font-style:italic;">"${word.example}"</p>`
            }
        </div>
    `;
    
    // 카드 클릭하면 뒤집기 효과
    const card = cardStack.querySelector('.flashcard');
    if(card) {
        card.onclick = () => {
            isFlipped = !isFlipped;
            renderCard();
        };
    }
}
