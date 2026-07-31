# Backend Documentation

This document describes the backend functionality and features of the Real Estate CRM project.

## 1. Overview

The backend is a FastAPI-based REST API that powers the CRM workflow for real estate sales, lead management, booking approvals, payments, site visits, notifications, analytics, and admin operations.

It provides:
- Authentication and role-based access control
- Lead and customer management
- Inventory and unit management
- Booking and payment workflows
- Site visit tracking
- Approval workflows and audit logging
- Dashboard and analytics
- Notifications and file uploads

---

## 2. Main Backend Architecture

### Framework
- FastAPI for API development
- SQLAlchemy ORM for database access
- Pydantic for request/response validation
- JWT-based authentication
- APScheduler for background jobs

### Core Modules
- app/main.py: API entry point and router registration
- app/core/config.py: backend environment configuration
- app/core/security.py: password hashing and JWT handling
- app/api/deps.py: authentication and authorization dependency helpers
- app/models/: database models for users, leads, customers, projects, sales, and system entities
- app/routers/: API route handlers by feature area
- app/services/: business logic for leads, notifications, inventory, and audit

---

## 3. Authentication and User Management

### Features
- User login with email/password
- JWT access and refresh token generation
- Token refresh endpoint
- Logout and token blacklisting
- Role-based access control with roles such as:
  - SUPER_ADMIN
  - MANAGER
  - EMPLOYEE

### Supported User Operations
- Create users
- View users
- Update user details
- Deactivate or activate users
- Reset user passwords
- Change user roles
- Reassign managers

### Security Features
- Password hashing
- Token blacklisting for logout and invalidation
- Role-based route restrictions

---

## 4. Organization and Branch Management

### Features
- Create and manage companies
- Create and manage branches
- Create and manage projects

### Admin Capability
- Only authorized super admins can manage organization-level entities

---

## 5. Lead Management

### Features
- Create leads
- View leads
- Update lead details
- Add notes to leads
- Assign leads to users
- Reject leads
- Schedule site visits
- Track lead status lifecycle

### Lead Workflow
Typical lead lifecycle includes:
- New
- Contacted
- Visit Scheduled
- Negotiation
- Converted
- Lost

### Advanced Behavior
- Lead access is restricted based on role and company/branch scope
- Lead activities and audit entries are recorded
- Notifications can be sent when a lead is assigned

---

## 6. Customer Management

### Features
- Convert leads into customers
- View customers
- Retrieve customer timeline information
- Upload customer documents
- Verify or reject uploaded documents
- Track document verification status

### Customer Workflow
- Customers can be created from leads
- KYC/document status is verified by admins/managers
- Customer timeline combines lead activity, notes, and site visits

---

## 7. Site Visit Management

### Features
- View scheduled site visits
- Check in for a site visit
- Upload a photo during check-in
- Submit feedback and ratings
- Approve visits
- Update visit results and notes

### Visit Workflow
- Employees can handle visits assigned to them
- Feedback and status updates are stored in the system
- Visit results can add notes to the lead timeline

---

## 8. Inventory and Property Management

### Features
- Create towers
- View towers
- Create blocks
- View blocks
- Create units
- View units with filters
- Hold units temporarily
- Release unit holds
- Update unit price

### Inventory Workflow
- Units have statuses such as:
  - AVAILABLE
  - HOLD
  - BOOKED
  - SOLD
- Holds automatically expire through a background scheduler

### Background Automation
- A scheduler periodically releases expired holds so units return to available status

---

## 9. Booking Management

### Features
- Create bookings for available units
- View bookings
- Retrieve a single booking
- Verify booking documents
- Approve bookings
- Confirm bookings
- Cancel bookings
- Request approval for discount or booking actions
- Track discount approval requests

### Booking Workflow
The booking lifecycle includes:
- PENDING
- DOCS_VERIFIED
- APPROVED
- CONFIRMED
- CANCELLED

### Business Rules
- Booking creation requires an available unit and verified customer KYC documents
- Booking approval updates unit status to BOOKED
- Confirmation marks the unit as SOLD
- Cancellation makes the unit available again

---

## 10. Payment Management

### Features
- Record payments for bookings
- Mark payments as received
- View payments by booking or status
- Generate receipt PDFs
- Send payment reminders

### Payment Workflow
- Payments can be pending, received, or overdue
- Received payments can generate downloadable PDF receipts
- Reminder notifications can be sent for pending or overdue payments

### Receipt Generation
- PDF receipts are stored in the uploads directory
- Receipt content includes customer, booking, unit, and payment details

---

## 11. Approval Workflow

### Features
- Create approval requests for discounts or other actions
- Review pending approval requests
- Approve or reject approval requests
- Support alias endpoints for approval actions

### Approval Logic
- Discount requests may be auto-approved if they are below a threshold
- Approval requests are logged in the system for audit purposes

---

## 12. Audit Logging and System Monitoring

### Features
- Record audit logs for actions such as:
  - user creation
  - booking changes
  - lead updates
  - approval actions
- Retrieve audit logs with filters

### Use Cases
- Track admin actions
- Support internal review and compliance
- Monitor critical backend changes

---

## 13. Notifications

### Features
- Retrieve user notifications
- Get unread notification count
- Mark notifications as read
- Send notifications for events such as:
  - lead assignment
  - booking approval
  - payment reminder

### Notification Behavior
- Notifications are stored in the database
- Email/SMS dispatch is attempted when company notification settings are configured

---

## 14. Dashboard and Analytics

### Dashboard Endpoints
- Super admin dashboard
- Manager dashboard
- Employee dashboard

### Dashboard Metrics
- Revenue
- Pending collections
- Today’s bookings
- Lead counts
- Project counts
- Visits
- Sales performance

### Analytics Endpoints
- Summary statistics
- Lead funnel reporting
- Revenue trend reporting

---

## 15. File Upload and Media Handling

### Supported Uploads
- Customer document uploads
- Site visit photo uploads
- Receipt PDFs generated by the backend

### Storage
- Uploaded files are stored under the uploads directory
- Static files are mounted for public access via the backend

---

## 16. Backend API Structure

Main API prefixes include:
- /auth
- /organization
- /users
- /inventory
- /leads
- /site-visits
- /customers
- /bookings
- /payments
- /analytics
- /system
- /dashboard
- /reports
- /settings
- /notifications

---

## 17. Summary

The backend provides a full real-estate CRM workflow covering:
- Sales and lead tracking
- Customer onboarding and KYC
- Inventory and unit management
- Booking lifecycle management
- Payments and receipts
- Approval workflows
- Notifications and analytics
- Admin and organization controls

This makes it suitable for managing the complete sales funnel from lead generation to booking confirmation.
