# Role-Based Access Control (RBAC) Implementation Plan

## Overview
Implement a tiered role system within the main M1A app for Merkaba Entertainment venue management.

## User Roles

### 1. **Admin** (Owner/Manager)
- Full system access
- Create/edit/delete events
- Create/edit/delete menu items
- Manage staff accounts
- View all financial data
- Configure integrations (Square/Toast/Eventbrite)
- System settings

### 2. **Staff** (Employees)
- Charge artists for services
- Process payments via Square/Toast
- View assigned events
- Update event status
- View order history
- Limited menu editing (price updates only)

### 3. **Client** (Artists/Guests)
- Book services
- Schedule events
- View menu/order items
- Make payments
- View own history

## Implementation Strategy

### Phase 1: User Role System
1. Add `role` field to user profiles in Firestore
2. Create `RoleContext` for role-based UI rendering
3. Update Firestore security rules for role-based access
4. Add role selection during signup (default: Client)
5. Admin can promote users to Staff/Admin

### Phase 2: Admin Interface
1. **Admin Dashboard**
   - Event management (create/edit/delete)
   - Menu item management
   - Staff management
   - Financial overview
   - Integration settings

2. **Event Management Screen**
   - Create events with full details
   - Edit existing events
   - Delete events
   - Sync with Google Calendar
   - Publish to Eventbrite

3. **Menu Management Screen**
   - Add/edit/delete bar menu items
   - Update prices
   - Manage categories
   - Set availability

### Phase 3: Staff Interface
1. **Staff Dashboard**
   - Today's events
   - Pending orders
   - Quick charge interface

2. **Service Charging Screen**
   - Select artist/client
   - Select service type
   - Enter amount
   - Process payment via Square/Toast
   - Generate receipt

3. **Order Management**
   - View active orders
   - Update order status
   - Process refunds

### Phase 4: Payment Integrations
1. **Square Integration**
   - Connect Square account
   - Process payments
   - Refund capability
   - Transaction history

2. **Toast Integration**
   - Connect Toast POS
   - Sync menu items
   - Process orders
   - Inventory sync

3. **Eventbrite Integration**
   - Create events
   - Sync attendee lists
   - Revenue tracking

## Database Schema

### User Profile Extension
```javascript
{
  role: 'admin' | 'staff' | 'client',
  permissions: {
    canCreateEvents: boolean,
    canEditEvents: boolean,
    canDeleteEvents: boolean,
    canChargeClients: boolean,
    canManageMenu: boolean,
    canViewFinancials: boolean,
    canManageStaff: boolean
  },
  staffInfo: {
    employeeId: string,
    department: string,
    hireDate: timestamp
  } | null
}
```

### Events Collection
```javascript
{
  title: string,
  description: string,
  startTime: timestamp,
  endTime: timestamp,
  createdBy: userId,
  assignedStaff: [userId],
  status: 'draft' | 'published' | 'cancelled',
  eventbriteId: string | null,
  squareEventId: string | null
}
```

### Service Charges Collection
```javascript
{
  clientId: userId,
  staffId: userId,
  serviceType: string,
  amount: number,
  paymentMethod: 'square' | 'toast' | 'stripe',
  transactionId: string,
  status: 'pending' | 'completed' | 'refunded',
  timestamp: timestamp
}
```

## Security Rules

### Firestore Rules
```javascript
// Events
match /events/{eventId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && 
    (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'staff');
  allow update, delete: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}

// Service Charges
match /serviceCharges/{chargeId} {
  allow read: if request.auth != null && (
    resource.data.clientId == request.auth.uid ||
    resource.data.staffId == request.auth.uid ||
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
  );
  allow create: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'staff'];
}
```

## UI/UX Considerations

### Role-Based Navigation
- **Admin**: Full drawer menu with admin sections
- **Staff**: Simplified menu (orders, charge, events)
- **Client**: Current menu (services, events, wallet)

### Conditional Rendering
```javascript
const { userRole } = useRole();
{userRole === 'admin' && <AdminDashboard />}
{userRole === 'staff' && <StaffDashboard />}
{userRole === 'client' && <ClientDashboard />}
```

## Next Steps

1. Create `contexts/RoleContext.js` for role management
2. Update user profile schema in Firestore
3. Create admin screens (EventManagement, MenuManagement)
4. Create staff screens (ChargeService, OrderManagement)
5. Implement payment integrations (Square, Toast, Eventbrite)
6. Update Firestore security rules
7. Add role-based navigation guards

