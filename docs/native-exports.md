# 문서 다운로드 — 테스트 구현 (2026-11-18)

공개 문서 이력서·시말서·영수증에서 **작성본 다운로드 / 빈 양식 다운로드**를 제공한다. Word는 DOCX, 한글은 HWPX, Excel은 XLSX를 생성한다. PDF는 기존 브라우저 인쇄·저장 경로를 사용한다. 구형 바이너리 HWP 변환은 포함하지 않는다.

## 데이터와 동작

- 작성본은 기존 입력 검증을 통과해야 한다. 이름·날짜·금액 오류가 있으면 다운로드 선택 창을 열지 않는다.
- 빈 양식은 입력값과 사진을 읽지 않고 정의의 라벨·빈 칸·반복 항목을 생성한다. 영수증 기본 선택값도 넣지 않는다.
- 편집용 파일은 표 형식이다. 선택한 이력서 색상과 사진을 반영하지만 브라우저 레이아웃 전체를 복제하지 않는다. 같은 화면 배치는 PDF로 저장한다.
- 사진은 기존 위치·확대 비율을 반영한 300×400 JPEG로 자르고 각 패키지에 포함한다. 외부 사진 URL이나 문서 내용을 서버로 보내지 않는다.
- Excel의 수령 금액은 숫자 셀이다. 사용자 문자열은 `inlineStr`로 저장하여 수식으로 실행되지 않는다. 서식의 한글 금액 표기는 별도 텍스트다.
- 다운로드는 브라우저 Blob으로 생성한다. JSON 백업·불러오기·로컬 저장·기존 인쇄와 별개의 기능이다.

## 구현 경계

`prototype/export-model.mjs`는 기존 JSON 정의/검증 결과를 직렬화 모델로 옮긴다. `export-zip.mjs`, `office-exports.mjs`, `hwpx-export.mjs`는 실제 ZIP/XML 패키지를 만들고 `native-downloads.mjs`가 Canvas 사진 처리와 다운로드에 연결한다. HTML 파일의 확장자만 바꾸는 방식이 아니다.

이 정적 앱에는 검증된 FreeLang Front 컴파일러·브라우저 런타임이 없다. Canvas/Blob 및 Office 패키지 직렬화는 기존 브라우저 JavaScript 경계에 구현했다. 도메인 검증과 FreeLang 핵심 규칙은 변경하지 않았다. 새로운 FreeLang 문법이나 API를 가정하지 않았다.

HWPX 기본 XML은 Apache-2.0의 python-hwpx 6.12.0 Skeleton을 기반으로 한다. 글자 스타일과 여백을 수정하고 샘플 내용·미리보기 이미지를 제외했다. 출처와 라이선스는 `prototype/third-party-notices/`에 보존했다. Python 패키지는 브라우저에 배포하지 않으며 런타임 의존성도 아니다.

## 검증과 한계

`node build-catalog.mjs` 후 `node --test tests/*.test.mjs`를 실행한다. 내보내기 반례는 `tests/native-exports.test.mjs`에 있다.

2026-11-18 테스트 서버에서는 다음을 실제 실행했다.

| 검사 | 결과 |
| --- | --- |
| 전체 Node 단위 테스트 | 23 PASS / 0 FAIL / 0 SKIP |
| 다운로드·PDF·모바일 Chrome 검사 | 43 PASS / 0 FAIL |
| 기존 문서 기능 브라우저 회귀 | 23 PASS / 0 FAIL |
| 독립 판독: 다운로드 38개·사진 자르기·PDF 6개 | 45 PASS / 0 FAIL |

DOCX는 python-docx 1.2.0, XLSX는 openpyxl 3.1.5, HWPX는 python-hwpx 6.12.0으로 재개봉했다. ZIP CRC, 모든 XML 구문, 필드/반복 항목/개행/한글/emoji, 빈 양식의 개인정보 제외, 사진 개수와 크기, Excel 수식 방지와 숫자 셀을 검사했다. HWPX 패키지 검사와 라이브러리의 전체 OWPML 스키마 lint에서 보고된 문제는 0건이었다. 해당 lint는 2011/2024 네임스페이스 차이와 알려진 Hancom 차이를 정규화하므로 공식 인증이나 모든 XSD에 대한 엄격한 무변환 적합성을 뜻하지 않는다.

사진은 Pillow의 별도 변환과 비교했고, 세 형식에 같은 자르기 결과가 들어갔다. PDF는 실제 Chrome으로 생성하여 A4·내용·빈 양식 정보 제외를 확인했다. 브라우저 인쇄 대화상자/물리 프린터 조작은 미실행이다.

**UNVERIFIED:** 설치된 Word·한글·Excel 프로그램이 없어 실제 프로그램의 화면 배치/편집/재저장 호환성은 확인하지 않았다. 글꼴과 표 배치는 프로그램에 따라 달라질 수 있다. 긴 내용을 넣은 Excel 셀은 행 높이 제한 때문에 화면·인쇄에서 일부가 가려질 수 있지만 셀 데이터는 보존된다. 긴 본문 출력은 PDF를 권장한다. 테스트 서버 검증 결과만으로 운영 배포 승인이나 전체 호환성을 주장하지 않는다.

## 형식 참고 자료

- [Microsoft Open XML package](https://learn.microsoft.com/en-us/office/open-xml/general/how-to-create-a-package)
- [Microsoft Spreadsheet document](https://learn.microsoft.com/en-us/office/open-xml/spreadsheet/how-to-create-a-spreadsheet-document-by-providing-a-file-name)
- [Hancom HWP/OWPML 문서 공개](https://www.hancom.com/support/downloadCenter/hwpOwpml)
- [Hancom OWPML 모델](https://github.com/hancom-io/hwpx-owpml-model)
- [python-hwpx 소스·스키마](https://github.com/airmang/python-hwpx)

## 후속 통합 범위

전체 양식은 공개20종으로 확장했다. 거래명세서는 기존 계산을 재사용하고 비금액 숫자(년/%)는 Excel에서 원 형식을 붙이지 않는다. 현재 카탈로그·검증·원본 매핑은 [전체 양식 기록](forms-catalog.md)을 참조한다. 위 검사 수치는 해당 증분 작업 시점의 기록이다.
