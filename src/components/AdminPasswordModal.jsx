import React, { useState } from 'react';
import { Lock, Eye, EyeOff, X } from 'lucide-react';

const AdminPasswordModal = ({ isOpen, onClose, onSuccess, title, message }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsValidating(true);
    setError('');

    // Simulate a small delay for security
    await new Promise(resolve => setTimeout(resolve, 500));

    if (password === adminPassword) {
      setPassword('');
      setIsValidating(false);
      onSuccess();
      onClose();
    } else {
      setError('Incorrect password. Access denied.');
      setPassword('');
      setIsValidating(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    setIsValidating(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content admin-password-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="admin-header-content">
            <Lock size={20} />
            <h2>{title || 'Admin Authentication Required'}</h2>
          </div>
          <button 
            onClick={handleClose} 
            className="modal-close"
            disabled={isValidating}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="admin-warning">
            <p>{message || 'This action requires administrator privileges.'}</p>
            <p>Please enter the admin password to continue:</p>
          </div>

          <form onSubmit={handleSubmit} className="admin-password-form">
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className={`admin-password-input ${error ? 'error' : ''}`}
                disabled={isValidating}
                autoFocus
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isValidating}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="admin-modal-actions">
              <button 
                type="button" 
                onClick={handleClose} 
                className="btn btn-secondary"
                disabled={isValidating}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isValidating || !password.trim()}
              >
                {isValidating ? 'Verifying...' : 'Authenticate'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminPasswordModal;