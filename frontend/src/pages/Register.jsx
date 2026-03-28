import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaChalkboardTeacher,
  FaBookReader,
} from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';
import '../styles/Register.css';

const Register = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    skillsOffer: '',
    skillsLearn: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:3003').replace(/\/$/, '');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }

    if (!formData.agreeTerms) {
      toast.error('Please agree to the Terms and Conditions');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        city: formData.city,
      });

      const { user, token, message } = response.data;
      toast.success(message || 'Account created successfully! Welcome to Skill Swap Hub!');
      onLogin(user, token);
      navigate('/dashboard');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-wrapper fade-in">
        <div className="register-card">
          <div className="register-header">
            <div className="register-icon">🚀</div>
            <h1>Join Skill Swap Hub</h1>
            <p>Start your skill exchange journey today</p>
          </div>

          <form onSubmit={handleSubmit} className="register-form">
            <div className="register-grid">
              <div className="input-group">
                <label htmlFor="name">
                  <FaUser className="input-icon" />
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="email">
                  <FaEnvelope className="input-icon" />
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="hello@skillswap.com"
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="phone">
                  <FaPhoneAlt className="input-icon" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className="input-group">
                <label htmlFor="city">
                  <FaMapMarkerAlt className="input-icon" />
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Hyderabad"
                />
              </div>

              <div className="input-group full-row">
                <label htmlFor="skillsOffer">
                  <FaChalkboardTeacher className="input-icon" />
                  Skills You Can Offer
                </label>
                <input
                  type="text"
                  id="skillsOffer"
                  name="skillsOffer"
                  value={formData.skillsOffer}
                  onChange={handleChange}
                  placeholder="React, Photoshop, Spoken English"
                />
              </div>

              <div className="input-group full-row">
                <label htmlFor="skillsLearn">
                  <FaBookReader className="input-icon" />
                  Skills You Want to Learn
                </label>
                <input
                  type="text"
                  id="skillsLearn"
                  name="skillsLearn"
                  value={formData.skillsLearn}
                  onChange={handleChange}
                  placeholder="Python, Public Speaking, SEO"
                />
              </div>

              <div className="input-group">
                <label htmlFor="password">
                  <FaLock className="input-icon" />
                  Password
                </label>
                <div className="password-input">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                    required
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                <small className="password-hint">
                  Minimum 8 characters with at least one number and special character
                </small>
              </div>

              <div className="input-group">
                <label htmlFor="confirmPassword">
                  <FaLock className="input-icon" />
                  Confirm Password
                </label>
                <div className="password-input">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
            </div>

            <label className="terms-checkbox">
              <input
                type="checkbox"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleChange}
              />
              <span>
                I agree to the <Link to="/terms">Terms of Service</Link> and{' '}
                <Link to="/privacy">Privacy Policy</Link>
              </span>
            </label>

            <button 
              type="submit" 
              className="register-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="spinner"></span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="login-link">
            <p>
              Already have an account?{' '}
              <Link to="/login">Sign in here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
