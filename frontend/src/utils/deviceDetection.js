// Device detection utility for mobile/desktop routing

export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;

  // Check user agent for mobile indicators
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    'mobile',
    'android',
    'iphone',
    'ipod',
    'blackberry',
    'windows phone',
    'opera mini',
    'palm',
    'symbian',
  ];

  const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));

  // Check screen size (mobile typically < 768px width)
  const isMobileScreen = window.innerWidth < 768;

  // Check touch capability
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Return true if any mobile indicator is present
  return isMobileUA || (isMobileScreen && isTouchDevice);
};

export const isTabletDevice = () => {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent.toLowerCase();
  const tabletKeywords = ['ipad', 'tablet', 'kindle', 'playbook', 'silk'];

  const isTabletUA = tabletKeywords.some(keyword => userAgent.includes(keyword));
  const isTabletScreen = window.innerWidth >= 768 && window.innerWidth <= 1024;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return isTabletUA || (isTabletScreen && isTouchDevice);
};

export const isDesktopDevice = () => {
  return !isMobileDevice() && !isTabletDevice();
};

export const getDeviceType = () => {
  if (isMobileDevice()) return 'mobile';
  if (isTabletDevice()) return 'tablet';
  return 'desktop';
};
