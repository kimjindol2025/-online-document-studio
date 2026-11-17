# 비즈니스 계산 FreeLang 실행 증거 — 2026-11-18

- 계열: 기존 `core/document-rules.fl`과 같은 FreeLang v11/FX bootstrap 인터프리터 프로필.
- 설치 package 이름 `freelang-v11-fx-next-runtime`, 버전 필드 없음. 정확한 런타임 버전은 UNVERIFIED, 실행기 반환 `runtimeVersion: null`.
- 참고 정본: 설치된 bootstrap.js의 floor 구현과 산술/비교, 기존 FreeLang 소스와 테스트를 읽었다. 예제나 미래 버전 API를 가정하지 않았다.
- bootstrap SHA-256: `6302db3fdc7320a5831ac655062b3c55ce68d6fc23a8302865ae04fae2bc7d53`.
- 새 계산 정본: `core/business-rules.fl`, SHA-256 `1a0353ffe70138a66700d526a446d7609bf6a0929896f204e2ff0b50847e1f88`.
- 프로브: `core/business-probe.fl`은 같은 함수 원문과 println 10개를 실제 인터프리터로 실행한다.
- 도구: 격리된 `runProjectFreeLang` 어댑터 함수를 Node에서 직접 호출했다. bwrap/prlimit, 읽기 전용 소스/런타임, 네트워크 없음. 191 Coding MCP 서비스 호출/운영 재시작은 하지 않았다.
- 결과: exitCode 0, simulated false. 출력 `5000000, 10000000, 620000, 1, 0, 6820000, true, false, true, false`를 순서대로 비교했다. PASS.

| 함수 | 계약 | 확인 |
| --- | --- | --- |
| lineSupply | 수량 × 단가 | 1×5000000, 2×5000000 |
| lineTax | floor(공급가액 × 세율 / 100) | 6200000/10%, 19/10%, 19/0% |
| addAmount | 두 금액 더하기 | 6200000+620000 |
| depositWithinAmount | 계약금 ≤ 계약금액 | 참/거짓 |
| orderedPeriod | 시작일 ≤ 종료일, 숫자 YYYYMMDD | 참/거짓 |

브라우저에는 전체 FreeLang Front 런타임이 없다. `build-business-core.mjs`는 이 파일의 defn/스칼라 산술·비교/floor만 허용하는 제한된 빌드 브리지다. 미지원 식은 실패하며 eval/사용자 코드를 실행하지 않는다. 생성 결과 `prototype/generated-business-core.mjs`가 브라우저에서 사용된다. 소스와 생성 결과 일치·반례·실제 합계·계약 검증을 Node 및 Chrome에서 확인했다. 이 결과를 일반 FreeLang 컴파일러, 전체 Front 기능, 다른 계열/버전 검증으로 확대하지 않는다.

기존 운영 onboarding 문서는 수정하지 않았다. 이번 증거는 격리 Studio의 이 파일과 작업 산출물 `business-forms/freelang.json` 및 `validation-results.json`에 보존했다.

## 전체 양식 통합에서 재사용한 결과 — 2026-11-18

- core/business-rules.fl, core/business-probe.fl, generated-business-core.mjs는 통합 시작 스냅샷과 바이트 동일하다.
- 거래명세서는 기존 lineSupply/lineTax/addAmount를 사용한다. 위임·차용·임대차·재직 기간은 기존 orderedPeriod를 사용하는 날짜 메타데이터 어댑터로 연결했다.
- 같은 실제 격리 런타임 프로브10개의 출력을 다시 비교했다. exitCode0, simulated false, 모두 일치했다. 원시 증거는 작업 산출물 all-forms/freelang.json에 있다.
- 원·년·% 표시, 분류 메뉴, 빈 작성 공간은 브라우저/파일 형식 어댑터 변경이며 새 FreeLang API 지원의 근거가 아니다. 기존 원본 프로젝트 onboarding은 수정하지 않았다.
