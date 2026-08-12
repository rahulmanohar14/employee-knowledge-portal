# Stakeholder Clarifications

**Q: Should there be different user roles (e.g., employee, manager, admin) with varying permissions, and if so, what specific actions are restricted to each role?**
A: yes, employee can only see and complete courses or policies they cant upload whereas manager or admin can create courses and manage everything

**Q: What types of content should be supported for courses and knowledge articles (e.g., plain text, markdown, embedded media), and what is the maximum size limit for each?**
A: everything supported, max size is 100MB

**Q: How should conflicts be resolved if multiple users attempt to edit the same knowledge article simultaneously (even though it's client-side, local conflicts could arise if data is synced via an external mechanism in the future, or if a user opens multiple tabs)?**
A: (stakeholder deferred — use your best judgment)

## Clarified Decisions

*   **User Roles and Permissions:**
    *   **Decision:** Implement three distinct user roles: Employee, Manager, and Admin. Employees can view and complete assigned courses/policies. Managers and Admins can create, edit, and manage all content (courses, policies, articles).
    *   **Impact:** Increases scope due to the need for role-based access control (RBAC) implementation across all content management and viewing features. Design must clearly differentiate UI elements and actions based on the logged-in user's role.
*   **Content Types and Size Limits:**
    *   **Decision:** Support plain text, Markdown, and embedded media (e.g., videos, images) for courses and knowledge articles. A maximum file size of 100MB per individual content item (e.g., a single video file, an image) will be enforced for uploads.
    *   **Impact:** Requires robust content editor integration capable of handling various formats. Backend storage and upload mechanisms must support large files and validate against the 100MB limit.
*   **Conflict Resolution:**
    *   **Decision:** Implement a "last-write-wins" strategy for simultaneous edits, coupled with a clear warning to users if they are editing an outdated version of an article.
    *   **Impact:** Simplifies initial implementation by avoiding complex real-time collaboration features. Design should include UI notifications for potential data overwrite scenarios to manage user expectations.
