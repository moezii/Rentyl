import React, { useContext, useState } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import Header from './Header';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const { darkMode } = useContext(ThemeContext);
  const { user, loading } = useContext(AuthContext);
  const { isRTL } = useLanguage();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Determine background color based on auth state
  const getBackgroundColor = () => {
    if (loading) return '#020409';
    return user ? '#020409' : undefined;
  };

  return (
    <div
      className={`min-h-screen overflow-x-hidden transition-colors duration-300 ${
        user ? 'text-white' : `bg-white ${darkMode ? 'dark bg-black text-white' : ''}`
      }`}
      style={{
        backgroundColor: getBackgroundColor(),
      }}
    >
      {user ? (
        <>
          <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
          {/* Show Header only on mobile for authenticated users */}
          <div className="md:hidden">
            <Header onMenuClick={() => setSidebarOpen(true)} />
            {/* Add spacing for fixed header on mobile */}
            <div className="h-16"></div>
          </div>
        </>
      ) : (
        <Header />
      )}

      {user && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),\n                           linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)`,
              backgroundSize: '50px 50px',
            }}
          ></div>
        </div>
      )}
      <main
        className={`transition-all duration-300 ${
          user
            ? 'md:ml-64' // Sidebar offset stays on the left for all locales
            : 'mt-16' // Header offset for public pages
        }`}
      >
        {children}
      </main>
    </div>
  );
};

export default Layout;
