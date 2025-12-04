# Role & Permissions Reference Guide

## Role Hierarchy

```
master_admin (Highest)
    ↓
admin
    ↓
employee
    ↓
client (Default)
```

## Role Definitions

### 🔴 **Master Admin** (`master_admin`)
**Highest level of access - Full system control**

**Capabilities:**
- Create employee accounts
- Create admin accounts
- Assign/revoke any role
- Delete users
- Access all data
- Modify system configuration
- Manage all integrations
- View all financials
- Export all data
- Manage billing & subscriptions

**Use Case:** Owner/Founder of the venue

---

### 🟠 **Admin** (`admin`)
**Management level - Can manage operations but not create other admins**

**Capabilities:**
- Create/edit/delete events
- Manage menu items (add/edit/delete)
- View financial reports
- Configure integrations (Square/Toast/Eventbrite)
- Manage system settings
- View all orders and payments
- Process refunds
- **Cannot** create other admins or employees

**Use Case:** Venue manager, operations manager

---

### 🟡 **Employee** (`employee`)
**Operational level - Can execute and confirm client orders**

**Capabilities:**
- ✅ **Confirm Orders** - Confirm client orders
- ✅ **Execute Orders** - Mark orders as completed
- ✅ **Process Payments** - Process client payments
- ✅ **Confirm Payments** - Verify payment completion
- ✅ **Refund Payments** - Process refunds
- ✅ **Manage Tickets** - Confirm and validate event tickets
- ✅ **Manage Amenities** - Handle amenities/products/services
- ✅ **Confirm Service Bookings** - Confirm service reservations
- ✅ **Update Product Availability** - Update inventory status
- ✅ **View All Orders** - See all client orders
- ✅ **Update Order Status** - Change order status
- ✅ **View Assigned Events** - See events they're assigned to
- ✅ **Update Event Status** - Update event status

**Cannot:**
- Create events
- Delete events
- Manage menu items
- View financial reports
- Configure integrations
- Create other users

**Use Case:** Staff members, bartenders, event coordinators, ticket takers

---

### 🟢 **Client** (`client`)
**Default role - Standard user access**

**Capabilities:**
- Book services
- Schedule events
- View menu
- Make payments
- View own order history
- Cancel own orders
- View own tickets

**Use Case:** Artists, guests, customers

---

## Permission Matrix

| Permission | Client | Employee | Admin | Master Admin |
|------------|--------|----------|-------|--------------|
| **Order Management** |
| View own orders | ✅ | ✅ | ✅ | ✅ |
| View all orders | ❌ | ✅ | ✅ | ✅ |
| Confirm orders | ❌ | ✅ | ✅ | ✅ |
| Execute orders | ❌ | ✅ | ✅ | ✅ |
| Update order status | ❌ | ✅ | ✅ | ✅ |
| Cancel orders | Own only | ✅ | ✅ | ✅ |
| **Payment Processing** |
| Make payments | ✅ | ✅ | ✅ | ✅ |
| Process payments | ❌ | ✅ | ✅ | ✅ |
| Confirm payments | ❌ | ✅ | ✅ | ✅ |
| Refund payments | ❌ | ✅ | ✅ | ✅ |
| View payment history | Own only | ✅ | ✅ | ✅ |
| **Ticket Management** |
| Manage tickets | ❌ | ✅ | ✅ | ✅ |
| Confirm tickets | ❌ | ✅ | ✅ | ✅ |
| Validate tickets | ❌ | ✅ | ✅ | ✅ |
| **Amenities/Services** |
| Book services | ✅ | ✅ | ✅ | ✅ |
| Manage amenities | ❌ | ✅ | ✅ | ✅ |
| Confirm service bookings | ❌ | ✅ | ✅ | ✅ |
| Update product availability | ❌ | ✅ | ✅ | ✅ |
| **Event Management** |
| Schedule events | ✅ | ❌ | ✅ | ✅ |
| Create events | ❌ | ❌ | ✅ | ✅ |
| Edit events | ❌ | ❌ | ✅ | ✅ |
| Delete events | ❌ | ❌ | ✅ | ✅ |
| View assigned events | ❌ | ✅ | ✅ | ✅ |
| Update event status | ❌ | ✅ | ✅ | ✅ |
| **Menu Management** |
| View menu | ✅ | ✅ | ✅ | ✅ |
| Manage menu | ❌ | ❌ | ✅ | ✅ |
| Add menu items | ❌ | ❌ | ✅ | ✅ |
| Edit menu items | ❌ | ❌ | ✅ | ✅ |
| Delete menu items | ❌ | ❌ | ✅ | ✅ |
| Update prices | ❌ | ❌ | ✅ | ✅ |
| **Financial Access** |
| View own financials | ✅ | ✅ | ✅ | ✅ |
| View financials | ❌ | ❌ | ✅ | ✅ |
| View revenue reports | ❌ | ❌ | ✅ | ✅ |
| Export financial data | ❌ | ❌ | ✅ | ✅ |
| **Integration Management** |
| Configure integrations | ❌ | ❌ | ✅ | ✅ |
| Manage Square | ❌ | ❌ | ✅ | ✅ |
| Manage Toast | ❌ | ❌ | ✅ | ✅ |
| Manage Eventbrite | ❌ | ❌ | ✅ | ✅ |
| **User Management** |
| Create employees | ❌ | ❌ | ❌ | ✅ |
| Create admins | ❌ | ❌ | ❌ | ✅ |
| Manage employees | ❌ | ❌ | ❌ | ✅ |
| Assign roles | ❌ | ❌ | ❌ | ✅ |
| Delete users | ❌ | ❌ | ❌ | ✅ |
| **System Access** |
| Access all data | ❌ | ❌ | ❌ | ✅ |
| Modify system config | ❌ | ❌ | ✅ | ✅ |
| Manage billing | ❌ | ❌ | ❌ | ✅ |

---

## Usage Examples

### Check Role
```javascript
import { useRole } from '../contexts/RoleContext';

const { isMasterAdmin, isAdmin, isEmployee, isClient } = useRole();

if (isMasterAdmin()) {
  // Show master admin features
}

if (isEmployee()) {
  // Show employee features
}
```

### Check Permission
```javascript
import { useRole } from '../contexts/RoleContext';

const { hasPermission } = useRole();

if (hasPermission('canConfirmOrders')) {
  // Show order confirmation button
}

if (hasPermission('canProcessPayments')) {
  // Show payment processing interface
}
```

### Conditional Rendering
```javascript
const { userRole, hasPermission } = useRole();

{userRole === 'master_admin' && <MasterAdminDashboard />}
{userRole === 'admin' && <AdminDashboard />}
{userRole === 'employee' && <EmployeeDashboard />}
{userRole === 'client' && <ClientDashboard />}

{hasPermission('canConfirmOrders') && <ConfirmOrderButton />}
{hasPermission('canProcessPayments') && <ProcessPaymentButton />}
```

---

## Database Schema

### User Profile
```javascript
{
  email: string,
  displayName: string,
  role: 'master_admin' | 'admin' | 'employee' | 'client',
  permissions: {
    // Custom permissions override defaults
  },
  // For employees
  employeeInfo: {
    employeeId: string,
    department: string,
    hireDate: timestamp,
    status: 'active' | 'inactive',
    createdBy: userId, // master_admin who created this
  },
  // For admins
  adminInfo: {
    adminId: string,
    department: string,
    assignedDate: timestamp,
    status: 'active' | 'inactive',
    createdBy: userId, // master_admin who created this
  },
  createdAt: timestamp,
  roleUpdatedAt: timestamp,
  roleUpdatedBy: userId,
}
```

---

## Security Notes

1. **Master Admin Creation**: Must be done manually in Firestore or through a one-time setup script
2. **Role Changes**: Only master_admin can change roles
3. **Employee Creation**: Only master_admin can create employees
4. **Admin Creation**: Only master_admin can create admins
5. **Self-Promotion**: Users cannot promote themselves
6. **Role Protection**: Master admin role cannot be changed or revoked




