/**
 * Admin Authentication Utilities
 * Provides helper functions for admin password validation
 */

export class AdminAuth {
  static getAdminPassword() {
    return import.meta.env.VITE_ADMIN_PASSWORD;
  }

  static isAdminPasswordConfigured() {
    const password = this.getAdminPassword();
    return password && password.trim().length > 0;
  }

  static validateAdminPassword(inputPassword) {
    const adminPassword = this.getAdminPassword();

    if (!adminPassword) {
      console.warn('Admin password not configured in environment variables');
      return false;
    }

    return inputPassword === adminPassword;
  }

  static requireAdminAuth(callback, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isAdminPasswordConfigured()) {
        console.warn('Admin authentication skipped - password not configured');
        resolve(callback());
        return;
      }

      // This would typically integrate with your modal system
      // For now, we'll use the component-based approach
      resolve(callback());
    });
  }

  static getSecurityLevel() {
    if (!this.isAdminPasswordConfigured()) {
      return 'NONE';
    }

    const password = this.getAdminPassword();
    if (password.length < 8) {
      return 'WEAK';
    } else if (password.length < 12) {
      return 'MEDIUM';
    } else {
      return 'STRONG';
    }
  }

  static logAdminAction(action, user = 'Admin') {
    const timestamp = new Date().toISOString();
    console.log(`[ADMIN ACTION] ${timestamp} - ${user}: ${action}`);

    // In a real application, you might want to send this to an analytics service
    // or store it in a database for audit purposes
  }
}

export default AdminAuth;