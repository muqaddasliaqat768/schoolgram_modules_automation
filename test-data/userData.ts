// ---------------------------------------------------------------------------
// Test data for the User Management specs.
//
// Nothing here is a real credential or a real person. `testUser` is a static
// fixture used ONLY by the negative-validation tests, which never submit a
// valid form (an invalid field always blocks the request), so its values never
// reach the database. The positive flows (create / edit / delete / export /
// bulk-delete) never use `testUser` directly — they call the builders below,
// which stamp a fresh, run-unique username + email so a re-run can never
// collide with a user left behind by a previous run.
//
// The admin login password lives in .env.test (see utils/env.ts). The value
// below is a throwaway used for the disposable users the tests create.
// ---------------------------------------------------------------------------

// Satisfies Moodle's default password policy (>= 8 chars, upper + lower + digit
// + non-alphanumeric) so the ONLY thing a negative test fails on is the field it
// deliberately corrupts.
export const TEST_USER_PASSWORD = 'Test@Pass123';

export const testUser = {
  firstName: 'Automation',
  lastName: 'User',
  username: 'automation_user_static',
  email: 'automation.user@example.com',
  password: TEST_USER_PASSWORD,
};


// A fresh username + email per run so the positive create flow never
// collides with a user left behind by a previous run.
export const buildUniqueTestUser = () => {
  const stamp = Date.now();

  return {
    ...testUser,
    username: `testuser_${stamp}`,
    email: `testuser_${stamp}@example.com`,
  };
};


// N fresh users that share one run-unique token, so a single list search
// (`token`) surfaces the whole batch together — needed by the bulk-delete and
// export flows where row selection resets on every list refetch.
export const buildUniqueTestUserBatch = (count: number) => {
  const token = `testuser_${Date.now()}_`;

  const users = Array.from({ length: count }, (_, i) => ({
    ...testUser,
    username: `${token}${i}`,
    email: `${token}${i}@example.com`,
  }));

  return { token, users };
};


// Random name + a fresh valid email for the edit-profile flow, so the
// "search by updated details" assertions can't match the pre-edit values.
export const buildProfileUpdate = () => {
  const stamp = Date.now();

  return {
    firstName: `Edited${stamp}`,
    lastName: `User${stamp}`,
    email: `edited_${stamp}@example.com`,
  };
};


export const invalidUsername = 'MUQADDASLIAQAT';


// Usernames present in test-data/sample.csv — kept here so the bulk-upload test
// has a known row to look up without hard-coding a name in the spec.
// MUST stay in sync with the `username` column of sample.csv (2nd column).
export const SAMPLE_CSV_USERNAMES = [
  'muqadas02',
  'shahiqrahman',
  'alishakhan',
  'bilalahmed',
  'sanaparveen',
  'usmantariq',
] as const;


export const invalidEmails = [
  'plainaddress',
  '#@%^%#$@#$@#.com',
  '@example.com',
  'Joe Smith <email@example.com>',
  'email.example.com',
  'email@example@example.com',
];


// Every entry violates at least one Moodle default password rule, so the
// "password format" test always sees the policy error and never creates a user.
export const invalidPasswords = [
  '12345',
  'password',
  'PASSWORD',
  'Password',
  'Password1',
  'password1!',
  'PASSWORD1!',
];
