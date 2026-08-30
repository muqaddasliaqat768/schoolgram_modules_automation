import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

import { DashboardPage } from '../pages/DashboardPage';
import { UserManagementPage } from '../pages/UserManagementPage';

import {
  testUser,
  buildUniqueTestUser,
  buildUniqueTestUserBatch,
  buildProfileUpdate,
  invalidEmails,
  invalidPasswords,
  invalidUsername,
  SAMPLE_CSV_USERNAMES,
} from '../test-data/userData';

import { VALIDATION_MESSAGES, ROUTES } from '../utils/constants';

test.describe('User Management', () => {
  let dashboardPage: DashboardPage;
  let userManagementPage: UserManagementPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    userManagementPage = new UserManagementPage(page);

    await dashboardPage.goto();
    await dashboardPage.openSidebar();
    await userManagementPage.open();
  });

  test.describe('User Management Validation', () => {
    test('should show required field validations', async () => {
      await test.step('Open Create User form', async () => {
        await userManagementPage.openCreateUser();
      });

      await test.step('Submit the empty form', async () => {
        await userManagementPage.submit();
      });

      await test.step('Verify required field validation messages', async () => {
        await expect(
          userManagementPage.page.getByText(
            VALIDATION_MESSAGES.FIRST_NAME_REQUIRED,
          ),
        ).toBeVisible();

        await expect(
          userManagementPage.page.getByText(
            VALIDATION_MESSAGES.LAST_NAME_REQUIRED,
          ),
        ).toBeVisible();

        await expect(
          userManagementPage.page.getByText(
            VALIDATION_MESSAGES.USERNAME_REQUIRED,
          ),
        ).toBeVisible();
      });
    });

    test('should validate username format', async () => {
      await test.step('Open Create User form', async () => {
        await userManagementPage.openCreateUser();
      });

      await test.step('Enter an invalid username', async () => {
        await userManagementPage.fillRequiredFields({
          ...testUser,
          username: invalidUsername,
        });

        await userManagementPage.passwordInput.fill(testUser.password);
      });

      await test.step('Submit the form and verify username validation', async () => {
        await userManagementPage.submit();

        await expect(
          userManagementPage.page.getByText(
            VALIDATION_MESSAGES.INVALID_USERNAME,
          ),
        ).toBeVisible();
      });
    });

    test('should validate email format', async () => {
      await userManagementPage.openCreateUser();

      for (const email of invalidEmails) {
        await test.step(
          `Verify invalid email: ${email}`,
          async () => {
            await userManagementPage.fillRequiredFields({
              ...testUser,
              email,
            });

            await userManagementPage.passwordInput.fill(testUser.password);
            await userManagementPage.submit();

            await expect(
              userManagementPage.page.getByText(
                VALIDATION_MESSAGES.INVALID_EMAIL,
              ),
            ).toBeVisible();
          },
        );
      }
    });

    test('should validate password format', async () => {
      await userManagementPage.openCreateUser();

      for (const password of invalidPasswords) {
        await test.step(
          `Verify invalid password: ${password}`,
          async () => {
            await userManagementPage.fillRequiredFields(testUser);
            await userManagementPage.passwordInput.fill(password);
            await userManagementPage.submit();

            await expect(
              userManagementPage.page.getByText(/Password must contain/i),
            ).toBeVisible();
          },
        );
      }
    });
  });

  test('Successfully create user, enroll in the course & redirect to the user list page', async () => {
    const newUser = buildUniqueTestUser();

    await test.step(
      'Create a new user and confirm successful creation',
      async () => {
        await userManagementPage.createUser(newUser);

        await userManagementPage.expectUserCreatedModal();
        await userManagementPage.dismissModal();
      },
    );

    await test.step(
      'Verify user is redirected to the course assignment page',
      async () => {
        await expect(userManagementPage.page).toHaveURL(
          ROUTES.COURSE_ENROL,
        );
      },
    );

    await test.step(
      'Enroll the new user in a course',
      async () => {
        await userManagementPage.selectFirstCourseCategory();

        await userManagementPage.enrollInFirstAvailableCourse();
      },
    );

    await test.step(
      'Return to the Users List',
      async () => {
        await userManagementPage.goToUsersListViaBreadcrumb();

        await expect(userManagementPage.page).toHaveURL(
          ROUTES.USERS_LIST,
        );

        await expect(userManagementPage.searchBox).toBeVisible();
      },
    );

    await test.step(
      'Verify the newly created user appears in the list',
      async () => {
        await userManagementPage.narrowToUserRow(newUser.username);
      },
    );
  });

  test('Search created user, edit profile, redirect back to list & delete it', async () => {
    const newUser = buildUniqueTestUser();
    const updatedProfile = buildProfileUpdate();

    await test.step(
      'Create a user and return to the Users List',
      async () => {
        await userManagementPage.createUser(newUser);

        await userManagementPage.expectUserCreatedModal();
        await userManagementPage.dismissModal();

        await userManagementPage.goToUsersListViaBreadcrumb();

        await expect(userManagementPage.page).toHaveURL(
          ROUTES.USERS_LIST,
        );
      },
    );

    await test.step(
      'Search for the user and open the profile',
      async () => {
        await userManagementPage.editUser(newUser.username);

        await expect(userManagementPage.page).toHaveURL(
          ROUTES.USER_PROFILE,
        );
      },
    );

    await test.step(
      'Update the user profile information',
      async () => {
        await userManagementPage.updateProfile(updatedProfile);

        await userManagementPage.expectProfileUpdatedModal();
        await userManagementPage.dismissModal();
      },
    );

    await test.step(
      'Return to the Users List',
      async () => {
        await userManagementPage.goBackToUsersList();

        await expect(userManagementPage.page).toHaveURL(
          ROUTES.USERS_LIST,
        );
      },
    );

    await test.step(
      'Verify the updated information is displayed',
      async () => {
        const row = await userManagementPage.narrowToUserRow(
          newUser.username,
        );

        await expect(row).toContainText(updatedProfile.firstName);
        await expect(row).toContainText(updatedProfile.lastName);
      },
    );

    await test.step(
      'Delete the user and verify removal',
      async () => {
        await userManagementPage.deleteUser(newUser.username);

        await userManagementPage.expectDeleteConfirmModal();
        await userManagementPage.confirmDeletion();

        await userManagementPage.expectUserDeletedModal();
        await userManagementPage.dismissModal();

        await userManagementPage.expectUserGone(newUser.username);
      },
    );
  });

  test('Successfully export users CSV with selected fields', async () => {
    const { token, users } = buildUniqueTestUserBatch(2);

    let selectedUsernames: string[] = [];

    await test.step('Create two users for export', async () => {
      for (const user of users) {
        await userManagementPage.createUser(user);

        await userManagementPage.expectUserCreatedModal();
        await userManagementPage.dismissModal();

        await userManagementPage.goToUsersListViaBreadcrumb();
      }
    });

    await test.step(
      'Select the users and open Export CSV',
      async () => {
        await userManagementPage.searchUser(token);

        selectedUsernames =
          await userManagementPage.selectUsersByUsername(
            users.map((user) => user.username),
          );

        expect(selectedUsernames).toHaveLength(2);

        await userManagementPage.openExportModal();

        await expect(userManagementPage.exportModal).toBeVisible();
      },
    );

    await test.step(
      'Select the required export fields',
      async () => {
        await userManagementPage.selectAccountInfoFields();
        await userManagementPage.selectContactInfoFields();
        await userManagementPage.selectEmergencyContactFields();
      },
    );

    await test.step(
      'Download the CSV and verify its contents',
      async () => {
        const download =
          await userManagementPage.exportAndGetDownload();

        expect(download.suggestedFilename()).toMatch(
          /^Users\b.*\.csv$/i,
        );

        const csv = (
          await fs.promises.readFile(
            await download.path(),
            'utf8',
          )
        ).replace(/^\uFEFF/, '');

        const rows = csv.trim().split(/\r?\n/);

        const header = rows[0]
          .split(',')
          .map((cell) =>
            cell.replace(/^"|"$/g, '').trim(),
          );

        expect(header).toEqual(
          expect.arrayContaining([
            'Username',
            'Email',
            'Role',
            'ID',
            'National ID',
            'Phone Number 1',
            'Address',
            'Emergency Contact Name',
            'Emergency Contact Phone',
          ]),
        );

        expect(rows).toHaveLength(3);

        for (const username of selectedUsernames) {
          expect(csv).toContain(username);
        }
      },
    );
  });

  test('Successfully bulk delete selected users', async () => {
    const { token, users } = buildUniqueTestUserBatch(2);

    let selectedUsernames: string[] = [];

    await test.step(
      'Create two users for bulk deletion',
      async () => {
        for (const user of users) {
          await userManagementPage.createUser(user);

          await userManagementPage.expectUserCreatedModal();
          await userManagementPage.dismissModal();

          await userManagementPage.goToUsersListViaBreadcrumb();
        }
      },
    );

    await test.step(
      'Select both users and start bulk deletion',
      async () => {
        await userManagementPage.searchUser(token);

        selectedUsernames =
          await userManagementPage.selectUsersByUsername(
            users.map((user) => user.username),
          );

        expect(selectedUsernames).toHaveLength(2);

        await userManagementPage.clickBulkDelete();
      },
    );

    await test.step(
      'Confirm bulk deletion',
      async () => {
        await userManagementPage.expectBulkDeleteConfirmModal();
        await userManagementPage.confirmBulkDeletion();
      },
    );

    await test.step(
      'Confirm successful deletion',
      async () => {
        await userManagementPage.expectBulkDeleteSuccessModal();
        await userManagementPage.dismissModal();
      },
    );

    await test.step(
      'Verify both users have been removed',
      async () => {
        await userManagementPage.expectUserGone(token);
      },
    );
  });

  test('Upload invalid file', async () => {
    await userManagementPage.goToUploadUsersPage();

    await test.step(
      'Upload an empty CSV file',
      async () => {
        await userManagementPage.uploadFile(
          path.join(
            __dirname,
            '../test-data/empty-user.csv',
          ),
        );

        await expect(
          userManagementPage.page.getByText(
            'CSV file is empty or invalid.',
          ),
        ).toBeVisible();
      },
    );

    await test.step(
      'Upload a CSV without the required username column',
      async () => {
        await userManagementPage.uploadFile(
          path.join(
            __dirname,
            '../test-data/missing-username.csv',
          ),
        );

        await expect(
          userManagementPage.page.getByText(
            'Missing required fields: username',
          ),
        ).toBeVisible();
      },
    );
  });

  test('Successfully upload users via valid CSV file', async () => {
    await userManagementPage.goToUploadUsersPage();

    await test.step(
      'Upload sample CSV and verify the preview',
      async () => {
        await userManagementPage.uploadCsvFile('sample.csv');
      },
    );

    await test.step(
      'Submit the CSV and select Create + Update mode',
      async () => {
        await userManagementPage.clickUploadUsers();

        await expect(
          userManagementPage.uploadModeDialog,
        ).toBeVisible();

        await userManagementPage.selectUploadMode('both');
      },
    );

    await test.step(
      'Wait for the CSV upload to complete',
      async () => {
        await userManagementPage.refreshUploadStatus();

        await userManagementPage.expectUploadComplete();
      },
    );

    await test.step(
      'Verify the upload result summary',
      async () => {
        const summary =
          await userManagementPage.getUploadResultSummary();

        expect(summary.total).toBeGreaterThan(0);
        expect(summary.passed).toBeGreaterThanOrEqual(1);
        expect(summary.failed).toBeGreaterThanOrEqual(0);

        expect(
          summary.passed + summary.failed,
        ).toBe(summary.total);
      },
    );

    await test.step(
      'Verify a user from the CSV exists in the Users List',
      async () => {
        await userManagementPage.goToUsersListViaBreadcrumb();

        const [sampleUsername] = SAMPLE_CSV_USERNAMES;

        await userManagementPage.narrowToUserRow(
          sampleUsername,
        );
      },
    );
  });
});
