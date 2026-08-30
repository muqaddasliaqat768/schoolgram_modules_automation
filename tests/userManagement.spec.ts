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

/**
 * User Management end-to-end tests.
 *
 * These tests cover the main user-management journeys an administrator can
 * perform:
 *
 * - Create a user
 * - Validate incorrect user information
 * - Enroll a user in a course
 * - Search for a user
 * - Edit user information
 * - Delete a user
 * - Export users to CSV
 * - Bulk delete users
 * - Upload users through CSV
 *
 * Each test is independent and can be executed on its own.
 * Positive tests create their own test data to avoid conflicts with other tests.
 */
test.describe('User Management', () => {
  let dashboardPage: DashboardPage;
  let userManagementPage: UserManagementPage;

  /**
   * Before every test:
   *
   * 1. Open the Dashboard.
   * 2. Expand the navigation sidebar.
   * 3. Open User Management.
   *
   * Starting every test from the same place ensures that tests do not depend
   * on the result or browser state of a previous test.
   */
  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    userManagementPage = new UserManagementPage(page);

    await dashboardPage.goto();
    await dashboardPage.openSidebar();
    await userManagementPage.open();
  });

  // ============================================================
  // NEGATIVE TESTS
  // ============================================================

  test.describe('User Management Validation', () => {
    /**
     * Verify that the system prevents an administrator from submitting
     * the Create User form when required information is missing.
     */
    test('should show required field validations', async () => {
      await test.step('Open Create User form', async () => {
        await userManagementPage.openCreateUser();
      });

      await test.step('Submit the empty form', async () => {
        // No information is entered because the purpose of this test
        // is to verify validation for required fields.
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

    /**
     * Verify that the system rejects a username that does not follow
     * the application's username format rules.
     */
    test('should validate username format', async () => {
      await test.step('Open Create User form', async () => {
        await userManagementPage.openCreateUser();
      });

      await test.step('Enter an invalid username', async () => {
        // All other fields contain valid information so the username
        // is the only reason the form should be rejected.
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

    /**
     * Verify that invalid email formats are rejected by the Create User form.
     *
     * Multiple invalid formats are checked to make sure validation is not
     * limited to only one specific invalid email pattern.
     */
    test('should validate email format', async () => {
      await userManagementPage.openCreateUser();

      for (const email of invalidEmails) {
        await test.step(
          `Verify invalid email: ${email}`,
          async () => {
            // Only the email value is changed. All other information remains
            // valid so the test specifically verifies email validation.
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

    /**
     * Verify that passwords which do not satisfy the application's
     * password requirements are rejected.
     */
    test('should validate password format', async () => {
      await userManagementPage.openCreateUser();

      for (const password of invalidPasswords) {
        await test.step(
          `Verify invalid password: ${password}`,
          async () => {
            // The remaining user information is valid. This ensures the
            // password is the only invalid value in the form.
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

  // ============================================================
  // CREATE USER
  // ============================================================

  /**
   * Verify the complete user-creation journey:
   *
   * Create User → Success → Assign Course → Enroll User →
   * Return to Users List → Verify User Exists
   */
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
        // Select a course category first so available courses are displayed.
        await userManagementPage.selectFirstCourseCategory();

        // Select the first available course and confirm enrollment.
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
        // Verifying the actual user record confirms that creation was
        // successfully completed and persisted in the system.
        await userManagementPage.narrowToUserRow(newUser.username);
      },
    );
  });

  // ============================================================
  // EDIT + DELETE USER
  // ============================================================

  /**
   * Verify that an administrator can:
   *
   * Search User → Open Profile → Edit Details → Save Changes →
   * Return to Users List → Verify Changes → Delete User
   */
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
        // Search by username because it remains unchanged after the edit.
        // Then verify that the updated first and last names are displayed.
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

        // Final verification confirms the user was actually removed
        // rather than only checking that a success message appeared.
        await userManagementPage.expectUserGone(newUser.username);
      },
    );
  });

  // ============================================================
  // CSV EXPORT
  // ============================================================

  /**
   * Verify that an administrator can select multiple users and export
   * the selected user information as a CSV file.
   */
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
        // Search using the shared token so both test users appear together.
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
        // Verify that fields from different information groups can be
        // selected for the exported CSV.
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

        // Confirm that the application generated a CSV file.
        expect(download.suggestedFilename()).toMatch(
          /^Users\..*\.csv$/i,
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

        // Verify that the selected information fields are included
        // in the exported file.
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

        // Header + exactly two selected users.
        expect(rows).toHaveLength(3);

        // Verify that both users selected by the administrator
        // are present in the exported CSV.
        for (const username of selectedUsernames) {
          expect(csv).toContain(username);
        }
      },
    );
  });

  // ============================================================
  // BULK DELETE
  // ============================================================

  /**
   * Verify that an administrator can select multiple users and delete
   * them together using the Bulk Delete Users option.
   */
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
        // Search using the shared token and confirm that no matching
        // users remain in the system.
        await userManagementPage.expectUserGone(token);
      },
    );
  });

  // ============================================================
  // INVALID CSV UPLOAD
  // ============================================================

  /**
   * Verify that the system rejects CSV files that cannot be processed:
   *
   * - Empty CSV file
   * - CSV without the required username column
   */
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

  // ============================================================
  // VALID CSV UPLOAD
  // ============================================================

  /**
   * Verify the complete CSV user-upload journey:
   *
   * Upload CSV → Preview Records → Select Upload Mode →
   * Wait for Processing → Verify Result Summary → Verify User
   */
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
        // The upload is processed in the background, so wait until
        // the application reports that processing has completed.
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

        // Every processed record must be either successfully processed
        // or reported as failed.
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

        // Confirm that the uploaded user can actually be found after
        // the background upload has completed.
        await userManagementPage.narrowToUserRow(
          sampleUsername,
        );
      },
    );
  });
});