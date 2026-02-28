# AndreyTORFL2
https://dalma-lgtm.github.io/AndreyTORFL2/
# ТРКИ-2 Study App 🇷🇺

토르플(ТРКИ) 2급 준비를 위한 AI 기반 러시아어 학습 웹 앱

## 기능

- 🗣️ **회화 연습** — AI 튜터와 음성으로 러시아어 대화 (STT → LLM → TTS 파이프라인)
- 📚 **단어 테스트** — 객관식, 빈칸 채우기, 듣고 쓰기, 뜻 매칭
- 📝 **모의시험** — 토르플 2급 형식 문법/읽기 시험 + AI 해설
- 📊 **학습 대시보드** — 스트릭, 학습 시간, 진행도 추적

## 기술 스택

| 항목 | 선택 |
|------|------|
| STT | OpenAI gpt-4o-mini-transcribe |
| LLM | GPT-4o / GPT-4o-mini / Gemini Flash (선택 가능) |
| TTS | OpenAI tts-1 / tts-1-hd |
| 프론트엔드 | Vanilla HTML/CSS/JS |
| 배포 | GitHub Pages |
| 데이터 | JSON 파일 + localStorage |

## 설정 방법

1. GitHub Pages로 배포 (Settings → Pages → main branch)
2. 앱의 ⚙️ 설정 페이지에서 API 키 입력
3. 사용 시작!

## API 키 필요

- **OpenAI** (필수): STT, TTS, GPT 모델에 사용
- **Google AI** (선택): Gemini 모델 사용 시 필요

> API 키는 브라우저 localStorage에만 저장됩니다. 서버로 전송되지 않습니다.

## 데이터 구조

```
data/
├── vocab/          # 단어장 JSON
│   └── unit01.json
├── exams/          # 시험 문제 JSON
│   ├── grammar-01.json
│   └── reading-01.json
└── scenarios/      # 회화 시나리오 (추가 예정)
```

## 단어장 JSON 형식

```json
{
  "unit": "01",
  "title": "일상생활",
  "words": [
    {
      "id": "v001",
      "ru": "однако",
      "ko": "그러나",
      "example_ru": "Однако он решил поехать.",
      "example_ko": "그러나 그는 가기로 결심했다.",
      "grammar_note": "접속사",
      "tags": ["접속사", "B2"]
    }
  ]
}
```
