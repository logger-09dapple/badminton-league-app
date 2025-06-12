import React, { useState, useEffect } from 'react';
import { validationUtils } from '../utils/validationUtils';

const MatchForm = ({ match, teams, onSubmit, onCancel }) => {
 const [formData, setFormData] = useState({
 team1Id: '',
 team2Id: '',
 scheduledDate: '',
 status: 'scheduled'
 });
 const [errors, setErrors] = useState({});
 const [isSubmitting, setIsSubmitting] = useState(false);

 // Filter out teams that don't have the required structure
 const availableTeams = teams.filter(team => 
 team && team.id && team.name
 );

 useEffect(() => {
 if (match) {
 setFormData({
 team1Id: match.team1_id || match.team1?.id || '',
 team2Id: match.team2_id || match.team2?.id || '',
 scheduledDate: match.scheduled_date || '',
 status: match.status || 'scheduled'
 });
 }
 }, [match]);

 const handleChange = (e) => {
 const { name, value } = e.target;
 setFormData(prev => ({
 ...prev,
 [name]: value
 }));

 // Clear error when user starts typing
 if (errors[name]) {
 setErrors(prev => ({
 ...prev,
 [name]: ''
 }));
 }
 };

 const handleSubmit = async (e) => {
 e.preventDefault();

 // Validation
 const matchData = {
 team1Id: formData.team1Id,
 team2Id: formData.team2Id,
 scheduledDate: formData.scheduledDate || null,
 status: formData.status
 };

 const validation = validationUtils.validateMatch(matchData);
 if (!validation.isValid) {
 setErrors(validation.errors);
 return;
 }

 // Additional validation for same team
 if (formData.team1Id === formData.team2Id) {
 setErrors({ teams: 'Please select different teams for the match' });
 return;
 }

 setIsSubmitting(true);
 try {
 await onSubmit(matchData);
 } catch (error) {
 console.error('Error submitting match form:', error);
 setErrors({ submit: 'Failed to save match. Please try again.' });
 } finally {
 setIsSubmitting(false);
 }
 };

 if (availableTeams.length < 2) {
 return (
 <div className="match-form-error">
 <p>Not enough teams available to create a match.</p>
 <p>You need at least 2 teams. Currently available: {availableTeams.length}</p>
 <button onClick={onCancel} className="btn btn-secondary">
 Close
 </button>
 </div>
 );
 }

 return (
 <form onSubmit={handleSubmit} className="match-form">
 <div className="form-group">
 <label htmlFor="team1Id">Team 1 *</label>
 <select
 id="team1Id"
 name="team1Id"
 value={formData.team1Id}
 onChange={handleChange}
 className={errors.team1 ? 'error' : ''}
 >
 <option value="">Select Team 1</option>
 {availableTeams.map(team => (
 <option key={team.id} value={team.id}>
 {team.name} ({team.skill_combination || 'No skill info'})
 </option>
 ))}
 </select>
 {errors.team1 && <span className="error-text">{errors.team1}</span>}
 </div>

 <div className="form-group">
 <label htmlFor="team2Id">Team 2 *</label>
 <select
 id="team2Id"
 name="team2Id"
 value={formData.team2Id}
 onChange={handleChange}
 className={errors.team2 ? 'error' : ''}
 >
 <option value="">Select Team 2</option>
 {availableTeams
 .filter(team => team.id !== formData.team1Id)
 .map(team => (
 <option key={team.id} value={team.id}>
 {team.name} ({team.skill_combination || 'No skill info'})
 </option>
 ))
 }
 </select>
 {errors.team2 && <span className="error-text">{errors.team2}</span>}
 {errors.teams && <span className="error-text">{errors.teams}</span>}
 </div>

 <div className="form-group">
 <label htmlFor="scheduledDate">Scheduled Date</label>
 <input
 type="date"
 id="scheduledDate"
 name="scheduledDate"
 value={formData.scheduledDate}
 onChange={handleChange}
 min={new Date().toISOString().split('T')[0]}
 className={errors.scheduledDate ? 'error' : ''}
 />
 {errors.scheduledDate && <span className="error-text">{errors.scheduledDate}</span>}
 </div>

 <div className="form-group">
 <label htmlFor="status">Status</label>
 <select
 id="status"
 name="status"
 value={formData.status}
 onChange={handleChange}
 >
 <option value="scheduled">Scheduled</option>
 <option value="in_progress">In Progress</option>
 <option value="completed">Completed</option>
 </select>
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
 {isSubmitting ? 'Saving...' : (match ? 'Update Match' : 'Create Match')}
 </button>
 </div>
 </form>
 );
};

export default MatchForm;

