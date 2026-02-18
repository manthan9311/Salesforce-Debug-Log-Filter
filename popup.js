let enabledTags = [];
let selectedTags = new Set();
let profiles = [];
let selectedProfileId = null;
let isManualMode = false;

function initializeUI() {
  chrome.storage.local.get(['enabledTags', 'selectedTags', 'profiles', 'selectedProfile'], function(result) {
    if (result.enabledTags && result.enabledTags.length > 0) {
      enabledTags = result.enabledTags;
    } else {
      enabledTags = SALESFORCE_LOG_TAGS;
    }

    if (result.selectedTags) {
      selectedTags = new Set(result.selectedTags);
    }

    if (result.profiles) {
      profiles = result.profiles;
    }

    if (result.selectedProfile) {
      selectedProfileId = result.selectedProfile;
    }

    renderProfileSelector();
    updateProfileInfo();
    renderTags(enabledTags);
    updateSelectedCount();
  });
}

function renderProfileSelector() {
  const selector = document.getElementById('profileSelector');
  selector.innerHTML = '';

  if (profiles.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No profiles available';
    option.disabled = true;
    selector.appendChild(option);
    return;
  }

  profiles.forEach(profile => {
    const option = document.createElement('option');
    option.value = profile.id;
    option.textContent = profile.name;
    if (profile.id === selectedProfileId) {
      option.selected = true;
    }
    selector.appendChild(option);
  });

  selector.addEventListener('change', function() {
    selectedProfileId = this.value;
    isManualMode = false;
    document.getElementById('manualFilterToggle').checked = false;
    chrome.storage.local.set({ selectedProfile: selectedProfileId });
    updateProfileInfo();
    applyProfileTags();
  });
}

function updateProfileInfo() {
  const profileInfo = document.getElementById('profileInfo');
  const profile = profiles.find(p => p.id === selectedProfileId);

  if (!profile) {
    profileInfo.innerHTML = '<p>Select a profile to get started</p>';
    return;
  }

  let html = `<div style="margin-bottom: 8px;">${profile.description}</div>`;
  html += '<div class="profile-tags-display">';
  profile.tags.forEach(tag => {
    html += `<span class="profile-tag-chip">${tag}</span>`;
  });
  html += '</div>';

  profileInfo.innerHTML = html;
}

function applyProfileTags() {
  const profile = profiles.find(p => p.id === selectedProfileId);
  if (profile) {
    selectedTags = new Set(profile.tags);
    renderTags(enabledTags);
    updateSelectedCount();
  }
}

function toggleManualMode() {
  isManualMode = document.getElementById('manualFilterToggle').checked;
  document.getElementById('manualControlsContainer').style.display = isManualMode ? 'flex' : 'none';
  document.getElementById('searchBoxContainer').style.display = isManualMode ? 'block' : 'none';
  document.getElementById('tagsContainer').style.display = isManualMode ? 'block' : 'none';

  if (!isManualMode) {
    applyProfileTags();
  }
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

document.getElementById('manualFilterToggle').addEventListener('change', toggleManualMode);

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
