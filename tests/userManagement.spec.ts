import { test, expect } from '@playwright/test';
import * as path from 'path';

import { DashboardPage } from '../pages/DashboardPage';
import { UserManagementPage } from '../pages/UserManagementPage';

import {
  testUser,
  invalidEmails,
  invalidPasswords,
  invalidUsername
} from '../test-data/userData';
import { VALIDATION_MESSAGES } from '../utils/constants';


test.describe('User Management Negative Tests',()=>{


let dashboardPage: DashboardPage;
let userManagementPage: UserManagementPage;



test.beforeEach(async({page})=>{

dashboardPage =
new DashboardPage(page);


userManagementPage =
new UserManagementPage(page);


await dashboardPage.goto();

await dashboardPage.openSidebar();

await userManagementPage.open();


});



test('should show required field validations',async()=>{


await userManagementPage.openCreateUser();


await userManagementPage.submit();


await expect(
userManagementPage.page.getByText(
VALIDATION_MESSAGES.FIRST_NAME_REQUIRED
)
).toBeVisible();


await expect(
userManagementPage.page.getByText(
VALIDATION_MESSAGES.LAST_NAME_REQUIRED
)
).toBeVisible();


await expect(
userManagementPage.page.getByText(
VALIDATION_MESSAGES.USERNAME_REQUIRED
)
).toBeVisible();


});




test('should validate username format',async()=>{


await userManagementPage.openCreateUser();


await userManagementPage.fillRequiredFields(
{
...testUser,
username: invalidUsername
}
);


await userManagementPage.passwordInput.fill(
testUser.password
);


await userManagementPage.submit();



await expect(
userManagementPage.page.getByText(
/Username must be/i
)
).toBeVisible();



});





test('should validate email format',async()=>{


await userManagementPage.openCreateUser();


for(const email of invalidEmails){


await test.step(
`Verify invalid email ${email}`,
async()=>{


await userManagementPage.fillRequiredFields(
{
...testUser,
email
}
);


await userManagementPage.passwordInput.fill(
testUser.password
);


await userManagementPage.submit();



await expect(
userManagementPage.page.getByText(
/Please enter a valid email/i
)
).toBeVisible();


});


}


});





test('should validate password format',async()=>{


await userManagementPage.openCreateUser();


for(const password of invalidPasswords){


await test.step(
`Verify invalid password ${password}`,
async()=>{


await userManagementPage.fillRequiredFields(
testUser
);


await userManagementPage.passwordInput.fill(
password
);


await userManagementPage.submit();



await expect(
userManagementPage.page.getByText(
/Password must contain/i
)
).toBeVisible();



});


}


});





test('should validate search filter',async()=>{


await userManagementPage.searchBox.fill(
'nouserfound'
);


await expect(
userManagementPage.noRecordsMessage
).toBeVisible();



await userManagementPage.clearSearchButton.click();


await expect(
userManagementPage.searchBox
).toHaveValue('');



await userManagementPage.searchBox.fill(
'$%^&*(('
);



await expect(
userManagementPage.noRecordsMessage
).toBeVisible();



});





test('Upload invalid file',async()=>{


await userManagementPage.uploadButton.click();



await userManagementPage.page.goto(
'/local/useraccountmanager/upload-users',
{
waitUntil:'domcontentloaded'
}
);



await userManagementPage.uploadFile(
path.join(
__dirname,
'../test-data/empty-user.csv'
)
);



await expect(
userManagementPage.page.getByText(
'CSV file is empty or invalid.'
)
).toBeVisible();




await userManagementPage.uploadFile(
path.join(
__dirname,
'../test-data/missing-username.csv'
)
);



await expect(
userManagementPage.page.getByText(
'Missing required fields: username'
)
).toBeVisible();



});


});