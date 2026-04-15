'use client';

import { useState, useEffect, useCallback } from 'react';

interface TutorialStep {
  title: string;
  description: string;
  icon: string;
  targetSelector: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const STEPS: TutorialStep[] = [
  {
    title: '채팅으로 AI에게 요청하세요',
    description: '"버튼 색 바꿔줘", "로그인 페이지 추가해줘"\n이런 식으로 입력하면 AI가 코드를 수정합니다.',
    icon: '💬',
    targetSelector: '[data-tutorial="chat-input"]',
    position: 'top',
  },
  {
    title: '편집 버튼으로 직접 수정',
    description: '이 버튼을 켜면 편집 모드가 활성화됩니다.\n미리보기에서 텍스트, 색상, 이미지를\n직접 클릭해서 수정할 수 있어요!',
    icon: '✏️',
    targetSelector: '[data-tutorial="edit-btn"]',
    position: 'bottom',
  },
  {
    title: '미리보기에서 확인',
    description: '수정한 내용이 여기에 바로 반영됩니다.\n모바일/데스크톱 전환도 가능해요.\n편집 모드에서 요소를 클릭하면 바로 수정!',
    icon: '📱',
    targetSelector: '[data-tutorial="preview"]',
    position: 'left',
  },
  {
    title: '온라인 게시로 배포하기',
    description: '수정이 끝나면 이 버튼을 꼭 눌러주세요!\n실제 URL에 반영됩니다.\n게시 안 하면 미리보기에서만 보여요.',
    icon: '🌐',
    targetSelector: '[data-tutorial="deploy-btn"]',
    position: 'top',
  },
  {
    title: '코드 다운로드',
    description: '완성된 앱의 전체 코드를 ZIP으로 받을 수 있어요.\n코드 소유권은 100% 고객님 것입니다!',
    icon: '📦',
    targetSelector: '[data-tutorial="download-btn"]',
    position: 'top',
  },
  {
    title: '언제든 사용법 다시 보기',
    description: '여기 "사용법" 버튼을 누르면\n사용법 가이드를 언제든 다시 볼 수 있어요.',
    icon: '📖',
    targetSelector: '[data-tutorial="help-btn"]',
    position: 'bottom',
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

  const pad = 8;
  const cutout = targetRect
    ? {
        top: targetRect.top - pad,
        left: targetRect.left - pad,
        width: targetRect.width + pad * 2,
        height: targetRect.height + pad * 2,
      }
    : null;

  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
    const margin = 16;
    switch (step.position) {
      case 'top':
        return {
          bottom: window.innerHeight - targetRect.top + margin,
          left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 380)),
        };
      case 'bottom':
        return {
          top: targetRect.bottom + margin,
          left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 380)),
        };
      case 'left':
        return {
          top: Math.max(16, targetRect.top),
          right: window.innerWidth - targetRect.left + margin,
        };
      case 'right':
        return {
          top: Math.max(16, targetRect.top),
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
          fill="rgba(0,0,0,0.6)"
          mask="url(#tutorial-mask)"
        />
      </svg>

      {/* Highlight border */}
      {cutout && (
        <div
          className="absolute border-2 border-[var(--toss-blue)] rounded-xl pointer-events-none"
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
        <div className="bg-[var(--bg-secondary)] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 shadow-2xl max-w-[360px]"
          style={{ backdropFilter: 'blur(12px)' }}>
          {/* Step number + icon + title */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--toss-blue)] text-white text-sm font-bold flex-shrink-0">
              {currentStep + 1}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{step.icon}</span>
              <h3 className="text-white font-bold text-[16px] leading-tight">{step.title}</h3>
            </div>
          </div>

          {/* Description */}
          <p className="text-[var(--text-secondary)] text-[14px] leading-relaxed whitespace-pre-line mb-5 pl-11">
            {step.description}
          </p>

          {/* Step indicator + buttons */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i === currentStep
                      ? 'bg-[var(--toss-blue)] w-5'
                      : i < currentStep
                        ? 'bg-[var(--toss-blue)]/40 w-2'
                        : 'bg-[rgba(255,255,255,0.15)] w-2'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDone}
                className="px-3 py-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
              >
                건너뛰기
              </button>
              <button
                onClick={handleNext}
                className="px-5 py-2.5 bg-[var(--toss-blue)] hover:bg-[#1b6ff5] text-white text-sm font-bold rounded-lg transition-colors"
              >
                {isLast ? '완료!' : '다음 →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
