# 🌱 Seedling

로컬 Ollama 기반 Obsidian 플러그인. 하나의 입력(문제·자막·노트)으로부터 **해설·파생 글·영상 제작 번들**을 생성해 Vault에 저장합니다.

- **완전 로컬·오프라인** — API 키 불필요, 외부 서버 호출 없음
- **제텔카스텐 친화** — Frontmatter 포함 `.md` 파일로 출력, Obsidian Properties 패널에서 바로 인식
- **프롬프트 엔지니어링 내장** — 영상 스타일별(다큐·숏폼·광고·설명·브이로그) 시스템 프롬프트 분기

---

## 3가지 기능

| 명령어 | 입력 | 출력 |
|---|---|---|
| **Solve & Teach** | 시험·기출 문제 | 정답 / 풀이 과정 / 핵심 이론 / 연결 개념 / 더 읽을거리 |
| **Caption Remix** | 자막 파일(.srt/.vtt/.txt) | 영상 개요 / 핵심 메시지 5개 / 파생 콘텐츠 3종(블로그·숏폼·보고서) |
| **영상제작소** | 기존 노트 + 영상 스타일 | 씬별 성우 대본 / 이미지 프롬프트(EN) / 비디오 프롬프트(EN) / 제작 노트 |

출력 경로: `{Vault}/Derived/{기능명}/*.md`

---

## 요구사항

1. [Ollama](https://ollama.com) 설치 (로컬)
2. 모델 설치 — 권장:
   ```bash
   ollama pull gemma4:e4b   # 균형
   ollama pull gemma4:e2b   # 경량·빠름
   ```
3. Obsidian 1.0 이상 (데스크톱 전용)

---

## 설치

### 빌드 & 배포 (권장)
```bash
git clone https://github.com/leedonwoo2827-ship-it/obsidian-seedling.git
cd obsidian-seedling
npm install
npm run build

# Vault 경로 지정 후 배포
OBSIDIAN_VAULT="/path/to/your/vault" npm run deploy
```
`scripts/deploy.mjs`가 `main.js`·`manifest.json`·`styles.css`를 `{Vault}/.obsidian/plugins/seedling/`로 복사합니다.

### 수동 설치
빌드 결과물 3개(`main.js`, `manifest.json`, `styles.css`)를 `{Vault}/.obsidian/plugins/seedling/` 에 직접 복사하고 Obsidian 커뮤니티 플러그인 탭에서 활성화.

---

## 사용법

1. **설정 → Seedling**에서 모델(`gemma4:e4b` / `gemma4:e2b`) 선택 후 **테스트 연결** 버튼으로 Ollama 응답 확인
2. 커맨드 팔레트(`Ctrl+P`)에서:
   - `Seedling: Solve & Teach`
   - `Seedling: Caption Remix`
   - `Seedling: 영상제작소`
3. 모달 입력 후 **생성** — `Derived/` 하위에 노트 자동 생성·열림

---

## 개발

```bash
npm install
npm run dev       # esbuild watch
npm run build     # tsc 타입체크 + 프로덕션 번들
npm run deploy    # build + Vault 로 배포
```

디렉토리 구조:
```
src/
├── main.ts               # Plugin 엔트리
├── settings.ts           # 설정 탭
├── clients/ollama.ts     # Ollama HTTP 클라이언트
├── commands/*.ts         # 기능별 실행 플로우
├── prompts/*.ts          # 시스템 프롬프트
├── ui/*Modal.ts          # 입력 모달
└── utils/                # frontmatter, noteWriter, captionParser
```

---

## 범위 밖 (v1 기준)

RAG · 임베딩 · MCP · 스트리밍 응답 · Gemini/OpenAI 백엔드는 포함하지 않습니다. 단순함이 v1의 목표입니다.

---

## 라이선스

MIT
