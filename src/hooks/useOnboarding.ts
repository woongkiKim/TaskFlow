import { useState, useCallback } from 'react';

const STORAGE_KEY = 'taskflow_onboarding_completed';
const DISMISSED_KEY = 'taskflow_onboarding_dismissed';

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

export const useOnboarding = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const hasCompleted = useCallback(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }, []);

  const wasDismissed = useCallback(() => {
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  }, []);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const endTour = useCallback((completed: boolean) => {
    setIsActive(false);
    setCurrentStep(0);
    if (completed) {
      localStorage.setItem(STORAGE_KEY, 'true');
    } else {
      localStorage.setItem(DISMISSED_KEY, 'true');
    }
  }, []);

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
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DISMISSED_KEY);
  }, []);

  return {
    isActive,
    currentStep,
    hasCompleted,
    wasDismissed,
    startTour,
    endTour,
    nextStep,
    prevStep,
    resetTour,
  };
};
