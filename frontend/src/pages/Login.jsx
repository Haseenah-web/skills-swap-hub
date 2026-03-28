import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';
import '../styles/Login.css';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
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
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: formData.email,
        password: formData.password,
      });

      const { user, token, message } = response.data;
      toast.success(message || 'Login successful! Welcome back!');
      onLogin(user, token);
      navigate('/dashboard');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Invalid email or password';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper fade-in">
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon">⚡</div>
            <h1>Welcome Back</h1>
            <p>Sign in to continue your skill swapping journey</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
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
                  placeholder="Enter your password"
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
            </div>

            <div className="login-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="forgot-link">
                Forgot Password?
              </Link>
            </div>

            <button 
              type="submit" 
              className="login-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="spinner"></span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="register-link">
            <p>
              Don't have an account?{' '}
              <Link to="/register">Create an account</Link>
            </p>
          </div>
        </div>

        <div className="login-features">
          <div className="feature-item">
            <div className="feature-icon">🔄</div>
            <h3>Swap Skills</h3>
            <p>Exchange knowledge without money</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">⭐</div>
            <h3>Build Reputation</h3>
            <p>Earn trust through ratings</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🌍</div>
            <h3>Global Community</h3>
            <p>Connect with learners worldwide</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
