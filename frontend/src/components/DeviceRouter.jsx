import React, { useEffect, useState } from 'react';
import { getDeviceType } from '../utils/deviceDetection';
import MobileHeader from './Layout/MobileHeader';

// Desktop Pages
import LandingPage from '../pages/LandingPage';
import FeaturesPage from '../pages/FeaturesPage';
import AboutPage from '../pages/AboutPage';
import ContactPage from '../pages/ContactPage';
import PricingPage from '../pages/PricingPage';

// Mobile Pages
import MobileLandingPage from '../pages/mobile/MobileLandingPage';
import MobileFeaturesPage from '../pages/mobile/MobileFeaturesPage';
import MobileAboutPage from '../pages/mobile/MobileAboutPage';
import MobileContactPage from '../pages/mobile/MobileContactPage';
import MobilePricingPage from '../pages/mobile/MobilePricingPage';

const DeviceRouter = ({ page, ...props }) => {
  const [deviceType, setDeviceType] = useState(() => {
    // Initialize with correct device type immediately
    if (typeof window !== 'undefined') {
      return getDeviceType();
    }
    return 'desktop';
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Only listen for window resize, don't re-detect on mount
    // (already initialized in useState)
    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const type = getDeviceType();
        setDeviceType(prevType => {
          // Only update if actually changed
          return type !== prevType ? type : prevType;
        });
      }, 150);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  // Route to appropriate page based on device type
  const isMobile = deviceType === 'mobile' || deviceType === 'tablet';

  // For mobile devices, render complete mobile layout (bypassing the outer Layout)
  if (isMobile) {
    const renderMobilePage = () => {
      switch (page) {
        case 'landing':
          return <MobileLandingPage {...props} />;
        case 'features':
          return <MobileFeaturesPage {...props} />;
        case 'about':
          return <MobileAboutPage {...props} />;
        case 'contact':
          return <MobileContactPage {...props} />;
        case 'pricing':
          return <MobilePricingPage {...props} />;
        default:
          return <MobileLandingPage {...props} />;
      }
    };

    // Return a portal-like structure that completely overrides the Layout
    return (
      <>
        {/* Hide only desktop header for mobile */}
        <style>{`
          @media (max-width: 768px) {
            header:not([data-mobile-header]) { display: none !important; }
            .mt-16 { margin-top: 0 !important; }
          }
        `}</style>
        <div
          className="fixed inset-0 z-[9999] bg-white"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <MobileHeader />
          <div className="pt-20 h-full overflow-y-auto">
            {' '}
            {/* Padding for fixed header */}
            {renderMobilePage()}
          </div>
        </div>
      </>
    );
  }

  // For desktop devices, just return the page content (will be wrapped by Layout in App.jsx)
  switch (page) {
    case 'landing':
      return <LandingPage {...props} />;
    case 'features':
      return <FeaturesPage {...props} />;
    case 'about':
      return <AboutPage {...props} />;
    case 'contact':
      return <ContactPage {...props} />;
    case 'pricing':
      return <PricingPage {...props} />;
    default:
      return <LandingPage {...props} />;
  }
};

export default DeviceRouter;
