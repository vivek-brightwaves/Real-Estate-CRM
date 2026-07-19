# Real Estate CRM

A modern, role-based Real Estate CRM solution.

## Features
- **Lead & Customer Management**: Manage leads, track statuses, schedule site visits, and convert leads into customers.
- **Inventory & Projects**: Manage projects, towers, blocks, and individual units (with statuses: AVAILABLE, HOLD, BOOKED, SOLD, BLOCKED).
- **Booking & Sales Pipeline**: Complete lifecycle of a property booking—from Pending, Docs Verified, Approved, to Confirmed.
- **Manual Payment Tracking**: Complete manual collection suite. **No Payment Gateway integration** meaning there are absolutely no API keys or third-party webhooks required for payment flow.
- **Role-Based Access Control (RBAC)**: Fine-grained access for SUPER_ADMIN, MANAGER, and EMPLOYEE.
- **Approval Workflows**: Discount requests, cancellations, and other sensitive actions that require admin or manager oversight.
- **Audit Logging**: Comprehensive logging of CRUD operations across the system.

## Tech Stack
- **Backend**: Python, FastAPI, SQLAlchemy, MySQL
- **Frontend**: Next.js, React (TypeScript)

## Setup Instructions

### 1. Database Setup (MySQL)
1. Install MySQL and ensure the service is running.
2. Log into MySQL and create the database:
   ```sql
   CREATE DATABASE real_estate_crm;
   ```
3. (Optional) Create a specific user:
   ```sql
   CREATE USER 'crm_user'@'localhost' IDENTIFIED BY 'crm_password';
   GRANT ALL PRIVILEGES ON real_estate_crm.* TO 'crm_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

### 2. Backend Setup (FastAPI)
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend` folder based on `.env.example` (or configure the `DATABASE_URL`):
   ```env
   DATABASE_URL="mysql+pymysql://crm_user:crm_password@localhost:3307/crm_db"
   SECRET_KEY="your_secure_random_secret"
   ```
5. Run the database migrations/setup (if using Alembic, or the initial table creation).
6. Run the demo seed script to populate sample data:
   ```bash
   python scripts/seed_demo.py
   ```
7. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend will be available at http://127.0.0.1:8000. You can view the swagger docs at http://127.0.0.1:8000/docs.

### 3. Frontend Setup (Next.js)
*(Assuming frontend repository/folder structure is present)*
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file with the API URL:
   ```env
   NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
   ```
4. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at http://localhost:3000.

---
**Note:** This application intentionally does not use any online payment processing (Stripe, Razorpay, etc.). All payments are entered manually, thereby keeping the system strictly offline-oriented for collections.
