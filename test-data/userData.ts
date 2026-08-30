 /**
  * Test data used by the User Management test cases.
  *
  * The data is divided into:
  * - Valid user data for creating and updating users
  * - Invalid values for validation testing
  * - Sample CSV usernames used to verify bulk upload
  *
  * Dynamic test data is generated for positive scenarios so repeated
  * test runs do not use the same username or email address.
  */

// Valid password that meets the application's password requirements.
// Used when the test needs to create a valid user.
export const TEST_USER_PASSWORD = 'Test@Pass123';

/**
 * Default user information used as a base for different test scenarios.
 *
 * Positive tests use the builders below to generate unique usernames
 * and email addresses. This prevents test data from conflicting with
 * users created during previous test runs.
 *
 * Negative validation tests may use these static values because the
 * invalid field should prevent the form from being submitted.
 */
export const testUser = {
  firstName: 'Automation',
  lastName: 'User',
  username: 'automation_user_static',
  email: 'automation.user@example.com',
  password: TEST_USER_PASSWORD,
};

/**
 * Creates a unique test user.
 *
 * A unique username and email are generated for every test run so
 * the test can create a new user without being affected by data
 * left behind from an earlier run.
 */
export const buildUniqueTestUser = () => {
  const stamp = Date.now();

  return {
    ...testUser,
    username: `testuser_${stamp}`,
    email: `testuser_${stamp}@example.com`,
  };
};

/**
 * Creates multiple unique test users for scenarios that require
 * more than one user, such as bulk delete or CSV export.
 *
 * All users share the same unique identifier so they can be found
 * together using a single search.
 */
export const buildUniqueTestUserBatch = (
  count: number
) => {
  const token = `testuser_${Date.now()}_`;

  const users = Array.from(
    { length: count },
    (_, i) => ({
      ...testUser,
      username: `${token}${i}`,
      email: `${token}${i}@example.com`,
    })
  );

  return {
    token,
    users,
  };
};

/**
 * Creates new profile information for the Edit User scenario.
 *
 * Unique values make it possible to verify that the user's profile
 * was actually updated instead of matching the original information.
 */
export const buildProfileUpdate = () => {
  const stamp = Date.now();

  return {
    firstName: `Edited${stamp}`,
    lastName: `User${stamp}`,
    email: `edited_${stamp}@example.com`,
  };
};

/**
 * Username used for username validation testing.
 *
 * This value is intentionally invalid according to the application's
 * username rules so the test can verify the appropriate validation message.
 */
export const invalidUsername = 'MUQADDASLIAQAT';

/**
 * Usernames expected to be available after uploading sample.csv.
 *
 * These values are used to verify that the users from the CSV file
 * were processed successfully.
 */
export const SAMPLE_CSV_USERNAMES = [
  'muqadas02',
  'shahiqrahman',
  'alishakhan',
  'bilalahmed',
  'sanaparveen',
  'usmantariq',
] as const;

/**
 * Invalid email formats used to verify email validation.
 *
 * Each value represents a different invalid format, such as:
 * - Missing @ symbol
 * - Missing domain
 * - Invalid characters
 * - Multiple @ symbols
 * - Invalid email structure
 */
export const invalidEmails = [
  'plainaddress',
  '#@%^%#$@#$@#.com',
  '@example.com',
  'Joe Smith <email@example.com>',
  'email.example.com',
  'email@example@example.com',
];

/**
 * Invalid passwords used to verify password validation.
 *
 * Each value intentionally fails one or more password requirements,
 * allowing the test to confirm that invalid passwords are rejected.
 */
export const invalidPasswords = [
  '12345',
  'password',
  'PASSWORD',
  'Password',
  'Password1',
  'password1!',
  'PASSWORD1!',
];