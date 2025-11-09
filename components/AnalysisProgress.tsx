'use client';

import { useEffect, useState } from 'react';
import { getCurrentStage, formatAnalysisTime } from '@/lib/analysisStats';

interface AnalysisProgressProps {
  averageTime: number; // in milliseconds
  onComplete?: () => void;
}

export default function AnalysisProgress({
  averageTime,
  onComplete,
}: AnalysisProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentStage, setCurrentStage] = useState<{
    stage: 'connecting' | 'analyzing' | 'saving';
    label: string;
    percentage: number;
  }>({
    stage: 'connecting',
    label: 'Connecting to AI...',
    percentage: 0,
  });

  useEffect(() => {
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setElapsedTime(elapsed);

      const stage = getCurrentStage(elapsed, averageTime);
      setCurrentStage(stage);
    }, 100);

    return () => clearInterval(interval);
  }, [averageTime]);

  const percentage = Math.min(currentStage.percentage, 95);
  const estimatedTotal = averageTime > 0 ? averageTime : 20000;
  const isSlowWarning = elapsedTime > estimatedTotal * 2;

  return (
    <div className="w-full space-y-3">
      {/* Progress Bar */}
      <div className="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
        </div>
      </div>

      {/* Stage and Time Info */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {/* Animated spinner */}
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-medium text-gray-900 dark:text-white">
            {currentStage.label}
          </span>
        </div>

        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          <span className="font-mono">
            {formatAnalysisTime(elapsedTime)} elapsed
          </span>
          {averageTime > 0 && !isSlowWarning && (
            <span className="text-xs">
              (usually ~{formatAnalysisTime(averageTime)})
            </span>
          )}
        </div>
      </div>

      {/* Progress Percentage */}
      <div className="text-center">
        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          {Math.round(percentage)}%
        </span>
      </div>

      {/* Slow Warning */}
      {isSlowWarning && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-400">
            ⚠️ This is taking longer than usual. The AI might be processing a
            complex document.
          </p>
        </div>
      )}

      {/* Stage Indicators */}
      <div className="flex items-center justify-between pt-2">
        {[
          { stage: 'connecting', label: 'Connect' },
          { stage: 'analyzing', label: 'Analyze' },
          { stage: 'saving', label: 'Save' },
        ].map((stage, index) => {
          const isActive = currentStage.stage === stage.stage;
          const isPast =
            (stage.stage === 'connecting' &&
              currentStage.stage !== 'connecting') ||
            (stage.stage === 'analyzing' &&
              currentStage.stage === 'saving');

          return (
            <div key={stage.stage} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isPast
                      ? 'bg-green-500 text-white'
                      : isActive
                      ? 'bg-blue-500 text-white ring-4 ring-blue-200 dark:ring-blue-800'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {isPast ? (
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </div>
                <span
                  className={`text-xs mt-1 ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-gray-500 dark:text-gray-500'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
              {index < 2 && (
                <div
                  className={`w-16 h-1 mx-2 rounded transition-all duration-300 ${
                    isPast
                      ? 'bg-green-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                ></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

