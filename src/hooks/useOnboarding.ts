import { useState, useCallback } from 'react';

const PREFIX = 'taskflow_onboarding_';

export interface TourStep {
  /** CSS selector for the target element to spotlight */
  targetSelector: string;
  /** Title for this step */
  title: string;
  /** Description for this step */
  description: string;
  /** Optional emoji icon */
  icon?: string;
  /** Which side to position the tooltip card */
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Hook for per-page onboarding tours.
 * @param pageKey — unique key per page, e.g. 'weeklyReports', 'analytics'
 */
export const useOnboarding = (pageKey: string = 'default') => {
  const storageKey = `${PREFIX}${pageKey}_completed`;
  const dismissedKey = `${PREFIX}${pageKey}_dismissed`;

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const hasCompleted = useCallback(() => {
    return localStorage.getItem(storageKey) === 'true';
  }, [storageKey]);

  const wasDismissed = useCallback(() => {
    return localStorage.getItem(dismissedKey) === 'true';
  }, [dismissedKey]);

  /** True if user has never seen this page's tour */
  const shouldShowOnboarding = useCallback(() => {
    return !hasCompleted() && !wasDismissed();
  }, [hasCompleted, wasDismissed]);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const endTour = useCallback((completed: boolean) => {
    setIsActive(false);
    setCurrentStep(0);
    if (completed) {
      localStorage.setItem(storageKey, 'true');
    } else {
      localStorage.setItem(dismissedKey, 'true');
    }
  }, [storageKey, dismissedKey]);

  const nextStep = useCallback((totalSteps: number) => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      endTour(true);
    }
  }, [currentStep, endTour]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const resetTour = useCallback(() => {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(dismissedKey);
  }, [storageKey, dismissedKey]);

  return {
    isActive,
    currentStep,
    hasCompleted,
    wasDismissed,
    shouldShowOnboarding,
    startTour,
    endTour,
    nextStep,
    prevStep,
    resetTour,
  };
};
