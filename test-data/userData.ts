export const TEST_USER_PASSWORD = 'Test@Pass123';

export const testUser = {
  firstName: 'Automation',
  lastName: 'User',
  username: 'automation_user_static',
  email: 'automation.user@example.com',
  password: TEST_USER_PASSWORD,
};


export const buildUniqueTestUser = () => {
  const stamp = Date.now();

  return {
    ...testUser,
    username: `testuser_${stamp}`,
    email: `testuser_${stamp}@example.com`,
  };
};


export const buildUniqueTestUserBatch = (count: number) => {
  const token = `testuser_${Date.now()}_`;

  const users = Array.from({ length: count }, (_, i) => ({
    ...testUser,
    username: `${token}${i}`,
    email: `${token}${i}@example.com`,
  }));

  return { token, users };
};


export const buildProfileUpdate = () => {
  const stamp = Date.now();

  return {
    firstName: `Edited${stamp}`,
    lastName: `User${stamp}`,
    email: `edited_${stamp}@example.com`,
  };
};


export const invalidUsername = 'MUQADDASLIAQAT';


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


export const invalidPasswords = [
  '12345',
  'password',
  'PASSWORD',
  'Password',
  'Password1',
  'password1!',
  'PASSWORD1!',
];
