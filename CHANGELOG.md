# Changelog

All notable changes to the M1A app will be documented in this file.

## [1.0.3] - 2026-01-08

### Added
- **Event Ticket Booking System**
  - Complete ticket booking flow with ticket type selection (Regular/Early Bird/VIP)
  - Early bird pricing with automatic expiration date checking
  - VIP pricing option
  - Discount code validation and application
  - Guest list entries automatically created in `eventBookings` collection
  - Event orders saved to dedicated `eventOrders` collection

- **Admin Wallet Balance Management**
  - Admins can now adjust user wallet balances for store credit purposes
  - Add store credit for cash payments
  - Deduct balance when needed
  - Complete audit trail with transaction records
  - Preview new balance before confirming

- **Event Image Uploads**
  - Admins can upload images when creating events
  - Images display correctly on events page
  - Fallback placeholder for missing images

### Changed
- Event images now properly mapped from `photoUrl` to `image` field for display
- Improved data normalization for events in ExploreScreen
- Enhanced wallet transaction audit trail

### Fixed
- Fixed event image display issue (images now show on events page)
- Fixed Firebase Storage permission errors for event image uploads
- Fixed wallet balance adjustment permissions (admins can now create wallets and transactions for users)
- Fixed checkout session ID update to use correct collection for events
- Fixed unit price calculation for event ticket types

### Security
- Updated Firestore rules to allow admin wallet operations
- Deployed storage rules for event image uploads
- Enhanced security for wallet transaction creation

## [1.0.2] - Previous Release

### Features
- Service booking system
- Wallet functionality
- User management
- Admin dashboard

## [1.0.1] - Previous Release

### Features
- Initial release
- Authentication system
- Basic navigation
- Profile management

