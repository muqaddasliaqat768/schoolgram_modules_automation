import { env } from './env';

export const STORAGE_STATE =
  `playwright/.auth/user-${env.ENVIRONMENT}.json`;

export const SESSION_TIMEOUT_MESSAGE =
  'Your session has timed out. Please log in again.';

export const SERVER_ERROR_MESSAGE = 'Server error';

export const INVALID_LOGIN_REGEX = /invalid login|incorrect/i;

export const SERVER_ERRORS = [
  '504 Gateway Timeout',
  '504 Gateway Time-out',
  '502 Bad Gateway',
  '503 Service Unavailable',
  '500 Internal Server Error',
];

export const ROUTES = {
  LOGIN: /\/login\/index\.php/,
  DASHBOARD: /\/my/,
  COURSE_ENROL: /\/course-enrol/,
  USERS_LIST: /\/users-list/,
  USER_PROFILE: /\/user-profile/,
  UPLOAD_USERS: /\/upload-users/,
} as const;

export const MENU = {
  USER_MANAGEMENT: 'User Management',
} as const;


export const VALIDATION_MESSAGES = {

  FIRST_NAME_REQUIRED:
    'First name is required.',

  LAST_NAME_REQUIRED:
    'Last name is required.',

  USERNAME_REQUIRED:
    'Username is required.',

  INVALID_USERNAME:
    /Username must be/i,

  INVALID_EMAIL:
    /Please enter a valid email/i,

  INVALID_PASSWORD:
    /Password must contain/i,

} as const;
