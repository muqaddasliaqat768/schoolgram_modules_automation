import * as path from 'path';
import { expect, Locator, Page, Response } from '@playwright/test';

import { MENU, ROUTES } from '../utils/constants';
import { User } from '../types/user';

/**
 * Retry settings for actions that depend on the application finishing
 * an asynchronous operation.
 *
 * These are condition-based waits, not fixed delays. Playwright keeps
 * checking the expected condition until it passes or the timeout is reached.
 */
const POLL = {
  // Used when waiting for the users list to finish updating.
  LIST_SETTLE: { timeout: 15_000, intervals: [200] },

  // Used when searching for a specific user.
  // Searching may require multiple API requests, so retries are spaced out.
  NARROW_ROW: {
    timeout: 45_000,
    intervals: [1_000, 2_000, 3_000, 5_000],
  },

  // Maximum time allowed for each individual user-row search attempt.
  NARROW_ROW_ATTEMPT_MS: 5_000,

  // Used after deleting a user while the application updates the users list.
  USER_GONE: {
    timeout: 30_000,
    intervals: [1_000, 2_000, 3_000],
  },

  // CSV uploads are processed in the background, so they may take longer
  // than normal UI actions.
  UPLOAD_JOB: {
    timeout: 180_000,
    intervals: [3_000],
  },
};

/**
 * Page object for the User Management area.
 *
 * This page object represents the actions an administrator can perform
 * from User Management, including:
 *
 * - Create a user
 * - Search for a user
 * - Edit a user
 * - Delete a user
 * - Enrol a user in a course
 * - Export users to CSV
 * - Bulk delete users
 * - Upload users through CSV
 *
 * Locators use accessible roles, labels and text wherever possible.
 * CSS selectors are used only where the application does not provide
 * a reliable accessible locator.
 */
export class UserManagementPage {
  readonly page: Page;

  readonly userManagementLink: Locator;
  readonly createUserButton: Locator;
  readonly submitButton: Locator;

  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly usernameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;

  readonly searchBox: Locator;
  readonly clearSearchButton: Locator;
  readonly noRecordsMessage: Locator;

  readonly uploadButton: Locator;
  readonly fileInput: Locator;

  readonly courseCategorySelect: Locator;
  readonly availableCoursesList: Locator;
  readonly enrolledCoursesList: Locator;
  readonly enrollButton: Locator;

  readonly usersListBreadcrumbLink: Locator;

  readonly editProfileButton: Locator;
  readonly updateProfileButton: Locator;
  readonly goBackButton: Locator;

  readonly profileFirstNameInput: Locator;
  readonly profileLastNameInput: Locator;
  readonly profileEmailInput: Locator;

  readonly successModal: Locator;
  readonly modalOkButton: Locator;

  readonly exportCsvButton: Locator;
  readonly exportModal: Locator;
  readonly exportModalExportButton: Locator;

  readonly bulkDeleteButton: Locator;

  readonly chooseFileButton: Locator;
  readonly uploadUsersSubmitButton: Locator;
  readonly uploadModeDialog: Locator;
  readonly uploadRefreshButton: Locator;
  readonly uploadCompleteBanner: Locator;
  readonly uploadPreviewFooter: Locator;

  // The application displays this overlay while moving between pages.
  // It can temporarily prevent the user from clicking page elements.
  readonly customLoader: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main User Management navigation option.
    this.userManagementLink = page.getByRole('link', {
      name: MENU.USER_MANAGEMENT,
    });

    // Button used by an administrator to start creating a new user.
    this.createUserButton = page.getByRole('button', {
      name: /Create New User/i,
    });

    // Button used to submit the Create User form.
    this.submitButton = page.getByRole('button', {
      name: 'Submit',
    });

    // Create User form fields.
    this.firstNameInput = page.getByRole('textbox', {
      name: 'First Name',
    });

    this.lastNameInput = page.getByRole('textbox', {
      name: 'Last Name',
    });

    this.usernameInput = page.getByRole('textbox', {
      name: 'Username',
    });

    this.emailInput = page.getByRole('textbox', {
      name: 'Email',
    });

    this.passwordInput = page.getByRole('textbox', {
      name: 'Password',
    });

    // User search controls.
    this.searchBox = page.getByRole('textbox', {
      name: 'Search users',
    });

    this.clearSearchButton = page.getByRole('button', {
      name: 'clear',
    });

    this.noRecordsMessage = page.getByText(
      'User records not found!'
    );

    // CSV upload entry point and hidden file input.
    this.uploadButton = page.getByRole('button', {
      name: 'Upload Users (csv)',
    });

    this.fileInput = page.locator(
      'input[type="file"]'
    );

    /**
     * Course category selector.
     *
     * The page contains multiple dropdown components, so the selector
     * is scoped to the one associated with "Course Category".
     */
    this.courseCategorySelect = page
      .locator('.react-select-container')
      .filter({
        hasText: 'Course Category',
      });

    // The first course list represents courses available for enrolment.
    this.availableCoursesList = page
      .locator('.course-list-container')
      .first();

    // The second course list represents courses already enrolled.
    this.enrolledCoursesList = page
      .locator('.course-list-container')
      .last();

    // Button used to enrol or assign the selected course.
    this.enrollButton = page.getByRole('button', {
      name: /(Enroll|Assign) \(\d+\)/,
    });

    // Breadcrumb link used to return to the Users List.
    this.usersListBreadcrumbLink = page.getByRole('link', {
      name: 'Users List',
    });

    // User profile actions.
    this.editProfileButton = page.getByRole('button', {
      name: 'Edit Profile',
    });

    // Exact match prevents this locator from matching other "Update" controls.
    this.updateProfileButton = page.getByRole('button', {
      name: 'Update',
      exact: true,
    });

    this.goBackButton = page.getByRole('button', {
      name: 'Go Back',
    });

    /**
     * Profile fields use placeholders instead of accessible labels.
     * Exact matching prevents similar placeholders from being selected.
     */
    this.profileFirstNameInput = page.getByPlaceholder(
      'e.g., John',
      { exact: true }
    );

    this.profileLastNameInput = page.getByPlaceholder(
      'e.g., Doe',
      { exact: true }
    );

    this.profileEmailInput = page.getByPlaceholder(
      'e.g., john.doe@mail.com',
      { exact: true }
    );

    // Success and confirmation messages displayed after user actions.
    this.successModal = page.locator('.swal2-popup');

    this.modalOkButton = page.locator('.swal2-confirm');

    // Application-wide loading overlay.
    this.customLoader = page.locator(
      '#custom-loader-wrapper'
    );

    // CSV export controls.
    this.exportCsvButton = page.getByRole('button', {
      name: 'Export CSV',
    });

    // Scope the dialog to "Export Users" so another dialog cannot be selected.
    this.exportModal = page
      .getByRole('dialog')
      .filter({
        hasText: 'Export Users',
      });

    this.exportModalExportButton = this.exportModal.getByRole(
      'button',
      {
        name: 'Export',
        exact: true,
      }
    );

    // Bulk delete action for selected users.
    this.bulkDeleteButton = page.getByRole('button', {
      name: 'Bulk Delete Users',
    });

    // CSV upload controls.
    this.chooseFileButton = page.getByRole('button', {
      name: 'Choose File',
    });

    this.uploadUsersSubmitButton = page.getByRole('button', {
      name: 'Upload Users',
      exact: true,
    });

    // Dialog asking which type of users should be processed.
    this.uploadModeDialog = page
      .locator('.swal2-popup')
      .filter({
        hasText: 'Please select upload type',
      });

    // Refresh button is shown while the background upload is processing.
    this.uploadRefreshButton = page.getByRole('button', {
      name: 'Refresh',
    });

    // Message shown when the CSV upload has finished.
    this.uploadCompleteBanner = page.getByText(
      /upload complete/i
    );

    // Shows how many users were successfully loaded from the CSV file.
    this.uploadPreviewFooter = page.getByText(
      /\d+ users loaded/i
    );
  }

  /**
   * Wait until the application's loading overlay disappears.
   *
   * This prevents actions such as clicking a button while the page
   * is still transitioning between screens.
   */
  async waitForLoaderGone() {
    await expect(this.customLoader).toBeHidden({
      timeout: 15000,
    });
  }

  /**
   * Returns the SweetAlert popup containing the requested message.
   *
   * Filtering by message is important because the application may briefly
   * keep an old popup visible while displaying a new one.
   */
  swalPopup(text: string | RegExp): Locator {
    return this.page
      .locator('.swal2-popup')
      .filter({
        hasText: text,
      });
  }

  /**
   * Opens User Management from the Dashboard.
   *
   * The method waits for the navigation overlay to disappear before
   * continuing so the next user action can be performed safely.
   */
  async open() {
    await expect(
      this.userManagementLink
    ).toBeVisible();

    await this.userManagementLink.click();

    await this.waitForLoaderGone();
  }

  /**
   * Opens the Create User form.
   */
  async openCreateUser() {
    await this.waitForLoaderGone();

    await this.createUserButton.click();
  }

  /**
   * Enters the required information for a new user.
   */
  async fillRequiredFields(user: User) {
    await this.firstNameInput.fill(user.firstName);
    await this.lastNameInput.fill(user.lastName);
    await this.usernameInput.fill(user.username);
    await this.emailInput.fill(user.email);
  }

  /**
   * Submits the current form.
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Selects a file using the application's file upload input.
   */
  async uploadFile(filePath: string) {
    await this.fileInput.setInputFiles(filePath);
  }

  /**
   * Creates a new user using the required user information.
   */
  async createUser(user: User) {
    await this.openCreateUser();

    await this.fillRequiredFields(user);

    await this.passwordInput.fill(user.password);

    await this.submit();
  }

  /**
   * Verifies that the application confirms successful user creation.
   */
  async expectUserCreatedModal() {
    await expect(this.successModal).toBeVisible();

    // The application currently allows both spellings of "successfully".
    await expect(this.successModal).toContainText(
      /User created succes?sfully!?/i
    );
  }

  /**
   * Closes the success/confirmation popup.
   */
  async dismissModal() {
    await this.waitForLoaderGone();

    await this.modalOkButton.click();

    // Confirm that the popup has actually been removed before continuing.
    await expect(this.successModal).toHaveCount(0, {
      timeout: 15000,
    });
  }

  /**
   * Selects the first available course category.
   *
   * Selecting a category loads the courses available for enrolment.
   */
  async selectFirstCourseCategory() {
    await this.waitForLoaderGone();

    // Wait for the course category selector to become available.
    await expect(this.courseCategorySelect).toBeVisible({
      timeout: 30000,
    });

    await this.courseCategorySelect.click();

    const firstOption = this.page
      .getByRole('option')
      .first();

    await expect(firstOption).toBeVisible();

    await firstOption.click();

    // Wait for the courses belonging to the selected category to load.
    await this.waitForLoaderGone();
  }

  /**
   * Selects the first available course and enrols the user.
   *
   * Returns the course name so the test can verify the same course
   * appears in the Enrolled Courses list.
   */
  async enrollInFirstAvailableCourse() {
    const firstCourse = this.availableCoursesList
      .locator('p')
      .first();

    // Courses are loaded after selecting a category.
    await expect(firstCourse).toBeVisible({
      timeout: 30000,
    });

    const courseLabel =
      (await firstCourse.textContent())?.trim() ?? '';

    await firstCourse.click();

    await this.enrollButton.click();

    // The selected course should move from Available Courses
    // to Enrolled Courses.
    await expect(
      this.enrolledCoursesList.getByText(courseLabel)
    ).toBeVisible();

    await expect(
      this.availableCoursesList.getByText(courseLabel)
    ).toBeHidden();

    return courseLabel;
  }

  /**
   * Returns to the Users List using the breadcrumb navigation.
   */
  async goToUsersListViaBreadcrumb() {
    await this.waitForLoaderGone();

    await this.usersListBreadcrumbLink.click();

    await this.waitForLoaderGone();
  }

  /**
   * Opens the CSV Upload Users page from the Users List.
   */
  async goToUploadUsersPage() {
    await this.waitForLoaderGone();

    await this.uploadButton.click();

    await this.page.waitForURL(
      ROUTES.UPLOAD_USERS
    );

    await this.waitForLoaderGone();
  }

  /**
   * Returns the row containing the specified user.
   *
   * The identifier can be a username, email or another unique value
   * visible within the user's row.
   */
  userRow(identifier: string): Locator {
    return this.page
      .getByRole('row')
      .filter({
        hasText: identifier,
      });
  }

  /**
   * Returns all user rows currently displayed in the Users List.
   *
   * Using tbody ensures the table header is not included.
   */
  get dataRows(): Locator {
    return this.page
      .locator('tbody')
      .getByRole('row');
  }

  /**
   * Checks whether a response belongs to the requested user search.
   *
   * This prevents the test from treating an unrelated users-list request
   * as the response for the search being performed.
   */
  private isFilteredGetUsers(
    res: Response,
    term: string
  ): boolean {
    if (
      !res.url().includes('action=get_users') ||
      !res.ok()
    ) {
      return false;
    }

    const value =
      new URL(res.url()).searchParams.get('search') ?? '';

    return value.split('@')[0] === term;
  }

  /**
   * Waits until the number of users in the list remains stable.
   *
   * This is useful after searching, deleting or updating users because
   * the application may need some time to refresh the displayed list.
   */
  async waitForListSettled() {
    const rows = this.dataRows;

    let previous = -1;
    let stable = 0;

    await expect
      .poll(
        async () => {
          const current = await rows.count();

          if (current === previous) {
            stable += 1;
          } else {
            stable = 0;
            previous = current;
          }

          return stable;
        },
        POLL.LIST_SETTLE
      )
      .toBeGreaterThanOrEqual(3)
      .catch(() => undefined);
  }

  /**
   * Searches for a user and ensures a fresh search request is triggered.
   *
   * The application uses a debounced search field, so the search is
   * deliberately changed when necessary to make sure a new request occurs.
   */
  async fireUserSearch(identifier: string) {
    const term = identifier.split('@')[0];

    // Clear an existing search first so entering the same value again
    // triggers a fresh search request.
    if ((await this.searchBox.inputValue()) !== '') {
      const cleared = this.page
        .waitForResponse(
          res => this.isFilteredGetUsers(res, ''),
          { timeout: 15000 }
        )
        .catch(() => undefined);

      await this.searchBox.fill('');

      await cleared;

      await this.waitForListSettled();
    }

    // Start listening before entering the search term so a fast response
    // cannot be missed.
    const filtered = this.page
      .waitForResponse(
        res => this.isFilteredGetUsers(res, term),
        { timeout: 15000 }
      )
      .catch(() => undefined);

    await this.searchBox.fill(identifier);

    await filtered;

    await this.waitForListSettled();

    await this.waitForLoaderGone();
  }

  /**
   * Narrows the Users List until exactly one matching user is displayed.
   *
   * This protects later actions such as Edit and Delete from operating
   * on the wrong user.
   */
  async narrowToUserRow(
    identifier: string
  ): Promise<Locator> {
    const row = this.userRow(identifier);

    await expect(async () => {
      await this.fireUserSearch(identifier);

      await expect(row).toHaveCount(1, {
        timeout: POLL.NARROW_ROW_ATTEMPT_MS,
      });
    }).toPass(POLL.NARROW_ROW);

    return row;
  }

  /**
   * Searches for a user using the Users List search field.
   */
  async searchUser(identifier: string) {
    await this.searchBox.fill(identifier);

    // Wait for the API response related to this specific search.
    const marker =
      `search=${identifier.split('@')[0]}`;

    await this.page
      .waitForResponse(
        res =>
          res.url().includes('action=get_users') &&
          res.url().includes(marker) &&
          res.ok(),
        { timeout: 15000 }
      )
      .catch(() => undefined);

    await this.waitForLoaderGone();
  }

  /**
   * Opens a user's profile and switches it to Edit Profile mode.
   */
  async editUser(identifier: string) {
    const row =
      await this.narrowToUserRow(identifier);

    // Open the user's profile using the username/name link.
    await row
      .getByRole('link')
      .first()
      .click();

    await this.page.waitForURL(
      ROUTES.USER_PROFILE
    );

    // Verify that the correct user's profile was opened.
    await expect(
      this.page.getByText(identifier).first()
    ).toBeVisible();

    await this.editProfileButton.click();

    // Edit fields should now be available.
    await expect(
      this.profileFirstNameInput
    ).toBeVisible();
  }

  /**
   * Updates the selected user's profile information.
   */
  async updateProfile(
    fields: Pick<
      User,
      'firstName' | 'lastName' | 'email'
    >
  ) {
    await this.profileFirstNameInput.fill(
      fields.firstName
    );

    await this.profileLastNameInput.fill(
      fields.lastName
    );

    await this.profileEmailInput.fill(
      fields.email
    );

    await this.updateProfileButton.click();
  }

  /**
   * Verifies that the application confirms the profile update.
   */
  async expectProfileUpdatedModal() {
    await expect(this.successModal).toBeVisible();

    // Allow the application's current spelling of "successfully".
    await expect(this.successModal).toContainText(
      /User updated succes?sfully!?/i
    );
  }

  /**
   * Returns to the previous page using the application's Go Back button.
   */
  async goBackToUsersList() {
    await this.goBackButton.click();
  }

  /**
   * Opens the delete confirmation for the specified user.
   */
  async deleteUser(identifier: string) {
    await this.waitForLoaderGone();

    const row = this.userRow(identifier);

    // If the requested user is not already the only matching row,
    // search for the user before performing the delete action.
    if ((await row.count()) !== 1) {
      await this.narrowToUserRow(identifier);
    }

    /**
     * The application's delete control does not currently have an
     * accessible role/name, so the action icon is selected by its
     * position within the user row.
     *
     * If a data-testid is added to the application in the future,
     * this locator should be replaced with getByTestId().
     */
    await row
      .locator('[class*="actionBtn"]')
      .nth(1)
      .click();
  }

  /**
   * Verifies that the delete confirmation message is displayed.
   */
  async expectDeleteConfirmModal() {
    await expect(
      this.swalPopup('Are you sure?')
    ).toBeVisible();
  }

  /**
   * Confirms deletion of the selected user.
   */
  async confirmDeletion() {
    const confirmPopup =
      this.swalPopup('Are you sure?');

    // Scope the button to the confirmation popup so another popup
    // cannot be selected during the transition.
    await confirmPopup
      .locator('.swal2-confirm')
      .click();

    // Wait until the confirmation popup is completely closed.
    await expect(confirmPopup).toHaveCount(0, {
      timeout: 15000,
    });
  }

  /**
   * Verifies that the user deletion was successful.
   */
  async expectUserDeletedModal() {
    await expect(
      this.swalPopup(
        /User deleted succes?sfully!?/i
      )
    ).toBeVisible({
      timeout: 15000,
    });
  }

  /**
   * Opens the Export Users dialog.
   */
  async openExportModal() {
    await this.waitForLoaderGone();

    await this.exportCsvButton.click();

    await expect(
      this.exportModal
    ).toBeVisible();
  }

  /**
   * Selects additional fields for the CSV export.
   */
  async selectExportFields(
    fieldKeys: string[]
  ) {
    for (const key of fieldKeys) {
      await this.exportModal
        .locator(`#export-field-${key}`)
        .check();
    }
  }

  /**
   * Selects account-related fields for export.
   */
  async selectAccountInfoFields() {
    await this.selectExportFields([
      'id',
      'idnumber',
    ]);
  }

  /**
   * Selects contact-related fields for export.
   */
  async selectContactInfoFields() {
    await this.selectExportFields([
      'phone1',
      'address',
    ]);
  }

  /**
   * Selects emergency contact fields for export.
   */
  async selectEmergencyContactFields() {
    await this.selectExportFields([
      'emergency_name',
      'emergency_phone',
    ]);
  }

  /**
   * Starts the CSV export and returns the generated download.
   */
  async exportAndGetDownload() {
    const downloadPromise =
      this.page.waitForEvent('download', {
        timeout: 30000,
      });

    await this.exportModalExportButton.click();

    return downloadPromise;
  }

  /**
   * Selects specific users for bulk deletion.
   *
   * Users are selected by username rather than row position so the test
   * always acts on the intended users.
   */
  async selectUsersByUsername(
    usernames: readonly string[]
  ) {
    await this.waitForLoaderGone();

    // Make sure all expected users are visible before selecting them.
    await expect(this.dataRows).toHaveCount(
      usernames.length,
      { timeout: 15000 }
    );

    for (const username of usernames) {
      const row = this.userRow(username);

      await expect(row).toHaveCount(1, {
        timeout: 15000,
      });

      await row
        .getByRole('checkbox')
        .check();
    }

    return [...usernames];
  }

  /**
   * Opens the bulk delete confirmation.
   */
  async clickBulkDelete() {
    await this.waitForLoaderGone();

    await this.bulkDeleteButton.click();
  }

  /**
   * Verifies the bulk delete confirmation message.
   */
  async expectBulkDeleteConfirmModal() {
    await expect(
      this.swalPopup(
        'Are you sure you want to delete the selected users?'
      )
    ).toBeVisible();
  }

  /**
   * Confirms deletion of all selected users.
   */
  async confirmBulkDeletion() {
    const confirmPopup =
      this.swalPopup(
        'Are you sure you want to delete the selected users?'
      );

    await confirmPopup
      .locator('.swal2-confirm')
      .click();

    await expect(confirmPopup).toHaveCount(0, {
      timeout: 15000,
    });
  }

  /**
   * Verifies that the bulk deletion completed successfully.
   */
  async expectBulkDeleteSuccessModal() {
    await expect(
      this.swalPopup(/Users deleted/i)
    ).toBeVisible({
      timeout: 15000,
    });
  }

  /**
   * Verifies that the specified user is no longer available
   * in the Users List.
   *
   * Deletion is processed asynchronously, so the test keeps checking
   * until the user disappears from the search results.
   */
  async expectUserGone(identifier: string) {
    await expect
      .poll(
        async () => {
          await this.fireUserSearch(identifier);

          return this.noRecordsMessage.isVisible();
        },
        {
          message:
            `user "${identifier}" still appears in the list after delete`,
          ...POLL.USER_GONE,
        }
      )
      .toBe(true);
  }

  /**
   * Uploads a CSV file and waits until the application has successfully
   * read and displayed the users from the file.
   */
  async uploadCsvFile(fileName: string) {
    await this.chooseFileButton.waitFor();

    await this.fileInput.setInputFiles(
      path.join(
        __dirname,
        '../test-data',
        fileName
      )
    );

    // "N users loaded" confirms that the CSV was parsed successfully.
    await expect(
      this.uploadPreviewFooter
    ).toBeVisible({
      timeout: 15000,
    });
  }

  /**
   * Starts processing the uploaded CSV file.
   */
  async clickUploadUsers() {
    await this.waitForLoaderGone();

    await this.uploadUsersSubmitButton
      .first()
      .click();
  }

  /**
   * Selects how the uploaded CSV should be processed.
   *
   * - create: Create new users only
   * - update: Update existing users only
   * - both: Create new and update existing users
   */
  async selectUploadMode(
    mode: 'create' | 'update' | 'both'
  ) {
    const labels = {
      create: 'Create new users only',
      update: 'Update existing users only',
      both: 'Create new and updated existing users',
    };

    await expect(
      this.uploadModeDialog
    ).toBeVisible();

    await this.uploadModeDialog
      .getByRole('button', {
        name: labels[mode],
        exact: true,
      })
      .click();
  }

  /**
   * Waits for the background CSV upload to finish.
   *
   * The application processes the upload in the background and provides
   * a Refresh button while the job is running. The method keeps refreshing
   * until the "Upload complete" message is displayed.
   */
  async refreshUploadStatus() {
    await expect
      .poll(
        async () => {
          // Refresh the status while the upload is still running.
          if (
            await this.uploadRefreshButton.isVisible()
          ) {
            await this.uploadRefreshButton
              .click({ timeout: 10000 })
              .catch(() => undefined);
          }

          return this.uploadCompleteBanner.isVisible();
        },
        {
          message:
            'bulk upload job never reached the completion banner',
          ...POLL.UPLOAD_JOB,
        }
      )
      .toBe(true);

    // The application may show a completion popup after processing.
    // Close it so the completion banner remains available for validation.
    if (
      await this.successModal
        .isVisible()
        .catch(() => false)
    ) {
      await this.modalOkButton
        .first()
        .click()
        .catch(() => undefined);

      await expect(
        this.successModal
      )
        .toHaveCount(0, {
          timeout: 10000,
        })
        .catch(() => undefined);
    }
  }

  /**
   * Verifies that the CSV upload completed successfully.
   */
  async expectUploadComplete() {
    await expect(
      this.uploadCompleteBanner
    ).toBeVisible({
      timeout: 10000,
    });
  }

  /**
   * Reads the CSV upload result summary.
   *
   * Returns:
   * - total: Total number of records processed
   * - created: Number of new users created
   * - updated: Number of existing users updated
   * - failed: Number of records that failed
   * - passed: Created + updated users
   */
  async getUploadResultSummary() {
    // Limit the search to the upload completion section so similarly
    // formatted numbers elsewhere on the page are not selected.
    const banner = this.page
      .locator('div')
      .filter({
        hasText: /upload complete/i,
      })
      .filter({
        hasText:
          /\d+\s*\/\s*\d+\s*(created|updated)/i,
      })
      .last();

    /**
     * Reads a single result category such as:
     * "5 / 5 created"
     * "3 / 3 updated"
     * "0 / 2 failed"
     */
    const readChip = async (
      label: 'created' | 'updated' | 'failed'
    ) => {
      const chip = banner
        .locator('span')
        .filter({
          hasText: new RegExp(
            `\\/\\s*\\d+\\s*${label}`,
            'i'
          ),
        })
        .first();

      // Some result categories are not displayed when their count is zero.
      if (!(await chip.count())) {
        return null;
      }

      const text = (
        await chip.innerText()
      )
        .replace(/\s+/g, ' ')
        .trim();

      const match = text.match(
        new RegExp(
          `(\\d+)\\s*\\/\\s*(\\d+)\\s*${label}`,
          'i'
        )
      );

      return match
        ? {
            count: Number(match[1]),
            total: Number(match[2]),
          }
        : null;
    };

    const created =
      await readChip('created');

    const updated =
      await readChip('updated');

    const failed =
      await readChip('failed');

    const createdCount =
      created?.count ?? 0;

    const updatedCount =
      updated?.count ?? 0;

    const failedCount =
      failed?.count ?? 0;

    return {
      total:
        created?.total ??
        updated?.total ??
        failed?.total ??
        0,

      created: createdCount,

      updated: updatedCount,

      failed: failedCount,

      // Users successfully processed = created + updated.
      passed:
        createdCount + updatedCount,
    };
  }
}