import { expect } from '@playwright/test';
import { LOC } from './locators';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly path = '/';

  async login(email: string, password: string) {
    await this.fill(LOC.login.email, email);
    await this.fill(LOC.login.password, password);
    await this.click(LOC.login.submit);
  }

  async autofillDemoCredentials() {
    await this.click(LOC.login.autofill);
  }

  async goToRegister() {
    await this.click(LOC.login.registerLink);
  }

  async expectEmailValue(value: string) {
    await expect(await this.el(LOC.login.email)).toHaveValue(value);
  }

  async expectPasswordFilled() {
    await expect(await this.el(LOC.login.password)).not.toHaveValue('');
  }

  /** Still on the sign-in screen (login form visible). */
  async expectLoginFormVisible() {
    await expect(await this.el(LOC.login.submit)).toBeVisible();
  }

  async expectErrorVisible() {
    await expect(await this.el(LOC.login.error)).toBeVisible();
  }
}
