# 전체 양식 카탈로그 — 2026-11-18

`business-forms-all.zip`의 HTML 19개와 README를 `sources/business-forms-all/`에 바이트 그대로 보존했다. 이전 ZIP의 비즈니스 4종 및 README는 동일하다. 이력서·시말서는 기존 ID와 초안을 유지하여 중복 등록하지 않았다. 새 양식 13종을 추가해 기존 영수증을 포함한 공개 양식은20종이다. 기술 검증용 meeting-notes는 계속 비공개이고, 사용자의 회의록은 meeting-minutes로 제공한다.

| 양식 | URL의 doc 값 | 원본 |
| --- | --- | --- |
| 내용증명 | `content-certified-mail` | legal/content_certified_mail.html |
| 용역계약서 | `contract` | core/04_contract.html |
| 자기소개서 | `cover-letter` | hr/cover_letter.html |
| 재직증명서 | `employment-certificate` | hr/employment_certificate.html |
| 근로계약서 | `employment-contract` | hr/employment_contract.html |
| 시말서 (기본형) | `incident` | internal/apology.html |
| 청구서 | `invoice` | core/02_invoice.html |
| 주택임대차계약서 | `lease-agreement` | personal/lease_agreement.html |
| 회의록 | `meeting-minutes` | internal/meeting_minutes.html |
| 비밀유지계약서 | `nda` | legal/nda.html |
| 각서 | `pledge` | internal/pledge.html |
| 위임장 | `power-of-attorney` | legal/power_of_attorney.html |
| 차용증 | `promissory-note` | legal/promissory_note.html |
| 품의서 | `proposal` | internal/proposal.html |
| 발주서 | `purchase-order` | core/03_purchase_order.html |
| 견적서 | `quotation` | core/01_quotation.html |
| 영수증 (계약금·중도금·잔금) | `receipt` | 기존 양식 (ZIP 외) |
| 사직서 | `resignation` | hr/resignation.html |
| 이력서 (기본형) | `resume` | hr/resume.html |
| 거래명세서 | `statement` | core/statement.html |

## 공통 기능

20종 모두 입력→실시간 미리보기, 문서별 로컬 초안 저장, JSON 백업·초기화·불러오기, 빈 양식/작성본 DOCX·HWPX·XLSX, 브라우저 인쇄/PDF를 제공한다. 메뉴는 분류와 검색을 조합할 수 있고 PC에서는 긴 목록을 스크롤한다. 미리보기와 같은 배치는 PDF, 편집용 파일은 표 형식이다.

원본의 예시 인물·회사·계좌·금액·사건 내용·자기소개 주장·경업 제한 약속을 초기 입력하지 않는다. 원본의 일부 고정 템플릿 문구는 수정 가능한 기본 조항으로 제공하며 법률적 적정성을 검토한 것으로 보지 않는다. 빈 양식에는 현재 입력과 수정한 조항을 넣지 않고, 정의에 명시된 원본 기본 조항만 남긴다. 자기소개서 등 빈 서술 양식은 직접 작성할 공간을 제공한다.

이력서는 기존 사진 업로드·크롭·3가지 템플릿·미리보기 폼 변경을 유지하고 선택형 생년월일을 추가했다. 이전 백업에는 새 필드를 빈 값으로 채운다. 시말서는 원본의 반성·사건 예문을 자동으로 채우지 않고 기존 직접 작성 흐름을 유지한다.

## 계산·표시 계약

거래명세서는 기존 견적서/청구서와 같은 FreeLang 계산 핵심을 사용한다. 수량×단가, 품목별 세액(원 미만 버림), 합계를 계산하며 범위·형식 오류는 작성본 출력을 차단한다. 기존 `orderedPeriod`를 dateRanges 메타데이터로 재사용하여 위임·차용·임대차·재직 기간의 역전을 검증한다. 종료가 텍스트 조건인 근로계약 기간은 임의로 해석하지 않는다.

number.unit은 표시 단위다. 기존 금액은 원을 유지하고 NDA 기간은 년, 차용증 이율은 %로 표시한다. Word/HWPX에는 단위를 포함한 텍스트, Excel에는 숫자 셀과 단위가 있는 라벨을 제공한다. 금액 이외의 숫자 셀에 원 형식을 붙이지 않는다. 이율로 이자를 자동 산출하거나 적용 가능한 법정 이율을 판정하는 기능은 없다.

새 핵심 산술이나 런타임을 추가하지 않았다. 검증된 `core/business-rules.fl`과 제한된 빌드 브리지를 재사용한다. HTML/DOM/저장/숫자 표시/Office 직렬화는 기존 JavaScript 어댑터를 확장했다. 전체 FreeLang Front 컴파일러를 검증했다는 뜻이 아니다.

## 이번 검증

- `node build-catalog.mjs`: 21개 정의, 20 public +1 internal.
- `node --test tests/*.test.mjs`:38 PASS /0 FAIL /0 SKIP.
- 20종 실제 Chrome 인터랙션:265 PASS /0 FAIL.
- 기존 3종 브라우저 회귀:23 PASS /0 FAIL. 사진/템플릿 회귀:14 PASS /0 FAIL.
- 독립 판독:161 PASS /0 FAIL = Office120개(20×2모드×3형식), PDF40개, 원본20파일 대조1건.
- 기존 FreeLang 프로브10개 실제 출력 일치, exit0, simulated false. 정확한 runtime version은 여전히 UNVERIFIED.

PC1440×1100, 모바일390×844의 설치 Chrome과 기존 Playwright를 사용했다. Browser plugin not available. JS/CSS 오류·오류 오버레이·빈 화면·외부 전송은 검사 중 관찰되지 않았다. Word·한글·Excel 실제 프로그램의 화면/편집/재저장, 시스템 인쇄 대화상자 조작·물리 프린터, 다른 브라우저의 동작은 UNVERIFIED. Chrome PDF 파일 생성과 내용·A4·정보 제외는 PASS다. 법률/세무 검수 및 운영 배포는 수행하지 않았다.
