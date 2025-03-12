import React from 'react';
import styles from '../styles/TimberCalculator.module.css';

const SaveModal = ({ isOpen, onClose, projectDetails, onSave, onProjectDetailsChange, saveMessage }) => {
  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    onProjectDetailsChange({ ...projectDetails, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave();
  };

  return (
    <div className={styles.saveModal}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Save Project</h2>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="name">Project Name</label>
            <input
              className={styles.input}
              type="text"
              id="name"
              name="name"
              value={projectDetails.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="client">Client</label>
            <input
              className={styles.input}
              type="text"
              id="client"
              name="client"
              value={projectDetails.client}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="location">Location</label>
            <input
              className={styles.input}
              type="text"
              id="location"
              name="location"
              value={projectDetails.location}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="date">Date</label>
            <input
              className={styles.input}
              type="date"
              id="date"
              name="date"
              value={projectDetails.date}
              onChange={handleChange}
            />
          </div>
          <div className={styles.buttonGroup}>
            <button type="button" className={`${styles.button} ${styles.secondaryButton}`} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.button}>Save</button>
          </div>
        </form>
        {saveMessage && (
          <div className={`${styles.saveMessage} ${saveMessage.includes('Error') ? styles.saveError : styles.saveSuccess}`}>
            {saveMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default SaveModal; 