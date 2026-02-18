let enabledTags = new Set();
let profiles = [];
let editingProfileId = null;

function initializeUI() {
  chrome.storage.local.get(['enabledTags', 'profiles'], function(result) {
    if (result.enabledTags) {
      enabledTags = new Set(result.enabledTags);
    } else {
      enabledTags = new Set(SALESFORCE_LOG_TAGS);
    }
    if (result.profiles) {
      profiles = result.profiles;
    }
    renderTags(SALESFORCE_LOG_TAGS);
    renderProfilesTab();
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

function renderTagSelector(containerId, selectedTags = []) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  SALESFORCE_LOG_TAGS.forEach(tag => {
    const label = document.createElement('label');
    label.className = 'tag-checkbox';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = tag;
    checkbox.checked = selectedTags.includes(tag);

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(tag));
    container.appendChild(label);
  });
}

function renderProfilesTab() {
  renderProfilesList();
  renderTagSelector('tagSelector');
}

function renderProfilesList() {
  const container = document.getElementById('profilesList');
  container.innerHTML = '';

  if (profiles.length === 0) {
    container.innerHTML = '<p style="color: #999; font-size: 13px;">No profiles created yet. Create your first custom profile using the form on the right.</p>';
    return;
  }

  profiles.forEach(profile => {
    const profileElement = document.createElement('div');
    profileElement.className = 'profile-item';

    const header = document.createElement('div');
    header.className = 'profile-header';

    const nameDiv = document.createElement('div');
    nameDiv.style.flex = '1';

    const name = document.createElement('div');
    name.className = 'profile-name';
    name.textContent = profile.name;

    const desc = document.createElement('div');
    desc.className = 'profile-description';
    desc.textContent = profile.description;

    nameDiv.appendChild(name);
    nameDiv.appendChild(desc);

    const badge = document.createElement('span');
    badge.className = 'profile-badge';
    badge.textContent = profile.isPrebuilt ? 'PREBUILT' : 'CUSTOM';

    header.appendChild(nameDiv);
    header.appendChild(badge);

    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'profile-tags';
    profile.tags.forEach(tag => {
      const tagSpan = document.createElement('span');
      tagSpan.className = 'profile-tag';
      tagSpan.textContent = tag;
      tagsDiv.appendChild(tagSpan);
    });

    const actions = document.createElement('div');
    actions.className = 'profile-actions';

    if (!profile.isPrebuilt) {
      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-secondary';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => openEditProfileModal(profile));

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.style.background = '#f44336';
      deleteBtn.style.color = 'white';
      deleteBtn.addEventListener('click', () => deleteProfile(profile.id));

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
    }

    profileElement.appendChild(header);
    profileElement.appendChild(tagsDiv);
    if (actions.children.length > 0) {
      profileElement.appendChild(actions);
    }

    container.appendChild(profileElement);
  });
}

function openEditProfileModal(profile) {
  editingProfileId = profile.id;
  document.getElementById('editProfileName').value = profile.name;
  document.getElementById('editProfileDesc').value = profile.description;
  renderTagSelector('editTagSelector', profile.tags);
  document.getElementById('editProfileModal').classList.add('show');
}

function closeEditProfileModal() {
  editingProfileId = null;
  document.getElementById('editProfileModal').classList.remove('show');
}

function saveEditedProfile() {
  const nameInput = document.getElementById('editProfileName');
  const descInput = document.getElementById('editProfileDesc');

  if (!nameInput.value.trim()) {
    alert('Profile name is required');
    return;
  }

  const selectedTags = Array.from(document.querySelectorAll('#editTagSelector input:checked')).map(cb => cb.value);

  if (selectedTags.length === 0) {
    alert('Please select at least one tag');
    return;
  }

  const profileIndex = profiles.findIndex(p => p.id === editingProfileId);
  if (profileIndex !== -1) {
    profiles[profileIndex].name = nameInput.value;
    profiles[profileIndex].description = descInput.value;
    profiles[profileIndex].tags = selectedTags;

    chrome.storage.local.set({ profiles }, () => {
      closeEditProfileModal();
      renderProfilesList();
      showProfileSaveIndicator();
    });
  }
}

function deleteProfile(profileId) {
  if (confirm('Are you sure you want to delete this profile?')) {
    profiles = profiles.filter(p => p.id !== profileId);
    chrome.storage.local.set({ profiles }, () => {
      renderProfilesList();
      showProfileSaveIndicator();
    });
  }
}

function createCustomProfile() {
  const nameInput = document.getElementById('profileName');
  const descInput = document.getElementById('profileDesc');

  if (!nameInput.value.trim()) {
    alert('Profile name is required');
    return;
  }

  const selectedTags = Array.from(document.querySelectorAll('#tagSelector input:checked')).map(cb => cb.value);

  if (selectedTags.length === 0) {
    alert('Please select at least one tag');
    return;
  }

  const newProfile = {
    id: `custom-${Date.now()}`,
    name: nameInput.value,
    description: descInput.value,
    isPrebuilt: false,
    tags: selectedTags
  };

  profiles.push(newProfile);

  chrome.storage.local.set({ profiles }, () => {
    clearProfileForm();
    renderProfilesList();
    showProfileSaveIndicator();
  });
}

function clearProfileForm() {
  document.getElementById('profileName').value = '';
  document.getElementById('profileDesc').value = '';
  document.querySelectorAll('#tagSelector input').forEach(cb => cb.checked = false);
}

function showProfileSaveIndicator() {
  const indicator = document.getElementById('profileSaveIndicator');
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

document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', function() {
    const tabName = this.dataset.tab;
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    this.classList.add('active');
    document.getElementById(tabName).classList.add('active');
  });
});

document.getElementById('createProfileBtn').addEventListener('click', createCustomProfile);
document.getElementById('clearProfileForm').addEventListener('click', clearProfileForm);

document.getElementById('cancelEditBtn').addEventListener('click', closeEditProfileModal);
document.getElementById('saveEditBtn').addEventListener('click', saveEditedProfile);

document.getElementById('editProfileModal').addEventListener('click', function(e) {
  if (e.target === this) {
    closeEditProfileModal();
  }
});

initializeUI();
