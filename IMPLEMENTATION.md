# IMPLEMENTATION v0.1 — 현재 구현 상태

2026-11-17 기준. 191코딩 격리 작업공간에서 작성. PRD는 유지하고 새로운 시제품 코드를 추가했다.

### 구현한 것
- JSON 설정을 읽어 공개 3종의 문서 작성 폼/미리보기를 자동 구성
- 이력서 학력·경력 반복행, 시말서 자유서술, 영수증 종류·수령액과 한글금액
- 필수/날짜/금액/선택지 검증 및 HTML 특수문자 이스케이프
- A4 빈 양식, 작성본 인쇄(PDF 저장은 브라우저 기능)
- 브라우저 localStorage 자동 저장/삭제 및 JSON 백업·불러오기
- 공개 문서별 HTML 검색 안내 페이지 생성, 비공개 테스트 회의록 제외
- 별도 테스트 JSON만으로 이질적 네 번째 문서 렌더링

### 사용 언어·예외
프로젝트 사용자 표준은 FreeLang Front/FreeLang AFJ/AFJ DB. 핵심 규칙 10개 입력/출력은 FreeLang v11/FX `.fl`로 실행 확인했다. 하지만 191 Coding MCP의 이 고정 프로젝트에는 FreeLang Front의 빌드/실행/브라우저 정본이 노출되지 않아 **시연 가능한 브라우저 호환 계층만 HTML/CSS/JavaScript로 임시 구현**했다. 생산 FreeLang Front 구현/동작 주장 금지. 이 의도적 차이는 별도 SPEC의 기술 블로커다.

### 건드리지 않은 것
기존 견적서 앱, 기존 워드프레스/서버 설정·도메인·FreeLang Front 원본 저장소, 사용자 기록·DB, 인증·팩스·클라우드. Git commit/push/deploy 없음.

### 불완전/미구현
- 사용성 20명 비교, 실제 PC/휴대폰 PDF 저장/출력, 브라우저 네트워크 무전송 동적 증명, PWA/오프라인 보장
- 진짜 PDF 파일 바이너리 생성, DOCX/XLSX/HWP/HWPX 출력
- FreeLang Front 빌드, AFJ backend, AFJ DB, 문서 공식서식·법적 승인
- 운영 검색 노출/도메인 연결 및 Google 색인 여부
