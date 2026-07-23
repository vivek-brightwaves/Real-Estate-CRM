# Real Estate CRM - User Roles & Functionality

This document details the responsibilities, dashboards, and features accessible to each user role (Super Admin, Manager, and Employee) in the Real Estate CRM.

---

## 1. Super Admin (Global Administrator)

The **Super Admin** has full administrative access to the entire CRM platform, including database tables, global configurations, audit logging, and branch/user controls.

### Dashboard: Global Dashboard
Provides a macro-level overview of the entire company's performance:
- **Total Revenue**: Sum of all confirmed collections across all branches.
- **Pending Collection**: Outstanding payments scheduled but not yet received.
- **Today's Bookings**: Total bookings completed globally today.
- **Top Sales Agent**: Spotlights the sales representative with the highest number of bookings.
- **Analytics Charts**: Displays global **Lead Pipeline** (Kanban status breakdown) and **Revenue Trends** over the last 6 months.

### Exclusive Functionality
- **Organization Setup**:
  - **Organization**: Configure global branding, company name, address, and metadata.
  - **User Management**: Add, update, delete, or suspend any user accounts and assign roles.
- **Administration Panels**:
  - **Approvals Inbox**: Review and approve/reject sensitive requests (such as manual price overrides or custom discounts).
  - **Audit Logs**: Access immutable logs tracking system changes, API requests, and critical events.
  - **Global Settings**: Configure system-level services:
    - **Email Configuration**: SMTP host, port, credentials, and sender email.
    - **Messaging**: Webhooks and provider details (e.g., Twilio).
    - **Security**: Toggle mandatory 2-Factor Authentication (2FA), session timeout limits, and password expiry duration.
    - **Storage**: AWS S3 Bucket details for asset/image storage.
    - **Backup**: Database backup schedule frequency and retention settings.
- **Inventory Control**:
  - Full read/write access to units, including the ability to edit unit pricing directly.
  - Hold or release units on demand.

---

## 2. Manager (Branch Manager)

The **Manager** is responsible for overseeing a specific branch, reviewing employee performance, approving site visits, and analyzing sales/collections.

### Dashboard: Branch Dashboard
Provides an operational view of their specific branch's sales and employee activity:
- **Branch Revenue**: Revenue collected by agents registered to their branch.
- **Today's Leads**: Number of new leads acquired in the branch today.
- **Today's Visits**: Count of scheduled site visits assigned to branch agents.
- **Pending Follow-ups**: Follow-up tasks overdue or scheduled for today.
- **Analytics Charts**: Displays branch-level **Lead Pipeline** and **Revenue Trends**.

### Functionality & Controls
- **Reports Center**: Export branch-specific reports (Sales & Bookings, Finance & Collections, and Inventory Status) in Excel or PDF formats.
- **Site Visit Approvals**: Review check-ins submitted by employees and verify/approve Completed Site Visits.
- **Inventory Management**:
  - View real-time unit availability and layout.
  - Hold units for 24 hours on behalf of clients or release existing holds.
- **Lead & Customer Management**: Assign leads to employees and review booking progress.

---

## 3. Employee (Sales Agent)

The **Employee** is the front-line agent responsible for contacting leads, conducting site visits, registering customers, and submitting booking requests.

### Dashboard: My Dashboard
Tailored for individual productivity and daily task tracking:
- **My Active Leads**: Total leads assigned to the logged-in agent currently in active follow-up stages.
- **My Visits Today**: Number of scheduled site visits the agent needs to conduct today.
- **My Confirmed Sales**: Number of booking sales closed by the agent.

### Functionality & Controls
- **Leads Kanban Board**: Move assigned leads between stages (*New, Contacted, Visit Scheduled, Negotiation, Converted, Lost*).
- **Site Visit Actions**:
  - **Check In**: Check in at site visits, with optional GPS verification or photo upload.
  - **Leave Feedback**: Record client feedback and rate the visit (1 to 5 stars) post-completion.
- **Bookings & Collections**:
  - Register new bookings for customers who have selected a unit.
  - Record scheduled payments and view pending installment dates.
- **Inventory Access**: Read-only view of the interactive inventory tree to check real-time unit availability (Available, Hold, Sold) and pricing. Cannot modify unit prices.

---

## Project Workflow (Simplified)

This CRM manages the lifecycle of a real estate sale, from the first contact with a client to the final payment collection. The workflow follows these step-by-step phases:

### Phase 1: Lead Acquisition & Assignment
1. **New Lead**: A potential buyer (lead) is registered in the system.
2. **Assigning**: The lead is assigned to an **Employee** (Sales Agent) to guide them.

### Phase 2: Contact & Nurturing (Leads Board)
1. **First Contact**: The agent contacts the lead and moves their card to `CONTACTED` on the Leads Board.
2. **Scheduling a Visit**: If the lead is interested, the agent schedules a site visit, moving the status to `VISIT_SCHEDULED`.

### Phase 3: Site Visit & Verification
1. **Check-in**: The agent goes to the real estate site with the customer, checks in via the app, and uploads a photo as proof.
2. **Feedback**: The agent submits the customer's feedback and rating.
3. **Approval**: A **Manager** reviews and approves the completed site visit.

### Phase 4: Unit Selection & Reservation (Inventory)
1. **Negotiation**: The lead enters the `NEGOTIATION` stage.
2. **Holding a Unit**: The agent selects a property unit (e.g., flat or plot) from the **Inventory Tree** and places it on `HOLD` (reserves it for 24 hours) so no other agent can sell it.

### Phase 5: Booking & Conversion
1. **Conversion**: The lead is officially converted into a **Customer** (the lead card moves to `CONVERTED`).
2. **New Booking**: The agent submits a **New Booking** request linking the customer to the selected unit. The unit status updates to sold.

### Phase 6: Installments & Collections
1. **Scheduling Payments**: The system automatically schedules payment installments (down payments, milestone payments).
2. **Collection**: When the customer pays, the agent records it and marks the status as `RECEIVED`.
3. **Overdue & Reminders**: If a payment is missed, the status becomes `OVERDUE`, and the agent sends a payment reminder.

### Phase 7: Analytics & Reporting
- **Super Admins** and **Managers** track active leads, total revenue, and collections on their dashboards.
- They export financial and sales reports from the **Reports Center** to evaluate the health of the business and agent performance.
