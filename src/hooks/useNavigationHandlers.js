"use client";

import { useEffect, useCallback } from 'react';
import { useProjectManagement } from './useProjectManagement';

export function useNavigationHandlers() {
  // Get project management functionality
  const { saveCurrentState } = useProjectManagement();

  // Save state before unloading page
  const handleBeforeUnload = useCallback(() => {
    console.log('Page about to unload, saving current state...');
    saveCurrentState();
  }, [saveCurrentState]);

  // Save state on route change
  const handleRouteChange = useCallback(() => {
    console.log('Route changing, saving current state...');
    saveCurrentState();
  }, [saveCurrentState]);

  // Handle link clicks that might navigate away
  const handleLinkClick = useCallback(() => {
    console.log('Link clicked, saving current state...');
    saveCurrentState();
  }, [saveCurrentState]);

  // Add event listeners when component mounts
  useEffect(() => {
    // Add event listener for beforeunload
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // For Next.js route changes, we'd typically use the router here
    // Since we don't have direct router integration in this hook,
    // we'll attach to all links to catch potential navigation
    const links = document.querySelectorAll('a');
    links.forEach(link => {
      link.addEventListener('click', handleLinkClick);
    });
    
    // Clean up on unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      links.forEach(link => {
        link.removeEventListener('click', handleLinkClick);
      });
    };
  }, [handleBeforeUnload, handleLinkClick]);

  return {
    handleBeforeUnload,
    handleRouteChange,
    handleLinkClick
  };
} 