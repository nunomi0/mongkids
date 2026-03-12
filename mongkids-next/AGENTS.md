# AGENTS.md

## 기본 작업 흐름

- 라이브러리, 프레임워크, 패키지처럼 버전 정확도가 중요한 질문은 Context7을 먼저 사용합니다.
- Codex, OpenAI API, ChatGPT, 모델 설정 관련 질문은 OpenAI 개발자 문서 MCP를 먼저 사용합니다.
- UI 흐름 검증, 브라우저 버그 재현, 렌더 결과 확인에는 Playwright MCP를 사용합니다.
- 저장소 맥락이 중요한 이슈, PR, 리뷰 메타데이터는 raw git 출력보다 GitHub MCP를 우선 사용합니다.
- 조사, 구현, 검증이 명확히 나뉘는 작업은 병렬 에이전트로 분리합니다.

## 설치된 전문 스킬

- Superpowers: `brainstorming`, `writing-plans`, `executing-plans`, `dispatching-parallel-agents`, `verification-before-completion`, `systematic-debugging`, `requesting-code-review`
- PM: `competitor-analysis`, `user-personas`, `product-strategy`, `prioritize-features`, `create-prd`, `gtm-strategy`
- Marketing: `content-strategy`, `seo-audit`, `copywriting`, `launch-strategy`

## 프로젝트 컨텍스트

- 사용자 요청이 없는 한 모든 문서와 사용자 노출 문구는 한국어로 작성합니다.
- 이 프로젝트에서는 구현 계획, CRUD UX 개선, 운영 흐름 개선, 학원 운영 리포트처럼 실무형 결과물을 우선합니다.
