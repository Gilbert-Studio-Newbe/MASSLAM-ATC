import React from "react";

/**
 * Component to display MASSLAM mechanical properties
 */
export default function MasslamPropertiesDisplay({ properties }) {
  if (!properties) {
    return <div className="p-4">Loading properties...</div>;
  }
  
  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4">{properties.name}</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p><strong>Grade:</strong> {properties.grade}</p>
          <p><strong>Bending Strength:</strong> {properties.bendingStrength} MPa</p>
          <p><strong>Modulus:</strong> {properties.modulus} MPa</p>
          <p><strong>Density:</strong> {properties.density} kg/m³</p>
        </div>
        
        <div>
          <p><strong>Type:</strong> {properties.type}</p>
          <p><strong>Fire Rating:</strong> {properties.fireRating}</p>
          <p><strong>Applications:</strong> {properties.applications.join(", ")}</p>
        </div>
      </div>
    </div>
  );
}
