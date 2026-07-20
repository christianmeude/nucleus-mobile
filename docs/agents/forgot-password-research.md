# Forgot Password & OTP Functionality Research

## Overview
The capstone-nucleus web project implements forgot password and OTP functionality using **Supabase's standard Auth API** and its built-in email service. It **does not** use Supabase Edge Functions (the `supabase/functions` directory does not exist).

## Dual-Email Model
The project uses a unique dual-email model:
- `public.users.email`: Institutional login email.
- `public.users.recovery_email`: Verified personal inbox used exclusively for account recovery.
*Source: `C:\Users\Christian\Projects\capstone-nucleus\PASSWORD_RESET_SETUP.md` (Section 10)*

## OTP Request Flow (`requestPasswordReset`)
1. User enters their institutional email on `/forgot-password`.
2. The backend looks up the `recovery_email` associated with that profile. If none is set, it returns an error requiring the user to configure one first.
3. The backend calls the standard Supabase API `supabase.auth.resetPasswordForEmail(recovery_email)`.
4. Supabase's built-in email service delivers a 6-digit OTP code to the personal recovery email.
*Source: `C:\Users\Christian\Projects\capstone-nucleus\backend\src\controllers\auth.controller.js` (lines 1065-1108)*
*Source: `C:\Users\Christian\Projects\capstone-nucleus\backend\src\utils\supabaseAuth.js` (lines 203-210)*

## OTP Verification Flow (`confirmPasswordReset`)
1. User provides the email, 6-digit verification code, and a new password.
2. The backend looks up the user's `recovery_email` again.
3. The code is verified server-side using standard Supabase Auth API: `supabase.auth.verifyOtp({ email: recovery_email, token: code, type: 'recovery' })`.
4. Upon successful verification, the backend updates the password directly using the Supabase Admin API: `supabase.auth.admin.updateUserById(userId, { password })`.
*Source: `C:\Users\Christian\Projects\capstone-nucleus\backend\src\controllers\auth.controller.js` (lines 1110-1188)*
*Source: `C:\Users\Christian\Projects\capstone-nucleus\backend\src\utils\supabaseAuth.js` (lines 212-221, 170-185)*

## Edge Functions
- **Investigation:** Checked the codebase for edge functions (`C:\Users\Christian\Projects\capstone-nucleus\supabase\functions`).
- **Result:** The directory does not exist. The auth controllers rely exclusively on the `@supabase/supabase-js` client within the standard Node.js backend to interact with Supabase Auth. No edge functions are used for the authentication or OTP flows.
