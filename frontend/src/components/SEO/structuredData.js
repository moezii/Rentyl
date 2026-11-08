// Structured Data (Schema.org) templates for SEO

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Rentyl',
  alternateName: 'Rentyl Car Rental Management',
  url: 'https://rentyl.app',
  logo: 'https://rentyl.app/logo.png',
  description:
    'Leading car rental management software platform providing comprehensive fleet management solutions for rental businesses worldwide.',
  foundingDate: '2024',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    email: 'support@rentyl.app',
    availableLanguage: ['English', 'Arabic', 'Malay'],
  },
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'CA',
    addressRegion: 'Ontario',
  },
  sameAs: ['https://www.linkedin.com/company/rentyl', 'https://twitter.com/rentyl'],
};

export const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Rentyl Car Rental Management Software',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web Browser',
  description:
    'Comprehensive car rental management software with fleet tracking, booking management, maintenance scheduling, and analytics.',
  offers: {
    '@type': 'Offer',
    price: 'Contact for pricing',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Rentyl',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '150',
    bestRating: '5',
  },
  featureList: [
    'Fleet Management',
    'Booking Management',
    'Maintenance Tracking',
    'Financial Analytics',
    'Customer Management',
    'Mobile App',
    '24/7 Support',
    'Cloud-based Platform',
  ],
};

export const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Rentyl',
  image: 'https://rentyl.app/logo.png',
  email: 'support@rentyl.app',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'CA',
    addressRegion: 'Ontario',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 43.6532,
    longitude: -79.3832,
  },
  url: 'https://rentyl.app',
  priceRange: '$$',
  openingHours: 'Mo-Fr 09:00-17:00',
};

export const faqSchema = faqs => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(faq => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
});

export const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Car Rental Management Software',
  description: 'Complete fleet management solution for car rental businesses',
  provider: {
    '@type': 'Organization',
    name: 'Rentyl',
  },
  areaServed: 'Worldwide',
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Rentyl Services',
    itemListElement: [
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Fleet Management',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Booking Management',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Maintenance Tracking',
        },
      },
    ],
  },
};

// Mobile Application Schema for PWA
export const mobileApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'MobileApplication',
  name: 'Rentyl Mobile',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'iOS, Android, Web',
  description:
    'Mobile app for car rental management with real-time fleet tracking, booking management, and analytics.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Rentyl',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    ratingCount: '75',
    bestRating: '5',
  },
  featureList: [
    'Real-time Fleet Tracking',
    'Mobile Booking Management',
    'Customer Communication',
    'Digital Vehicle Inspection',
    'Push Notifications',
    'Offline Mode',
    'Quick Access Analytics',
    'Multi-language Support',
  ],
  downloadUrl: 'https://rentyl.app',
  installUrl: 'https://rentyl.app',
  screenshot: 'https://rentyl.app/mobile-screenshot.jpg',
  softwareVersion: '2.0',
  releaseNotes: 'Enhanced mobile experience with offline capabilities and improved analytics',
};

// Mobile Web App Schema
export const webApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Rentyl Web App',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web Browser',
  description: 'Progressive Web App for car rental management accessible on all devices.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Rentyl',
  },
  url: 'https://rentyl.app',
  browserRequirements: 'Requires JavaScript. Requires HTML5.',
  featureList: [
    'Responsive Design',
    'Progressive Web App',
    'Offline Functionality',
    'Push Notifications',
    'Mobile-First Interface',
    'Cross-Platform Compatibility',
  ],
};
