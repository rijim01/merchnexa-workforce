/**
 * Password validation rule:
 * - At least 6 characters
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 number (0-9)
 * - At least 1 special character (e.g. !@#$%^&*()_+-=[]{}|;':",./<>?)
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 6) {
    return {
      valid: false,
      error: "Password must be at least 6 characters long.",
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least 1 uppercase letter (A-Z).",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least 1 number (0-9).",
    };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least 1 special character (!@#$%^&* etc.).",
    };
  }

  return { valid: true };
}
