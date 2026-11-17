# SPEC v0.1 — 공통 문서 엔진 시제품

## 아키텍처
- `definitions/*.json` : 사용자 입력 필드·검색 메타·안내문구·공개 상태 (JSON 스키마 v1).
- `build-catalog.mjs` : JSON 정의들을 읽어 브라우저 카탈로그와 `prototype/doc-{slug}.html` 독립 안내 페이지를 생성하는 빌드 브리지.
- `prototype/engine.mjs` : 필드/문서 정의 검증, 필수값·숫자·이메일·날짜 검증, 한글 금액 표기, A4 미리보기 HTML(이스케이프 적용).
- `prototype/app.mjs` : DOM 바인딩, 문서 검색·전환·입력/반복행, 로컬 임시 저장·복구/백업, 인쇄 호출.
- `prototype/index.html` / `styles.css` : 반응형 입력·미리보기 UI와 print CSS.
- `core/document-rules.fl` : FreeLang v11/FX 필수값/양수 금액 기본 정책의 실행 가능 프로브(브라우저와 연결되었다고 주장하지 않음).

## DocumentDefinition v1
`{schemaVersion:1,id,slug,title,summary,purpose,category,status,icon,notice,layout,fields:[...],seo:{title,description}}`.
필드 `{id,type,label,group,required,placeholder,default,min,max,rows,options,columns,initialRows}`.
지원 타입: text/tel/email/date/number/textarea/select/repeater.
리피터 `columns:[{id,label,required}]`. JSON의 스크립트 임의 실행이나 평가(evaluation)는 허용하지 않음.
초기 범위에서 조건부 분기, 법정 서식 보장, 문서 간 데이터 연계, 별도 서명/날인은 미구현.

## 데이터 흐름
페이지/공개 정의(JS 모듈) 로딩 → 필드 입력→브라우저 내 검증→로컬스토리지 키 `document-studio:v1:{doc.id}`→A4 HTML→브라우저 인쇄/PDF 선택. 내보내기 JSON 파일은 File/Blob URL에서 생성. 사용자 입력의 fetch/XHR/beacon/WebSocket 전송 로직 없음(정적 검토만 확인).
`normalizeImportedAnswers`는 정의된 필드만 수용(문서별 타입/길이/반복행 상한). 문서별 필수 규칙과 HTML 출력 이스케이프.

## 출력 정책
- PDF: OS/브라우저 인쇄 다이얼로그에서 PDF 선택. **실제 PDF 직접 생성 API 아님**.
- 빈 양식: 입력 내용 무시하고 자리 표시 줄이 포함된 인쇄 문서 생성.
- DOCX/XLSX/HWP/HWPX: 미구현, 지원 광고 금지.
- 서술형 시말서/경위서 문구를 AI가 임의 창작하지 않고 사용자 입력 그대로 서식에 배치.

## 비기능/제약
- HTML 출력의 사용자 입력 XSS 이스케이프.
- 한글 금액 영원~9999억9999만원 범위. 회계·세무 전문 검수는 별도 필요.
- 로컬 저장은 계정 로그인이나 서버 측 접근제어 없이 현재 브라우저 프로필 한정.
- 정적 HTML SEO 안내 페이지는 **noindex** 개발 시제품이며 실제 검색 노출/사이트맵 적용은 운영 배포 시 검토.
- FreeLang Front 정식 브라우저 빌드·라우팅은 191 MCP에서 아직 UNVERIFIED. 임시 JS 클라이언트 어댑터는 목표 아키텍처와 다른 사실을 명시.
