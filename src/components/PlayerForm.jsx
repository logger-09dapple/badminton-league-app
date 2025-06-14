import React, { useState, useEffect } from 'react';
import { validationUtils } from '../utils/validationUtils';

const PlayerForm = ({ player, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    skillLevel: '',
    gender: '', // NEW: Gender field
    email: '',
    phone: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (player) {
      setFormData({
        name: player.name || '',
        skillLevel: player.skill_level || '',
        gender: player.gender || '', // NEW: Load gender
        email: player.email || '',
        phone: player.phone || ''
      });
    }
  }, [player]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validation = validationUtils.validatePlayer(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting player form:', error);
      setErrors({ submit: 'Failed to save player. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="player-form">
      <div className="form-group">
        <label htmlFor="name">Name *</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={errors.name ? 'error' : ''}
          placeholder="Enter player name"
        />
        {errors.name && <span className="error-text">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="skillLevel">Skill Level *</label>
        <select
          id="skillLevel"
          name="skillLevel"
          value={formData.skillLevel}
          onChange={handleChange}
          className={errors.skillLevel ? 'error' : ''}
        >
          <option value="">Select Skill Level</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
        {errors.skillLevel && <span className="error-text">{errors.skillLevel}</span>}
      </div>

      {/* NEW: Gender selection */}
      <div className="form-group">
        <label htmlFor="gender">Gender *</label>
        <select
          id="gender"
          name="gender"
          value={formData.gender}
          onChange={handleChange}
          className={errors.gender ? 'error' : ''}
        >
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
        {errors.gender && <span className="error-text">{errors.gender}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={errors.email ? 'error' : ''}
          placeholder="Enter email address"
        />
        {errors.email && <span className="error-text">{errors.email}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="phone">Phone</label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className={errors.phone ? 'error' : ''}
          placeholder="Enter phone number"
        />
        {errors.phone && <span className="error-text">{errors.phone}</span>}
      </div>

      {errors.submit && (
        <div className="error-message">
          {errors.submit}
        </div>
      )}

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="btn btn-primary">
          {isSubmitting ? 'Saving...' : (player ? 'Update Player' : 'Add Player')}
        </button>
      </div>
    </form>
  );
};

export default PlayerForm;

