# Real Estate CRM - Platform User Guide

Welcome to the **Real Estate CRM Platform**. This guide outlines key workflows and step-by-step instructions to help administrators, sales managers, agents, and finance users navigate the system.

---

## 1. Authentication & Onboarding Workflow

### Sign In & "Remember Me"
1. Navigate to the login page `/login`.
2. Enter your email and password.
3. Check the **Remember Me** box if you want the system to remember your email for subsequent logins and persist your session using long-lived secure `HttpOnly` cookies. If left unchecked, the authentication tokens will expire when you close your browser.
4. Click **Sign In**.

### Cookie-Based Token Security
* The system utilizes secure `HttpOnly` and `SameSite=Lax` cookies for both `access_token` and `refresh_token`, providing robust protection against Cross-Site Scripting (XSS) and ensuring automatic token refreshing during active sessions.

### Account Lockout & Recovery
* **Limit**: If a user enters an incorrect password **5 consecutive times**, the account is automatically locked for **30 minutes** to prevent brute-force attacks.
* **Unlocking**: An administrator must navigate to **User Management** (`/admin/users`) and click the **🔒 Unlock User** action button next to the locked user in the directory. This invokes the `/users/{user_id}/unlock` endpoint to immediately restore their access.

### First-Time Sign In & Password Management
* **Enforced Update**: When an administrator creates a new user, the account is flagged with `must_change_password: true`.
* **Changing Password**: At any time, users can click the **Change Password** option from their profile dropdown menu on the Dashboard or Admin layout. This opens a modal to safely update their password. Once successfully updated, the user's password hash is refreshed, all other active sessions are invalidated for security, and the `must_change_password` flag is cleared.

---

## 2. Admin Role & Access Control Workflow

The **Admin** is responsible for managing the organization's overall configuration, users, security, workflows, and operational settings. The following modules and workflows are available to users with the **ADMIN** role.

### Dashboard Operations
* **Metrics & KPIs**: View organization-wide business metrics and KPIs.
* **Monitoring**: Monitor total users, active projects, bookings, customers, revenue, and pending approvals.
* **Quick Actions**: Access quick actions for frequently used administrative tasks.
* **Activity Tracking**: Track recent activities and system notifications.

### User Management & Provisioning
* **Creating a New User**:
  1. Navigate to **User Management** (`/admin/users`).
  2. Click the **+ Add User** button.
  3. Fill out the full name, email, phone, and temporary password.
  4. **Scoping Fields**:
     * **Department**: Assign the user to a department (e.g. `Sales`, `Collections`, `Finance`).
     * **Project Scope**: Select a primary project if their scope is localized (mapped via `project_id`).
     * **Branch / Office**: Map them to a specific physical office branch (mapped via `branch_id`).
  5. Choose a business-role profile from the dropdown catalog (e.g. Telecaller, Field Sales) to dynamically determine their starting permission list.
  6. Click **Create User**. The user is created, flagged with `must_change_password: true`, and must change their password on first use.
* **Account Controls**: Create, edit, deactivate, and unlock user accounts (e.g., clearing lockouts via the **🔒 Unlock User** action).
* **Security Tasks**: Reset user passwords and manage activation states.
* **Search & Filters**: Search and filter users by department, role, branch, or status.

### Customizing Roles & Permissions
* **Dynamic Matrix**: Under **User Management**, click **+ Add Role** or view the roles catalog, and click **Configure Permissions** next to any profile.
* **Module-Level Configurations**: Toggle permissions across **16 system modules** (e.g. `users`, `roles`, `projects`, `inventory`, `leads`, `site_visits`, `customers`, `bookings`, `payments`, `rentals`, `tasks`, `messages`, `audit`, etc.) and columns for **Actions**:
  * View
  * Create
  * Edit
  * Delete
  * Approve
  * Assign
  * Export
* **Department Templates**: Manage permission templates for different departments.
* **Instant Enforcement**: Click **Save Mappings** to send updates to `/roles/{role_id}/permissions` and immediately apply updates to all users assigned to that role.

### Organization Settings
* **Company Profile**: Configure company information, office branches, and upload company logo/branding.
* **Regional Settings**: Configure timezone and regional settings.
* **Preferences**: Manage email, notification preferences, and system-wide authentication/security settings.

### Project & Inventory Management
* **Lifecycle**: Create and edit projects, manage project phases, and toggle project statuses.
* **Inventory Control**: Configure project locations and map physical unit inventory.
* **Monitoring**: Monitor project progress and completion percentage, and archive completed or inactive projects.

### Workflow Builder & Automation
* **Lifecycle Customization**: Design custom business workflows and configure lead lifecycle stages.
* **Automation**: Create automation rules and define task assignment logic.
* **Triggers**: Configure notification triggers and enable approval-based workflow execution.

### Approval Matrix
* **Hierarchy**: Configure approval hierarchies and assign designated approvers for different modules.
* **Execution**: Define multi-level approval processes and configure approval rules based on amount, department, or project.
* **Tracking**: Track pending, approved, and rejected requests inside `/admin/approvals`.

### Reports & Analytics
* **Report Generation**: Generate organization-wide reports including:
  * Sales Reports
  * Lead Conversion Reports
  * Booking Reports
  * Payment Reports
  * Customer Reports
  * Agent Performance Reports
  * Revenue Reports
  * Collection Reports
  * Project Progress Reports
* **Filters**: Filter reports by Date Range, Branch, Department, Project, User, or Status.
* **Exports**: Export reports in PDF, Excel, and CSV formats (with automatic formula-injection protection).

### Audit Logs & Compliance
* **Action Logs**: Track every important activity performed within the system, including:
  * User Login History & Failed Login Attempts
  * Password Changes
  * User Creation & Updates
  * Permission Changes & Role Assignments
  * Project Updates & Booking Modifications
  * Payment Activities & Approval Actions
  * System Configuration Changes
* **Metadata Stored**: Each audit record stores:
  * User
  * Module
  * Action
  * Timestamp
  * IP Address & Device Information
  * Previous Value & Updated Value
* **Observability**: Access the complete history of administrative activities at `/admin/audit` for compliance, troubleshooting, and security monitoring.


---

## 3. Leads & Pipeline Management (Sales Workflow)

### Creating & Assigning Leads
1. Go to **Leads** (`/leads`).
2. Click **+ New Lead**. Enter the lead's contact details, source (e.g. Social, Broker), and requirements.
3. Sales managers can assign leads to agents by editing the lead and choosing a designated **Assignee / Telecalling Executive**.

### Scheduling Site Visits
1. Within a Lead's details view, go to the **Site Visits** tab.
2. Click **Schedule Visit**, select the date/time, and choose the property project.
3. The assigned agent can record site visit feedback (e.g. "Customer interested, requested floor plan") and update status checks.

---

## 4. Inventory, Bookings & Collections Workflow

### Browsing Properties
1. Go to the **Properties** catalog (`/inventory`).
2. Filter properties by project, tower, block, size, or availability status (e.g. `Available`, `Hold`, `Booked`).

### Allocating Units & Creating Bookings
1. Navigate to **Bookings** (`/bookings`).
2. Click **+ Create Booking**.
3. Choose the Customer, Property, and select an available Unit.
4. Input the agreed sale value, down-payment, discounts, and save. The unit status automatically updates to `Booked`.

### Recording Payments
1. Navigate to **Payments** (`/collections`).
2. Click **+ Record Payment**.
3. Select the target Booking, select the payment method (e.g. Cheque, Bank Transfer, Card), input the amount, and upload the transaction receipt.
4. Once verified by a Finance User, the status changes to `Reconciled` and a PDF receipt is generated.

---

## 5. Rentals & Lease Management (Leasing Workflow)

### Accessing the Rentals Dashboard
* Navigate to **Rentals** (`/rentals`).
* *Note: Access to the Rentals view is dynamically restricted and visible only to authorized roles (`SUPER_ADMIN`, `ADMIN`, and `MANAGER`).*
* The screen is divided into two primary views: **Lease Agreements** and **Rental Invoices**.

### Managing Lease Agreements
1. **Creating a Lease**:
   * Navigate to the **Lease Agreements** tab.
   * Click the **+ New Lease** button to open the registration modal.
   * Enter the tenant details (**Tenant Name**, **Tenant Phone**, and optional **Tenant Email**), select a **Unit ID**, set the **Rent Amount** and **Security Deposit**, select **Start/End Dates**, and click **Create Lease**.
2. **Updating Lease Status**:
   * Locate the lease in the directory table (you can search by ID or filter by statuses: `DRAFT`, `ACTIVE`, `TERMINATED`, `EXPIRED`).
   * Click the **Options** button in the target row.
   * Select the next status transition from the dropdown: **Set Active**, **Terminate Lease**, or **Mark Expired** to immediately update the record.

### Managing Rental Invoices & Billing
1. **Viewing Invoices**:
   * Navigate to the **Rental Invoices** tab.
   * Filter invoices by status: `ALL`, `PENDING`, `PAID`, or `OVERDUE`.
2. **Reconciling Rent Payments**:
   * Next to any pending or overdue invoice, click the **Mark Paid** action button.
   * This immediately marks the invoice status as `PAID`, records the settlement timestamp, and updates the records.

---

## 6. Tasks & Communications

### Sidebar Navigation & Dynamic Updates
* **Tasks & Messages**: Fully operational views accessible at `/tasks` and `/messages` are now integrated into the main navigation sidebar to track agent checklists and messages.
