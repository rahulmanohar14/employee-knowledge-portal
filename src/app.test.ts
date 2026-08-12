import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataStore, AppError } from './app';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('DataStore', () => {
  let dataStore: DataStore;

  beforeEach(() => {
    localStorageMock.clear();
    // Reset the singleton instance for each test
    (DataStore as any).instance = undefined;
    dataStore = DataStore.getInstance();
    // Ensure admin user is created on first load
    dataStore.getUserByUsername('admin');
    localStorageMock.clear.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.getItem.mockClear();
  });

  it('should register a new user and retrieve them', () => {
    const user = dataStore.registerUser('testuser', 'Employee');
    expect(user).toBeDefined();
    expect(user.username).toBe('testuser');
    expect(user.role).toBe('Employee');
    expect(dataStore.getUserByUsername('testuser')).toEqual(user);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should throw an error if registering a duplicate username', () => {
    dataStore.registerUser('duplicate', 'Employee');
    expect(() => dataStore.registerUser('duplicate', 'Manager')).toThrow(AppError);
    expect(() => dataStore.registerUser('duplicate', 'Manager')).toThrow('Username already exists.');
  });

  it('should create and retrieve a content item', () => {
    const admin = dataStore.getUserByUsername('admin')!;
    const content = dataStore.createContentItem('New Course', 'Course', 'Course content here.', admin.id);
    expect(content).toBeDefined();
    expect(content.title).toBe('New Course');
    expect(dataStore.getContentItemById(content.id)).toEqual(content);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should update an existing content item', () => {
    const admin = dataStore.getUserByUsername('admin')!;
    const originalContent = dataStore.createContentItem('Old Title', 'Article', 'Old content.', admin.id);
    const updatedContent = dataStore.updateContentItem(originalContent.id, 'New Title', 'Policy', 'Updated content.', originalContent.lastModified);
    expect(updatedContent.title).toBe('New Title');
    expect(updatedContent.type).toBe('Policy');
    expect(updatedContent.content).toBe('Updated content.');
    expect(updatedContent.lastModified).not.toBe(originalContent.lastModified);
    expect(dataStore.getContentItemById(originalContent.id)).toEqual(updatedContent);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should mark content as completed for a user', () => {
    const admin = dataStore.getUserByUsername('admin')!;
    const employee = dataStore.registerUser('employee1', 'Employee');
    const course = dataStore.createContentItem('Intro Course', 'Course', 'Learn basics.', admin.id);

    const completion = dataStore.markContentAsCompleted(employee.id, course.id);
    expect(completion).toBeDefined();
    expect(completion.userId).toBe(employee.id);
    expect(completion.contentItemId).toBe(course.id);
    expect(dataStore.isContentCompletedByUser(employee.id, course.id)).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should throw an error on content update conflict (last-write-wins)', () => {
    const admin = dataStore.getUserByUsername('admin')!;
    const content = dataStore.createContentItem('Conflict Test', 'Article', 'Initial content.', admin.id);
    
    // Simulate another user updating it, changing lastModified
    const modifiedContent = { ...content, lastModified: content.lastModified + 1000, content: 'Modified by someone else.' };
    (dataStore as any).contentItems = [(dataStore as any).contentItems.find((item: any) => item.id !== content.id), modifiedContent].filter(Boolean);

    // Now try to update with the original lastModified
    expect(() => dataStore.updateContentItem(content.id, 'My Update', 'Article', 'My content.', content.lastModified))
      .toThrow(AppError);
    expect(() => dataStore.updateContentItem(content.id, 'My Update', 'Article', 'My content.', content.lastModified))
      .toThrow('Conflict: This content has been updated by another user. Please refresh and try again.');
  });
});
