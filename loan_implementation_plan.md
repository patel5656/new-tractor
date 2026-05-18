# Soft Loan Integration Implementation Plan

This plan details the step-by-step architecture to integrate a secure agricultural **Soft Loan System** (compatible with BOI and Crop2Cash) into the Tractor Link web application.

To allow immediate progress and 100% safe testing without needing real bank keys from the client, the integration is designed with a **Mock-first Service Architecture**. The backend will check the `.env` file to decide whether to run in `MOCK` (simulation) mode or `CROP2CASH` (production) mode, allowing seamless live deployment later.

---

## User Review Required

> [!IMPORTANT]
> **No Direct USSD Modifications:** As requested, this plan excludes USSD integration entirely and focuses solely on the React Web Application (Frontend) and the Node.js/Express Server (Backend).
> 
> **Keys Kept Out of UI for Security:** Following standard security protocols, all sensitive API Keys and Secrets will be stored only in the backend's server `.env` file. The settings panel will only contain business-level toggles (e.g., Enable/Disable, Max loan limit, Active Bank Selector).

---

## Open Questions

> [!NOTE]
> Please confirm if **₦50,000** is a reasonable baseline for the **Minimum Booking Cost** to trigger the loan option on the payment screen.

---

## Proposed Changes

### 1. Database Layer (Prisma ORM)
We need to create a dedicated structure to store loan statuses, bank names, and transaction references.

#### [MODIFY] [schema.prisma](file:///c:/Users/kiaan/Desktop/tractor/tractor%20backend15/prisma/schema.prisma)
* Add a `Loan` model mapped to the `loans` table.
* Create a one-to-one relationship between `Loan` and `Booking`.
* Create a one-to-many relationship between `User` (Farmer) and `Loan`.

---

### 2. Backend Logic (Node.js & Express)
We will implement the service that handles bank API requests (supporting both Mock and Live mode) and expose secure endpoints.

#### [NEW] [loan.service.js](file:///c:/Users/kiaan/Desktop/tractor/tractor%20backend15/src/services/loan.service.js)
* Read `LOAN_PROVIDER_MODE` from `.env`.
* If `MOCK`, generate instant sandbox approvals and simulated EMIs.
* If `CROP2CASH`, send real secure HTTP requests to Crop2Cash API with credentials.

#### [NEW] [loan.controller.js](file:///c:/Users/kiaan/Desktop/tractor/tractor%20backend15/src/controllers/farmer/loan.controller.js)
* Handle `applyLoan` requests, perform BVN format checks, and process loan logic via `LoanService`.
* Automatically update `Booking` and `Payment` tables in the database once the loan is approved.

#### [NEW] [loan.routes.js](file:///c:/Users/kiaan/Desktop/tractor/tractor%20backend15/src/routes/loan.routes.js)
* Expose `POST /apply` and `GET /history` endpoints (protected by `verifyToken` middleware).

#### [MODIFY] [index.js](file:///c:/Users/kiaan/Desktop/tractor/tractor%20backend15/src/index.js)
* Register the new loan router under `/api/loans` path.

---

### 3. Frontend API layer
We will connect the frontend to the new backend endpoints.

#### [MODIFY] [api.js](file:///c:/Users/kiaan/Desktop/tractor/tractor%20frontent%2015/src/lib/api.js)
* Add a new `loans` group to the `api` object:
  ```javascript
  loans: {
    apply: (data) => fetchAPI('/loans/apply', { method: 'POST', body: JSON.stringify(data) }),
    getHistory: () => fetchAPI('/loans/history')
  }
  ```

---

### 4. Frontend UI Components & Pages
We will integrate the visual options for farmers to request loans and for admins to manage business rules.

#### [MODIFY] [Payments.jsx](file:///c:/Users/kiaan/Desktop/tractor/tractor%20frontent%2015/src/pages/farmer/Payments.jsx)
* Add a **"Pay using Soft Loan"** payment method option at checkout.
* Create a highly aesthetic, responsive modal popup asking for the 11-digit BVN.
* Add a secondary confirmation panel showing calculated EMI details (e.g., 3-month plan) before final submission.

#### [NEW] [Loans.jsx](file:///c:/Users/kiaan/Desktop/tractor/tractor%20frontent%2015/src/pages/farmer/Loans.jsx)
* Add a new "My Loans" page in the farmer dashboard displaying active loan amounts, repayment progress, and due EMI details.

#### [MODIFY] [Settings.jsx](file:///c:/Users/kiaan/Desktop/tractor/tractor%20frontent%2015/src/pages/admin/Settings.jsx)
* Add a new **"Loan Integration"** tab under System Configuration.
* Display inputs for **Active Bank**, **Feature Switch (On/Off)**, **Max Loan Amount**, and **Min Booking Value**.

---

## Verification Plan

### Automated Verification
* Run the application servers via `npm run dev` in both folders.
* Run Prisma schema migration to ensure MySQL database structures sync correctly without data loss:
  `npx prisma migrate dev --name add_loan_system`

### Manual Verification
* Log in as a Farmer, select a high-value booking, select "Pay with Soft Loan".
* Input a test 11-digit BVN and click submit.
* Verify that the mock loan gets approved, the booking status automatically transitions to "Paid", and the payment is correctly logged under the new "My Loans" dashboard page.
* Log in as Admin, verify that the transaction is tracked in the Payments page, and modify loan parameters in Settings to confirm they update live.
