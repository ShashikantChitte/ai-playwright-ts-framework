import type { LocatorSpec } from '../core/locatorTypes';

/**
 * Central locator registry. ONE place to fix when the UI changes.
 *
 * Each element lists strategies in priority order; strategies[0] is primary, the rest heal it.
 * Convention: semantic (role/label) first, then data-testid, then CSS as a last resort.
 *
 * Sections marked VERIFIED were checked against a live accessibility snapshot; UNVERIFIED ones are guesses.
 * Tip: the shop has an "Inspect locators" button that reveals the real data-testid values.
 */
export const LOC = {
  login: {
    email: {
      key: 'login.email',
      description: 'Login email input',
      strategies: [
        { by: 'label', value: /e-?mail/i },
        { by: 'testid', value: 'login-email' },
        { by: 'placeholder', value: /e-?mail/i },
        { by: 'css', value: 'input[type="email"], input[name="email"], input#email' },
      ],
    },
    password: {
      key: 'login.password',
      description: 'Login password input',
      strategies: [
        { by: 'label', value: /^password/i },
        { by: 'testid', value: 'login-password' },
        { by: 'placeholder', value: /password/i },
        { by: 'css', value: 'input[type="password"]' },
      ],
    },
    submit: {
      key: 'login.submit',
      description: 'Login submit button',
      strategies: [
        { by: 'role', role: 'button', name: /^login$/i },
        { by: 'testid', value: 'login-submit' },
        { by: 'css', value: 'form button[type="submit"], form input[type="submit"]' },
      ],
    },
    autofill: {
      key: 'login.autofill',
      description: 'Autofill demo credentials button',
      strategies: [
        { by: 'role', role: 'button', name: /autofill demo/i },
        { by: 'text', value: /autofill demo credentials/i },
      ],
    },
    registerLink: {
      key: 'login.registerLink',
      description: 'Register here link',
      strategies: [
        { by: 'role', role: 'link', name: /register here/i },
        { by: 'css', value: 'a[href*="register.php"]' },
      ],
    },
    error: {
      key: 'login.error',
      description: 'Login error message',
      strategies: [
        { by: 'role', role: 'alert' },
        { by: 'testid', value: 'login-error' },
        { by: 'css', value: '.alert, .error, .error-message, [class*="invalid"], [data-testid*="error"]' },
      ],
    },
  },

  // VERIFIED against the live accessibility snapshot of /shop.php (logged in).
  header: {
    cartLink: {
      key: 'header.cart',
      description: 'Header cart link (contains item count)',
      strategies: [
        { by: 'role', role: 'link', name: 'Cart', exact: true },
        { by: 'css', value: 'a[href*="cart.php"]' },
      ],
    },
    search: {
      key: 'header.search',
      description: 'Header search box',
      strategies: [
        { by: 'role', role: 'searchbox', name: 'Search' },
        { by: 'css', value: 'input[type="search"]' },
      ],
    },
    logout: {
      key: 'header.logout',
      description: 'Logout button',
      strategies: [
        { by: 'role', role: 'button', name: 'Logout' },
        { by: 'css', value: 'button:has(.fa-sign-out-alt), button:has(.fa-right-from-bracket)' },
      ],
    },
  },

  // VERIFIED: /shop.php is a CATEGORY LANDING page (4 cards), not a product list.
  shop: {
    categoryLinks: {
      key: 'shop.categoryLinks',
      description: 'Category "Shop Now" links on the landing page',
      multiple: true,
      strategies: [
        { by: 'role', role: 'link', name: /^Shop (Men|Women|Kids|Electronics)/i },
        { by: 'css', value: 'a[href$="mens-wear.php"], a[href$="womens-wear.php"], a[href$="kids-wear.php"], a[href$="electronics.php"]' },
      ],
    },
  },

  // UNVERIFIED: product listing lives on the category pages (e.g. mens-wear.php). Locators below are
  // educated guesses; confirm with the site's "Inspect locators" button or an error-context.md snapshot.
  category: {
    productCards: {
      key: 'category.productCards',
      description: 'Product cards in a category listing',
      multiple: true,
      strategies: [
        { by: 'css', value: '[data-testid^="product-card"], [data-testid="product"]' },
        { by: 'css', value: '.product-card, .product, article.card, .card:has(button)' },
      ],
    },
    addToCartButtons: {
      key: 'category.addToCart',
      description: 'Add to cart buttons',
      multiple: true,
      strategies: [
        { by: 'role', role: 'button', name: /add to cart/i },
        { by: 'css', value: '[data-testid^="add-to-cart"], button.add-to-cart' },
        { by: 'text', value: /add to cart/i },
      ],
    },
  },

  cart: {
    items: {
      key: 'cart.items',
      description: 'Line items in the cart',
      multiple: true,
      strategies: [
        { by: 'css', value: '[data-testid^="cart-item"]' },
        { by: 'css', value: '.cart-item, table tbody tr' },
      ],
    },
    checkout: {
      key: 'cart.checkout',
      description: 'Proceed to checkout',
      strategies: [
        { by: 'role', role: 'link', name: /checkout/i },
        { by: 'role', role: 'button', name: /checkout/i },
        { by: 'css', value: 'a[href*="checkout"]' },
      ],
    },
  },
} satisfies Record<string, Record<string, LocatorSpec>>;
