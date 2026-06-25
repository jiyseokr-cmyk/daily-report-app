const apiKeyInputEl = document.getElementById("apiKeyInput");
const apiKeyStatusEl = document.getElementById("apiKeyStatus");
const reportDateEl = document.getElementById("reportDate");
const chatInputEl = document.getElementById("chatInput");
const jiraInputEl = document.getElementById("jiraInput");
const reportOutputEl = document.getElementById("reportOutput");
const reportTitleEl = document.getElementById("reportTitle");
const summaryTableBodyEl = document.getElementById("summaryTableBody");
const reportModeLabelEl = document.getElementById("reportModeLabel");
const reportAccessLabelEl = document.getElementById("reportAccessLabel");
const reportTimestampEl = document.getElementById("reportTimestamp");
const statusMessageEl = document.getElementById("statusMessage");
const loadSampleBtn = document.getElementById("loadSampleBtn");
const generateLocalBtn = document.getElementById("generateLocalBtn");
const generateAiBtn = document.getElementById("generateAiBtn");
const saveApiKeyBtn = document.getElementById("saveApiKeyBtn");
const validateApiKeyBtn = document.getElementById("validateApiKeyBtn");
const deleteApiKeyBtn = document.getElementById("deleteApiKeyBtn");
const copyBtn = document.getElementById("copyBtn");
const downloadTxtBtn = document.getElementById("downloadTxtBtn");
const resetBtn = document.getElementById("resetBtn");
const apiKeySummaryEl = document.getElementById("apiKeySummary");

const sampleFiles = {
  chat: "messenger_chat_sample.txt",
  jira: "jira_task_sample.csv",
};

const apiKeyStorageKey = "securex_api_key";
const MODEL_NAME = "gpt-4o-mini";

const reportState = {
  title: "SecureX 일일 업무보고서",
  summaryRows: [],
  bodyText: "",
  exportText: "",
  dateValue: "",
  generatedAt: "",
};

init();

function init() {
  reportDateEl.value = toDateInputValue(new Date());
  syncApiKeyStatus();
  updateResponsiveMode();

  loadSampleBtn.addEventListener("click", loadSampleData);
  generateLocalBtn.addEventListener("click", generateLocalSampleReport);
  generateAiBtn.addEventListener("click", generateAiReport);
  saveApiKeyBtn.addEventListener("click", saveApiKey);
  validateApiKeyBtn.addEventListener("click", validateApiKey);
  deleteApiKeyBtn.addEventListener("click", deleteApiKey);
  copyBtn.addEventListener("click", copyReport);
  downloadTxtBtn.addEventListener("click", downloadTxtReport);
  resetBtn.addEventListener("click", resetForm);

  window.addEventListener("resize", updateResponsiveMode);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateResponsiveMode);
  }
}

function toDateInputValue(date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function getStoredApiKey() {
  return localStorage.getItem(apiKeyStorageKey);
}

function syncApiKeyStatus() {
  const apiKey = getStoredApiKey();
  apiKeyStatusEl.textContent = apiKey ? "API Key 설정됨" : "API Key 미설정";
  apiKeySummaryEl.textContent = apiKey ? maskApiKey(apiKey) : "없음";
}

function setReportModeLabel(label) {
  reportModeLabelEl.textContent = label;
}

function setReportAccessLabel(label) {
  reportAccessLabelEl.textContent = label;
}

function setReportTitle(dateValue) {
  const suffix = dateValue ? ` (${dateValue})` : "";
  reportTitleEl.textContent = `SecureX 일일 업무보고서${suffix}`;
}

function setReportTimestamp(timestampText) {
  reportTimestampEl.textContent = `보고서 생성 시각: ${timestampText || "-"}`;
}

function maskApiKey(apiKey) {
  const trimmed = String(apiKey || "").trim();
  if (!trimmed) {
    return "없음";
  }

  if (trimmed.length <= 8) {
    return `${trimmed.slice(0, 2)}****`;
  }

  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

function formatCurrentTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function saveApiKey() {
  const apiKey = apiKeyInputEl.value.trim();

  if (!apiKey) {
    localStorage.removeItem(apiKeyStorageKey);
    syncApiKeyStatus();
    setStatus("API Key가 비어 있어 저장하지 않았습니다.");
    return;
  }

  localStorage.setItem(apiKeyStorageKey, apiKey);
  apiKeyInputEl.value = "";
  syncApiKeyStatus();
  setStatus("API Key 설정됨");
}

async function validateApiKey() {
  const apiKey = getStoredApiKey() || apiKeyInputEl.value.trim();

  if (!apiKey) {
    alert("API Key 검증 결과: API Key가 설정되지 않았습니다.");
    setStatus("API Key가 설정되지 않았습니다. 먼저 API Key를 입력해 주세요.");
    return;
  }

  if (!looksLikeOpenAIKey(apiKey)) {
    alert("API Key 검증 결과: API Key 형식이 올바르지 않습니다.");
    setStatus("API Key 형식이 올바르지 않아 검증할 수 없습니다.");
    return;
  }

  setStatus("API Key를 검증하는 중입니다.");

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      syncApiKeyStatus();
      alert("API Key 검증 결과: 유효한 키로 확인되었습니다.");
      setStatus("API Key가 유효합니다.");
      return;
    }

    if (response.status === 401 || response.status === 403) {
      alert("API Key 검증 결과: 유효하지 않은 키입니다.");
      setStatus("API Key가 유효하지 않습니다. 키를 다시 확인해 주세요.");
      return;
    }

    alert("API Key 검증 결과: 검증에 실패했습니다.");
    setStatus("API Key 검증에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  } catch (error) {
    alert("API Key 검증 결과: 요청을 보낼 수 없어 확인하지 못했습니다.");
    setStatus("API Key 검증 요청을 보낼 수 없습니다. 네트워크 연결을 확인해 주세요.");
    console.error(error);
  }
}

function deleteApiKey() {
  localStorage.removeItem(apiKeyStorageKey);
  apiKeyInputEl.value = "";
  syncApiKeyStatus();
  setStatus("API Key 미설정");
}

async function loadSampleData() {
  setStatus("샘플 데이터를 불러오는 중입니다.");

  try {
    const [chatText, jiraText] = await Promise.all([
      readTextFile(sampleFiles.chat),
      readTextFile(sampleFiles.jira),
    ]);

    chatInputEl.value = chatText.trim();
    jiraInputEl.value = jiraText.trim();

    setStatus("샘플 데이터 로드가 완료되었습니다.");
  } catch (error) {
    setStatus("샘플 파일을 불러오지 못했습니다. 파일 위치를 확인해 주세요.");
    reportOutputEl.textContent = "샘플 파일을 찾을 수 없습니다. 동일 폴더의 참고 파일을 확인해 주세요.";
    console.error(error);
  }
}

async function readTextFile(fileName) {
  const response = await fetch(encodeURI(fileName));
  if (!response.ok) {
    throw new Error(`Failed to load ${fileName}`);
  }
  return response.text();
}

function analyzeInputs(dateValue, chatText, jiraText) {
  const issues = parseCsv(jiraText);
  const chatLines = chatText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const completedItems = issues.filter((item) => isCompleted(item.status));
  const inProgressItems = issues.filter((item) => isInProgress(item.status));
  const pendingItems = issues.filter((item) => isPending(item.status));
  const highPriorityItems = issues.filter((item) => isHighPriority(item.priority));
  const tomorrowItems = issues.filter((item) => shouldCheckTomorrow(item.due_date, dateValue));
  const issueItems = issues.filter((item) => hasIssueSignal(item));
  const summaryHighlights = collectSummaryHighlights(chatLines, issues);

  return {
    dateValue,
    chatLines,
    issues,
    completedItems,
    inProgressItems,
    pendingItems,
    highPriorityItems,
    tomorrowItems,
    issueItems,
    summaryHighlights,
  };
}

function buildSummaryRows(analysis) {
  const rows = [];
  const supportItems = dedupeIssues([
    ...analysis.pendingItems,
    ...analysis.highPriorityItems,
    ...analysis.issueItems,
  ]);

  pushSummaryRows(rows, "완료 업무", analysis.completedItems.slice(0, 2), "완료");
  pushSummaryRows(rows, "진행 중 업무", analysis.inProgressItems.slice(0, 2), "진행 중");
  pushSummaryRows(rows, "지연/이슈 업무", analysis.issueItems.slice(0, 2), "모니터링");
  pushSummaryRows(rows, "내일 예정 업무", analysis.tomorrowItems.slice(0, 2), "예정");
  pushSummaryRows(rows, "지원 필요 업무", supportItems.slice(0, 2), "추가 확인 필요");

  if (!rows.length) {
    rows.push(createSummaryRow(
      "추가 확인 필요",
      "현재 입력에서 주요 업무를 식별하지 못했습니다.",
      "추가 확인 필요",
      "추가 확인 필요",
      "추가 확인 필요",
      "메신저 대화와 JIRA 데이터를 다시 확인해 주세요.",
      false,
    ));
  }

  return rows;
}

function pushSummaryRows(rows, category, items, fallbackStatus) {
  if (!items.length) {
    rows.push(createSummaryRow(
      category,
      `${category}에 해당하는 업무를 찾지 못했습니다.`,
      "추가 확인 필요",
      fallbackStatus,
      "추가 확인 필요",
      "추가 확인 필요",
      false,
    ));
    return;
  }

  for (const item of items) {
    rows.push(createSummaryRow(
      category,
      buildSummaryContent(item, category),
      maskSensitiveDisplay(item.owner || "추가 확인 필요"),
      normalizeSummaryStatus(item, fallbackStatus),
      normalizeSummaryPriority(item),
      buildSummaryNextAction(item, category),
      isHighPriority(item.priority),
    ));
  }
}

function createSummaryRow(category, content, owner, status, priority, nextAction, highlight) {
  return {
    category,
    content,
    owner,
    status,
    priority,
    nextAction,
    highlight,
  };
}

function buildSummaryContent(item, category) {
  const title = maskSensitiveDisplay(item.title || `${category} 관련 업무`);
  const summaryParts = [title];

  if (item.issue_summary) {
    summaryParts.push(maskSensitiveDisplay(item.issue_summary));
  } else if (item.progress && !isCompleted(item.status)) {
    summaryParts.push(maskSensitiveDisplay(item.progress));
  }

  return summaryParts.join(" / ");
}

function buildSummaryNextAction(item, category) {
  const nextAction = maskSensitiveDisplay(item.next_action || "");
  if (nextAction) {
    return nextAction;
  }

  switch (category) {
    case "완료 업무":
      return "후속 확인 필요 시 추가 공유";
    case "진행 중 업무":
      return "진행 상황 재확인";
    case "지연/이슈 업무":
      return "원인 분석 및 고객 안내";
    case "내일 예정 업무":
      return "내일 오전 확인";
    case "지원 필요 업무":
      return "추가 확인 필요";
    default:
      return "추가 확인 필요";
  }
}

function normalizeSummaryStatus(item, fallbackStatus) {
  const value = normalize(item.status);
  if (/완료/i.test(value)) return "완료";
  if (/진행/i.test(value)) return "진행 중";
  if (/대기/i.test(value)) return "대기";
  if (/모니터링/i.test(value)) return "모니터링";
  if (/예정/i.test(value)) return "예정";
  return fallbackStatus || "추가 확인 필요";
}

function normalizeSummaryPriority(item) {
  const value = normalize(item.priority);
  if (/high/i.test(value)) return "High";
  if (/medium/i.test(value)) return "Medium";
  if (/low/i.test(value)) return "Low";
  return "추가 확인 필요";
}

function maskSensitiveDisplay(value) {
  return sanitizeSensitiveText(String(value || "")).replace(/\s+/g, " ").trim();
}

function dedupeIssues(items) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = item.ticket_id || item.title || JSON.stringify(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function buildLocalReportBody(dateValue, analysis) {
  const reportLines = [
    `[일일 업무 요약]`,
    buildDailySummaryLine(
      analysis.issues,
      analysis.completedItems,
      analysis.inProgressItems,
      analysis.pendingItems,
      analysis.highPriorityItems,
    ),
    "",
    "[주요 완료 업무]",
    ...(analysis.completedItems.length
      ? analysis.completedItems.slice(0, 5).map((item) => formatIssueLine(item))
      : ["- 완료된 업무가 없습니다."]),
    "",
    "[진행 중 업무]",
    ...(analysis.inProgressItems.length
      ? analysis.inProgressItems.slice(0, 5).map((item) => formatIssueLine(item))
      : ["- 진행 중 업무가 없습니다."]),
    "",
    "[지연/이슈 사항]",
    ...(analysis.issueItems.length
      ? analysis.issueItems.slice(0, 5).map((item) => formatIssueIssueLine(item))
      : ["- 지연 또는 이슈로 보이는 업무가 없습니다."]),
    "",
    "[내일 예정 업무]",
    ...(analysis.tomorrowItems.length
      ? analysis.tomorrowItems.slice(0, 5).map((item) => formatIssueLine(item, true))
      : ["- 내일 확인할 업무가 없습니다."]),
    "",
    "[지원 필요 사항]",
    ...buildSupportNeedLines(analysis.pendingItems, analysis.highPriorityItems, analysis.issueItems),
    "",
    "[내부 공유 메모]",
    ...buildInternalMemoLines(analysis.summaryHighlights, analysis.chatLines, analysis.issues),
  ];

  return reportLines.join("\n");
}

function buildExportReportText(reportData) {
  const tableText = buildSummaryTableText(reportData.summaryRows);
  return [
    `## ${reportData.title}`,
    `작성일: ${reportData.dateValue}`,
    `보고서 생성 시각: ${reportData.generatedAt}`,
    "",
    "[업무 현황 요약표]",
    tableText,
    "",
    "[일일 업무보고서 본문]",
    reportData.bodyText,
  ].join("\n");
}

function buildSummaryTableText(rows) {
  const headers = ["구분", "주요 내용", "담당자", "상태", "우선순위", "다음 조치"];
  const matrix = [headers, ...rows.map((row) => [
    row.category,
    row.content,
    row.owner,
    row.status,
    row.priority,
    row.nextAction,
  ])];
  const widths = headers.map((_, index) => Math.max(...matrix.map((line) => String(line[index] || "").length)));

  return matrix
    .map((line) => line.map((cell, index) => String(cell || "").padEnd(widths[index])).join(" | "))
    .join("\n");
}

function buildReportData({ dateValue, modeLabel, accessLabel, bodyText, summaryRows }) {
  const generatedAt = formatCurrentTimestamp();
  const title = `SecureX 일일 업무보고서${dateValue ? ` (${dateValue})` : ""}`;

  return {
    title,
    dateValue,
    generatedAt,
    modeLabel,
    accessLabel,
    bodyText,
    summaryRows,
    exportText: buildExportReportText({
      title,
      dateValue,
      generatedAt,
      bodyText,
      summaryRows,
    }),
  };
}

function renderReport(reportData) {
  reportState.title = reportData.title;
  reportState.summaryRows = reportData.summaryRows;
  reportState.bodyText = reportData.bodyText;
  reportState.exportText = reportData.exportText;
  reportState.dateValue = reportData.dateValue;
  reportState.generatedAt = reportData.generatedAt;

  setReportTitle(reportData.dateValue);
  setReportTimestamp(reportData.generatedAt);
  setReportModeLabel(reportData.modeLabel);
  setReportAccessLabel(reportData.accessLabel);
  renderSummaryTable(reportData.summaryRows);
  reportOutputEl.textContent = reportData.bodyText;
}

function renderSummaryTable(rows) {
  summaryTableBodyEl.innerHTML = "";
  const columnLabels = ["구분", "주요 내용", "담당자", "상태", "우선순위", "다음 조치"];

  if (!rows.length) {
    const emptyRow = document.createElement("tr");
    const emptyCell = document.createElement("td");
    emptyCell.colSpan = 6;
    emptyCell.className = "table-empty";
    emptyCell.textContent = "표시할 요약 정보가 없습니다.";
    emptyRow.appendChild(emptyCell);
    summaryTableBodyEl.appendChild(emptyRow);
    return;
  }

  for (const row of rows) {
    const tr = document.createElement("tr");
    if (row.highlight) {
      tr.classList.add("row-high");
    }

    [
      row.category,
      row.content,
      row.owner,
      row.status,
      row.priority,
      row.nextAction,
    ].forEach((value, index) => {
      const td = document.createElement("td");
      td.textContent = value;
      td.setAttribute("data-label", columnLabels[index]);
      td.title = value;
      tr.appendChild(td);
    });

    summaryTableBodyEl.appendChild(tr);
  }
}

function clearRenderedReport() {
  reportState.title = "SecureX 일일 업무보고서";
  reportState.summaryRows = [];
  reportState.bodyText = "";
  reportState.exportText = "";
  reportState.dateValue = "";
  reportState.generatedAt = "";
  reportTitleEl.textContent = "SecureX 일일 업무보고서";
  summaryTableBodyEl.innerHTML = '<tr><td colspan="6" class="table-empty">샘플 데이터를 불러온 뒤 보고서 생성을 눌러 주세요.</td></tr>';
  reportOutputEl.textContent = "샘플 데이터를 불러온 뒤 보고서 생성을 눌러 주세요.";
  setReportTimestamp("-");
}

function normalizeAiReportBody(aiReport) {
  const lines = String(aiReport || "").trim().split(/\r?\n/).map((line) => line.trim());
  if (lines[0] && /^#{1,6}\s/.test(lines[0])) {
    return lines.slice(1).join("\n").trim() || String(aiReport || "").trim();
  }
  return String(aiReport || "").trim();
}

function generateLocalSampleReport() {
  const dateValue = reportDateEl.value || toDateInputValue(new Date());
  const chatText = chatInputEl.value.trim();
  const jiraText = jiraInputEl.value.trim();

  if (!chatText && !jiraText) {
    clearRenderedReport();
    reportOutputEl.textContent = "메신저 대화 내용과 JIRA 업무 데이터를 입력한 뒤 로컬 샘플 보고서를 생성해 주세요.";
    setStatus("입력값이 비어 있습니다.");
    return;
  }

  const analysis = analyzeInputs(dateValue, chatText, jiraText);
  const bodyText = buildLocalReportBody(dateValue, analysis);
  const reportData = buildReportData({
    dateValue,
    modeLabel: "보고서 생성 방식: 로컬 샘플 생성",
    accessLabel: "API Key 없이 실행 가능",
    bodyText,
    summaryRows: buildSummaryRows(analysis),
  });

  renderReport(reportData);
  setStatus("로컬 샘플 보고서가 생성되었습니다.");
}

async function generateAiReport() {
  setReportModeLabel("보고서 생성 방식: AI 보고서 생성");
  setReportAccessLabel("API Key 필요");

  const apiKey = getStoredApiKey();
  const dateValue = reportDateEl.value || toDateInputValue(new Date());
  const chatText = chatInputEl.value.trim();
  const jiraText = jiraInputEl.value.trim();
  setReportTitle(dateValue);
  clearRenderedReport();
  setReportTitle(dateValue);
  setReportModeLabel("보고서 생성 방식: AI 보고서 생성");
  setReportAccessLabel("API Key 필요");

  if (!apiKey) {
    reportOutputEl.textContent = "API Key가 설정되지 않았습니다. 먼저 API Key를 입력해 주세요.";
    setStatus("API Key 미설정");
    return;
  }

  if (!chatText && !jiraText) {
    reportOutputEl.textContent = "메신저 대화 내용과 JIRA 업무 데이터를 입력한 뒤 AI 보고서를 생성해 주세요.";
    setStatus("입력값이 비어 있습니다.");
    return;
  }

  const prompt = buildAiPrompt(dateValue, chatText, jiraText);

  reportOutputEl.textContent = "AI 보고서를 생성 중입니다...";
  setStatus("AI 보고서를 생성 중입니다...");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        input: prompt,
        instructions: buildAiInstructions(),
        max_output_tokens: 1200,
        temperature: 0.2,
        store: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      reportOutputEl.textContent = "AI 보고서 생성에 실패했습니다. API 응답을 확인해 주세요.";
      setStatus(`AI 보고서 생성 실패 (${response.status})`);
      console.error(errorText);
      return;
    }

    const responseData = await response.json();
    const aiReport = extractResponseText(responseData);

    if (!aiReport) {
      reportOutputEl.textContent = "AI 보고서 응답을 해석하지 못했습니다.";
      setStatus("AI 응답 파싱 실패");
      return;
    }

    const analysis = analyzeInputs(dateValue, chatText, jiraText);
    const reportData = buildReportData({
      dateValue,
      modeLabel: "보고서 생성 방식: AI 보고서 생성",
      accessLabel: "API Key 필요",
      bodyText: normalizeAiReportBody(aiReport),
      summaryRows: buildSummaryRows(analysis),
    });

    renderReport(reportData);
    setStatus("AI 보고서가 생성되었습니다.");
  } catch (error) {
    reportOutputEl.textContent = "AI 보고서 생성 중 오류가 발생했습니다. 네트워크 또는 API Key 상태를 확인해 주세요.";
    setStatus("AI 보고서 생성 실패");
    console.error(error);
  }
}

function buildAiInstructions() {
  return [
    "당신은 SecureX 기술지원팀의 팀장 공유용 일일 업무보고서를 작성하는 도우미다.",
    "출력은 반드시 아래 구조와 순서를 그대로 따르고, 섹션 제목도 동일하게 사용한다.",
    "[일일 업무 요약]",
    "[주요 완료 업무]",
    "[진행 중 업무]",
    "[지연/이슈 사항]",
    "[내일 예정 업무]",
    "[지원 필요 사항]",
    "[내부 공유 메모]",
    "보고서 제목은 ## 제목2 수준으로 작성한다.",
    "문체는 팀장에게 공유할 업무보고서 톤으로 간결하고 명확하게 작성한다.",
    "입력 데이터에 없는 사실은 추측하지 말고 반드시 '추가 확인 필요'라고 쓴다.",
    "고객명, 계정, IP, 내부 URL, API Key 같은 민감정보는 그대로 노출하지 말고 '[마스킹 필요]'로 표기한다.",
    "필요한 경우 담당자, 상태, 후속조치, 위험요인을 간단히 정리한다.",
  ].join("\n");
}

function buildAiPrompt(dateValue, chatText, jiraText) {
  const maskedChatText = sanitizeSensitiveText(chatText);
  const maskedJiraText = sanitizeSensitiveText(jiraText);

  return [
    `작성일: ${dateValue}`,
    "",
    "메신저 대화 내용:",
    maskedChatText || "없음",
    "",
    "JIRA 업무 데이터:",
    maskedJiraText || "없음",
    "",
    "요청:",
    "위 두 입력을 종합해 팀장에게 공유할 수 있는 일일 업무보고서 초안을 작성해 주세요.",
    "사실이 불분명한 부분은 추측하지 말고 '추가 확인 필요'로 표시해 주세요.",
    "민감정보가 포함되어 있다면 반드시 '[마스킹 필요]'로 표기해 주세요.",
  ].join("\n");
}

function sanitizeSensitiveText(text) {
  return String(text || "")
    .replace(/sk-proj-[A-Za-z0-9._-]+/g, "[API Key 마스킹 필요]")
    .replace(/\bsk-[A-Za-z0-9._-]+/g, "[API Key 마스킹 필요]")
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[IP 마스킹 필요]")
    .replace(/\bhttps?:\/\/[^\s)]+/gi, "[내부 URL 마스킹 필요]")
    .replace(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}\b/g, "[계정 마스킹 필요]")
    .replace(/(계정|account|아이디|id|user)\s*[:=]\s*([^\s,;/]+)/gi, "$1: [계정 마스킹 필요]")
    .replace(/(고객사|고객명)\s*[:=]\s*([^\s,;/]+)/gi, "$1: [마스킹 필요]");
}

function extractResponseText(responseData) {
  const directText = typeof responseData.output_text === "string" ? responseData.output_text.trim() : "";
  if (directText) {
    return directText;
  }

  const outputItems = Array.isArray(responseData.output) ? responseData.output : [];
  const chunks = [];

  for (const item of outputItems) {
    if (item && item.type === "message" && Array.isArray(item.content)) {
      for (const contentItem of item.content) {
        if (contentItem && contentItem.type === "output_text" && typeof contentItem.text === "string") {
          chunks.push(contentItem.text);
        }
        if (contentItem && contentItem.type === "text" && typeof contentItem.text === "string") {
          chunks.push(contentItem.text);
        }
      }
    }
  }

  return chunks.join("").trim();
}

function buildDailySummaryLine(issues, completionItems, inProgressItems, pendingItems, highPriorityItems) {
  const total = issues.length;
  return `- 총 ${total}건의 업무를 확인했습니다. 완료 ${completionItems.length}건, 진행 중 ${inProgressItems.length}건, 대기/이슈 ${pendingItems.length}건으로 정리되며, 우선순위가 높은 업무는 ${highPriorityItems.length}건입니다.`;
}

function buildSupportNeedLines(pendingItems, highPriorityItems, issueItems) {
  const lines = [];

  if (highPriorityItems.length) {
    lines.push(`- 우선순위가 높은 업무 ${maskSensitiveDisplay(highPriorityItems[0].ticket_id)}(${maskSensitiveDisplay(highPriorityItems[0].title)})는 추가 확인이 필요합니다.`);
  }

  if (pendingItems.length) {
    lines.push(`- 대기 상태 업무 ${maskSensitiveDisplay(pendingItems[0].ticket_id)}(${maskSensitiveDisplay(pendingItems[0].title)})의 회신 또는 재확인이 필요합니다.`);
  }

  if (issueItems.length) {
    lines.push(`- 이슈성 업무 ${maskSensitiveDisplay(issueItems[0].ticket_id)}(${maskSensitiveDisplay(issueItems[0].title)})는 원인 확인 후 고객 안내가 필요합니다.`);
  }

  if (!lines.length) {
    lines.push("- 추가 지원이 필요한 항목은 현재 확인되지 않았습니다.");
  }

  return lines;
}

function buildInternalMemoLines(summaryHighlights, chatLines, issues) {
  const lines = [];

  if (summaryHighlights.length) {
    lines.push(...summaryHighlights.slice(0, 3).map((line) => `- ${line}`));
  }

  if (chatLines.some((line) => /고객|회신|확인|재검토|모니터링/i.test(line))) {
    lines.push("- 메신저 대화에서 고객 회신, 확인 요청, 모니터링 항목을 우선 확인했습니다.");
  }

  if (issues.some((item) => isHighPriority(item.priority))) {
    lines.push("- 우선순위가 높은 업무는 담당자별로 재배치하여 추적하는 것이 좋습니다.");
  }

  if (!lines.length) {
    lines.push("- 내부 공유 메모로 남길 추가 내용이 없습니다.");
  }

  return lines;
}

function collectSummaryHighlights(chatLines, issues) {
  const lines = [];
  const chatMatches = chatLines.filter((line) => /(완료|진행|대기|이슈|지연|확인|고객|모니터링|회신|재검토)/i.test(line));
  const issueMatches = issues.filter((item) => isHighPriority(item.priority) || isPending(item.status) || hasIssueSignal(item));

  if (chatMatches.length) {
    lines.push(`메신저 대화에서 ${chatMatches.length}개의 확인 포인트를 찾았습니다.`);
  }

  if (issueMatches.length) {
    lines.push(`JIRA 기준으로 ${issueMatches.length}개의 우선 확인 업무가 있습니다.`);
  }

  return lines;
}

function formatIssueLine(item, withDueDate = false) {
  const parts = [`- ${maskSensitiveDisplay(item.ticket_id)}`, maskSensitiveDisplay(item.title)];

  if (item.owner) {
    parts.push(`담당: ${maskSensitiveDisplay(item.owner)}`);
  }

  if (item.priority) {
    parts.push(`우선순위: ${maskSensitiveDisplay(item.priority)}`);
  }

  if (withDueDate && item.due_date) {
    parts.push(`예정일: ${maskSensitiveDisplay(item.due_date)}`);
  }

  return parts.join(" / ");
}

function formatIssueIssueLine(item) {
  const parts = [`- ${maskSensitiveDisplay(item.ticket_id)}`, maskSensitiveDisplay(item.title)];

  if (item.status) {
    parts.push(`상태: ${maskSensitiveDisplay(item.status)}`);
  }

  if (item.next_action) {
    parts.push(`조치: ${maskSensitiveDisplay(item.next_action)}`);
  }

  return parts.join(" / ");
}

function isCompleted(status) {
  return /완료/i.test(normalize(status));
}

function isInProgress(status) {
  return /진행/i.test(normalize(status));
}

function isPending(status) {
  return /대기|예정|모니터링|보류/i.test(normalize(status));
}

function isHighPriority(priority) {
  return /high|상/i.test(normalize(priority));
}

function looksLikeOpenAIKey(apiKey) {
  const value = normalize(apiKey);
  if (value.length < 20) {
    return false;
  }

  if (/\s/.test(value)) {
    return false;
  }

  return /^sk-[A-Za-z0-9._-]+$/.test(value) || /^sk-proj-[A-Za-z0-9._-]+$/.test(value);
}

function shouldCheckTomorrow(dueDate, currentDate) {
  if (!dueDate) return false;
  const tomorrow = addDays(currentDate, 1);
  return dueDate <= tomorrow;
}

function hasIssueSignal(item) {
  const text = `${item.status || ""} ${item.progress || ""} ${item.issue_summary || ""} ${item.next_action || ""}`;
  return /이슈|지연|오탐|실패|경고|오류|미적용|offline|차단/i.test(text);
}

function parseCsv(csvText) {
  if (!csvText) return [];

  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const entry = {};

    headers.forEach((header, index) => {
      entry[header] = (values[index] || "").trim();
    });

    return entry;
  });
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const nextChar = line[index + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function normalize(value) {
  return String(value || "").trim();
}

function addDays(dateInput, amount) {
  const date = new Date(`${dateInput}T00:00:00`);
  date.setDate(date.getDate() + amount);
  return toDateInputValue(date);
}

async function copyReport() {
  const text = reportState.exportText.trim();
  if (!text) {
    setStatus("복사할 보고서가 아직 없습니다.");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setStatus("보고서가 클립보드에 복사되었습니다.");
  } catch (error) {
    setStatus("브라우저 권한 때문에 복사하지 못했습니다. 텍스트를 직접 선택해 주세요.");
    console.error(error);
  }
}

function downloadTxtReport() {
  const text = reportState.exportText.trim();
  if (!text) {
    setStatus("다운로드할 보고서가 아직 없습니다.");
    return;
  }

  const dateValue = reportState.dateValue || reportDateEl.value || toDateInputValue(new Date());
  const fileName = `daily_report_${dateValue}.txt`;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  setStatus("TXT 파일 다운로드를 시작했습니다.");
}

function resetForm() {
  reportDateEl.value = toDateInputValue(new Date());
  apiKeyInputEl.value = "";
  chatInputEl.value = "";
  jiraInputEl.value = "";
  setReportModeLabel("보고서 생성 방식: 로컬 샘플 생성");
  setReportAccessLabel("API Key 없이 실행 가능");
  syncApiKeyStatus();
  clearRenderedReport();
  setStatus("");
}

function setStatus(message) {
  statusMessageEl.textContent = message;
}

function updateResponsiveMode() {
  const zoomScale = getViewportScale();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const shouldCompact = zoomScale > 1.05 || viewportWidth < 1180;

  document.body.classList.toggle("zoom-compact", shouldCompact);
}

function getViewportScale() {
  if (window.visualViewport && typeof window.visualViewport.scale === "number") {
    return window.visualViewport.scale;
  }

  return 1;
}
