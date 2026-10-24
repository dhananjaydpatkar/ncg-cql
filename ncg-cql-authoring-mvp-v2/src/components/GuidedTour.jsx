import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  RotateCcw,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Lightbulb,
} from 'lucide-react';
import { TOUR_STEPS } from '../lib/tourData';

export function GuidedTour({
  isOpen,
  onClose,
  setTab,
  currentTab,
  initialStep = 0,
}) {
  const [stepIndex, setStepIndex] = useState(initialStep);
  const [prevInitialStep, setPrevInitialStep] = useState(initialStep);
  const [targetRect, setTargetRect] = useState(null);
  const [popoverPos, setPopoverPos] = useState({ top: 120, left: 40 });
  const [arrowPos, setArrowPos] = useState({ left: 30, isTop: true });
  const popoverRef = useRef(null);

  // Sync stepIndex when initialStep changes without triggering effect setState warning
  if (prevInitialStep !== initialStep) {
    setPrevInitialStep(initialStep);
    setStepIndex(initialStep);
  }

  const currentStep = TOUR_STEPS[stepIndex] || TOUR_STEPS[0];

  // Update target bounding box and popover position
  const updatePosition = useCallback(() => {
    if (!isOpen) return;
    const targetSelector = currentStep.target;
    const el = targetSelector ? document.querySelector(targetSelector) : null;

    if (!el) {
      // Fallback: center in viewport
      setTargetRect(null);
      const w = 460;
      const h = 300;
      setPopoverPos({
        top: Math.max(20, (window.innerHeight - h) / 2),
        left: Math.max(20, (window.innerWidth - w) / 2),
      });
      setArrowPos({ left: 40, isTop: true });
      return;
    }

    // Measure element
    const rect = el.getBoundingClientRect();
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom,
      right: rect.right,
    });

    const popoverWidth = popoverRef.current ? popoverRef.current.offsetWidth : 460;
    const popoverHeight = popoverRef.current ? popoverRef.current.offsetHeight : 300;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // Prefer placing below if target is near top, otherwise above
    let top = 0;
    let isTop = true;
    if (rect.bottom + popoverHeight + 20 < viewportH) {
      // Place below target
      top = rect.bottom + 12;
      isTop = true;
    } else if (rect.top - popoverHeight - 20 > 0) {
      // Place above target
      top = rect.top - popoverHeight - 12;
      isTop = false;
    } else {
      // Centered fallback if tight
      top = Math.max(16, (viewportH - popoverHeight) / 2);
      isTop = true;
    }

    // Horizontal placement aligned with target center
    const targetCenter = rect.left + rect.width / 2;
    let left = targetCenter - popoverWidth / 2;

    // Clamp horizontally to viewport
    const minLeft = 16;
    const maxLeft = viewportW - popoverWidth - 16;
    left = Math.max(minLeft, Math.min(maxLeft, left));

    // Arrow relative to popover
    const arrowLeft = Math.max(24, Math.min(popoverWidth - 24, targetCenter - left));

    setPopoverPos({ top, left });
    setArrowPos({ left: arrowLeft, isTop });
  }, [isOpen, currentStep]);

  // Tab switching and element scrolling on step change
  useEffect(() => {
    if (!isOpen) return;

    if (currentStep.tab && currentStep.tab !== currentTab && typeof setTab === 'function') {
      setTab(currentStep.tab);
    }

    // Allow a tick for React tab render, then measure & scroll
    const timer = setTimeout(() => {
      const el = currentStep.target ? document.querySelector(currentStep.target) : null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      updatePosition();
    }, 60);

    return () => clearTimeout(timer);
  }, [isOpen, stepIndex, currentStep, currentTab, setTab, updatePosition]);

  // Listen to window resize and scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, updatePosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        if (stepIndex < TOUR_STEPS.length - 1) {
          setStepIndex((s) => s + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (stepIndex > 0) {
          setStepIndex((s) => s - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, stepIndex, onClose]);

  if (!isOpen) return null;

  const StepIcon = currentStep.icon || Sparkles;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  const nextStep = () => {
    if (stepIndex < TOUR_STEPS.length - 1) {
      setStepIndex((s) => s + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (stepIndex > 0) {
      setStepIndex((s) => s - 1);
    }
  };

  const goToStep = (idx) => {
    if (idx >= 0 && idx < TOUR_STEPS.length) {
      setStepIndex(idx);
    }
  };

  return (
    <div className="tour-root" role="dialog" aria-modal="true" aria-label="Guided Tour">
      {/* Spotlight SVG Mask Cutout */}
      <svg className="tour-spotlight-svg" aria-hidden="true">
        <defs>
          <mask id="tour-spotlight-mask">
            {/* Opaque white covers everything */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Cutout black hole over target element */}
            {targetRect && (
              <rect
                x={targetRect.left - 5}
                y={targetRect.top - 5}
                width={targetRect.width + 10}
                height={targetRect.height + 10}
                rx="8"
                ry="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Semi-transparent dark background with mask */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.65)"
          mask="url(#tour-spotlight-mask)"
          onClick={onClose}
        />
        {/* Focus border glow around highlighted target */}
        {targetRect && (
          <rect
            className="tour-focus-outline"
            x={targetRect.left - 5}
            y={targetRect.top - 5}
            width={targetRect.width + 10}
            height={targetRect.height + 10}
            rx="8"
            ry="8"
          />
        )}
      </svg>

      {/* Floating Tour Popover Box */}
      <div
        ref={popoverRef}
        className={`tour-popover ${arrowPos.isTop ? 'arrow-top' : 'arrow-bottom'}`}
        style={{
          top: `${popoverPos.top}px`,
          left: `${popoverPos.left}px`,
        }}
      >
        {/* Pointer Arrow */}
        {targetRect && (
          <div
            className={`tour-popover-arrow ${arrowPos.isTop ? 'top' : 'bottom'}`}
            style={{ left: `${arrowPos.left}px` }}
          />
        )}

        {/* Header Bar */}
        <div className="tour-popover-head">
          <div className="tour-head-left">
            <span className="tour-category-pill">{currentStep.category}</span>
            <span className="tour-step-counter">
              Step {stepIndex + 1} of {TOUR_STEPS.length}
            </span>
          </div>
          <div className="tour-head-actions">
            <button
              className="tour-icon-btn"
              title="Restart tour from step 1"
              onClick={() => goToStep(0)}
              aria-label="Restart tour"
            >
              <RotateCcw size={13} />
            </button>
            <button
              className="tour-icon-btn close"
              title="Close tour (Esc)"
              onClick={onClose}
              aria-label="Close tour"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="tour-popover-body">
          <div className="tour-title-row">
            <div className="tour-step-icon-wrap">
              <StepIcon size={18} />
            </div>
            <h3 className="tour-title">{currentStep.title}</h3>
          </div>

          <p className="tour-description">{currentStep.description}</p>

          {currentStep.tip && (
            <div className="tour-tip-box">
              <Lightbulb size={14} className="tour-tip-icon" />
              <div className="tour-tip-text">{currentStep.tip}</div>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="tour-popover-foot">
          <div className="tour-foot-left">
            {isLast ? (
              <button
                className="btn sm"
                onClick={() => goToStep(0)}
                title="Replay tour from step 1"
              >
                <RotateCcw size={12} /> Replay
              </button>
            ) : (
              <button className="btn sm ghost tour-skip-btn" onClick={onClose}>
                Skip
              </button>
            )}
          </div>

          {/* Interactive Step Dots */}
          <div className="tour-dots" role="tablist" aria-label="Tour steps">
            {TOUR_STEPS.map((s, idx) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={idx === stepIndex}
                className={`tour-dot ${idx === stepIndex ? 'active' : ''}`}
                onClick={() => goToStep(idx)}
                title={`Go to step ${idx + 1}: ${s.title}`}
              />
            ))}
          </div>

          <div className="tour-foot-right">
            <button
              className="btn sm"
              onClick={prevStep}
              disabled={isFirst}
              title="Previous step (Left Arrow)"
            >
              <ChevronLeft size={14} /> Back
            </button>

            {isLast ? (
              <button className="btn sm primary" onClick={onClose} title="Finish tour">
                <Check size={14} /> Done
              </button>
            ) : (
              <button className="btn sm primary" onClick={nextStep} title="Next step (Right Arrow)">
                Next <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
