# How to Create Users

Since signup is disabled, you need to create users directly in Supabase.

## Create a New User

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/waxywordtmfvaryyumht
2. Click on **Authentication** in the left sidebar
3. Click on **Users**
4. Click **Add user** button
5. Fill in:
   - Email address
   - Password
   - Auto Confirm User: **Yes** (check this box)
6. Click **Create user**

The user can now login with their email and password at `/login`

### Option 2: SQL Editor

1. Go to Supabase Dashboard → **SQL Editor**
2. Click **New query**
3. Run this SQL (replace with actual values):

```sql
-- Create a new user
-- Note: You need to generate a UUID for the user_id
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
)
VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'user@example.com',  -- Change this
    crypt('password123', gen_salt('bf')),  -- Change this password
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"John Doe"}',  -- Change this
    false,
    'authenticated'
);
```

**⚠️ Note**: This is advanced and requires understanding of Supabase Auth structure.

## Assign Roles to Users

After creating a user, assign them roles:

1. Go to Supabase Dashboard → **SQL Editor**
2. Run this SQL:

```sql
-- Assign Admin role
INSERT INTO user_roles (user_id, role_id)
SELECT
    u.id,
    r.id
FROM auth.users u
CROSS JOIN roles r
WHERE u.email = 'user@example.com'  -- User's email
  AND r.name = 'Admin';  -- Role name: Admin, Engineer, Electronics, or Project Manager
```

### Available Roles

- **Admin** - Full system access and user management
- **Engineer** - Technical access to all rooms and systems
- **Electronics** - Electronics and hardware systems access
- **Project Manager** - Project oversight and reporting access

### Assign Multiple Roles

To assign multiple roles to one user:

```sql
INSERT INTO user_roles (user_id, role_id)
SELECT
    u.id,
    r.id
FROM auth.users u
CROSS JOIN roles r
WHERE u.email = 'user@example.com'
  AND r.name IN ('Admin', 'Engineer');  -- Multiple roles
```

## View All Users and Roles

```sql
SELECT
    u.email,
    u.raw_user_meta_data->>'full_name' as name,
    u.created_at,
    array_agg(r.name) as roles
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY u.id, u.email, u.raw_user_meta_data, u.created_at
ORDER BY u.created_at DESC;
```

## Remove a Role from a User

```sql
DELETE FROM user_roles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com')
  AND role_id = (SELECT id FROM roles WHERE name = 'Admin');
```

## Delete a User

```sql
DELETE FROM auth.users
WHERE email = 'user@example.com';
```

**Note**: This will also delete their role assignments due to CASCADE.

## Using the Admin Panel

Once logged in, any user can access the admin panel at `/admin/users` to:
- View all users
- See user roles
- Assign new roles
- Remove roles

This is the easiest way to manage users after initial creation!
