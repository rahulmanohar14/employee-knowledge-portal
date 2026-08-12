import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataStore, AppError } from './app';

interface LocalStorageMock { 
  [key: string]: string; 
}

let localStorageMock: LocalStorageMock = {};

beforeEach(() => {
  localStorageMock = {};
  globalThis.localStorage = {
    getItem: vi.fn((key: string) => localStorageMock[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      localStorageMock[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete localStorageMock[key];
    }),
    clear: vi.fn(() => {
      localStorageMock = {};
    }),
    length: 0,
    key: vi.fn()
  };
  // Reset the singleton instance before each test to ensure isolation
  // @ts-ignore
  DataStore.instance = undefined;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DataStore', () => {
  it('DataStore loads initial admin user if no users exist', () => {
    const store = DataStore.getInstance();
    const users = store.getAllUsers();
    expect(users.length).toBe(1);
    expect(users[0].username).toBe('admin');
    expect(users[0].role).toBe('Admin');
    expect(localStorage.setItem).toHaveBeenCalledWith('users', JSON.stringify(users));
  });

  it('DataStore can register a new user with a specified role', () => {
    const store = DataStore.getInstance();
    const newUser = store.registerUser('testuser', 'Employee');
    expect(newUser).toBeDefined();
    expect(newUser.username).toBe('testuser');
    expect(newUser.role).toBe('Employee');
    expect(store.getAllUsers().length).toBe(2); // Admin + new user
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('DataStore prevents registration of duplicate usernames', () => {
    const store = DataStore.getInstance();
    store.registerUser('duplicate', 'Employee');
    expect(() => store.registerUser('duplicate', 'Manager')).toThrow(AppError);
    expect(() => store.registerUser('duplicate', 'Manager')).toThrow('Username already exists.');
    expect(store.getAllUsers().filter(u => u.username === 'duplicate').length).toBe(1);
  });

  it('DataStore can create a new content item', () => {
    const store = DataStore.getInstance();
    const admin = store.getUserByUsername('admin');
    if (!admin) throw new Error('Admin user not found');
    const contentItem = store.createContentItem('New Course', 'Course', 'Course content', admin.id);
    expect(contentItem).toBeDefined();
    expect(contentItem.title).toBe('New Course');
    expect(contentItem.createdBy).toBe(admin.id);
    expect(store.getAllContentItems().length).toBe(1);
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('DataStore can update an existing content item', () => {
    const store = DataStore.getInstance();
    const admin = store.getUserByUsername('admin');
    if (!admin) throw new Error('Admin user not found');
    const originalContent = store.createContentItem('Original Title', 'Article', 'Original content', admin.id);
    const updatedContent = store.updateContentItem(originalContent.id, 'Updated Title', 'Policy', 'Updated content', originalContent.lastModified);
    expect(updatedContent.title).toBe('Updated Title');
    expect(updatedContent.type).toBe('Policy');
    expect(updatedContent.content).toBe('Updated content');
    expect(updatedContent.lastModified).not.toBe(originalContent.lastModified);
    expect(store.getContentItemById(originalContent.id)?.title).toBe('Updated Title');
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('DataStore handles concurrent content updates gracefully', () => {
    const store = DataStore.getInstance();
    const admin = store.getUserByUsername('admin');
    if (!admin) throw new Error('Admin user not found');
    const content = store.createContentItem('Concurrent Edit', 'Course', 'Initial content', admin.id);

    // Simulate another user updating the content, changing lastModified
    const modifiedByOther = { ...content, lastModified: content.lastModified + 1000 };
    // @ts-ignore - Directly manipulating internal state for test scenario
    store.contentItems = [modifiedByOther];

    // Attempt to update with the original (stale) lastModified timestamp
    expect(() => store.updateContentItem(content.id, 'New Title', 'Course', 'New Content', content.lastModified))
      .toThrow(AppError);
    expect(() => store.updateContentItem(content.id, 'New Title', 'Course', 'New Content', content.lastModified))
      .toThrow('Conflict: This content has been updated by another user. Please refresh and try again.');
  });

  it('DataStore can delete a content item', () => {
    const store = DataStore.getInstance();
    const admin = store.getUserByUsername('admin');
    if (!admin) throw new Error('Admin user not found');
    const contentItem1 = store.createContentItem('Item 1', 'Course', 'Content 1', admin.id);
    const contentItem2 = store.createContentItem('Item 2', 'Policy', 'Content 2', admin.id);
    store.deleteContentItem(contentItem1.id);
    expect(store.getAllContentItems().length).toBe(1);
    expect(store.getContentItemById(contentItem1.id)).toBeUndefined();
    expect(store.getContentItemById(contentItem2.id)).toBeDefined();
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('DataStore can mark content as completed for a user', () => {
    const store = DataStore.getInstance();
    const user = store.registerUser('employee1', 'Employee');
    const admin = store.getUserByUsername('admin');
    if (!admin) throw new Error('Admin user not found');
    const content = store.createContentItem('Course A', 'Course', 'Content A', admin.id);
    const completion = store.markContentAsCompleted(user.id, content.id);
    expect(completion).toBeDefined();
    expect(completion.userId).toBe(user.id);
    expect(completion.contentItemId).toBe(content.id);
    expect(store.getUserCompletions(user.id).length).toBe(1);
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('DataStore prevents marking content as completed multiple times by the same user', () => {
    const store = DataStore.getInstance();
    const user = store.registerUser('employee2', 'Employee');
    const admin = store.getUserByUsername('admin');
    if (!admin) throw new Error('Admin user not found');
    const content = store.createContentItem('Course B', 'Course', 'Content B', admin.id);
    store.markContentAsCompleted(user.id, content.id);
    expect(() => store.markContentAsCompleted(user.id, content.id)).toThrow(AppError);
    expect(() => store.markContentAsCompleted(user.id, content.id)).toThrow('Content already marked as completed by this user.');
    expect(store.getUserCompletions(user.id).length).toBe(1);
  });

  it('DataStore can retrieve completions for a specific user', () => {
    const store = DataStore.getInstance();
    const user1 = store.registerUser('user1', 'Employee');
    const user2 = store.registerUser('user2', 'Employee');
    const admin = store.getUserByUsername('admin');
    if (!admin) throw new Error('Admin user not found');
    const content1 = store.createContentItem('C1', 'Course', 'c1', admin.id);
    const content2 = store.createContentItem('C2', 'Policy', 'c2', admin.id);
    store.markContentAsCompleted(user1.id, content1.id);
    store.markContentAsCompleted(user1.id, content2.id);
    store.markContentAsCompleted(user2.id, content1.id);
    const user1Completions = store.getUserCompletions(user1.id);
    const user2Completions = store.getUserCompletions(user2.id);
    expect(user1Completions.length).toBe(2);
    expect(user2Completions.length).toBe(1);
    expect(user1Completions.some(c => c.contentItemId === content1.id)).toBe(true);
    expect(user1Completions.some(c => c.contentItemId === content2.id)).toBe(true);
    expect(user2Completions.some(c => c.contentItemId === content1.id)).toBe(true);
  });

  it('DataStore correctly identifies if content is completed by a user', () => {
    const store = DataStore.getInstance();
    const user = store.registerUser('checker', 'Employee');
    const admin = store.getUserByUsername('admin');
    if (!admin) throw new Error('Admin user not found');
    const content1 = store.createContentItem('Checkable 1', 'Course', 'c1', admin.id);
    const content2 = store.createContentItem('Checkable 2', 'Policy', 'c2', admin.id);
    store.markContentAsCompleted(user.id, content1.id);
    expect(store.isContentCompletedByUser(user.id, content1.id)).toBe(true);
    expect(store.isContentCompletedByUser(user.id, content2.id)).toBe(false);
  });
});
