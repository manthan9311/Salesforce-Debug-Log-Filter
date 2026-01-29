let originalLogContent = '';
let filteredLogContent = '';
let isFilterActive = false;

const LOG_TAGS = [
  'CODE_UNIT_STARTED',
  'CODE_UNIT_FINISHED',
  'METHOD_ENTRY',
  'METHOD_EXIT',
  'CONSTRUCTOR_ENTRY',
  'CONSTRUCTOR_EXIT',
  'SYSTEM_METHOD_ENTRY',
  'SYSTEM_METHOD_EXIT',
  'SYSTEM_CONSTRUCTOR_ENTRY',
  'SYSTEM_CONSTRUCTOR_EXIT',
  'STATEMENT_EXECUTE',
  'VARIABLE_SCOPE_BEGIN',
  'VARIABLE_ASSIGNMENT',
  'USER_DEBUG',
  'USER_INFO',
  'SYSTEM_MODE_ENTER',
  'SYSTEM_MODE_EXIT',
  'DML_BEGIN',
  'DML_END',
  'SOQL_EXECUTE_BEGIN',
  'SOQL_EXECUTE_END',
  'SOSL_EXECUTE_BEGIN',
  'SOSL_EXECUTE_END',
  'EXCEPTION_THROWN',
  'FATAL_ERROR',
  'FLOW_CREATE_INTERVIEW_BEGIN',
  'FLOW_CREATE_INTERVIEW_END',
  'FLOW_START_INTERVIEWS_BEGIN',
  'FLOW_START_INTERVIEWS_END',
  'FLOW_ELEMENT_BEGIN',
  'FLOW_ELEMENT_END',
  'VALIDATION_RULE',
  'VALIDATION_FORMULA',
  'VALIDATION_PASS',
  'VALIDATION_FAIL',
  'CALLOUT_REQUEST',
  'CALLOUT_RESPONSE',
  'LIMIT_USAGE',
  'HEAP_ALLOCATE',
  'EXECUTION_STARTED',
  'EXECUTION_FINISHED',
  'WF_RULE_EVAL_BEGIN',
  'WF_RULE_EVAL_END',
  'WF_CRITERIA_BEGIN',
  'WF_CRITERIA_END',
  'WF_ACTION',
  'WF_ACTIONS_END',
  'ENTERING_MANAGED_PKG',
  'CUMULATIVE_LIMIT_USAGE',
  'CUMULATIVE_LIMIT_USAGE_END',
  'EMAIL_QUEUE',
  'PUSH_NOTIFICATION_SENT',
  'VF_APEX_CALL_START',
  'VF_APEX_CALL_END',
  'VF_DESERIALIZE_VIEWSTATE_BEGIN',
  'VF_DESERIALIZE_VIEWSTATE_END',
  'VF_EVALUATE_FORMULA_BEGIN',
  'VF_EVALUATE_FORMULA_END',
  'VF_PAGE_MESSAGE',
  'VF_SERIALIZE_VIEWSTATE_BEGIN',
  'VF_SERIALIZE_VIEWSTATE_END'
];

function findLogElements() {
  const selectors = [
    'pre',
    'textarea',
    '[class*="log"]',
    '[class*="debug"]',
    '[id*="log"]',
    '[id*="debug"]',
    '.codeBlock',
    '.debugLog'
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);

    for (const element of elements) {
      const text = element.textContent || element.value || '';

      const hasAnyLogTag = LOG_TAGS.some(tag => text.includes(tag));

      if (hasAnyLogTag) {
        return element;
      }
    }
  }

  return null;
}

function getLogContent(element) {
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    return element.value;
  }
  return element.textContent;
}

function setLogContent(element, content) {
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    element.value = content;
  } else {
    element.textContent = content;
  }
}

function filterLogByTags(logText, tags) {
  if (!tags || tags.length === 0) {
    return logText;
  }

  const lines = logText.split('\n');
  const filteredLines = lines.filter(line => {
    return tags.some(tag => line.includes(tag));
  });

  return filteredLines.join('\n');
}

function applyFilter(tags) {
  const logElement = findLogElements();

  if (!logElement) {
    console.log('No log element found on this page');
    return;
  }

  if (!originalLogContent) {
    originalLogContent = getLogContent(logElement);
  }

  filteredLogContent = filterLogByTags(originalLogContent, tags);
  if (!filteredLogContent) {
    console.log('No log element found on this page');
	chrome.runtime.sendMessage({
      action: "noFilteredContent",
      message: "No log lines match the selected tags."
    });
    
    return;
  }
  setLogContent(logElement, filteredLogContent);
  isFilterActive = true;

  addFilterIndicator(tags.length);
}

function clearFilter() {
  
  
  const logElement = findLogElements();
/*
  if (!logElement) {
    console.log('No log element found on this page');
    return;
  }
*/
  if (originalLogContent) {
    setLogContent(logElement, originalLogContent);
  }

  isFilterActive = false;
  removeFilterIndicator();
}

function addFilterIndicator(tagCount) {
  removeFilterIndicator();

  const indicator = document.createElement('div');
  indicator.id = 'sf-log-filter-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  indicator.innerHTML = `
    <span>Filter Active (${tagCount} tags)</span>
    <button id="sf-clear-filter" style="
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      padding: 4px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
    ">Clear</button>
  `;

  document.body.appendChild(indicator);

  document.getElementById('sf-clear-filter').addEventListener('click', function() {
    clearFilter();
  });
}

function removeFilterIndicator() {
  const indicator = document.getElementById('sf-log-filter-indicator');
  if (indicator) {
    indicator.remove();
  }
}

function downloadFilteredLog() {
  if (!isFilterActive || !filteredLogContent) {
    alert('No filtered log to download. Please apply a filter first.');
    return;
  }

  const blob = new Blob([filteredLogContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `filtered-log-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'applyFilter') {
    applyFilter(request.tags);
    sendResponse({ success: true });
  } else if (request.action === 'clearFilter') {
    clearFilter();
    sendResponse({ success: true });
  } else if (request.action === 'downloadFiltered') {
    downloadFilteredLog();
    sendResponse({ success: true });
  }
});

chrome.storage.local.get(['selectedTags'], function(result) {
  if (result.selectedTags && result.selectedTags.length > 0) {
    setTimeout(() => {
      const logElement = findLogElements();
      if (logElement) {
        applyFilter(result.selectedTags);
      }
    }, 1000);
  }
});
