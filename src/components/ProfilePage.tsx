import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getFullUserProfile,
  updateUserProfile,
  updateUserPassword,
  uploadAvatar
} from '../services/supabaseQueries';
import { useAuthStore } from '../store/authStore';

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  roles: Array<{ name: string; color: string; description: string }>;
  createdAt: string;
  lastSignIn: string | undefined;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { signOut } = useAuthStore();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Messages
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await getFullUserProfile();
      if (data) {
        setProfile(data);
        setDisplayName(data.displayName);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setErrorMessage('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      setErrorMessage('Display name cannot be empty');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await updateUserProfile(displayName.trim());
      if (result.success) {
        setSuccessMessage('Profile updated successfully');
        await loadProfile();
      } else {
        setErrorMessage(result.error || 'Failed to update profile');
      }
    } catch (error) {
      setErrorMessage('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await updateUserPassword(currentPassword, newPassword);
      if (result.success) {
        setSuccessMessage('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMessage(result.error || 'Failed to change password');
      }
    } catch (error) {
      setErrorMessage('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  // Compress image before upload
  const compressImage = (file: File, maxSize: number = 256, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions maintaining aspect ratio
          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Draw image with white background (for transparency)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Could not compress image'));
                return;
              }
              // Create new file with compressed data
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => reject(new Error('Could not load image'));
      };
      reader.onerror = () => reject(new Error('Could not read file'));
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file');
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Image must be less than 10MB');
      return;
    }

    setUploadingAvatar(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Compress image before upload (256px max, 80% quality)
      const compressedFile = await compressImage(file, 256, 0.8);

      const result = await uploadAvatar(profile.id, compressedFile);
      if (result.success) {
        setSuccessMessage('Profile picture updated');
        await loadProfile();
      } else {
        setErrorMessage(result.error || 'Failed to upload image');
      }
    } catch (error) {
      setErrorMessage('An unexpected error occurred');
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-full bg-[#0f0f12] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#ea2127] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6b6b7a]">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-full bg-[#0f0f12] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#6b6b7a]">Failed to load profile</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-[#ea2127] text-white rounded-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0f0f12] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-50" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#ea2127] rounded-full blur-[200px] opacity-[0.03]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#3b82f6] rounded-full blur-[150px] opacity-[0.02]" />

      <div className="relative z-10 p-6 lg:p-10 max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-[#6b6b7a] hover:text-white transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Profile Settings
          </h1>
          <p className="text-[#6b6b7a] text-sm mt-1">
            Manage your account settings and preferences
          </p>
        </header>

        {/* Messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-[#10b981]/10 border border-[#10b981]/30 rounded-xl text-[#10b981]">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-6 p-4 bg-[#ea2127]/10 border border-[#ea2127]/30 rounded-xl text-[#ea2127]">
            {errorMessage}
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-[#141418] rounded-2xl border border-[#1f1f28] p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {/* Avatar */}
              <div className="relative group">
                <div
                  onClick={handleAvatarClick}
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-[#ea2127] to-[#b81a1f] flex items-center justify-center cursor-pointer overflow-hidden transition-transform hover:scale-105 ring-4 ring-[#1f1f28]"
                >
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-white">
                      {profile.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}

                  {/* Upload overlay */}
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploadingAvatar ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <p className="text-xs text-[#6b6b7a] mt-2 text-center">Click to change</p>
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-white mb-1">
                  {profile.displayName}
                </h2>
                <p className="text-[#6b6b7a] mb-3">{profile.email}</p>

                {/* Roles */}
                <div className="flex flex-wrap gap-2">
                  {profile.roles.map((role, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-lg text-xs font-medium"
                      style={{
                        backgroundColor: `${role.color}20`,
                        color: role.color
                      }}
                    >
                      {role.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Account Stats */}
              <div className="text-right space-y-2">
                <div>
                  <p className="text-xs text-[#4a4a58] uppercase tracking-wider">Member Since</p>
                  <p className="text-sm text-[#8b8b9a]">{formatDate(profile.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#4a4a58] uppercase tracking-wider">Last Login</p>
                  <p className="text-sm text-[#8b8b9a]">{profile.lastSignIn ? formatDate(profile.lastSignIn) : 'Never'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Profile */}
          <div className="bg-[#141418] rounded-2xl border border-[#1f1f28] p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#ea2127]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#8b8b9a] mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-[#1a1a1f] border border-[#2a2a35] rounded-xl px-4 py-3 text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#ea2127]/50 focus:ring-2 focus:ring-[#ea2127]/20 transition-all"
                  placeholder="Enter your display name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8b8b9a] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full bg-[#1a1a1f] border border-[#2a2a35] rounded-xl px-4 py-3 text-[#5a5a68] cursor-not-allowed"
                />
                <p className="text-xs text-[#4a4a58] mt-1">Email cannot be changed</p>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving || displayName === profile.displayName}
                className="px-5 py-2.5 bg-[#ea2127] hover:bg-[#d11920] disabled:bg-[#ea2127]/50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-[#141418] rounded-2xl border border-[#1f1f28] p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Change Password
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#8b8b9a] mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-[#1a1a1f] border border-[#2a2a35] rounded-xl px-4 py-3 text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#f59e0b]/50 focus:ring-2 focus:ring-[#f59e0b]/20 transition-all"
                  placeholder="Enter current password"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#8b8b9a] mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#1a1a1f] border border-[#2a2a35] rounded-xl px-4 py-3 text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#f59e0b]/50 focus:ring-2 focus:ring-[#f59e0b]/20 transition-all"
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#8b8b9a] mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#1a1a1f] border border-[#2a2a35] rounded-xl px-4 py-3 text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#f59e0b]/50 focus:ring-2 focus:ring-[#f59e0b]/20 transition-all"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <button
                onClick={handleChangePassword}
                disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                className="px-5 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-[#f59e0b]/50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all"
              >
                {saving ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-[#141418] rounded-2xl border border-[#1f1f28] p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#3b82f6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Account Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#1a1a1f] rounded-xl">
                <p className="text-xs text-[#4a4a58] uppercase tracking-wider mb-1">User ID</p>
                <p className="text-sm text-[#8b8b9a] font-mono break-all">{profile.id}</p>
              </div>

              <div className="p-4 bg-[#1a1a1f] rounded-xl">
                <p className="text-xs text-[#4a4a58] uppercase tracking-wider mb-1">Assigned Roles</p>
                <p className="text-sm text-[#8b8b9a]">
                  {profile.roles.length} role{profile.roles.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {profile.roles.length > 0 && (
              <div className="mt-4 p-4 bg-[#1a1a1f] rounded-xl">
                <p className="text-xs text-[#4a4a58] uppercase tracking-wider mb-3">Role Details</p>
                <div className="space-y-2">
                  {profile.roles.map((role, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                      <div>
                        <span className="text-white font-medium">{role.name}</span>
                        {role.description && (
                          <span className="text-[#6b6b7a] text-sm ml-2">- {role.description}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Logout Section */}
          <div className="bg-[#141418] rounded-2xl border border-[#1f1f28] p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#ea2127]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </h3>
            <p className="text-[#6b6b7a] text-sm mb-4">
              Sign out of your account on this device.
            </p>
            <button
              onClick={signOut}
              className="px-5 py-2.5 bg-[#ea2127] hover:bg-[#d11920] text-white rounded-xl font-medium transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
