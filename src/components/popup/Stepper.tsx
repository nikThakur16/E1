import React, { useState, useEffect } from "react";
import Button from "../comman/button";
import QuickTip from "./QuickTip";

type Step = {
  title: string;
  description: string;
};

interface StepperProps {
  steps: Step[];
  duration?: number; // milliseconds per step
  onComplete?: () => void;
  onStepChange?: (stepIndex: number) => void;
  title: string;
  autoStart?: boolean;
  // New props for dynamic control
  currentStep?: number;
  completedSteps?: number[];
  isProcessing?: boolean;
  onGenerateSummary?: () => void;
  summaryResult?: any;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  duration = 2000,
  onComplete,
  onStepChange,
  title,
  autoStart = false,
  // New props
  currentStep: externalCurrentStep,
  completedSteps: externalCompletedSteps = [],
  isProcessing = false,
  onGenerateSummary,
  summaryResult,
}) => {
  const [internalCurrentStep, setInternalCurrentStep] = useState(0);
  const [internalCompletedSteps, setInternalCompletedSteps] = useState<number[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showTip, setShowTip] = useState(false);

  // Use external state if provided, otherwise use internal state
  const currentStep = externalCurrentStep !== undefined ? externalCurrentStep : internalCurrentStep;
  const completedSteps = externalCompletedSteps.length > 0 ? externalCompletedSteps : internalCompletedSteps;

  const generateSummary = () => {
    if (isRunning || isProcessing) return;
    
    if (onGenerateSummary) {
      onGenerateSummary();
      return;
    }

    // Fallback to original behavior
    setIsRunning(true);
    setShowTip(true);

    const runStep = (step: number) => {
      if (step < steps.length) {
        setTimeout(() => {
          setInternalCompletedSteps((prev) => [...prev, step]);
          setInternalCurrentStep(step + 1);
          onStepChange?.(step);
          runStep(step + 1);
        }, duration);
      } else {
        onComplete?.();
        setIsRunning(false);
      }
    };

    runStep(internalCurrentStep);
  };

  // Auto-start effect
  useEffect(() => {
    if (autoStart) {
      generateSummary();
    }
  }, [autoStart]);

  // Show tip when processing starts
  useEffect(() => {
    if (isProcessing) {
      setShowTip(true);
    }
  }, [isProcessing]);

  return (
    <div className="bg-white flex flex-col justify-between rounded-[16px] min-h-[400px] p-6">
      <div>
        <h3 className="text-[#1F2937] font-bold text-[20px] mb-4">{title}</h3>

        <div className="flex flex-col gap-5">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(index);
            const isActive = isProcessing && index === currentStep - 1;

            return (
              <div key={index} className="flex items-start gap-3">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  {isActive && (
                    <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                  )}
                  <div
                    className={`w-7 h-7 flex items-center justify-center rounded-full border-2 text-sm font-medium
                      ${
                        isCompleted
                          ? "bg-[#56A305] text-white"
                          : isActive
                          ? "border-blue-500 text-blue-500"
                          : "border-gray-300 text-gray-400"
                      }`}
                  >
                    {isCompleted ? (
                      <svg
                        width="15"
                        height="12"
                        viewBox="0 0 15 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12.6035 2.5L5.60352 9.49969L2.10352 6"
                          stroke="white"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                </div>

                <div>
                  <p
                    className={`text-[16px] ${
                      isCompleted
                        ? "text-[#4B5563] font-bold"
                        : "text-[rgba(75,85,99,0.6)] font-[500]"
                    }`}
                  >
                    {step.title}
                  </p>
                  <p
                    className={`text-[14px] font-[400] ${
                      isCompleted ? "text-[#4B5563]" : "text-[rgba(75,85,99,0.6)]"
                    }`}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Show summary result if available */}
   
      </div>

      <div className="px-6">
        {!autoStart && !showTip && !isProcessing && (
          <Button 
            onClick={generateSummary} 
            title={isProcessing ? "Processing..." : "Generate Summary"} 
            disabled={isProcessing}
          />
        )}
        {showTip && <QuickTip />}
      </div>
    </div>
  );
};
