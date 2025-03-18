"use client";

/**
 * SaveProjectModal component for saving project details to local storage
 */
const SaveProjectModal = ({ 
  show, 
  onClose, 
  onSave, 
  projectDetails, 
  setProjectDetails 
}) => {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="apple-card max-w-md w-full">
        <div className="apple-card-header">
          <h2 className="text-xl font-semibold">Save Project</h2>
        </div>
        
        <div className="apple-card-body">
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--apple-text-secondary)' }}>Project Name</label>
              <input 
                type="text" 
                className="apple-input"
                value={projectDetails.name}
                onChange={(e) => setProjectDetails({...projectDetails, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--apple-text-secondary)' }}>Client</label>
              <input 
                type="text" 
                className="apple-input"
                value={projectDetails.client}
                onChange={(e) => setProjectDetails({...projectDetails, client: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--apple-text-secondary)' }}>Location</label>
              <input 
                type="text" 
                className="apple-input"
                value={projectDetails.location}
                onChange={(e) => setProjectDetails({...projectDetails, location: e.target.value})}
              />
            </div>
          </div>
        </div>
        
        <div className="apple-card-footer flex justify-end space-x-3">
          <button 
            className="apple-button apple-button-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="apple-button apple-button-primary"
            onClick={onSave}
          >
            Save Project
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveProjectModal; 