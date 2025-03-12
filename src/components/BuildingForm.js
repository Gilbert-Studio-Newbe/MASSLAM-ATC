import React from 'react';
import styles from '../styles/TimberCalculator.module.css';

const BuildingForm = ({
  buildingLength,
  buildingWidth,
  numFloors,
  floorHeight,
  load,
  fireRating,
  lengthwiseBays,
  widthwiseBays,
  joistsRunLengthwise,
  onInputChange,
  onCalculate
}) => {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) : value;
    onInputChange(name, newValue);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onCalculate();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.formSection}>
        <h2 className={styles.sectionTitle}>Building Dimensions</h2>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="buildingLength">Building Length (m)</label>
            <input
              className={styles.input}
              type="number"
              id="buildingLength"
              name="buildingLength"
              min="1"
              step="0.1"
              value={buildingLength}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="buildingWidth">Building Width (m)</label>
            <input
              className={styles.input}
              type="number"
              id="buildingWidth"
              name="buildingWidth"
              min="1"
              step="0.1"
              value={buildingWidth}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="numFloors">Number of Floors</label>
            <input
              className={styles.input}
              type="number"
              id="numFloors"
              name="numFloors"
              min="1"
              max="20"
              value={numFloors}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="floorHeight">Floor Height (m)</label>
            <input
              className={styles.input}
              type="number"
              id="floorHeight"
              name="floorHeight"
              min="2"
              max="6"
              step="0.1"
              value={floorHeight}
              onChange={handleChange}
              required
            />
          </div>
        </div>
      </div>

      <div className={styles.formSection}>
        <h2 className={styles.sectionTitle}>Structural Parameters</h2>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="load">Design Load (kPa)</label>
            <input
              className={styles.input}
              type="number"
              id="load"
              name="load"
              min="0.5"
              max="10"
              step="0.1"
              value={load}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="fireRating">Fire Rating</label>
            <select
              className={styles.select}
              id="fireRating"
              name="fireRating"
              value={fireRating}
              onChange={handleChange}
            >
              <option value="none">None</option>
              <option value="30/30/30">30/30/30</option>
              <option value="60/60/60">60/60/60</option>
              <option value="90/90/90">90/90/90</option>
              <option value="120/120/120">120/120/120</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.formSection}>
        <h2 className={styles.sectionTitle}>Bay Configuration</h2>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="lengthwiseBays">Lengthwise Bays</label>
            <input
              className={styles.input}
              type="number"
              id="lengthwiseBays"
              name="lengthwiseBays"
              min="1"
              max="20"
              value={lengthwiseBays}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="widthwiseBays">Widthwise Bays</label>
            <input
              className={styles.input}
              type="number"
              id="widthwiseBays"
              name="widthwiseBays"
              min="1"
              max="20"
              value={widthwiseBays}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>
            <input
              type="checkbox"
              name="joistsRunLengthwise"
              checked={joistsRunLengthwise}
              onChange={handleChange}
            />
            Joists Run Lengthwise
          </label>
        </div>
      </div>

      <div className={styles.buttonGroup}>
        <button type="submit" className={styles.button}>Calculate</button>
      </div>
    </form>
  );
};

export default BuildingForm; 