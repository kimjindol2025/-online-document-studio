// Browser-only compatibility engine for a static MVP.
// Production contract is FreeLang Front/AFJ. This adapter must be replaced or justified in SPEC.
export const SUPPORTED_TYPES = new Set(["text", "tel", "email", "date", "number", "textarea", "select", "repeater"]);
export const MAX_TEXT_LENGTH = 12000;
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);
}
export function validateDefinition(doc) {
  const errors = [];
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return ["문서 정의가 객체가 아닙니다."];
  if (doc.schemaVersion !== 1) errors.push("지원하지 않는 스키마 버전");
  if (!/^[a-z][a-z0-9-]*$/.test(doc.id ?? "") || !/^[a-z][a-z0-9-]*$/.test(doc.slug ?? "")) errors.push("잘못된 문서 ID 또는 슬러그");
  if (!doc.title || !doc.summary || !Array.isArray(doc.fields) || !doc.fields.length) errors.push("필수 문서 메타 또는 필드 없음");
  const ids = new Set();
  for (const field of doc.fields || []) {
    if (!/^[a-z][a-z0-9A-Z]*$/.test(field.id ?? "") || ids.has(field.id)) errors.push("필드 ID 오류/중복");
    ids.add(field.id);
    if (!SUPPORTED_TYPES.has(field.type)) errors.push("지원하지 않는 필드 타입: " + field.type);
    if (!field.label) errors.push("필드 라벨 없음");
    if (field.type === "select" && (!Array.isArray(field.options) || !field.options.length)) errors.push("선택지 없음");
    if (field.type === "repeater") {
      if (!Array.isArray(field.columns) || !field.columns.length) errors.push("반복 항목 열 없음");
      const cIds = new Set();
      for (const col of field.columns || []) {
        if (!/^[a-z][a-z0-9A-Z]*$/.test(col.id ?? "") || cIds.has(col.id)) errors.push("반복 열 ID 오류");
        cIds.add(col.id);
      }
    }
    if (field.min !== undefined && typeof field.min !== "number") errors.push("최솟값 자료형 오류");
    if (field.max !== undefined && typeof field.max !== "number") errors.push("최댓값 자료형 오류");
  }
  if (!["public","internal"].includes(doc.status)) errors.push("문서 상태 오류");
  return errors;
}
export function emptyAnswers(doc) {
  return Object.fromEntries(doc.fields.map(field => [
    field.id,
    field.type === "repeater" ? Array.from({ length: field.initialRows || 1 }, () => ({})) : field.default ?? ""
  ]));
}
export function validISODate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [year, month, day] = s.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month && d.getUTCDate() === day;
}
const nonEmpty = x => String(x ?? "").trim() !== "";
export function validateAnswers(doc, answers = {}) {
  const issues = [];
  for (const field of doc.fields) {
    const value = answers[field.id];
    if (field.type === "repeater") {
      if (value !== undefined && !Array.isArray(value)) {
        issues.push({field:field.id, message:"목록 형식이 잘못되었습니다."});
        continue;
      }
      const rows = value ?? [];
      if (rows.length > 40) issues.push({field:field.id,message:"항목은 최대 40개까지 가능합니다."});
      if (field.required && !rows.some(row => Object.values(row || {}).some(nonEmpty))) issues.push({field:field.id,message:"항목을 하나 이상 입력하세요."});
      rows.forEach((row,i) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) {issues.push({field:field.id,message:"행 형식 오류"});return;}
        const active = Object.values(row).some(nonEmpty);
        if (!active) return;
        for (const col of field.columns) {
          if (col.required && !nonEmpty(row[col.id])) issues.push({field:field.id,message:(i + 1) + "행: " + col.label + "을(를) 입력하세요."});
          if (String(row[col.id] ?? "").length > MAX_TEXT_LENGTH) issues.push({field:field.id,message:"항목이 너무 깁니다."});
        }
      });
      continue;
    }
    const text = String(value ?? "").trim();
    if (field.required && !text) {issues.push({field:field.id,message:field.label + "을(를) 입력하세요."});continue;}
    if (!text) continue;
    if (text.length > MAX_TEXT_LENGTH) issues.push({field:field.id,message:"입력 내용이 너무 깁니다."});
    if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) issues.push({field:field.id,message:"이메일 주소 형식을 확인하세요."});
    if (field.type === "date" && !validISODate(text)) issues.push({field:field.id,message:"실제 날짜를 입력하세요."});
    if (field.type === "select" && !field.options.includes(text)) issues.push({field:field.id,message:"목록에서 선택하세요."});
    if (field.type === "number") {
      const number = Number(text);
      if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text) || !Number.isFinite(number)) issues.push({field:field.id,message:"올바른 숫자를 입력하세요."});
      else if ((field.min !== undefined && number < field.min) || (field.max !== undefined && number > field.max)) issues.push({field:field.id,message:"허용 금액 범위를 벗어났습니다."});
    }
  }
  return issues;
}
export function normalizeImportedAnswers(doc, proposed) {
  if (!proposed || typeof proposed !== "object" || Array.isArray(proposed)) throw new Error("입력 데이터 형식 오류");
  const result = emptyAnswers(doc);
  for (const field of doc.fields) {
    const value = proposed[field.id];
    if (value === undefined || value === null) continue;
    if (field.type === "repeater") {
      if (!Array.isArray(value) || value.length > 40) throw new Error("반복 행 형식 오류");
      result[field.id] = value.map(row => {
        if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error("행 형식 오류");
        return Object.fromEntries(field.columns.map(c => {
          const v = String(row[c.id] ?? "");
          if (v.length > MAX_TEXT_LENGTH) throw new Error("입력 내용이 너무 깁니다");
          return [c.id, v];
        }));
      });
    } else {
      if (!["string","number"].includes(typeof value)) throw new Error("잘못된 자료형");
      if (String(value).length > MAX_TEXT_LENGTH) throw new Error("입력 내용이 너무 깁니다");
      result[field.id] = String(value);
    }
  }
  return result;
}
export const KRW = new Intl.NumberFormat("ko-KR");
export const formatWon = n => KRW.format(Number(n)) + "원";
export function toHangulWon(n) {
  if (!Number.isSafeInteger(Number(n)) || Number(n) < 0 || Number(n) > 999999999999) return "";
  if (+n === 0) return "영원";
  const digits = ["","일","이","삼","사","오","육","칠","팔","구"];
  const unit = ["","십","백","천"];
  const large = ["","만","억"];
  let num = Number(n), groups = [], p = 0;
  while (num) {
    let block = num % 10000, part = "", idx = 0;
    while (block) {
      const digit = block % 10;
      if (digit) part = (digit === 1 && idx > 0 ? "" : digits[digit]) + unit[idx] + part;
      block = Math.floor(block / 10);idx++;
    }
    if (part) groups.unshift(part + large[p]);
    num = Math.floor(num / 10000);p++;
  }
  return groups.join("") + "원";
}
function viewText(value, blank = false) {
  if (blank || !nonEmpty(value)) return "<span class='blank-line'>___________________________</span>";
  return escapeHtml(value).replace(/\n/g,"<br>");
}
export function renderDocument(doc, answers, opts = {}) {
  const blank = !!opts.blank;
  const todayField = doc.fields.find(f => f.id === "date");
  const dateDisplay = todayField ? (blank ? "_______년 ____월 ____일" : viewText(answers.date)) : "";
  const parts = [];
  for (const field of doc.fields) {
    const value = answers[field.id];
    if (field.type === "repeater") {
      const entries = blank ? [{}] : (Array.isArray(value) ? value.filter(row => Object.values(row).some(nonEmpty)) : []);
      const rows = entries.length ? entries : (blank ? [{}] : []);
      parts.push("<section class='print-section'><h3>" + escapeHtml(field.label) + "</h3><table class='document-table'><thead><tr>"+
        field.columns.map(c => "<th>" + escapeHtml(c.label) + "</th>").join("") + "</tr></thead><tbody>" +
        (rows.length ? rows.map(row => "<tr>" + field.columns.map(c => "<td>"+viewText(row[c.id], blank)+"</td>").join("")+"</tr>").join("") :
          "<tr><td colspan='" + field.columns.length + "' class='muted'>기재 사항 없음</td></tr>") + "</tbody></table></section>");
    } else {
      const display = field.type === "number" && !blank && nonEmpty(value) ? formatWon(value) : viewText(value,blank);
      parts.push("<div class='document-field'><div class='document-label'>"+escapeHtml(field.label)+"</div><div class='document-value'>"+display+"</div></div>");
    }
  }
  const amount = !blank && doc.id === "receipt" && nonEmpty(answers.amount) && !validateAnswers(doc,{...answers, amount:answers.amount}).some(e=>e.field==="amount")
    ? "<div class='amount-block'><span>수령 금액</span><strong>" + escapeHtml(formatWon(answers.amount)) + "</strong><small>일금 " + escapeHtml(toHangulWon(Number(answers.amount))) + "정</small></div>"
    : "";
  return "<article class='document-sheet' aria-label='" + escapeHtml(doc.title) + " 미리보기'><header class='sheet-head'>" +
    "<small>DOCUMENT · " + escapeHtml(doc.category) + "</small><h2>" + escapeHtml(doc.title) + "</h2>" +
    (dateDisplay ? "<div class='sheet-date'>" + dateDisplay + "</div>" : "") +
    "</header>" + amount + "<div class='document-contents'>" + parts.join("") + "</div>" +
    "<footer class='sheet-foot'><p>" + escapeHtml(doc.notice) + "</p><div class='sheet-sign'>작성자 / 확인자: ____________________ (서명 또는 날인)</div></footer></article>";
}
