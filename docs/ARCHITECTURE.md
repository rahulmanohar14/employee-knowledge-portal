# Architecture — Employee Knowledge Portal

# High-Level Design (HLD)

## System Overview
The Employee Knowledge Portal is a client-side web application. `index.html` provides the static structure, styling, and entry point for the TypeScript application. `src/main.ts` handles all DOM manipulation and event binding, orchestrating interactions with the core business logic in `src/app.ts`. `src/app.ts` manages data, user roles, and content operations, persisting state in `localStorage`.

```
index.html
    ├── <style> (Dark theme, responsive)
    ├── <script type="module" src="./src/main.ts"></script>
    └── <main> (UI elements)
            │
            └── src/main.ts
                    │
                    └── src/app.ts
```

## Component Responsibilities
*   `index.html`: Defines the application's static structure, styling, and loads the main script.
*   `src/main.ts`: Manages all user interface rendering, event handling, and communication with `src/app.ts`.
*   `src/app.ts`: Implements core business logic, data management, validation, and `localStorage` persistence.

## Data Design

### In-Memory State
*   `currentUser`: Stores the currently logged-in user's `User` object.
*   `currentContent`: Stores the content currently being viewed or edited (`Course` or `Policy`).

### localStorage Persistence
*   `ekp_users`: `User[]` - Array of all registered users.
*   `ekp_courses`: `Course[]` - Array of all created courses.
*   `ekp_policies`: `Policy[]` - Array of all created policies.
*   `ekp_assignments`: `Assignment[]` - Array of course/policy assignments to users.

### Storage Shape

```typescript
// User Role
type UserRole = "Employee" | "Manager" | "Admin";

// User Entity
interface User {
    id: string; // crypto.randomUUID()
    username: string;
    passwordHash: string; // Stored securely (e.g., simple hash for client-side demo)
    role: UserRole;
}

// Content Base (Course or Policy)
interface Content {
    id: string; // crypto.randomUUID()
    title: string;
    body: string; // Markdown/HTML content
    lastEdited: number; // Timestamp for last edit, used for conflict detection
}

// Course Entity
interface Course extends Content {
    // Specific course properties if any, otherwise just Content
}

// Policy Entity
interface Policy extends Content {
    // Specific policy properties if any, otherwise just Content
}

// Assignment Entity
interface Assignment {
    id: string; // crypto.randomUUID()
    userId: string;
    contentId: string; // ID of the Course or Policy
    contentType: "Course" | "Policy";
    completed: boolean;
}
```

# Low-Level Design (LLD)

## Logic Core Specification (src/app.ts)

*   `type UserRole = "Employee" | "Manager" | "Admin";` - Defines available user roles.
*   `interface User { ... }` - Represents a user entity.
*   `interface Content { ... }` - Base interface for courses and policies.
*   `interface Course extends Content { ... }` - Represents a course.
*   `interface Policy extends Content { ... }` - Represents a policy.
*   `interface Assignment { ... }` - Represents a user's assignment to content.
*   `class ValidationError extends Error { ... }` - Custom error for input validation.
*   `initApp(): void` - Initializes data from `localStorage` or sets up defaults.
*   `login(username: string, passwordHash: string): User | null` - Authenticates a user.
*   `logout(): void` - Clears the current user session.
*   `getCurrentUser(): User | null` - Returns the currently logged-in user.
*   `hasPermission(requiredRole: UserRole): boolean` - Checks if current user has the required role.
*   `createCourse(title: string, body: string): Course` - Creates a new course (Manager/Admin only).
*   `getCourse(id: string): Course | undefined` - Retrieves a course by ID.
*   `updateCourse(id: string, title: string, body: string, lastEditedAt: number): Course` - Updates an existing course, with conflict detection.
*   `deleteCourse(id: string): void` - Deletes a course (Manager/Admin only).
*   `getAllCourses(): Course[]` - Retrieves all courses.
*   `createPolicy(title: string, body: string): Policy` - Creates a new policy (Manager/Admin only).
*   `getPolicy(id: string): Policy | undefined` - Retrieves a policy by ID.
*   `updatePolicy(id: string, title: string, body: string, lastEditedAt: number): Policy` - Updates an existing policy, with conflict detection.
*   `deletePolicy(id: string): void` - Deletes a policy (Manager/Admin only).
*   `getAllPolicies(): Policy[]` - Retrieves all policies.
*   `assignContent(userId: string, contentId: string, contentType: "Course" | "Policy"): Assignment` - Assigns content to a user (Manager/Admin only).
*   `getAssignedContent(userId: string): Assignment[]` - Retrieves all content assigned to a user.
*   `markContentCompleted(assignmentId: string): Assignment` - Marks an assigned content as completed by an employee.
*   `getAllUsers(): User[]` - Retrieves all registered users (Manager/Admin only).
*   `registerUser(username: string, passwordHash: string, role: UserRole): User` - Registers a new user (Admin only).

## UI Wireframe

```
+-----------------------------------------------------------------+
| Employee Knowledge Portal                                       |
|-----------------------------------------------------------------|
| [Logo]                                              [User: John Doe (Employee)] | [Logout] |
|-----------------------------------------------------------------|
| [Dashboard/Home] [Courses] [Policies] [Users (M/A)] [Create Course (M/A)] [Create Policy (M/A)] |
|-----------------------------------------------------------------|
|                                                                 |
| +-------------------------------------------------------------+ |
| | Content List / Detail View                                  | |
| |                                                             | |
| | [Course Title 1] [View] [Edit (M/A)] [Assign (M/A)]         | |
| | [Course Title 2] [View] [Edit (M/A)] [Assign (M/A)]         | |
| |                                                             | |
| | +---------------------------------------------------------+ | |
| | | Course/Policy Detail:                                   | | |
| | | Title: [Course Title X]                                 | | |
| | | Body: [Markdown Editor / Viewer]                        | | |
| | |                                                         | | |
| | | [Complete Course (Employee)] [Save (M/A)] [Cancel]     | | |
| | +---------------------------------------------------------+ | |
| |                                                             | |
| +-------------------------------------------------------------+ |
|                                                                 |
+-----------------------------------------------------------------+
```

## Interaction Flow

1.  **User Login:** User enters credentials on a login screen. `main.ts` calls `app.login()`. If successful, `main.ts` updates UI to show dashboard based on `app.getCurrentUser().role`.
2.  **View Assigned Courses (Employee):** Employee navigates to "Courses". `main.ts` calls `app.getAssignedContent(userId)` filtering for courses. `main.ts` renders a list of courses with "View" and "Complete" buttons.
3.  **Create Course (Manager/Admin):** Manager/Admin clicks "Create Course". `main.ts` displays a form for title and content. On submit, `main.ts` calls `app.createCourse()`, then refreshes the course list.
4.  **Edit Course with Conflict (Manager/Admin):** Manager/Admin opens a course for editing. `main.ts` stores `course.lastEdited`. If another user edits, `app.updateCourse()` detects `lastEdited` mismatch. `app.updateCourse()` returns a specific error or flag. `main.ts` displays a warning ("This content has been updated since you opened it. Saving will overwrite changes.") and proceeds with "last-write-wins" upon user confirmation.

## Key Risks

1.  **Data Integrity with Last-Write-Wins:**
    *   **Risk:** Users might unintentionally overwrite critical content if they ignore the conflict warning.
    *   **Mitigation:** The UI will implement a prominent, blocking warning dialog when an edit conflict is detected, requiring explicit user confirmation to proceed with the overwrite. The warning will clearly state that their changes will replace newer content.
2.  **Content Editor Complexity:**
    *   **Risk:** Implementing a robust content editor capable of handling plain text, Markdown, and embedded media (up to 100MB) without external libraries is complex and prone to bugs.
    *   **Mitigation:** Start with a basic `textarea` for plain text/Markdown, using a simple Markdown parser/renderer. For embedded media, initially support only direct URL embeds (e.g., `<img>`, `<video>`) and validate file sizes on upload (if an upload mechanism were added, for now, it's just a URL). Avoid complex WYSIWYG editors to keep the scope minimal.
3.  **Security of Client-Side Data:**
    *   **Risk:** Storing user data, even hashed passwords, and enforcing RBAC purely client-side means sensitive data is accessible, and roles can be bypassed by a determined user manipulating `localStorage` or client-side code.
    *   **Mitigation:** Clearly document this limitation as an inherent characteristic of a purely client-side application. For password hashing, use a simple, fast hash (e.g., SHA-256) for demonstration purposes, acknowledging it's not production-grade. Emphasize that this architecture is for internal knowledge management where trust is higher, and no truly sensitive data is handled.
