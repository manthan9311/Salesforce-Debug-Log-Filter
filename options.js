let enabledTags = new Set();

function initializeUI() {
  chrome.storage.local.get(['enabledTags'], function(result) {
    if (result.enabledTags) {
      enabledTags = new Set(result.enabledTags);
    } else {
      enabledTags = new Set(SALESFORCE_LOG_TAGS);
    }
    renderTags(SALESFORCE_LOG_TAGS);
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
    checkbox.checked = enabledTags.has(tag);

    checkbox.addEventListener('change', function() {
      if (this.checked) {
        enabledTags.add(tag);
      } else {
        enabledTags.delete(tag);
      }
      saveTags();
    });

    const label = document.createElement('label');
    label.htmlFor = `tag-${tag}`;
    label.textContent = tag;

    tagElement.appendChild(checkbox);
    tagElement.appendChild(label);
    container.appendChild(tagElement);
  });
}

function saveTags() {
  const tagsArray = Array.from(enabledTags);
  chrome.storage.local.set({ enabledTags: tagsArray }, function() {
    showSaveIndicator();
  });
}

function showSaveIndicator() {
  const indicator = document.getElementById('saveIndicator');
  indicator.classList.add('show');
  setTimeout(() => {
    indicator.classList.remove('show');
  }, 2000);
}

document.getElementById('selectAll').addEventListener('click', function() {
  SALESFORCE_LOG_TAGS.forEach(tag => enabledTags.add(tag));
  renderTags(SALESFORCE_LOG_TAGS);
  saveTags();
});

document.getElementById('deselectAll').addEventListener('click', function() {
  enabledTags.clear();
  renderTags(SALESFORCE_LOG_TAGS);
  saveTags();
});

document.getElementById('searchTags').addEventListener('input', function(e) {
  const searchTerm = e.target.value.toLowerCase();
  const filteredTags = SALESFORCE_LOG_TAGS.filter(tag =>
    tag.toLowerCase().includes(searchTerm)
  );
  renderTags(filteredTags);
});

initializeUI();
