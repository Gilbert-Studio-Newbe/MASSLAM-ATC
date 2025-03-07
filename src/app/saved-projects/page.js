'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SavedProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Load saved projects from localStorage
    const loadProjects = () => {
      try {
        const savedProjects = localStorage.getItem('masslamProjects');
        if (savedProjects) {
          setProjects(JSON.parse(savedProjects));
        }
      } catch (error) {
        console.error('Error loading saved projects:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  const handleLoadProject = (project) => {
    // Store the selected project in localStorage to be loaded by the calculator
    localStorage.setItem('currentProject', JSON.stringify(project));
    router.push('/');
  };

  const handleDeleteProject = (projectId) => {
    if (confirm('Are you sure you want to delete this project?')) {
      const updatedProjects = projects.filter(project => project.id !== projectId);
      setProjects(updatedProjects);
      localStorage.setItem('masslamProjects', JSON.stringify(updatedProjects));
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Saved Projects</h1>
        <Link href="/" className="text-blue-600 hover:text-blue-800 flex items-center">
          &larr; Back to Member Calculator
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading saved projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <h2 className="text-xl font-semibold mb-4">No Saved Projects</h2>
          <p className="text-gray-600 mb-4">You haven't saved any projects yet.</p>
          <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
            Create New Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-2">{project.details.name}</h2>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  <strong>Client:</strong> {project.details.client || 'Not specified'}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Location:</strong> {project.details.location || 'Not specified'}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Date:</strong> {new Date(project.details.date).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Dimensions:</strong> {project.buildingLength}m × {project.buildingWidth}m
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Floors:</strong> {project.numFloors}
                </p>
              </div>
              <div className="flex justify-between">
                <button
                  onClick={() => handleLoadProject(project)}
                  className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
                >
                  Load Project
                </button>
                <button
                  onClick={() => handleDeleteProject(project.id)}
                  className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 