# 비즈니스 핵심 4종 통합 — 2026-11-18

사용자가 제공한 `business-forms-core.zip`의 HTML 4개와 README를 `sources/business-forms/`에 바이트 단위로 보존했다. 원본에는 수량·단가를 수정해도 고정 합계가 갱신되지 않는 문제가 있었다. 통합본은 이를 자동 계산으로 바꾸고 7종 문서 선택 메뉴에 추가했다. 원본 파일은 prototype 정적 서버에 노출하지 않는다.

| 원본 | 통합 정의 | 작성 URL |
| --- | --- | --- |
| core/01_quotation.html | definitions/quotation.json | index.html?doc=quotation |
| core/02_invoice.html | definitions/invoice.json | index.html?doc=invoice |
| core/03_purchase_order.html | definitions/purchase-order.json | index.html?doc=purchase-order |
| core/04_contract.html | definitions/contract.json | index.html?doc=contract |

## 사용

당사자 정보와 품목을 입력하면 미리보기가 갱신된다. 품목을 추가/삭제할 수 있고 문서별로 로컬 임시 저장, JSON 백업·복원·초기화를 제공한다. `작성본 다운로드`와 `빈 양식 다운로드`에서 DOCX/HWPX/XLSX를 받는다. PDF는 기존 브라우저 인쇄 경로다. 편집용 파일은 표 형식이며 브라우저와 같은 배치는 PDF를 사용한다.

초기 입력에는 원본의 샘플 기업명·대표자·사업자번호·주소·계좌·금액·날짜를 채우지 않는다. 계약서 하자보수/비밀유지/해지 조항은 원본 문구를 그대로 편집 가능한 기본값으로 제공한다. 계약금과 지급조건은 직접 입력한다. 내용의 법적 적정성을 검토했다는 뜻은 아니다.

## 계산과 검증

- 수량은 양의 정수, 단가는 0 이상의 정수. 음수/소수 수량/잘못된 날짜/총액 범위 초과는 작성본 출력·다운로드를 차단한다.
- 견적서/청구서는 VAT 10% 또는 0%를 선택한다. 세액은 품목별로 원 단위 미만을 버린다. 이 계산 방식은 입력 화면에 표시한다. 특정 거래의 법정 세율·세무 처리를 판정하지 않는다.
- 발주서는 원본과 같이 VAT 별도 공급금액 합계를 표시한다.
- 합계 한도 999,999,999,999원, 반복행 최대40. 백업에 임의 계산 결과를 넣어도 채택하지 않고 수량·단가에서 다시 계산한다.
- 계약금이 총 계약금액보다 크거나 완료일이 착수일보다 빠르면 오류로 표시한다. 수정한 조항은 사용자가 입력한 그대로 출력한다.
- 빈 양식은 입력값과 계산된 금액을 제외한다. 계약서의 기본 조항은 원본 템플릿 문구를 유지하며, 사용자가 수정한 조항은 빈 양식에 포함하지 않는다.

계산 핵심은 FreeLang으로 작성하고 제한된 빌드 브리지로 브라우저 모듈을 생성한다. 근거·범위는 `freelang-business-evidence.md` 참조. DOM/JSON/Canvas/Blob/Office 파일 처리 어댑터는 기존 JavaScript를 유지한다. 일반 Front 컴파일러가 있는 것으로 가정하지 않는다.

## 빌드와 테스트

```bash
node build-catalog.mjs
node --test tests/*.test.mjs
```

최종 실행: 단위31 PASS /0 FAIL /0 SKIP, 신규 브라우저58 PASS, 기존 브라우저23 PASS, 독립 검증34 PASS (Office 파일24개·PDF8개·실제 FreeLang 프로브10개의 출력 대조1건·원본 보존1건). 1440px PC/390px 모바일 Chrome에서 검증했다. Browser plugin not available이므로 기존 Playwright와 설치된 Chrome을 사용했다. JS/CSS 로딩, 검증 오류, 입력→계산→미리보기, 행 추가·삭제, 저장/재접속, JSON 백업/복원, 빈 양식·작성본 다운로드, 인쇄 핸들러/PDF 파일을 실제 검사했다.

PDF: 테스트 데이터의 견적서·청구서·발주서 각 A4 한 장. 용역계약서는 조항을 보존해 두 장으로 출력된다. 더 긴 본문/품목은 여러 장이 될 수 있다. 입력한 회사 정보·은행 계좌·조항은 별도 서버로 전송하지 않았다. 네트워크 관찰에서 localhost GET 외 전송 없음.

Office 파일은 python-docx/openpyxl/python-hwpx로 읽어 전체 필드·행·숫자 합계·빈 양식 정보 제외·XML/ZIP 구조를 검증했다. HWPX 패키지/라이브러리 OWPML lint 문제0건이다. 실제 Word·한글·Excel 프로그램의 화면/편집/재저장과 물리 프린터는 UNVERIFIED. 해당 프로그램 검증 없이 전체 호환성이나 운영 배포 완료를 주장하지 않는다.

## 후속 통합 범위

전체 양식은 공개20종으로 확장했다. 거래명세서는 기존 계산을 재사용하고 비금액 숫자(년/%)는 Excel에서 원 형식을 붙이지 않는다. 현재 카탈로그·검증·원본 매핑은 [전체 양식 기록](forms-catalog.md)을 참조한다. 위 검사 수치는 해당 증분 작업 시점의 기록이다.
