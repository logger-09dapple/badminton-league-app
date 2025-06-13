import React, { useState } from 'react';
import AdminPasswordModal from './AdminPasswordModal';
import { Shield } from 'lucide-react';

const ProtectedAdminButton = ({ 
  children, 
  onClick, 
  disabled, 
  className = '', 
  title,
  modalTitle,
  modalMessage,
  ...buttonProps 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleButtonClick = () => {
    setIsModalOpen(true);
  };

  const handlePasswordSuccess = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <>
      <button
        {...buttonProps}
        onClick={handleButtonClick}
        disabled={disabled}
        className={`${className} protected-admin-btn`}
        title={title || 'Admin access required'}
      >
        <Shield size={16} className="admin-shield-icon" />
        {children}
      </button>

      <AdminPasswordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handlePasswordSuccess}
        title={modalTitle}
        message={modalMessage}
      />
    </>
  );
};

export default ProtectedAdminButton;