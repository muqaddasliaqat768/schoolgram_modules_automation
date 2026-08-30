// Defines the information required to create or manage a user
// in the User Management module.
//
// These fields represent the details an administrator would normally
// provide when creating or updating a user.

export interface User {
  // User's first name.
  firstName: string;

  // User's last name / family name.
  lastName: string;

  // Unique username used by the user to identify/sign in to the system.
  username: string;

  // User's email address.
  email: string;

  // Password used for the test user.
  // This is a test-user password, NOT the administrator's login password.
  password: string;
}