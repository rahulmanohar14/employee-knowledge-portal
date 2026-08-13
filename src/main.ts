import { DataStore, AppError } from './app';

const dataStore = DataStore.getInstance();

let currentUser: { id: string; username: string; role: 'Employee' | 'Manager' | 'Admin'; password?: string } | null = null;

// Inject custom CSS styling for login tabs, search, and view modal
const styleElement = document.createElement('style');
styleElement.textContent = `
  .login-tabs {
    display: flex;
    width: 100%;
    margin-bottom: 15px;
    border-bottom: 2px solid var(--border-color);
  }
  .login-tab-btn {
    flex: 1;
    background: none;
    border: none;
    color: var(--text-color);
    padding: 10px;
    cursor: pointer;
    font-size: 16px;
    font-weight: bold;
    border-radius: 4px 4px 0 0;
    transition: background-color 0.2s, color 0.2s;
  }
  .login-tab-btn.active {
    background-color: var(--primary-color);
    color: white;
  }
  .login-tab-content {
    display: none;
    width: 100%;
    flex-direction: column;
    gap: 15px;
  }
  .login-tab-content.active {
    display: flex;
  }
  .search-container {
    margin-bottom: 20px;
    width: 100%;
  }
  .search-input {
    width: calc(100% - 20px);
    padding: 10px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background-color: var(--secondary-color);
    color: var(--text-color);
    box-sizing: border-box;
  }
`;
document.head.appendChild(styleElement);

// Root elements for dynamic UI rendering
const body = document.body;
let headerElement: HTMLElement;
let loginSection: HTMLElement;
let appSection: HTMLElement;
let errorMessageDiv: HTMLDivElement;
let viewModal: HTMLDivElement;

// Login elements references
let loginUsernameInput: HTMLInputElement;
let loginPasswordInput: HTMLInputElement;
let loginSubmitBtn: HTMLButtonElement;

// Register elements references
let registerUsernameInput: HTMLInputElement;
let registerPasswordInput: HTMLInputElement;
let registerRoleSelect: HTMLSelectElement;
let registerSubmitBtn: HTMLButtonElement;

// App elements references
let logoutButton: HTMLButtonElement;
let currentUserSpan: HTMLSpanElement;
let searchInput: HTMLInputElement;
let contentList: HTMLUListElement;
let contentFormSection: HTMLElement;

// Form elements references
let contentForm: HTMLFormElement;
let contentTitleInput: HTMLInputElement;
let contentTypeSelect: HTMLSelectElement;
let contentTextInput: HTMLTextAreaElement;
let contentSubmitButton: HTMLButtonElement;

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
    <div class="login-tabs">
      <button class="login-tab-btn active" id="tab-login-btn">Login</button>
      <button class="login-tab-btn" id="tab-register-btn">Register</button>
    </div>

    <div class="login-tab-content active" id="login-tab-pane">
      <h2>Login</h2>
      <input type="text" id="login-username" placeholder="Username">
      <input type="password" id="login-password" placeholder="Password" style="width: calc(100% - 20px); padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; background-color: var(--secondary-color); color: var(--text-color); margin-bottom: 10px;">
      <button id="login-submit-btn">Login</button>
    </div>

    <div class="login-tab-content" id="register-tab-pane">
      <h2>Register</h2>
      <input type="text" id="register-username" placeholder="Username">
      <input type="password" id="register-password" placeholder="Password" style="width: calc(100% - 20px); padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; background-color: var(--secondary-color); color: var(--text-color); margin-bottom: 10px;">
      <label for="register-role" style="font-weight: bold; align-self: flex-start;">Role:</label>
      <select id="register-role">
        <option value="Employee">Employee</option>
        <option value="Manager">Manager</option>
        <option value="Admin">Admin</option>
      </select>
      <button id="register-submit-btn">Register</button>
    </div>
  `;

  const tabLoginBtn = section.querySelector('#tab-login-btn') as HTMLButtonElement;
  const tabRegisterBtn = section.querySelector('#tab-register-btn') as HTMLButtonElement;
  const loginTabPane = section.querySelector('#login-tab-pane') as HTMLDivElement;
  const registerTabPane = section.querySelector('#register-tab-pane') as HTMLDivElement;

  tabLoginBtn.addEventListener('click', () => {
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
    loginTabPane.classList.add('active');
    registerTabPane.classList.remove('active');
  });

  tabRegisterBtn.addEventListener('click', () => {
    tabRegisterBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    registerTabPane.classList.add('active');
    loginTabPane.classList.remove('active');
  });

  loginUsernameInput = section.querySelector('#login-username') as HTMLInputElement;
  loginPasswordInput = section.querySelector('#login-password') as HTMLInputElement;
  loginSubmitBtn = section.querySelector('#login-submit-btn') as HTMLButtonElement;

  registerUsernameInput = section.querySelector('#register-username') as HTMLInputElement;
  registerPasswordInput = section.querySelector('#register-password') as HTMLInputElement;
  registerRoleSelect = section.querySelector('#register-role') as HTMLSelectElement;
  registerSubmitBtn = section.querySelector('#register-submit-btn') as HTMLButtonElement;

  loginSubmitBtn.addEventListener('click', handleLogin);
  registerSubmitBtn.addEventListener('click', handleRegister);

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
      <div class="search-container">
        <input type="text" id="search-input" placeholder="Search courses, policies, or articles..." class="search-input">
      </div>
      <ul id="content-list"></ul>
    </section>
  `;
  currentUserSpan = section.querySelector('#current-user') as HTMLSpanElement;
  logoutButton = section.querySelector('#logout-button') as HTMLButtonElement;
  logoutButton.addEventListener('click', handleLogout);
  contentFormSection = section.querySelector('#content-form-section') as HTMLElement;
  contentList = section.querySelector('#content-list') as HTMLUListElement;

  searchInput = section.querySelector('#search-input') as HTMLInputElement;
  searchInput.addEventListener('input', () => {
    renderContentItems();
  });

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
        <!-- populated dynamically based on user role -->
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

function createViewModal(): HTMLDivElement {
  const modal = document.createElement('div');
  modal.id = 'view-modal';
  modal.style.display = 'none';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  modal.style.zIndex = '1000';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.padding = '20px';
  modal.style.boxSizing = 'border-box';

  modal.innerHTML = `
    <div style="background-color: var(--card-background); color: var(--text-color); border-radius: 8px; width: 100%; max-width: 600px; max-height: 85vh; overflow-y: auto; padding: 25px; box-sizing: border-box; position: relative;">
      <button id="close-modal-btn" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; color: var(--text-color); cursor: pointer; padding: 0; line-height: 1;">&times;</button>
      <h2 id="modal-title" style="color: var(--primary-color); margin-top: 0; margin-right: 30px;"></h2>
      <div id="modal-meta" style="font-size: 0.9em; opacity: 0.8; margin-bottom: 15px;"></div>
      <div id="modal-body" style="word-break: break-word; line-height: 1.6;"></div>
    </div>
  `;

  modal.querySelector('#close-modal-btn')?.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  return modal;
}

function renderUI(): void {
  body.innerHTML = ''; // Clear existing body content

  headerElement = createHeader();
  loginSection = createLoginSection();
  appSection = createAppSection();
  errorMessageDiv = createErrorMessageDiv();
  viewModal = createViewModal();

  body.appendChild(headerElement);
  body.appendChild(loginSection);
  body.appendChild(appSection);
  body.appendChild(errorMessageDiv);
  body.appendChild(viewModal);

  setupUIForRole();
}

function updateContentTypeOptions(): void {
  if (!currentUser) return;
  contentTypeSelect.innerHTML = '';
  if (currentUser.role === 'Employee') {
    const opt = document.createElement('option');
    opt.value = 'Article';
    opt.textContent = 'Article';
    contentTypeSelect.appendChild(opt);
  } else {
    ['Course', 'Policy', 'Article'].forEach(type => {
      const opt = document.createElement('option');
      opt.value = type;
      opt.textContent = type;
      contentTypeSelect.appendChild(opt);
    });
  }
}

function renderContentItems(): void {
  if (!currentUser) return;

  contentList.innerHTML = '';
  const allContent = dataStore.getAllContentItems();
  const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const filteredContent = allContent.filter(item => {
    if (!searchQuery) return true;
    return item.title.toLowerCase().includes(searchQuery) ||
           item.content.toLowerCase().includes(searchQuery);
  });

  filteredContent.forEach(item => {
    const li = document.createElement('li');
    li.className = 'content-item';
    const isCompleted = dataStore.isContentCompletedByUser(currentUser!.id, item.id);

    let completionStatus = '';
    let actionText = '';

    if (item.type === 'Course') {
      completionStatus = isCompleted ? ' (Completed)' : '';
      actionText = 'Mark Completed';
    } else if (item.type === 'Policy') {
      completionStatus = isCompleted ? ' (Acknowledged)' : '';
      actionText = 'Acknowledge';
    } else if (item.type === 'Article') {
      completionStatus = isCompleted ? ' (Read)' : '';
      actionText = 'Mark Read';
    }

    // Role-based rendering: Employees can only edit/delete knowledge Articles
    const canEditOrDelete = currentUser!.role !== 'Employee' || item.type === 'Article';

    li.innerHTML = `
      <h3>${item.title} (${item.type})${completionStatus}</h3>
      <p>${item.content.substring(0, 100)}...</p>
      <div class="actions">
        <button class="view-btn" data-id="${item.id}">View</button>
        ${canEditOrDelete ? `<button class="edit-btn" data-id="${item.id}">Edit</button>` : ''}
        ${canEditOrDelete ? `<button class="delete-btn" data-id="${item.id}">Delete</button>` : ''}
        ${!isCompleted ? `<button class="complete-btn" data-id="${item.id}">${actionText}</button>` : ''}
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

function parseContentToHTML(content: string): string {
  // Sanitize simple HTML tags to prevent XSS
  let escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Parse basic Markdown:
  // Bold: **text** -> <strong>text</strong>
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text* -> <em>text</em>
  escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Headers: # Header -> <h1>Header</h1> etc.
  escaped = escaped.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  escaped = escaped.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  escaped = escaped.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
  // Bullet points: * Item or - Item -> <ul><li>Item</li></ul>
  escaped = escaped.replace(/^\s*[-*]\s+(.*?)$/gm, '<li>$1</li>');

  // Convert double newlines to paragraph tags, single to <br>
  escaped = escaped.split(/\n\n+/).map(p => {
    if (p.trim().startsWith('<li>')) {
      return `<ul>${p}</ul>`;
    }
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('');

  // Find and embed media URLs
  const urlRegex = /(https?:\/\/[^\s$.?#].[^\s]*)/g;
  escaped = escaped.replace(urlRegex, (url) => {
    const cleanUrl = url.replace(/&amp;/g, '&');
    const isImage = /\.(jpeg|jpg|gif|png|webp)/i.test(cleanUrl);
    const isVideo = /\.(mp4|webm|ogg)/i.test(cleanUrl);
    const isYoutube = /youtube\.com|youtu\.be/i.test(cleanUrl);

    if (isImage) {
      return `<div style="margin: 15px 0;"><img src="${cleanUrl}" alt="Embedded Image" style="max-width: 100%; max-height: 400px; border-radius: 4px; display: block;"></div>`;
    }
    if (isVideo) {
      return `<div style="margin: 15px 0;"><video src="${cleanUrl}" controls style="max-width: 100%; max-height: 400px; border-radius: 4px; display: block;"></video></div>`;
    }
    if (isYoutube) {
      let embedUrl = cleanUrl;
      if (cleanUrl.includes('watch?v=')) {
        embedUrl = cleanUrl.replace('watch?v=', 'embed/');
      } else if (cleanUrl.includes('youtu.be/')) {
        embedUrl = cleanUrl.replace('youtu.be/', 'youtube.com/embed/');
      }
      return `<div style="margin: 15px 0; position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%;"><iframe src="${embedUrl}" frameborder="0" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 4px;"></iframe></div>`;
    }
    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });

  return escaped;
}

function viewContent(id: string): void {
  const item = dataStore.getContentItemById(id);
  if (item) {
    const modalTitle = viewModal.querySelector('#modal-title') as HTMLElement;
    const modalMeta = viewModal.querySelector('#modal-meta') as HTMLElement;
    const modalBody = viewModal.querySelector('#modal-body') as HTMLElement;

    modalTitle.textContent = item.title;
    modalMeta.textContent = `Type: ${item.type} | Last modified: ${new Date(item.lastModified).toLocaleString()}`;
    modalBody.innerHTML = parseContentToHTML(item.content);

    viewModal.style.display = 'flex';
  }
}

let editingContentId: string | null = null;
let editingContentLastModified: number | null = null;

function editContent(id: string): void {
  const item = dataStore.getContentItemById(id);
  if (item) {
    contentTitleInput.value = item.title;
    updateContentTypeOptions();
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
    const item = dataStore.getContentItemById(id);
    let successMsg = 'Content marked as completed!';
    if (item?.type === 'Policy') {
      successMsg = 'Policy acknowledged!';
    } else if (item?.type === 'Article') {
      successMsg = 'Article marked as read!';
    }
    showMessage(successMsg, false);
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

    // All roles can create/edit/delete content, but Employees are limited to 'Article'
    if (!contentFormSection.querySelector('#content-form')) {
      contentFormSection.appendChild(createContentFormSection());
    }
    contentFormSection.style.display = 'block';
    updateContentTypeOptions();

    contentSubmitButton.textContent = 'Create Content';
    contentTitleInput.value = '';
    contentTypeSelect.value = currentUser.role === 'Employee' ? 'Article' : 'Course';
    contentTextInput.value = '';
    editingContentId = null;
    editingContentLastModified = null;

    if (searchInput) {
      searchInput.value = '';
    }

    renderContentItems();
  }
}

function handleLogin(): void {
  const username = loginUsernameInput.value.trim();
  const password = loginPasswordInput.value;

  if (!username) {
    showMessage('Please enter a username.', true);
    return;
  }
  if (!password) {
    showMessage('Please enter a password.', true);
    return;
  }

  const user = dataStore.getUserByUsername(username);
  if (!user) {
    showMessage(`User '${username}' does not exist. Please register first.`, true);
    return;
  }

  if (user.password !== password) {
    showMessage('Incorrect password.', true);
    return;
  }

  currentUser = user;
  setupUIForRole();
  showMessage('Logged in successfully.', false);
}

function handleRegister(): void {
  const username = registerUsernameInput.value.trim();
  const password = registerPasswordInput.value;
  const role = registerRoleSelect.value as 'Employee' | 'Manager' | 'Admin';

  if (!username) {
    showMessage('Username is required.', true);
    return;
  }
  if (!password) {
    showMessage('Password is required.', true);
    return;
  }

  try {
    dataStore.registerUser(username, role, password);
    showMessage(`User '${username}' registered as ${role}.`, false);

    // Auto populate and switch to Login tab
    loginUsernameInput.value = username;
    loginPasswordInput.value = password;

    const tabLoginBtn = loginSection.querySelector('#tab-login-btn') as HTMLButtonElement;
    if (tabLoginBtn) tabLoginBtn.click();
  } catch (error) {
    if (error instanceof AppError) {
      showMessage(error.message, true);
    } else {
      showMessage('An unexpected error occurred during registration.', true);
    }
  }
}

function handleLogout(): void {
  currentUser = null;
  if (loginUsernameInput) loginUsernameInput.value = '';
  if (loginPasswordInput) loginPasswordInput.value = '';
  if (registerUsernameInput) registerUsernameInput.value = '';
  if (registerPasswordInput) registerPasswordInput.value = '';
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

  // Double check Employee restrictions on content types
  if (currentUser.role === 'Employee' && type !== 'Article') {
    showMessage('Employees are only allowed to manage Articles.', true);
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
    updateContentTypeOptions();
    contentTypeSelect.value = currentUser.role === 'Employee' ? 'Article' : 'Course';
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
