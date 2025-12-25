# 🚀 Quick Start Guide

## Get Started in 3 Steps

### 1. Start the Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### 2. Create Your First User

Go to Supabase Dashboard:
https://supabase.com/dashboard/project/waxywordtmfvaryyumht

**Authentication → Users → Add user**

- Email: `admin@iegroup.gr`
- Password: `your-password`
- ✅ Auto Confirm User

### 3. Login

Go to `http://localhost:5173/login` and sign in with your credentials.

You're done! You now have full access to the system.

## Key URLs

- **Login**: `http://localhost:5173/login`
- **Dashboard**: `http://localhost:5173/`
- **Admin Panel**: `http://localhost:5173/admin/users`
- **Room Browser**: `http://localhost:5173/room`

## Managing Users

### Create Users
See [CREATE_USERS.md](CREATE_USERS.md) for detailed instructions.

### Assign Roles
Use the admin panel at `/admin/users` or run SQL:

```sql
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM auth.users u
CROSS JOIN roles r
WHERE u.email = 'user@example.com'
  AND r.name = 'Admin';
```

## Available Roles

- **Admin** - Full access
- **Engineer** - Technical access
- **Electronics** - Hardware access
- **Project Manager** - Oversight access

## Current Setup

✅ **Database**: 3 escape room types, 67 cities, 716 rooms
✅ **Authentication**: Login-only (no signup)
✅ **Access**: Any logged-in user can access everything
✅ **Admin Panel**: Manage users and roles at `/admin/users`

## Troubleshooting

**Can't login?**
- Check user exists in Supabase Dashboard → Authentication → Users
- Verify "Email Confirmed At" has a timestamp

**Admin panel not loading?**
- Check browser console for errors
- Verify you're logged in
- Try hard refresh (Ctrl+Shift+R)

**Need help?**
- [DATABASE_SETUP.md](DATABASE_SETUP.md) - Database guide
- [AUTHENTICATION.md](AUTHENTICATION.md) - Auth system docs
- [CREATE_USERS.md](CREATE_USERS.md) - User creation guide

---

**Happy managing! 🎉**
