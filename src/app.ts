interface User {
  id: string;
  username: string;
  role: 'Employee' | 'Manager' | 'Admin';
}

interface ContentItem {
  id: string;
  title: string;
  type: 'Course' | 'Policy' | 'Article';
  content: string; // Supports Markdown, plain text, embedded media URLs
  lastModified: number;
  createdBy: string; // User ID
}

interface Completion {
  id: string;
  userId: string;
  contentItemId: string;
  completedAt: number;
}

export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export class DataStore {
  private static instance: DataStore;
  private users: User[] = [];
  private contentItems: ContentItem[] = [];
  private completions: Completion[] = [];
  private counter: number = 0;

  private constructor() {
    this.loadData();
  }

  public static getInstance(): DataStore {
    if (!DataStore.instance) {
      DataStore.instance = new DataStore();
    }
    return DataStore.instance;
  }

  private generateId(): string {
    this.counter++;
    return `${Date.now()}-${this.counter}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private saveData(): void {
    localStorage.setItem('users', JSON.stringify(this.users));
    localStorage.setItem('contentItems', JSON.stringify(this.contentItems));
    localStorage.setItem('completions', JSON.stringify(this.completions));
  }

  private loadData(): void {
    const usersData = localStorage.getItem('users');
    const contentItemsData = localStorage.getItem('contentItems');
    const completionsData = localStorage.getItem('completions');

    if (usersData) this.users = JSON.parse(usersData);
    if (contentItemsData) this.contentItems = JSON.parse(contentItemsData);
    if (completionsData) this.completions = JSON.parse(completionsData);

    // Seed initial admin if no users exist
    if (this.users.length === 0) {
      this.users.push({ id: this.generateId(), username: 'admin', role: 'Admin' });
      this.saveData();
    }
  }

  public registerUser(username: string, role: User['role']): User {
    if (!username || !role) throw new AppError('Username and role are required.');
    if (this.users.some(u => u.username === username)) throw new AppError('Username already exists.');
    const newUser: User = { id: this.generateId(), username, role };
    this.users.push(newUser);
    this.saveData();
    return newUser;
  }

  public getUserByUsername(username: string): User | undefined {
    return this.users.find(u => u.username === username);
  }

  public getAllUsers(): User[] {
    return [...this.users];
  }

  public createContentItem(title: string, type: ContentItem['type'], content: string, createdBy: string): ContentItem {
    if (!title || !type || !content || !createdBy) throw new AppError('Title, type, content, and creator are required.');
    const newContent: ContentItem = {
      id: this.generateId(),
      title,
      type,
      content,
      lastModified: Date.now(),
      createdBy,
    };
    this.contentItems.push(newContent);
    this.saveData();
    return newContent;
  }

  public updateContentItem(id: string, title: string, type: ContentItem['type'], content: string, lastModified: number): ContentItem {
    const index = this.contentItems.findIndex(item => item.id === id);
    if (index === -1) throw new AppError('Content item not found.');
    if (this.contentItems[index].lastModified > lastModified) {
      throw new AppError('Conflict: This content has been updated by another user. Please refresh and try again.');
    }
    this.contentItems[index] = { ...this.contentItems[index], title, type, content, lastModified: Date.now() };
    this.saveData();
    return this.contentItems[index];
  }

  public deleteContentItem(id: string): void {
    const initialLength = this.contentItems.length;
    this.contentItems = this.contentItems.filter(item => item.id !== id);
    if (this.contentItems.length === initialLength) throw new AppError('Content item not found.');
    this.completions = this.completions.filter(c => c.contentItemId !== id);
    this.saveData();
  }

  public getContentItemById(id: string): ContentItem | undefined {
    return this.contentItems.find(item => item.id === id);
  }

  public getAllContentItems(): ContentItem[] {
    return [...this.contentItems];
  }

  public markContentAsCompleted(userId: string, contentItemId: string): Completion {
    if (!userId || !contentItemId) throw new AppError('User ID and Content Item ID are required.');
    if (this.completions.some(c => c.userId === userId && c.contentItemId === contentItemId)) {
      throw new AppError('Content already marked as completed by this user.');
    }
    const newCompletion: Completion = { id: this.generateId(), userId, contentItemId, completedAt: Date.now() };
    this.completions.push(newCompletion);
    this.saveData();
    return newCompletion;
  }

  public getUserCompletions(userId: string): Completion[] {
    return this.completions.filter(c => c.userId === userId);
  }

  public isContentCompletedByUser(userId: string, contentItemId: string): boolean {
    return this.completions.some(c => c.userId === userId && c.contentItemId === contentItemId);
  }
}
