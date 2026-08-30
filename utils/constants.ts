// ---------------------------------------------------------------------------
// Shared constants used across the Playwright test suite.
//
// These values are the same across all environments, such as QA, staging,
// or demo. Environment-specific information like the application URL and
// login credentials is managed separately through .env.test and utils/env.ts.
// ---------------------------------------------------------------------------

import { env } from './env';

// ===========================================================================
// AUTHENTICATION & LOGIN
// ===========================================================================

/**
 * Location where Playwright saves the authenticated user session.
 *
 * The authentication setup logs in once and saves the session here.
 * Other tests reuse this session instead of logging in before every test.
 *
 * The environment name is included in the filename so different environments
 * have their own authentication state.
 */
export const STORAGE_STATE =
  `playwright/.auth/user-${env.ENVIRONMENT}.json`;

/**
 * Message displayed when the user's session has expired.
 *
 * Tests use this message to detect that the user needs to log in again.
 */
export const SESSION_TIMEOUT_MESSAGE =
  'Your session has timed out. Please log in again.';

/**
 * Generic server-error message used when the application reports
 * that the server is unavailable.
 */
export const SERVER_ERROR_MESSAGE =
  'Server error';

/**
 * Messages that indicate the login attempt was unsuccessful.
 *
 * The regular expression handles different login-error messages that
 * may be displayed by the application.
 */
export const INVALID_LOGIN_REGEX =
  /invalid login|incorrect/i;

/**
 * Common server errors that indicate the application is unavailable.
 *
 * If any of these messages is displayed, the test setup stops the
 * dependent tests instead of allowing every test to fail individually.
 */
export const SERVER_ERRORS = [
  '504 Gateway Timeout',
  '504 Gateway Time-out',
  '502 Bad Gateway',
  '503 Service Unavailable',
  '500 Internal Server Error',
] as const;


// ===========================================================================
// APPLICATION ROUTES
// ===========================================================================

/**
 * Main application pages used by the tests.
 *
 * These are kept in one place so that if a page URL changes, we only
 * need to update it here instead of changing every test.
 *
 * The routes contain only the application path, not the complete domain,
 * so they work with any configured environment.
 */
export const ROUTES = {
  // Login page where the user enters their credentials.
  LOGIN: /\/login\/index\.php/,

  // Main Dashboard shown after successful login.
  DASHBOARD: /\/my\//,

  // Page where an administrator assigns courses to a user.
  COURSE_ENROL: /\/course-enrol\//,

  // Page containing the list of users.
  USERS_LIST: /\/users-list\//,

  // User profile page where an administrator can view/edit user details.
  USER_PROFILE: /\/user-profile\//,

  // Page used to upload users through a CSV file.
  UPLOAD_USERS: /\/upload-users\//,
} as const;


// ===========================================================================
// USER MANAGEMENT
// ===========================================================================

/**
 * Navigation labels used to access User Management features.
 *
 * Keeping menu text here avoids repeating the same UI text throughout
 * multiple Page Objects and tests.
 */
export const MENU = {
  // Navigation option an administrator uses to manage users.
  USER_MANAGEMENT: 'User Management',
} as const;


// ===========================================================================
// FORM VALIDATION
// ===========================================================================

/**
 * Validation messages displayed when the administrator enters
 * incomplete or invalid user information.
 *
 * These values allow tests to verify that the application gives the
 * user the correct feedback instead of allowing invalid data to be submitted.
 */
export const VALIDATION_MESSAGES = {
  // Displayed when the administrator leaves First Name empty.
  FIRST_NAME_REQUIRED:
    'First name is required.',

  // Displayed when the administrator leaves Last Name empty.
  LAST_NAME_REQUIRED:
    'Last name is required.',

  // Displayed when the administrator leaves Username empty.
  USERNAME_REQUIRED:
    'Username is required.',

  // Displayed when the entered username does not follow the required format.
  INVALID_USERNAME:
    /Username must be/i,

  // Displayed when the entered email address is not valid.
  INVALID_EMAIL:
    /Please enter a valid email/i,

  // Displayed when the entered password does not satisfy the password rules.
  INVALID_PASSWORD:
    /Password must contain/i,
} as const;