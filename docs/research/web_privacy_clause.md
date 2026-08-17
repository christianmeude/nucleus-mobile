# Research: Web Project Data Privacy Clause Implementation

## Overview
This document outlines how the data privacy clause was recently implemented in the `capstone-nucleus` web project (around commit `c8c49758c0144af33386b93e82bd32078b149f75`), to serve as a reference for integrating a similar feature into the `capstone-nucleus-rn` mobile project.

## Findings

### 1. Presentation to the User
The privacy notice is presented as a "gate" component (`PrivacyNoticeGate`) that wraps the existing authentication flows. When a user navigates to the Login or Register pages, the application first checks if the privacy notice has been accepted. If not, the user is shown the gate component instead of the authentication forms. Once accepted, the gate unmounts and reveals the underlying forms.

### 2. Content of the Agreement
The agreement text emphasizes that National University Dasmariñas values user privacy and commits to protecting data in accordance with the **Data Privacy Act of 2012 (RA 10173)**. 
Key details included in the notice:
- **User Rights:** Informs users of their right to access, object, erase/block, rectify, and file complaints with the National Privacy Commission.
- **Contact Info:** Provides contact details for the university's Data Privacy Office (DPO).
- **External Links:** Links to the official NPC law page (`https://privacy.gov.ph/data-privacy-act/`) and the full NU Data Privacy Policy (`https://www.national-u.edu.ph/data-privacy/`).
- **Visuals:** Uses a DPO registration seal (`nu-dpo-seal.png.webp`) to establish trust.

### 3. Tracking and Enforcement
Acceptance is tracked purely via the browser's `sessionStorage` using the key `nucleus_privacy_accepted` (exported as `PRIVACY_ACCEPTANCE_KEY`). 
- **Enforcement:** The check is strictly a client-side gating mechanism.
- **Persistence:** Because it uses `sessionStorage`, the acceptance is only valid for the current browser session. It is **not** stored persistently in the backend database or `localStorage`.

### 4. Components and Changes Involved
The implementation in the web project involved the following frontend changes:
- **New Component:** `frontend/src/components/auth/PrivacyNoticeGate.jsx` was created to render the notice and handle the "Accept/Decline" logic.
- **Modified Views:** 
  - `frontend/src/components/auth/Login.jsx`
  - `frontend/src/components/auth/Register.jsx`
  Both were updated to import `PrivacyNoticeGate` and use a state initialized from `sessionStorage` to conditionally render either the gate or the respective form.
- **Assets:** A new seal image `frontend/src/assets/nu-dpo-seal.png.webp` was added.

*(Note: The same commit also included changes for live hero stats on the Landing page, which are unrelated to the privacy gate itself.)*

## Sources
- `capstone-nucleus` Git Repository: Commit `c8c49758c0144af33386b93e82bd32078b149f75`
- `frontend/src/components/auth/PrivacyNoticeGate.jsx`
- `frontend/src/components/auth/Login.jsx`
- `frontend/src/components/auth/Register.jsx`
