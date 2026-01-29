const SALESFORCE_LOG_TAGS = [
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

let selectedTags = new Set();

function initializeUI() {
  chrome.storage.local.get(['selectedTags'], function(result) {
    if (result.selectedTags) {
      selectedTags = new Set(result.selectedTags);
    }
    renderTags(SALESFORCE_LOG_TAGS);
    updateSelectedCount();
  });
}

function renderTags(tags) {
  const container = document.getElementById('tagsContainer');
  container.innerHTML = '';

  tags.forEach(tag => {
    const tagElement = document.createElement('div');
    tagElement.className = 'tag-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `tag-${tag}`;
    checkbox.value = tag;
    checkbox.checked = selectedTags.has(tag);

    checkbox.addEventListener('change', function() {
      if (this.checked) {
        selectedTags.add(tag);
      } else {
        selectedTags.delete(tag);
      }
      updateSelectedCount();
    });

    const label = document.createElement('label');
    label.htmlFor = `tag-${tag}`;
    label.textContent = tag;

    tagElement.appendChild(checkbox);
    tagElement.appendChild(label);
    container.appendChild(tagElement);
  });
}

function updateSelectedCount() {
  document.getElementById('selectedCount').textContent = selectedTags.size;
}

document.getElementById('selectAll').addEventListener('click', function() {
  SALESFORCE_LOG_TAGS.forEach(tag => selectedTags.add(tag));
  renderTags(SALESFORCE_LOG_TAGS);
  updateSelectedCount();
});

document.getElementById('deselectAll').addEventListener('click', function() {
  selectedTags.clear();
  renderTags(SALESFORCE_LOG_TAGS);
  updateSelectedCount();
});

document.getElementById('searchTags').addEventListener('input', function(e) {
  const searchTerm = e.target.value.toLowerCase();
  const filteredTags = SALESFORCE_LOG_TAGS.filter(tag =>
    tag.toLowerCase().includes(searchTerm)
  );
  renderTags(filteredTags);
});

function sendMessageToTab(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (!tabs || tabs.length === 0) {
      showNotification('No active tab found', 'error');
      return;
    }

    chrome.tabs.sendMessage(tabs[0].id, message, function() {
      if (chrome.runtime.lastError) {
        if (chrome.runtime.lastError.message.includes('Could not establish connection')) {
          showNotification('This page does not have a debug log. Please navigate to a Salesforce debug log page.', 'error');
        } else {
          showNotification('Error: ' + chrome.runtime.lastError.message, 'error');
        }
      }
    });
  });
}

function showNotification(message, type) {
  let notification = document.getElementById('notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'notification';
    notification.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      padding: 12px;
      background: ${type === 'error' ? '#f8d7da' : '#d4edda'};
      color: ${type === 'error' ? '#721c24' : '#155724'};
      border-bottom: 1px solid ${type === 'error' ? '#f5c6cb' : '#c3e6cb'};
      font-size: 12px;
      text-align: center;
      font-weight: 500;
      z-index: 10000;
    `;
    document.body.insertBefore(notification, document.body.firstChild);
  }

  notification.textContent = message;
  notification.style.display = 'block';

  setTimeout(() => {
    notification.style.display = 'none';
  }, 3000);
}

document.getElementById('applyFilter').addEventListener('click', function() {
  if (selectedTags.size === 0) {
    showNotification('Please select at least one tag', 'error');
    return;
  }

  const tagsArray = Array.from(selectedTags);
  chrome.storage.local.set({ selectedTags: tagsArray }, function() {
    sendMessageToTab({
      action: 'applyFilter',
      tags: tagsArray
    });
  });
});

document.getElementById('clearFilter').addEventListener('click', function() {
  sendMessageToTab({
    action: 'clearFilter'
  });
});

document.getElementById('downloadFiltered').addEventListener('click', function() {
  sendMessageToTab({
    action: 'downloadFiltered'
  });
});

initializeUI();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "noFilteredContent") {
    // type "error" will render with your existing red styling
    showNotification(request.message || "No matching log lines found.", "error");
    sendResponse({ acknowledged: true });
  }
});
