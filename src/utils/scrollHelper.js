/**
 * Helper functions for smooth scrolling
 */

/**
 * Smoothly scroll to a section of the page
 * @param {HTMLElement} element - The element to scroll to
 * @param {Object} options - Scrolling options
 */
export const scrollToElement = (element, options = {}) => {
  if (!element) return;
  
  const defaultOptions = {
    behavior: 'smooth',
    block: 'start',
    offset: -20 // Slight offset to show section header
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  // First do the native scrollIntoView
  element.scrollIntoView({
    behavior: mergedOptions.behavior,
    block: mergedOptions.block
  });
  
  // Then apply any offset
  if (mergedOptions.offset) {
    setTimeout(() => {
      window.scrollBy({
        top: mergedOptions.offset,
        behavior: mergedOptions.behavior
      });
    }, 100);
  }
};

/**
 * Add a click handler to toggle section visibility with proper scrolling
 * @param {boolean} isVisible - Current visibility state
 * @param {Function} setVisibility - Function to toggle visibility
 * @param {React.RefObject} elementRef - Ref to element that should be scrolled to
 */
export const createSectionToggleHandler = (isVisible, setVisibility, elementRef) => {
  return () => {
    // If section is currently hidden, toggle visibility and then scroll
    if (!isVisible) {
      setVisibility(true);
      setTimeout(() => {
        if (elementRef.current) {
          scrollToElement(elementRef.current);
        }
      }, 50); // Short delay to ensure DOM is updated
    } else {
      // Just toggle visibility if hiding
      setVisibility(false);
    }
  };
};

/**
 * Check if an element is in the viewport
 * @param {HTMLElement} element - The element to check
 * @returns {boolean} - True if the element is at least partially visible
 */
export const isElementInViewport = (element) => {
  if (!element) return false;
  
  const rect = element.getBoundingClientRect();
  
  return (
    rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.bottom >= 0
  );
};