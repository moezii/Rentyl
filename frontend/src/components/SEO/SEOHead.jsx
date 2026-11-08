import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEOHead = ({
  title = 'Rentyl - Car Rental Management Software | Fleet Management System',
  description = "Transform your car rental business with Rentyl's comprehensive fleet management software. Track vehicles, manage bookings, automate maintenance, and boost revenue with our cloud-based platform.",
  keywords = 'car rental management software, fleet management system, vehicle rental software, car rental platform, fleet tracking, rental business management, automotive software, rental management system',
  canonical,
  ogImage = 'https://rentyl.app/og-image.jpg',
  ogType = 'website',
  twitterCard = 'summary_large_image',
  structuredData,
  noIndex = false,
  hreflang = [],
}) => {
  const fullTitle = title.includes('Rentyl') ? title : `${title} | Rentyl`;
  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://rentyl.app';
  const canonicalUrl = canonical || currentUrl;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="Rentyl" />
      <meta name="robots" content={noIndex ? 'noindex,nofollow' : 'index,follow'} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Rentyl" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:locale:alternate" content="ar_SA" />
      <meta property="og:locale:alternate" content="ms_MY" />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content="@rentyl" />
      <meta name="twitter:creator" content="@rentyl" />

      {/* Additional Meta Tags */}
      <meta name="theme-color" content="#3B82F6" />
      <meta name="msapplication-TileColor" content="#3B82F6" />
      <meta name="application-name" content="Rentyl" />
      <meta name="apple-mobile-web-app-title" content="Rentyl" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />

      {/* Mobile Optimization */}
      <meta name="format-detection" content="telephone=no" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"
      />
      <meta name="HandheldFriendly" content="true" />
      <meta name="MobileOptimized" content="width" />
      <meta name="apple-touch-fullscreen" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

      {/* Mobile App Deep Linking */}
      <meta name="apple-itunes-app" content="app-argument=https://rentyl.app" />
      <meta name="google-play-app" content="app-id=com.rentyl.app" />

      {/* Mobile Performance */}
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="application-name" content="Rentyl" />
      <meta name="msapplication-TileColor" content="#3B82F6" />
      <meta name="msapplication-TileImage" content="/logo-144x144.png" />
      <meta name="msapplication-config" content="/browserconfig.xml" />

      {/* Business Information */}
      <meta name="geo.region" content="CA" />
      <meta name="geo.placename" content="Ontario" />
      <meta name="geo.position" content="43.6532;-79.3832" />
      <meta name="ICBM" content="43.6532, -79.3832" />

      {/* Hreflang for multilingual support */}
      {hreflang.map((lang, index) => (
        <link key={index} rel="alternate" hrefLang={lang.lang} href={lang.href} />
      ))}

      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      )}
    </Helmet>
  );
};

export default SEOHead;
