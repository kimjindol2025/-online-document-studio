# VERIFICATION v0.1 — 증거 및 판정

| 검사 | 실행 도구/명령 | 결과 | 한계 |
|---|---|---|---|
| FreeLang 기본 유효성/금액 10개 출력 | `coding_task_freelang_run(core/document-rules.fl)` | PASS, exitCode 0, 10줄 예상값 일치 | 브라우저 제품 호출 경로는 아님 |
| JSON 정의 빌드 | `node projects/online-document-studio/build-catalog.mjs` | PASS: 4개 정의 중 공개 3종, 내부 1종 제외 | 실제 브라우저 빌드 아님 |
| Node 엔진 테스트 | `node --test projects/online-document-studio/tests/engine.test.mjs` | PASS 10/10, exitCode 0 | JS 엔진 계약·정적 검사, 브라우저 E2E 아님 |
| 공개 독립 안내 페이지 | 빌더 생성 파일을 테스트에서 검사 | PASS 3종, noindex | 실제 검색 유입 미검증 |
| 인쇄/PDF 기기 간 일치 | Android Chrome, iOS Safari, PC Chrome/Firefox 수동/자동 브라우저 검사 필요 | UNVERIFIED | 실제 렌더·인쇄 환경 부재 |
| 민감정보 원문 외부 전송 | 테스트 코드 내 fetch/XHR/beacon/WebSocket 호출 없음 검사 | **정적 PASS / 동적 UNVERIFIED** | 네트워크 패킷/서드파티 동작 감사 미실행 |
| FreeLang Front 정식 빌드 | 대상 FreeLang Front 프로젝트/컴파일러 검증 필요 | BLOCKED | 191 고정 프로젝트에서 런타임·프론트 표준 미노출 |
| 법정 서식·HWP 등 | 별도 자료/전문가 검증과 포맷 어댑터 필요 | NOT IMPLEMENTED | 최초 3종만 시제품 |
| 실제 이용자 실험 | 20명 비교 과업 | NOT STARTED | 사업 성과 미검증 |

**출시 판정: REVISE.** 시제품/정적·단위검증은 성공했으나 모바일 인쇄, 보안 동적 검증, FreeLang Front 전환, 사용자 실험은 통과 전이므로 운영 배포 금지.
