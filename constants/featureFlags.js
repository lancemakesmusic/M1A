/**
 * Feature Flags
 * Control feature visibility without removing code
 * Set to false to hide features that require MTL compliance
 */

// Wallet features require Money Transmitter License (MTL)
// Set to true only after obtaining proper licenses and compliance
export const ENABLE_WALLET_FEATURES = false; // Set to true when MTL is obtained

// Individual wallet feature flags (all depend on ENABLE_WALLET_FEATURES)
export const ENABLE_WALLET_BALANCE = ENABLE_WALLET_FEATURES;
export const ENABLE_ADD_FUNDS = ENABLE_WALLET_FEATURES;
export const ENABLE_SEND_MONEY = ENABLE_WALLET_FEATURES;
export const ENABLE_CASH_OUT = ENABLE_WALLET_FEATURES;
export const ENABLE_WALLET_QR_CODE = ENABLE_WALLET_FEATURES;

// Payment processing features (OK for standard LLC)
export const ENABLE_PAYMENT_PROCESSING = true; // Always enabled
export const ENABLE_PAYMENT_METHODS = true; // Always enabled
export const ENABLE_TRANSACTION_HISTORY = true; // Always enabled (for service/event payments)

// Helper function to check if any wallet feature is enabled
export const isWalletEnabled = () => ENABLE_WALLET_FEATURES;

// Helper function to check if wallet screen should be shown
// Show if wallet features enabled OR if we want to show transaction history
export const shouldShowWalletScreen = () => ENABLE_WALLET_FEATURES || ENABLE_TRANSACTION_HISTORY;


