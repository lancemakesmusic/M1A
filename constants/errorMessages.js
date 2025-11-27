// constants/errorMessages.js
// Standardized error messages across the application

export const AUTH_ERRORS = {
  INVALID_EMAIL: 'Please enter a valid email address.',
  EMAIL_REQUIRED: 'Email is required.',
  PASSWORD_REQUIRED: 'Password is required.',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters.',
  PASSWORD_WEAK: 'Password must contain uppercase, lowercase, number, and special character.',
  PASSWORDS_DONT_MATCH: 'Passwords do not match.',
  USER_NOT_FOUND: 'No account found with this email.',
  WRONG_PASSWORD: 'Incorrect password.',
  EMAIL_IN_USE: 'An account with this email already exists.',
  TOO_MANY_ATTEMPTS: 'Too many failed attempts. Please try again later.',
  RATE_LIMITED: 'Too many attempts. Please wait before trying again.',
  LOGIN_FAILED: 'Login failed. Please try again.',
  SIGNUP_FAILED: 'Signup failed. Please try again.',
  OPERATION_NOT_ALLOWED: 'Email/password accounts are not enabled.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
};

export const PROFILE_ERRORS = {
  DISPLAY_NAME_REQUIRED: 'Display name is required.',
  USERNAME_REQUIRED: 'Username is required.',
  USERNAME_TOO_SHORT: 'Username must be at least 3 characters.',
  USERNAME_TOO_LONG: 'Username must be less than 30 characters.',
  USERNAME_INVALID_CHARS: 'Username can only contain letters, numbers, underscores, and hyphens.',
  USERNAME_INVALID_START_END: 'Username cannot start or end with underscore or hyphen.',
  USERNAME_TAKEN: 'This username is already taken.',
  UPDATE_FAILED: 'Update failed. Please try again.',
  PERMISSION_DENIED: 'You do not have permission to update this profile.',
  UPLOAD_FAILED: 'Upload failed. Please try again.',
  UPLOAD_IN_PROGRESS: 'Please wait for the current upload to complete.',
};

export const VALIDATION_ERRORS = {
  INVALID_URL: 'Please enter a valid URL.',
  URL_CANNOT_OPEN: 'This link cannot be opened.',
  INVALID_LINK: 'This link is not valid and cannot be opened.',
  REQUIRED_FIELD: 'This field is required.',
  MAX_LENGTH_EXCEEDED: (max) => `Maximum length is ${max} characters.`,
};

export const NETWORK_ERRORS = {
  CONNECTION_FAILED: 'Connection failed. Please check your internet connection.',
  TIMEOUT: 'Request timed out. Please try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
};

export const GENERAL_ERRORS = {
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  OPERATION_FAILED: 'Operation failed. Please try again.',
};

// Helper function to get error message from Firebase error
export const getFirebaseErrorMessage = (error) => {
  if (!error || !error.message) return GENERAL_ERRORS.UNKNOWN_ERROR;

  const message = error.message.toLowerCase();

  if (message.includes('user-not-found')) return AUTH_ERRORS.USER_NOT_FOUND;
  if (message.includes('wrong-password')) return AUTH_ERRORS.WRONG_PASSWORD;
  if (message.includes('invalid-email')) return AUTH_ERRORS.INVALID_EMAIL;
  if (message.includes('email-already-in-use')) return AUTH_ERRORS.EMAIL_IN_USE;
  if (message.includes('too-many-requests')) return AUTH_ERRORS.TOO_MANY_ATTEMPTS;
  if (message.includes('weak-password')) return AUTH_ERRORS.PASSWORD_WEAK;
  if (message.includes('operation-not-allowed')) return AUTH_ERRORS.OPERATION_NOT_ALLOWED;
  if (message.includes('network-request-failed')) return NETWORK_ERRORS.CONNECTION_FAILED;
  if (message.includes('permission-denied')) return PROFILE_ERRORS.PERMISSION_DENIED;

  return error.message || GENERAL_ERRORS.UNKNOWN_ERROR;
};

