import { DataStore, AppError } from './app';

const dataStore = DataStore.getInstance();

let currentUser: { id: string; username: string; role: 'Employee' | 'Manager' | 'Admin' } | null = null;

// Root elements for dynamic UI rendering
const body = document.body;
let headerElement: HTMLElement;
let loginSection: HTMLElement;
let appSection: HTMLElement;
let errorMessageDiv: HTMLDivElement;

// UI elements that will be dynamically created and referenced
let usernameInput: HTMLInputElement;
let loginButton: HTMLButtonElement;
let logoutButton: HTMLButtonElement;
let currentUserSpan: HTMLSpanElement;
let contentList: HTMLUListElement;
let contentForm: HTMLFormElement;
let contentTitleInput: HTMLInputElement;
let contentTypeSelect: HTMLSelectElement;
let contentTextInput: HTMLTextAreaElement;
let contentSubmitButton: HTMLButtonElement;
let contentFormSection: HTMLElement;

function showMessage(message: string, isError: boolean = false): void {
  errorMessageDiv.textContent = message;
  errorMessageDiv.style.color = isError ? 'var(--error-color)' : 'var(--success-color)';
  errorMessageDiv.style.display = 'block';
  setTimeout(() => {
    errorMessageDiv.style.display = 'none';
  }, 5000);
}

function createHeader(): HTMLElement {
  const header = document.createElement('header');
  const h1 = document.createElement('h1');
  h1.textContent = 'Employee Knowledge Portal';
  header.appendChild(h1);
  return header;
}

function createLoginSection(): HTMLElement {
  const section = document.createElement('section');
  section.id = 'login-section';
  section.innerHTML = `
    <h2>Login</h2>
    <input type="text" id="username-input" placeholder="Enter your username">
    <button id="login-button">Login / Register</button>
  `;
  usernameInput = section.querySelector('#username-input') as HTMLInputElement;
  loginButton = section.querySelector('#login-button') as HTMLButtonElement;
  loginButton.addEventListener('click', handleLogin);
  return section;
}

function createAppSection(): HTMLElement {
  const section = document.createElement('section');
  section.id = 'app-section';
  section.innerHTML = `
    <div id="current-user-info">
      <span>Logged in as: <span id="current-user"></span></span>
      <button id="logout-button">Logout</button>
    </div>
    <section id="content-form-section"></section>
    <section>
      <h2>Knowledge Base</h2>
      <ul id="content-list"></ul>
    </section>
  `;
  currentUserSpan = section.querySelector('#current-user') as HTMLSpanElement;
  logoutButton = section.querySelector('#logout-button') as HTMLButtonElement;
  logoutButton.addEventListener('click', handleLogout);
  contentFormSection = section.querySelector('#content-form-section') as HTMLElement;
  contentList = section.querySelector('#content-list') as HTMLUListElement;
  return section;
}

function createContentFormSection(): HTMLElement {
  const section = document.createElement('section');
  section.innerHTML = `
    <h2>Manage Content</h2>
    <form id="content-form">
      <label for="content-title">Title:</label>
      <input type="text" id="content-title" required>

      <label for="content-type">Type:</label>
      <select id="content-type">
        <option value="Course">Course</option>
        <option value="Policy">Policy</option>
        <option value="Article">Article</option>
      </select>

      <label for="content-text">Content (supports Markdown, embedded media URLs):</label>
      <textarea id="content-text" rows="10" required></textarea>

      <button type="submit" id="content-submit">Create Content</button>
    </form>
  `;
  contentForm = section.querySelector('#content-form') as HTMLFormElement;
  contentTitleInput = section.querySelector('#content-title') as HTMLInputElement;
  contentTypeSelect = section.querySelector('#content-type') as HTMLSelectElement;
  contentTextInput = section.querySelector('#content-text') as HTMLTextAreaElement;
  contentSubmitButton = section.querySelector('#content-submit') as HTMLButtonElement;
  contentForm.addEventListener('submit', handleSubmitContent);
  return section;
}

function createErrorMessageDiv(): HTMLDivElement {
  const div = document.createElement('div');
  div.id = 'error-message';
  return div;
}

function renderUI(): void {
  body.innerHTML = ''; // Clear existing body content

  headerElement = createHeader();
  loginSection = createLoginSection();
  appSection = createAppSection();
  errorMessageDiv = createErrorMessageDiv();

  body.appendChild(headerElement);
  body.appendChild(loginSection);
  body.appendChild(appSection);
  body.appendChild(errorMessageDiv);

  setupUIForRole();
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

let editingContentId: string | null = null;
let editingContentLastModified: number | null = null;

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
    contentFormSection.style.display = 'none'; // Ensure hidden when logged out
  } else {
    loginSection.style.display = 'none';
    appSection.style.display = 'block';
    currentUserSpan.textContent = `${currentUser.username} (${currentUser.role})`;

    if (currentUser.role === 'Employee') {
      contentFormSection.style.display = 'none';
    } else {
      // Only create content form section if it doesn't exist yet
      if (!contentFormSection.querySelector('#content-form')) {
        contentFormSection.appendChild(createContentFormSection());
      }
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

function handleLogin(): void {
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
}

function handleLogout(): void {
  currentUser = null;
  usernameInput.value = '';
  setupUIForRole();
  showMessage('Logged out successfully.', false);
}

function handleSubmitContent(e: Event): void {
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
}

// Initial setup
renderUI();