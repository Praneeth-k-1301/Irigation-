import React from 'react';
import { signOutUser } from '../services/authService';
import './Auth.css';

const UserHeader = ({ user, onLogout }) => {
  const handleLogout = async () => {
    const result = await signOutUser();
    if (result.success) {
      onLogout();
    }
  };

  const getInitials = (name) => {
    if (!name) return '👤';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatEmail = (email) => {
    if (email.length > 25) {
      return email.substring(0, 22) + '...';
    }
    return email;
  };

  return (
    <div className="user-header">
      <div className="user-info">
        <div className="user-avatar">
          {getInitials(user.displayName)}
        </div>
        <div className="user-details">
          <h3>Welcome, {user.displayName || 'User'}!</h3>
          <p>{formatEmail(user.email)}</p>
        </div>
      </div>
      <button onClick={handleLogout} className="logout-button">
        🚪 Logout
      </button>
    </div>
  );
};

export default UserHeader;
