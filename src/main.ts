import { DataStore, AppError } from './app';

const dataStore = DataStore.getInstance();

let currentUser: { id: string; username: string; role: 'Employee' | 'Manager' | 'Admin' } | null = null;

const loginSection = document.getElementById('login-section') as HTMLElement;
const appSection = document.getElementById('app-section') as HTMLElement;
const usernameInput = document.getElementById('username-input') as HTMLInputElement;
const loginButton = document.getElementById('login-button') as HTMLButtonElement;
const logoutButton = document.getElementById('logout-button') as HTMLButtonElement;
const currentUserSpan = document.getElementById('current-user') as HTMLSpanElement;
const contentList = document.getElementById('content-list') as HTMLUListElement;
const contentForm = document.getElementById('content-form') as HTMLFormElement;
const contentTitleInput = document.getElementById('content-title') as HTMLInputElement;
const contentTypeSelect = document.getElementById('content-type') as HTMLSelectElement;
const contentTextInput = document.getElementById('content-text') as HTMLTextAreaElement;
const contentSubmitButton = document.getElementById('content-submit') as HTMLButtonElement;
const contentFormSection = document.getElementById('content-form-section') as HTMLElement;
const errorMessageDiv = document.getElementById('error-message') as HTMLDivElement;

let editingContentId: string | null = null;
let editingContentLastModified: number | null = null;

function showMessage(message: string, isError: boolean = false): void {
  errorMessageDiv.textContent = message;
  errorMessageDiv.style.color = isError ? 'var(--error-color)' : 'var(--success-color)';
  errorMessageDiv.style.display = 'block';
  setTimeout(() => {
    errorMessageDiv.style.display = 'none';
  }, 5000);
}

function renderContentItems(): void {
  if (!currentUser) return;

  contentList.innerHTML = '';
  const allContent = dataStore.getAllContentItems();

  allContent.forEach(item => {
    const li = document.createElement('li');
    li.className = 'content-item';
    const isCompleted = dataStore.isContentCompletedByUser(currentUser!.id, item.id);
    const completionStatus = isCompleted ? ' (Completed)' : '';

    li.innerHTML = `
      <h3>${item.title} (${item.type})${completionStatus}</h3>
      <p>${item.content.substring(0, 100)}...</p>
      <div class="actions">
        <button class="view-btn" data-id="${item.id}">View</button>
        ${currentUser!.role !== 'Employee' ? `<button class="edit-btn" data-id="${item.id}">Edit</button>` : ''}
        ${currentUser!.role !== 'Employee' ? `<button class="delete-btn" data-id="${item.id}">Delete</button>` : ''}
        ${!isCompleted ? `<button class="complete-btn" data-id="${item.id}">Mark Complete</button>` : ''}
      </div>
    `;
    contentList.appendChild(li);
  });

  document.querySelectorAll('.view-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const id = (e.target as HTMLButtonElement).dataset.id!;
      viewContent(id);
    });
  });

  document.querySelectorAll('.edit-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const id = (e.target as HTMLButtonElement).dataset.id!;
      editContent(id);
    });
  });

  document.querySelectorAll('.delete-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const id = (e.target as HTMLButtonElement).dataset.id!;
      deleteContent(id);
    });
  });

  document.querySelectorAll('.complete-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const id = (e.target as HTMLButtonElement).dataset.id!;
      markComplete(id);
    });
  });
}

function viewContent(id: string): void {
  const item = dataStore.getContentItemById(id);
  if (item) {
    alert(`Title: ${item.title}\nType: ${item.type}\nContent:\n${item.content}`);
  }
}

function editContent(id: string): void {
  const item = dataStore.getContentItemById(id);
  if (item) {
    contentTitleInput.value = item.title;
    contentTypeSelect.value = item.type;
    contentTextInput.value = item.content;
    editingContentId = item.id;
    editingContentLastModified = item.lastModified;
    contentSubmitButton.textContent = 'Update Content';
    contentFormSection.style.display = 'block';
  }
}

function deleteContent(id: string): void {
  if (confirm('Are you sure you want to delete this content item?')) {
    try {
      dataStore.deleteContentItem(id);
      showMessage('Content item deleted successfully.', false);
      renderContentItems();
    } catch (error) {
      if (error instanceof AppError) {
        showMessage(error.message, true);
      } else {
        showMessage('An unexpected error occurred.', true);
      }
    }
  }
}

function markComplete(id: string): void {
  if (!currentUser) return;
  try {
    dataStore.markContentAsCompleted(currentUser.id, id);
    showMessage('Content marked as completed!', false);
    renderContentItems();
  } catch (error) {
    if (error instanceof AppError) {
      showMessage(error.message, true);
    } else {
      showMessage('An unexpected error occurred.', true);
    }
  }
}

function setupUIForRole(): void {
  if (!currentUser) {
    loginSection.style.display = 'flex';
    appSection.style.display = 'none';
    contentFormSection.style.display = 'none';
  } else {
    loginSection.style.display = 'none';
    appSection.style.display = 'block';
    currentUserSpan.textContent = `${currentUser.username} (${currentUser.role})`;

    if (currentUser.role === 'Employee') {
      contentFormSection.style.display = 'none';
    } else {
      contentFormSection.style.display = 'block';
      contentSubmitButton.textContent = 'Create Content';
      contentTitleInput.value = '';
      contentTypeSelect.value = 'Course';
      contentTextInput.value = '';
      editingContentId = null;
      editingContentLastModified = null;
    }
    renderContentItems();
  }
}

loginButton.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  if (username) {
    let user = dataStore.getUserByUsername(username);
    if (!user) {
      // For simplicity, auto-register as Employee if not found, unless it's 'admin'
      const role = username === 'admin' ? 'Admin' : 'Employee';
      try {
        user = dataStore.registerUser(username, role);
        showMessage(`User '${username}' registered as ${role}.`, false);
      } catch (error) {
        if (error instanceof AppError) {
          showMessage(error.message, true);
        } else {
          showMessage('An unexpected error occurred during registration.', true);
        }
        return;
      }
    }
    currentUser = user;
    setupUIForRole();
  } else {
    showMessage('Please enter a username.', true);
  }
});

logoutButton.addEventListener('click', () => {
  currentUser = null;
  usernameInput.value = '';
  setupUIForRole();
  showMessage('Logged out successfully.', false);
});

contentForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const title = contentTitleInput.value.trim();
  const type = contentTypeSelect.value as 'Course' | 'Policy' | 'Article';
  const content = contentTextInput.value.trim();

  if (!title || !content) {
    showMessage('Title and content cannot be empty.', true);
    return;
  }

  // Basic size check (100MB limit)
  if (new TextEncoder().encode(content).length > 100 * 1024 * 1024) {
    showMessage('Content exceeds the 100MB limit.', true);
    return;
  }

  try {
    if (editingContentId && editingContentLastModified !== null) {
      dataStore.updateContentItem(editingContentId, title, type, content, editingContentLastModified);
      showMessage('Content updated successfully.', false);
    } else {
      dataStore.createContentItem(title, type, content, currentUser.id);
      showMessage('Content created successfully.', false);
    }
    contentTitleInput.value = '';
    contentTypeSelect.value = 'Course';
    contentTextInput.value = '';
    editingContentId = null;
    editingContentLastModified = null;
    contentSubmitButton.textContent = 'Create Content';
    renderContentItems();
  } catch (error) {
    if (error instanceof AppError) {
      showMessage(error.message, true);
    } else {
      showMessage('An unexpected error occurred.', true);
    }
  }
});

// Initial setup
setupUIForRole();
