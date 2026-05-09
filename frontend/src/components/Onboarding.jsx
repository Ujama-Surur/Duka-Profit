import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Onboarding = ({ onComplete, user }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSkipped, setIsSkipped] = useState(false);

  const steps = [
    {
      id: 'welcome',
      title: t('welcomeToDukaProfit'),
      description: t('onboardingWelcomeDesc'),
      icon: '🎉',
      action: t('getStarted')
    },
    {
      id: 'addProduct',
      title: t('addYourFirstProduct'),
      description: t('onboardingProductDesc'),
      icon: '📦',
      action: t('addProduct')
    },
    {
      id: 'firstSale',
      title: t('recordFirstSale'),
      description: t('onboardingSaleDesc'),
      icon: '💰',
      action: t('recordSale')
    },
    {
      id: 'explore',
      title: t('exploreFeatures'),
      description: t('onboardingExploreDesc'),
      icon: '🚀',
      action: t('exploreDashboard')
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    setIsSkipped(true);
    handleComplete();
  };

  const handleComplete = () => {
    // Mark onboarding as completed
    localStorage.setItem('duka_onboarding_completed', 'true');
    if (onComplete) {
      onComplete();
    }
  };

  const handleStepAction = () => {
    const step = steps[currentStep];
    
    switch (step.id) {
      case 'addProduct':
        navigate('/products');
        break;
      case 'firstSale':
        navigate('/sales');
        break;
      case 'explore':
        navigate('/dashboard');
        break;
      default:
        handleNext();
        break;
    }
  };

  // Check if onboarding should be shown
  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('duka_onboarding_completed');
    const hasProducts = user?.productsCount > 0;
    const hasSales = user?.salesCount > 0;
    
    if (hasCompletedOnboarding || (hasProducts && hasSales)) {
      if (onComplete) {
        onComplete();
      }
    }
  }, [user, onComplete]);

  const step = steps[currentStep];

  if (isSkipped) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div 
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '40px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)',
          position: 'relative'
        }}
        role="document"
      >
        {/* Skip button */}
        <button
          onClick={handleSkip}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            fontSize: '14px',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '8px'
          }}
          aria-label="Skip onboarding"
        >
          {t('skip')} ×
        </button>

        {/* Progress indicator */}
        <div 
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '32px',
            gap: '8px'
          }}
          role="progressbar"
          aria-valuenow={currentStep + 1}
          aria-valuemin={1}
          aria-valuemax={steps.length}
        >
          {steps.map((_, index) => (
            <div
              key={index}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: index <= currentStep ? 'var(--green-primary)' : 'var(--border)',
                transition: 'var(--transition)'
              }}
            />
          ))}
        </div>

        {/* Step content */}
        <div style={{ textAlign: 'center' }}>
          <div 
            style={{
              fontSize: '64px',
              marginBottom: '24px',
              lineHeight: 1
            }}
          >
            {step.icon}
          </div>
          
          <h2 
            id="onboarding-title"
            style={{
              fontSize: '24px',
              fontWeight: '700',
              marginBottom: '16px',
              color: 'var(--text)'
            }}
          >
            {step.title}
          </h2>
          
          <p 
            style={{
              fontSize: '16px',
              color: 'var(--text-muted)',
              marginBottom: '32px',
              lineHeight: '1.5'
            }}
          >
            {step.description}
          </p>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {t('back')}
              </button>
            )}
            
            <button
              onClick={handleStepAction}
              style={{
                padding: '12px 32px',
                background: 'var(--green-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
            >
              {step.action}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
