import React, { useState } from 'react';
import { signIn, resetPassword, validateEmail } from '../services/authService';
import './Auth.css';

const Login = ({ onSwitchToSignup, onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }
    
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await signIn(formData.email, formData.password);
      
      if (result.success) {
        onLoginSuccess(result.user);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError('Please enter your email address first');
      return;
    }
    
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await resetPassword(formData.email);
      
      if (result.success) {
        setResetEmailSent(true);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>🌾 Welcome Back</h2>
          <p>Sign in to your crop prediction account</p>
        </div>
        
        {resetEmailSent ? (
          <div className="success-message">
            <h3>✅ Reset Email Sent</h3>
            <p>Check your email for password reset instructions.</p>
            <button 
              onClick={() => setResetEmailSent(false)}
              className="auth-button secondary"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">📧 Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className="auth-input"
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">🔒 Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className="auth-input"
                disabled={loading}
              />
            </div>
            
            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}
            
            <button 
              type="submit" 
              className={`auth-button primary ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? '🔄 Signing In...' : '🚀 Sign In'}
            </button>
            
            <div className="auth-links">
              <button 
                type="button"
                onClick={handleForgotPassword}
                className="link-button"
                disabled={loading}
              >
                Forgot Password?
              </button>
            </div>
          </form>
        )}
        
        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <button 
              onClick={onSwitchToSignup}
              className="link-button"
              disabled={loading}
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
