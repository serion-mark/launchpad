'use client';

import { useState, useEffect, useCallback } from 'react';

interface TutorialStep {
  title: string;
  description: string;
  icon: string;
  targetSelector: string; // CSS selector for highlight target
  position: 'top' | 'bottom' | 'left' | 'right';
}

const STEPS: TutorialStep[] = [
  {
    title: '채팅으로 수정하세요',
    description: '"버튼 색 바꿔줘", "로그인 페이지 추가해줘"\n입력하면 AI가 코드를 수정합니다',
    icon: '💬',
    targetSelector: '[data-tutorial="chat-input"]',
    position: 'top',
  },
  {
    title: '클릭으로 직접 수정',
    description: '미리보기에서 텍스트나 요소를 클릭하면\n바로 수정할 수 있어요',
    icon: '✏️',
    targetSelector: '[data-tutorial="preview"]',
    position: 'left',
  },
  {
    title: '온라인 게시',
    description: '완성한 앱을 인터넷에 게시하면\n누구나 접속할 수 있어요\n나만의 URL이 생성됩니다',
    icon: '🌐',
    targetSelector: '[data-tutorial="deploy-btn"]',
    position: 'top',
  },
  {
    title: '코드 다운로드',
    description: '만든 앱의 전체 코드를 받아서\n개발자에게 전달할 수 있어요\n코드 소유권은 100% 고객님 것!',
    icon: '📦',
    targetSelector: '[data-tutorial="download-btn"]',
    position: 'top',
  },
];

interface BuilderTutorialProps {
  onComplete: () => void;
}

export default function BuilderTutorial({ onComplete }: BuilderTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const updateTargetRect = useCallback(() => {
    const step = STEPS[currentStep];
    if (!step) return;
    const el = document.querySelector(step.targetSelector);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    updateTargetRect();
    window.addEventListener('resize', updateTargetRect);
    return () => window.removeEventListener('resize', updateTargetRect);
  }, [updateTargetRect]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleDone();
    }
  };

  const handleDone = () => {
    localStorage.setItem('foundry_tutorial_done', '1');
    onComplete();
  };

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  // Highlight cutout position
  const pad = 8;
  const cutout = targetRect
    ? {
        top: targetRect.top - pad,
        left: targetRect.left - pad,
        width: targetRect.width + pad * 2,
        height: targetRect.height + pad * 2,
      }
    : null;

  // Tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
    const margin = 16;
    switch (step.position) {
      case 'top':
        return {
          bottom: window.innerHeight - targetRect.top + margin,
          left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 340)),
        };
      case 'bottom':
        return {
          top: targetRect.bottom + margin,
          left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 340)),
        };
      case 'left':
        return {
          top: targetRect.top,
          right: window.innerWidth - targetRect.left + margin,
        };
      case 'right':
        return {
          top: targetRect.top,
          left: targetRect.right + margin,
        };
    }
  };

  return (
    <div className="fixed inset-0 z-[100000]">
      {/* Overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'auto' }}>
        <defs>
          <mask id="tutorial-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {cutout && (
              <rect
                x={cutout.left}
                y={cutout.top}
                width={cutout.width}
                height={cutout.height}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(0,0,0,0.65)"
          mask="url(#tutorial-mask)"
        />
      </svg>

      {/* Highlight border */}
      {cutout && (
        <div
          className="absolute border-2 border-[#3182f6] rounded-xl pointer-events-none"
          style={{
            top: cutout.top,
            left: cutout.left,
            width: cutout.width,
            height: cutout.height,
            boxShadow: '0 0 0 4px rgba(49,130,246,0.2), 0 0 20px rgba(49,130,246,0.3)',
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute z-10"
        style={{ ...getTooltipStyle(), pointerEvents: 'auto' }}
      >
        <div className="bg-[#1b1b21] border border-[rgba(255,255,255,0.1)] rounded-2xl p-5 shadow-2xl max-w-[320px]"
          style={{ backdropFilter: 'blur(12px)' }}>
          {/* Step icon + title */}
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-2xl">{step.icon}</span>
            <h3 className="text-white font-bold text-base">{step.title}</h3>
          </div>

          {/* Description */}
          <p className="text-[#8b95a1] text-sm leading-relaxed whitespace-pre-line mb-5">
            {step.description}
          </p>

          {/* Step indicator + buttons */}
          <div className="flex items-center justify-between">
            {/* Step dots */}
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentStep
                      ? 'bg-[#3182f6] w-5'
                      : i < currentStep
                        ? 'bg-[#3182f6]/40'
                        : 'bg-[rgba(255,255,255,0.15)]'
                  }`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleDone}
                className="px-3 py-1.5 text-xs text-[#6b7684] hover:text-[#8b95a1] transition-colors"
              >
                건너뛰기
              </button>
              <button
                onClick={handleNext}
                className="px-5 py-2 bg-[#3182f6] hover:bg-[#1b6ff5] text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {isLast ? '시작하기!' : '다음 →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
