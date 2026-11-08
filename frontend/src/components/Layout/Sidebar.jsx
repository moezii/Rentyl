import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  KeyIcon,
  CalendarIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
  UsersIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import favicon from '../../assets/background.webp';
import LanguageSelector from '../LanguageSelector';

const Sidebar = ({ isOpen, onClose }) => {
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  const { logout } = useContext(AuthContext);
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: t('nav.dashboard'), icon: HomeIcon },
    { path: '/cars', label: t('nav.cars'), icon: Cog6ToothIcon },
    { path: '/clients', label: t('nav.clients'), icon: UsersIcon },
    { path: '/rentals', label: t('nav.rentals'), icon: KeyIcon },
    { path: '/calendar', label: t('nav.calendar'), icon: CalendarIcon },
    { path: '/maintenance', label: t('nav.maintenance'), icon: WrenchScrewdriverIcon },
    { path: '/analytics', label: t('nav.analytics'), icon: ChartBarIcon },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 z-40 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header with Logo */}
        <div className="h-16 border-b border-gray-100 dark:border-gray-800 px-6 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center">
            <img
              src={favicon}
              alt="Rentyl"
              className="h-10 w-10 object-contain hover:scale-105 transition-all"
            />
          </Link>
          <button
            onClick={onClose}
            className="md:hidden p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-6 px-3">
          <div className="space-y-1">
            {navItems.map(item => {
              const isActive = location.pathname.startsWith(item.path);
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => onClose && onClose()}
                  className={`
                                        w-full px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium transition-all duration-200
                                        ${
                                          isActive
                                            ? 'bg-primary text-white shadow-md shadow-primary/30'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/50 hover:text-primary dark:hover:text-primary'
                                        }
                                    `}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`}
                  />
                  <span className="flex-1 text-left">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
          {/* Language Selector */}
          <div className="mb-4 px-2">
            <LanguageSelector variant="sidebar" className="w-full" />
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 flex items-center gap-3 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
