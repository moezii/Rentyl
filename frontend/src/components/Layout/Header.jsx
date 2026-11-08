// src/components/Layout/Header.jsx
import React, { useContext, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import LoginModal from '../Auth/LoginModal';
import LanguageSelector from '../LanguageSelector';
import footer1 from '../../assets/footer1.webp';

const LogoutIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
    />
  </svg>
);

const LoginIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
    />
  </svg>
);

const Header = ({ onMenuClick }) => {
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  const { user, logout } = useContext(AuthContext);
  const { t, isRTL } = useLanguage();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Check if we're on the landing-style pages (including login which uses landing layout)
  const isLandingPage =
    location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname === '/features' ||
    location.pathname === '/pricing' ||
    location.pathname === '/about' ||
    location.pathname === '/contact' ||
    location.pathname === '/book' ||
    location.pathname.startsWith('/booking');

  // Use landing visual theme whenever user is authenticated as well
  const useLandingTheme = isLandingPage || !!user;

  // Handle scroll event
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Reusable NavLink with active styling
  const NavLink = ({ to, children }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`relative px-4 py-3 text-lg font-medium transition-all duration-300 rounded-lg transform-gpu will-change-transform hover:-translate-y-0.5 ${
          isLandingPage
            ? `text-gray-300 hover:text-blue-400 hover:bg-blue-500/10 ${isActive ? 'font-semibold text-blue-400 bg-blue-500/10' : ''}`
            : `text-gray-700 hover:text-primary dark:text-gray-300 dark:hover:text-primary hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isActive ? 'font-semibold text-primary dark:text-primary bg-primary/5 dark:bg-primary/10' : ''}`
        }`}
      >
        <span className="relative z-10">{children}</span>
        {/* Active indicator */}
        {isActive && (
          <div
            className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 rounded-full ${isLandingPage ? 'bg-blue-400' : 'bg-primary'}`}
          ></div>
        )}
      </Link>
    );
  };

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 ${
        useLandingTheme
          ? `bg-gradient-to-br from-gray-900 via-black to-gray-900 ${scrolled ? 'backdrop-blur-xl border-b border-blue-500/20 shadow-lg shadow-blue-500/10' : ''}`
          : 'bg-white dark:bg-black shadow-sm'
      }`}
      style={useLandingTheme && scrolled ? { background: 'rgba(0, 0, 0, 0.95)' } : {}}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Brand & Mobile Menu */}
          <div className="flex items-center gap-4">
            {user && (
              <button
                onClick={onMenuClick}
                className="md:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                aria-label="Open menu"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>
            )}
            <Link to={user ? '/dashboard' : '/'} className="flex items-center">
              <img
                src={footer1}
                alt="Rentyl"
                className={`h-12 w-auto object-contain transition-all duration-1 ease-in-out ${isLandingPage ? 'brightness-150' : ''}`}
              />
            </Link>
          </div>

          {/* Nav Links */}
          <nav
            className={`hidden md:flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-8`}
          >
            {user ? (
              <>
                <NavLink to="/dashboard">{t('nav.dashboard')}</NavLink>
                <NavLink to="/cars">{t('nav.cars')}</NavLink>
                <NavLink to="/rentals">{t('nav.rentals')}</NavLink>
                <NavLink to="/calendar">{t('nav.calendar')}</NavLink>
                <NavLink to="/maintenance">{t('nav.maintenance')}</NavLink>
                <NavLink to="/analytics">{t('nav.analytics')}</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/">{t('nav.home')}</NavLink>
                <NavLink to="/features">{t('nav.features')}</NavLink>
                <NavLink to="/book">{t('nav.book') || 'Book'}</NavLink>
                <NavLink to="/pricing">{t('nav.pricing')}</NavLink>
                <NavLink to="/about">{t('nav.about')}</NavLink>
                <NavLink to="/contact">{t('nav.contact')}</NavLink>
              </>
            )}
          </nav>

          {/* Actions: Language & Auth */}
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {/* Language Selector */}
            <LanguageSelector variant={user ? 'default' : 'landing'} />

            {user ? (
              // Logged-in: show Logout
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className={`group flex items-center px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-all duration-300 hover:shadow-md hover:scale-105 font-medium ${isRTL ? 'space-x-reverse' : ''} space-x-2`}
              >
                <LogoutIcon className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
                <span>{t('nav.logout')}</span>
              </button>
            ) : (
              // Logged-out: show Login
              <button
                onClick={() => setShowLoginModal(true)}
                className={`group flex items-center px-6 py-2 rounded-lg transition-all duration-300 font-medium ${isRTL ? 'space-x-reverse' : ''} space-x-2 ${
                  useLandingTheme
                    ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300 border border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105'
                    : 'bg-primary text-white hover:bg-primary-dark hover:shadow-md hover:scale-105'
                }`}
              >
                <LoginIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                <span>{t('nav.login')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
      </AnimatePresence>
    </motion.header>
  );
};

export default Header;
