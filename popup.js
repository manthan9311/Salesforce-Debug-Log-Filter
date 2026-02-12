let enabledTags = [];
let selectedTags = new Set();

function initializeUI() {
  chrome.storage.local.get(['enabledTags', 'selectedTags'], function(result) {
    if (result.enabledTags && result.enabledTags.length > 0) {
      enabledTags = result.enabledTags;
    } else {
      enabledTags = SALESFORCE_LOG_TAGS;
    }

    if (result.selectedTags) {
      selectedTags = new Set(result.selectedTags);
    }
    renderTags(enabledTags);
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
  enabledTags.forEach(tag => selectedTags.add(tag));
  renderTags(enabledTags);
  updateSelectedCount();
});

document.getElementById('deselectAll').addEventListener('click', function() {
  selectedTags.clear();
  renderTags(enabledTags);
  updateSelectedCount();
});

document.getElementById('searchTags').addEventListener('input', function(e) {
  const searchTerm = e.target.value.toLowerCase();
  const filteredTags = enabledTags.filter(tag =>
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

document.getElementById('downloadOriginal').addEventListener('click', function() {
  sendMessageToTab({
    action: 'downloadLog',
    type: 'original'
  });
});

document.getElementById('downloadFiltered').addEventListener('click', function() {
  sendMessageToTab({
    action: 'downloadLog',
    type: 'filtered'
  });
});

document.getElementById('downloadTrimmedOriginal').addEventListener('click', function() {
  sendMessageToTab({
    action: 'downloadLog',
    type: 'trimmed-original'
  });
});

document.getElementById('downloadTrimmedFiltered').addEventListener('click', function() {
  sendMessageToTab({
    action: 'downloadLog',
    type: 'trimmed-filtered'
  });
});

initializeUI();

document.getElementById('openOptions').addEventListener('click', function(e) {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "noFilteredContent") {
    showNotification(request.message || "No matching log lines found.", "error");
    sendResponse({ acknowledged: true });
  }
});
