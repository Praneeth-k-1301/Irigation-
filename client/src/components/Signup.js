import React, { useState } from 'react';
import { signUp, validateEmail, validatePassword } from '../services/authService';
import './Auth.css';

const Signup = ({ onSwitchToLogin, onSignupSuccess }) => {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordValidation, setPasswordValidation] = useState({
    isValid: false,
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumbers: false
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    setError(''); // Clear error when user types
    
    // Real-time password validation
    if (name === 'password') {
      setPasswordValidation(validatePassword(value));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.displayName || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (formData.displayName.length < 2) {
      setError('Name must be at least 2 characters long');
      return;
    }
    
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (!passwordValidation.isValid) {
      setError('Password must be at least 6 characters with uppercase, lowercase, and numbers');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await signUp(formData.email, formData.password, formData.displayName);
      
      if (result.success) {
        onSignupSuccess(result.user);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>🌱 Join Us</h2>
          <p>Create your crop prediction account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="displayName">👤 Full Name</label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              placeholder="Enter your full name"
              className="auth-input"
              disabled={loading}
            />
          </div>
          
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
              placeholder="Create a strong password"
              className="auth-input"
              disabled={loading}
            />
            
            {formData.password && (
              <div className="password-validation">
                <div className={`validation-item ${passwordValidation.minLength ? 'valid' : 'invalid'}`}>
                  {passwordValidation.minLength ? '✅' : '❌'} At least 6 characters
                </div>
                <div className={`validation-item ${passwordValidation.hasUpperCase ? 'valid' : 'invalid'}`}>
                  {passwordValidation.hasUpperCase ? '✅' : '❌'} Uppercase letter
                </div>
                <div className={`validation-item ${passwordValidation.hasLowerCase ? 'valid' : 'invalid'}`}>
                  {passwordValidation.hasLowerCase ? '✅' : '❌'} Lowercase letter
                </div>
                <div className={`validation-item ${passwordValidation.hasNumbers ? 'valid' : 'invalid'}`}>
                  {passwordValidation.hasNumbers ? '✅' : '❌'} Number
                </div>
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">🔒 Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
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
            disabled={loading || !passwordValidation.isValid}
          >
            {loading ? '🔄 Creating Account...' : '🚀 Create Account'}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <button 
              onClick={onSwitchToLogin}
              className="link-button"
              disabled={loading}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
