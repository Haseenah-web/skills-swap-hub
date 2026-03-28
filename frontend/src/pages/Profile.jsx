import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import '../styles/Profile.css';

const Profile = ({ user, onUserUpdate }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    bio: '',
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:3003').replace(/\/$/, '');

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  const loadProfile = useCallback(async () => {
    const authConfig = getAuthConfig();
    if (!authConfig) {
      setIsLoadingProfile(false);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/me`, authConfig);
      const { user: profile } = response.data;

      setFormData({
        name: profile?.name || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
        city: profile?.city || '',
        bio: profile?.bio || '',
      });
      onUserUpdate?.(profile);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Unable to load profile';
      toast.error(errorMessage);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [API_BASE_URL, onUserUpdate]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (isLoadingProfile || formData.name) {
      return;
    }
    setFormData((prev) => ({
      ...prev,
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      city: user?.city || '',
      bio: user?.bio || '',
    }));
  }, [formData.name, isLoadingProfile, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const authConfig = getAuthConfig();
    if (!authConfig) {
      toast.error('Please login again');
      return;
    }

    setIsSaving(true);
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/users/me`,
        {
          name: formData.name,
          phone: formData.phone,
          city: formData.city,
          bio: formData.bio,
        },
        authConfig
      );

      const updatedUser = response.data.user;
      setFormData({
        name: updatedUser?.name || '',
        email: updatedUser?.email || '',
        phone: updatedUser?.phone || '',
        city: updatedUser?.city || '',
        bio: updatedUser?.bio || '',
      });
      onUserUpdate?.(updatedUser);
      toast.success(response.data.message || 'Profile updated successfully');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Unable to update profile';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-header">
          <h1>Profile Settings</h1>
          <p>Manage your personal details for skill swapping</p>
        </div>

        {isLoadingProfile ? (
          <div className="profile-loading">Loading profile...</div>
        ) : (
          <form onSubmit={handleSave} className="profile-form">
            <div className="profile-grid">
              <label className="profile-field">
                <span>Full Name</span>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  required
                />
              </label>

              <label className="profile-field">
                <span>Email Address</span>
                <input type="email" name="email" value={formData.email} readOnly />
              </label>

              <label className="profile-field">
                <span>Phone Number</span>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                />
              </label>

              <label className="profile-field">
                <span>City</span>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Hyderabad"
                />
              </label>

              <label className="profile-field profile-field--full">
                <span>Bio</span>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows="5"
                  placeholder="Share what you can teach and what you want to learn."
                />
              </label>
            </div>

            <button type="submit" className="profile-save-btn" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default Profile;
