import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import LoginModal from '../components/Auth/LoginModal';
import SEOHead from '../components/SEO/SEOHead';
import { organizationSchema, softwareApplicationSchema } from '../components/SEO/structuredData';
import footer1 from '../assets/footer1.webp';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const LandingPage = ({ initialShowLogin = false }) => {
  const { t, isRTL } = useLanguage();
  const [showLoginModal, setShowLoginModal] = useState(initialShowLogin);
  const [activeModal, setActiveModal] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [typingLog, setTypingLog] = useState(null);
  const [animatedStats, setAnimatedStats] = useState({
    totalRevenue: 0,
    activeRentals: 0,
    totalCars: 0,
    satisfaction: 0,
  });

  const openModal = modalType => {
    setActiveModal(modalType);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  // Simulate live data updates - random fluctuations with upward trend
  useEffect(() => {
    // Initialize with pre-filled historical data - SHARP PEAKS AND VALLEYS
    const initialData = Array.from({ length: 150 }, (_, i) => {
      const basePrice = 15000 + i * 50;
      const randomJump = (Math.random() - 0.5) * 5000;
      return Math.max(10000, Math.min(40000, basePrice + randomJump));
    });
    setRevenueData(initialData);

    let baseValue = initialData[initialData.length - 1];

    const interval = setInterval(() => {
      setRevenueData(prev => {
        // Sharp random movements - big jumps up and down
        const change = (Math.random() - 0.4) * 3000;
        baseValue += change;
        baseValue = Math.max(10000, Math.min(50000, baseValue));
        const newData = [...prev, baseValue].slice(-150);
        return newData;
      });
    }, 400);

    return () => clearInterval(interval);
  }, []);

  // Generate live system logs with typing effect
  useEffect(() => {
    const logTemplates = [
      {
        type: 'info',
        msg: { en: 'New booking confirmed', ar: 'تم تأكيد الحجز الجديد' },
        detail: 'BMW X5 #4523',
      },
      {
        type: 'info',
        msg: { en: 'Client registered', ar: 'تم تسجيل العميل' },
        detail: { en: 'Premium account activated', ar: 'تم تفعيل الحساب المميز' },
      },
      {
        type: 'revenue',
        msg: { en: 'Payment received', ar: 'تم استلام الدفع' },
        detail: { en: '+$450.00 • Status: Confirmed', ar: '+450.00 ر.ع • الحالة: مؤكد' },
      },
      {
        type: 'revenue',
        msg: { en: 'Transaction completed', ar: 'اكتملت المعاملة' },
        detail: { en: '+$780.00 • Wire transfer', ar: '+780.00 ر.ع • تحويل بنكي' },
      },
      {
        type: 'warn',
        msg: { en: 'Maintenance required', ar: 'الصيانة مطلوبة' },
        detail: 'Tesla Model 3 #2891',
      },
      {
        type: 'warn',
        msg: { en: 'Low fuel alert', ar: 'تنبيه انخفاض الوقود' },
        detail: 'Mercedes E-Class #5612',
      },
      {
        type: 'info',
        msg: { en: 'Vehicle returned', ar: 'تم إرجاع المركبة' },
        detail: 'Audi A4 #3345',
      },
      {
        type: 'revenue',
        msg: { en: 'Deposit received', ar: 'تم استلام الوديعة' },
        detail: { en: '+$1,200.00', ar: '+1,200.00 ر.ع • نقداً' },
      },
      {
        type: 'warn',
        msg: { en: 'Insurance expiring', ar: 'انتهاء صلاحية التأمين' },
        detail: 'Toyota Camry #7821',
      },
      {
        type: 'info',
        msg: { en: 'New rental started', ar: 'بدأ إيجار جديد' },
        detail: 'Honda Civic #9012',
      },
    ];

    let typeInterval = null;
    let isTyping = false;

    const addNewLog = () => {
      if (isTyping) return;

      isTyping = true;
      const randomLog = logTemplates[Math.floor(Math.random() * logTemplates.length)];
      const timestamp = new Date().toLocaleTimeString();

      // Get localized strings
      const currentLang = isRTL ? 'ar' : 'en';
      const msg = typeof randomLog.msg === 'object' ? randomLog.msg[currentLang] : randomLog.msg;
      const detail =
        typeof randomLog.detail === 'object' ? randomLog.detail[currentLang] : randomLog.detail;

      const fullLog = {
        type: randomLog.type,
        msg,
        detail,
        timestamp,
        id: Date.now(),
      };

      // Start typing animation
      setTypingLog({ ...fullLog, typedMsg: '', typedDetail: '' });

      // Type the message character by character
      const msgChars = msg.split('');
      const detailChars = detail.split('');
      let msgIndex = 0;
      let detailIndex = 0;

      typeInterval = setInterval(() => {
        if (msgIndex < msgChars.length) {
          msgIndex++;
          setTypingLog(prev =>
            prev ? { ...prev, typedMsg: msgChars.slice(0, msgIndex).join('') } : null
          );
        } else if (detailIndex < detailChars.length) {
          detailIndex++;
          setTypingLog(prev =>
            prev ? { ...prev, typedDetail: detailChars.slice(0, detailIndex).join('') } : null
          );
        } else {
          clearInterval(typeInterval);
          typeInterval = null;
          // Add completed log to the list
          setSystemLogs(prevLogs => [fullLog, ...prevLogs].slice(0, 4));
          setTypingLog(null);
          isTyping = false;
        }
      }, 30);
    };

    // Add first log immediately
    const firstTimeout = setTimeout(addNewLog, 1000);

    // Add new logs periodically
    const interval = setInterval(() => {
      if (!isTyping) {
        addNewLog();
      }
    }, 6000);

    return () => {
      clearTimeout(firstTimeout);
      clearInterval(interval);
      if (typeInterval) clearInterval(typeInterval);
    };
  }, [isRTL]);

  // Animate stats on mount
  useEffect(() => {
    const targets = {
      totalRevenue: 247500,
      activeRentals: 142,
      totalCars: 89,
      satisfaction: 98,
    };

    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      setAnimatedStats({
        totalRevenue: Math.floor(targets.totalRevenue * progress),
        activeRentals: Math.floor(targets.activeRentals * progress),
        totalCars: Math.floor(targets.totalCars * progress),
        satisfaction: Math.floor(targets.satisfaction * progress),
      });

      if (currentStep >= steps) {
        clearInterval(interval);
        setAnimatedStats(targets);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, []);

  const lineChartData = {
    labels: revenueData.map(() => ''),
    datasets: [
      {
        label: 'Revenue ($)',
        data: revenueData,
        borderColor: '#3b82f6',
        backgroundColor: context => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
          gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.2)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
          return gradient;
        },
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHitRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    scales: {
      x: {
        display: false,
        grid: {
          display: false,
        },
      },
      y: {
        display: true,
        position: 'right',
        grid: {
          color: 'rgba(59, 130, 246, 0.1)',
          borderDash: [3, 3],
          drawBorder: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: '#3b82f6',
          font: {
            size: 11,
            weight: '500',
          },
          padding: 10,
          callback: function (value) {
            return '$' + (value / 1000).toFixed(0) + 'k';
          },
        },
      },
    },
    animation: {
      duration: 0,
      easing: 'linear',
    },
    transitions: {
      active: {
        animation: {
          duration: 0,
        },
      },
    },
    elements: {
      line: {
        borderJoinStyle: 'round',
      },
    },
  };

  // SEO structured data combining organization and software schemas
  const combinedStructuredData = [organizationSchema, softwareApplicationSchema];

  return (
    <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 min-h-screen">
      <SEOHead
        title="Rentyl - Car Rental Management Software"
        description="Transform your car rental business with Rentyl's fleet management software. Track vehicles, manage bookings, and automate maintenance."
        keywords="car rental management, fleet management, vehicle rental software, rental business"
        canonical="https://rentyl.app/"
        structuredData={combinedStructuredData}
        hreflang={[
          { lang: 'en', href: 'https://rentyl.app/' },
          { lang: 'ar', href: 'https://rentyl.app/ar/' },
          { lang: 'ms', href: 'https://rentyl.app/ms/' },
        ]}
      />

      {/* Visually hidden h1 for SEO */}
      <h1 className="sr-only">{t('landing.title')}</h1>

      {/* Animated Background Grid */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        ></div>
      </div>

      {/* Hero Section */}
      <div className="relative min-h-screen pt-24 pb-20 px-4 overflow-hidden">
        <div className="container mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-12">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="lg:w-5/12 text-white"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-block mb-4 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full"
              >
                <span className="text-blue-400 text-sm font-semibold tracking-wide">
                  {t('landing.nextGenFleet')}
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl lg:text-5xl xl:text-6xl font-bold mb-6 leading-tight bg-gradient-to-r from-gray-200 via-blue-100 to-gray-200 bg-clip-text text-transparent"
              >
                {t('landing.title')}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg text-gray-300 mb-8 max-w-lg leading-relaxed"
              >
                {t('landing.subtitle')}
              </motion.p>

              {/* Animated Stats */}
              <div className="grid grid-cols-2 gap-4 mb-8 max-w-lg">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-gray-800/50 backdrop-blur-sm border border-blue-500/20 rounded-xl p-4"
                >
                  <div className="text-3xl font-bold text-blue-400">
                    ${(animatedStats.totalRevenue / 1000).toFixed(0)}K
                  </div>
                  <div className="text-gray-400 text-sm">{t('landing.monthlyRevenue')}</div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-gray-800/50 backdrop-blur-sm border border-blue-500/20 rounded-xl p-4"
                >
                  <div className="text-3xl font-bold text-blue-400">
                    {animatedStats.activeRentals}
                  </div>
                  <div className="text-gray-400 text-sm">{t('landing.activeRentals')}</div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-gray-800/50 backdrop-blur-sm border border-blue-500/20 rounded-xl p-4"
                >
                  <div className="text-3xl font-bold text-blue-400">{animatedStats.totalCars}</div>
                  <div className="text-gray-400 text-sm">{t('landing.fleetVehicles')}</div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-gray-800/50 backdrop-blur-sm border border-blue-500/20 rounded-xl p-4"
                >
                  <div className="text-3xl font-bold text-blue-400">
                    {animatedStats.satisfaction}%
                  </div>
                  <div className="text-gray-400 text-sm">{t('landing.clientSatisfaction')}</div>
                </motion.div>
              </div>

              <div className={`flex flex-wrap gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <motion.a
                  href="/contact"
                  whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(59, 130, 246, 0.5)' }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-4 px-8 rounded-full shadow-lg shadow-blue-500/50 transition-all duration-300 flex items-center justify-center"
                  style={{ textDecoration: 'none' }}
                >
                  {t('landing.getStarted')}
                  <svg
                    className="w-5 h-5 ml-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </motion.a>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowLoginModal(true)}
                  className="bg-transparent border-2 border-blue-500 text-blue-400 font-bold py-4 px-8 rounded-full hover:bg-blue-500/10 transition-all duration-300"
                >
                  {t('landing.signIn')}
                </motion.button>
              </div>
            </motion.div>

            {/* Right Content - Live Analytics Dashboard */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="lg:w-7/12 w-full"
            >
              <div className="relative">
                {/* Main Analytics Panel */}
                <div className="relative bg-gradient-to-br from-gray-800/60 via-gray-900/60 to-black/60 backdrop-blur-2xl border border-blue-500/40 rounded-3xl p-6 shadow-2xl shadow-blue-500/30 overflow-hidden">
                  {/* Animated gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-600/5 pointer-events-none"></div>

                  {/* Glow effect */}
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
                  <div
                    className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600 rounded-full filter blur-3xl opacity-20 animate-pulse"
                    style={{ animationDelay: '1s' }}
                  ></div>

                  {/* Header */}
                  <div className="relative flex items-center justify-between mb-8">
                    <div className="flex items-center gap-0">
                      <div className="flex items-center gap-2"></div>
                      <h3 className="text-white font-bold text-lg">
                        {t('landing.realtimeAnalytics')}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 bg-green-500/20 border border-green-400/30 rounded-full px-3 py-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-400 text-xs font-semibold">
                        {t('landing.live')}
                      </span>
                    </div>
                  </div>

                  {/* Revenue Chart - Enhanced - ULTRA WIDE */}
                  <div className="relative mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-white font-bold text-lg mb-1">
                          {t('landing.revenueStream')}
                        </h3>
                        <p className="text-gray-400 text-sm">{t('landing.trackingBusiness')}</p>
                      </div>
                    </div>
                    <div className="h-48 bg-black/60 rounded-2xl p-4 border border-blue-500/20 shadow-inner overflow-hidden">
                      <Line data={lineChartData} options={chartOptions} />
                    </div>
                  </div>

                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="relative bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                          <svg
                            className="w-6 h-6 text-blue-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                          </svg>
                        </div>
                        <div className="text-white font-bold text-2xl mb-1">142</div>
                        <div className="text-blue-400 text-xs font-medium">
                          {t('landing.activeBookings')}
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="relative bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                          <svg
                            className="w-6 h-6 text-blue-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                            />
                          </svg>
                        </div>
                        <div className="text-white font-bold text-2xl mb-1">87%</div>
                        <div className="text-blue-400 text-xs font-medium">
                          {t('landing.fleetUtilization')}
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="relative bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                          <svg
                            className="w-6 h-6 text-blue-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                            />
                          </svg>
                        </div>
                        <div className="text-white font-bold text-2xl mb-1">98%</div>
                        <div className="text-blue-400 text-xs font-medium">
                          {t('landing.satisfaction')}
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Live System Logs - Terminal Style */}
                  <div className="relative bg-black/80 border border-blue-500/30 rounded-2xl overflow-hidden shadow-2xl">
                    {/* Terminal Header */}
                    <div className="relative bg-gray-900/80 border-b border-blue-500/20 px-5 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5"></div>
                          <span className="text-blue-400 font-mono font-semibold text-xs tracking-wider">
                            {t('landing.notifications')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 bg-green-500/20 border border-green-400/30 rounded px-2 py-1">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-green-400 text-xs font-mono font-semibold">
                            {t('landing.live')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Scrollable Terminal Content */}
                    <div className="relative p-5 font-mono text-xs h-56 overflow-y-auto overflow-x-hidden custom-scrollbar">
                      <div className="space-y-2">
                        {/* Typing log - Active line with cursor */}
                        {typingLog && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-start gap-2 pb-2 border-b border-blue-500/10"
                          >
                            <span className="text-blue-400 font-bold">&gt;</span>
                            <div className="flex-1 flex flex-wrap items-center gap-1.5">
                              <span className="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                [{typingLog.timestamp}]
                              </span>
                              <span className="text-blue-400 font-semibold">
                                {typingLog.typedMsg}
                                {typingLog.typedMsg.length < typingLog.msg.length && (
                                  <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-0.5"></span>
                                )}
                              </span>
                              {typingLog.typedMsg.length >= typingLog.msg.length &&
                                typingLog.typedDetail && (
                                  <span className="text-blue-400">
                                    {typingLog.typedDetail}
                                    {typingLog.typedDetail.length < typingLog.detail.length && (
                                      <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-0.5"></span>
                                    )}
                                  </span>
                                )}
                            </div>
                          </motion.div>
                        )}

                        {/* Completed logs - Faded historical lines */}
                        <AnimatePresence initial={false}>
                          {systemLogs.map((log, index) => (
                            <motion.div
                              key={log.id}
                              initial={{ opacity: 0, y: -5 }}
                              animate={{
                                opacity: 1 - index * 0.15,
                                y: 0,
                              }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="flex items-start gap-2 leading-relaxed"
                            >
                              <span className="text-blue-400/50">&gt;</span>
                              <div className="flex-1 flex flex-wrap items-center gap-1.5">
                                <span className="text-blue-400/50 text-xs">[{log.timestamp}]</span>
                                <span className="text-blue-400/50">{log.msg}</span>
                                <span className="text-blue-400/40 text-xs">• {log.detail}</span>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features Section - Enhanced */}
      <div className="relative py-32 px-4 overflow-hidden">
        {/* Background gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-blue-950/20 to-black"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full filter blur-3xl"></div>

        <div className="container mx-auto relative z-10">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-block mb-4 px-6 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full"
            >
              <span className="text-blue-400 text-sm font-bold tracking-wider uppercase">
                Why Choose Us
              </span>
            </motion.div>

            <h2 className="text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent leading-tight">
              {t('landing.whyChoose')}
            </h2>
            <p className="text-gray-400 text-xl max-w-3xl mx-auto leading-relaxed">
              {t('landing.whyChooseSubtitle')}
            </p>
          </motion.div>

          {/* White text for SEO */}
          <div className="text-white opacity-0 h-0 overflow-hidden" style={{ userSelect: 'none' }}>
            Rentyl is a car rental management platform that helps businesses streamline operations,
            automate bookings, and gain insights with analytics. Our software is trusted by
            companies worldwide to manage vehicles, track maintenance, and optimize revenue. With a
            user-friendly interface and robust features, Rentyl empowers agencies to deliver great
            customer experiences and grow efficiently. Discover why industry leaders choose Rentyl
            for their fleet management needs.
          </div>

          {/* Features Grid - Enhanced Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Feature 1 - Fleet Management */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="group relative"
            >
              {/* Animated border gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500"></div>

              <div className="relative h-full bg-gradient-to-br from-gray-900 via-gray-900/95 to-black border border-blue-500/30 rounded-3xl p-10 transition-all duration-500 group-hover:border-blue-400/60 group-hover:transform group-hover:-translate-y-2">
                {/* Icon with gradient background */}
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-2xl group-hover:bg-blue-500/30 transition-all duration-500"></div>
                  <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/50 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
                    </svg>
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-3xl font-bold mb-4 text-white group-hover:text-blue-400 transition-colors duration-300">
                  {t('features.fleetManagement')}
                </h3>
                <p className="text-gray-400 text-base leading-relaxed mb-6">
                  {t('features.fleetManagementDesc')}
                </p>

                {/* Decorative line */}
                <div className="w-0 group-hover:w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"></div>
              </div>
            </motion.div>

            {/* Feature 2 - Maintenance Tracking */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="group relative"
            >
              {/* Animated border gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500"></div>

              <div className="relative h-full bg-gradient-to-br from-gray-900 via-gray-900/95 to-black border border-blue-500/30 rounded-3xl p-10 transition-all duration-500 group-hover:border-blue-400/60 group-hover:transform group-hover:-translate-y-2">
                {/* Icon with gradient background */}
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-2xl group-hover:bg-blue-500/30 transition-all duration-500"></div>
                  <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/50 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                    <svg
                      className="w-10 h-10 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-3xl font-bold mb-4 text-white group-hover:text-blue-400 transition-colors duration-300">
                  {t('features.maintenanceTracking')}
                </h3>
                <p className="text-gray-400 text-base leading-relaxed mb-6">
                  {t('features.maintenanceTrackingDesc')}
                </p>

                {/* Decorative line */}
                <div className="w-0 group-hover:w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"></div>
              </div>
            </motion.div>

            {/* Feature 3 - Usage Analytics */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="group relative"
            >
              {/* Animated border gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500"></div>

              <div className="relative h-full bg-gradient-to-br from-gray-900 via-gray-900/95 to-black border border-blue-500/30 rounded-3xl p-10 transition-all duration-500 group-hover:border-blue-400/60 group-hover:transform group-hover:-translate-y-2">
                {/* Icon with gradient background */}
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-2xl group-hover:bg-blue-500/30 transition-all duration-500"></div>
                  <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/50 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                    <svg
                      className="w-10 h-10 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-3xl font-bold mb-4 text-white group-hover:text-blue-400 transition-colors duration-300">
                  {t('features.usageAnalytics')}
                </h3>
                <p className="text-gray-400 text-base leading-relaxed mb-6">
                  {t('features.usageAnalyticsDesc')}
                </p>

                {/* Decorative line */}
                <div className="w-0 group-hover:w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"></div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative bg-black border-t border-blue-500/20 py-16 px-4">
        {/* Subtle glow effect */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>

        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Company Info */}
            <div className="md:col-span-2">
              <img
                src={footer1}
                alt="Rentyl"
                className="h-16 w-auto object-contain mb-6 brightness-150"
              />
              <p className="text-gray-400 mb-6 max-w-md leading-relaxed">{t('landing.subtitle')}</p>
              <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                <motion.div
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="w-10 h-10 bg-gray-800/50 border border-blue-500/30 rounded-lg flex items-center justify-center text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all duration-300"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="w-10 h-10 bg-gray-800/50 border border-blue-500/30 rounded-lg flex items-center justify-center text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all duration-300"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="w-10 h-10 bg-gray-800/50 border border-blue-500/30 rounded-lg flex items-center justify-center text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all duration-300"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </motion.div>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className={`text-lg font-bold mb-6 text-white ${isRTL ? 'text-right' : ''}`}>
                {t('about.contactUs')}
              </h4>
              <div className={`space-y-4 text-gray-400 ${isRTL ? 'text-right' : ''}`}>
                <div
                  className={`flex items-center gap-3 ${
                    isRTL ? 'flex-row-reverse text-right ml-auto' : ''
                  }`}
                >
                  <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <a
                    href="mailto:support@rentyl.app"
                    className={`text-sm hover:text-blue-400 transition-colors ${
                      isRTL ? 'text-right' : ''
                    }`}
                    dir="ltr"
                  >
                    support@rentyl.app
                  </a>
                </div>

                <div
                  className={`flex items-start gap-3 ${
                    isRTL ? 'flex-row-reverse justify-end w-full' : ''
                  }`}
                >
                  <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                  </div>
                  <ul
                    className={`flex flex-col gap-3 text-sm ${
                      isRTL ? 'items-end text-right w-full' : ''
                    }`}
                    dir="ltr"
                  >
                    <li
                      className={`block hover:text-blue-400 transition-colors cursor-pointer ${
                        isRTL ? 'text-right w-full' : ''
                      }`}
                    >
                      +968 0000 0000
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-bold mb-6 text-white">{t('about.quickLinks')}</h4>
              <div className="space-y-3">
                <a
                  href="/features"
                  className="block text-gray-400 hover:text-blue-400 transition-colors text-sm"
                >
                  {t('nav.features')}
                </a>
                <a
                  href="/pricing"
                  className="block text-gray-400 hover:text-blue-400 transition-colors text-sm"
                >
                  {t('nav.pricing')}
                </a>
                <a
                  href="/about"
                  className="block text-gray-400 hover:text-blue-400 transition-colors text-sm"
                >
                  {t('nav.about')}
                </a>
                <a
                  href="/contact"
                  className="block text-gray-400 hover:text-blue-400 transition-colors text-sm"
                >
                  {t('nav.contact')}
                </a>
              </div>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="border-t border-blue-500/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">{t('about.allRightsReserved')}</p>
            <div className={`flex gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => openModal('privacy')}
                className="text-gray-500 hover:text-blue-400 text-sm transition-colors"
              >
                {t('about.privacyPolicy')}
              </button>
              <button
                onClick={() => openModal('terms')}
                className="text-gray-500 hover:text-blue-400 text-sm transition-colors"
              >
                {t('about.termsOfService')}
              </button>
              <button
                onClick={() => openModal('cookies')}
                className="text-gray-500 hover:text-blue-400 text-sm transition-colors"
              >
                {t('about.cookiePolicy')}
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Policy Modals */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={closeModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-gray-900 border border-blue-500/30 rounded-2xl shadow-2xl shadow-blue-500/20 max-w-2xl w-full max-h-[80vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-blue-500/20">
                <h2 className="text-xl font-bold text-white">
                  {activeModal === 'privacy' && t('about.privacyPolicy')}
                  {activeModal === 'terms' && t('about.termsOfService')}
                  {activeModal === 'cookies' && t('about.cookiePolicy')}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {activeModal === 'privacy' && <PrivacyPolicy />}
                {activeModal === 'terms' && <TermsOfService />}
                {activeModal === 'cookies' && <CookiePolicy />}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
      </AnimatePresence>
    </div>
  );
};

// Policy Components
const PrivacyPolicy = () => {
  const { t } = useLanguage();
  return (
    <div className="prose prose-sm max-w-none prose-invert">
      <p className="text-gray-400 mb-4">{t('policies.lastUpdated')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">
        {t('policies.informationWeCollect')}
      </h3>
      <p className="text-gray-400 mb-4">{t('policies.informationWeCollectDesc')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('policies.howWeUseInfo')}</h3>
      <p className="text-gray-400 mb-4">{t('policies.howWeUseInfoDesc')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('policies.informationSharing')}</h3>
      <p className="text-gray-400 mb-4">{t('policies.informationSharingDesc')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('policies.dataSecurity')}</h3>
      <p className="text-gray-400 mb-4">{t('policies.dataSecurityDesc')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('policies.contactUs')}</h3>
      <p className="text-gray-400">{t('policies.contactUsDesc')}</p>
    </div>
  );
};

const TermsOfService = () => {
  const { t } = useLanguage();
  return (
    <div className="prose prose-sm max-w-none prose-invert">
      <p className="text-gray-400 mb-4">{t('policies.lastUpdated')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('policies.acceptanceOfTerms')}</h3>
      <p className="text-gray-400 mb-4">{t('policies.acceptanceOfTermsDesc')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('policies.useLicense')}</h3>
      <p className="text-gray-400 mb-4">{t('policies.useLicenseDesc')}</p>
      <ul className="list-disc list-inside text-gray-400 mb-4 space-y-1">
        <li>{t('policies.useLicenseItem1')}</li>
        <li>{t('policies.useLicenseItem2')}</li>
        <li>{t('policies.useLicenseItem3')}</li>
        <li>{t('policies.useLicenseItem4')}</li>
      </ul>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('policies.serviceAvailability')}</h3>
      <p className="text-gray-400 mb-4">{t('policies.serviceAvailabilityDesc')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">
        {t('policies.limitationOfLiability')}
      </h3>
      <p className="text-gray-400 mb-4">{t('policies.limitationOfLiabilityDesc')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('policies.contactInformation')}</h3>
      <p className="text-gray-400">{t('policies.contactInformationDesc')}</p>
    </div>
  );
};

const CookiePolicy = () => {
  const { t } = useLanguage();
  return (
    <div className="prose prose-sm max-w-none prose-invert">
      <p className="text-gray-400 mb-4">{t('policies.lastUpdated')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('policies.whatAreCookies')}</h3>
      <p className="text-gray-400 mb-4">{t('policies.whatAreCookiesDesc')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('policies.typesOfCookies')}</h3>
      <div className="space-y-3 mb-4">
        <div>
          <h4 className="font-medium text-white">{t('policies.essentialCookies')}</h4>
          <p className="text-gray-400 text-sm">{t('policies.essentialCookiesDesc')}</p>
        </div>
        <div>
          <h4 className="font-medium text-white">{t('policies.analyticsCookies')}</h4>
          <p className="text-gray-400 text-sm">{t('policies.analyticsCookiesDesc')}</p>
        </div>
        <div>
          <h4 className="font-medium text-white">{t('policies.functionalCookies')}</h4>
          <p className="text-gray-400 text-sm">{t('policies.functionalCookiesDesc')}</p>
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('policies.managingCookies')}</h3>
      <p className="text-gray-400 mb-4">{t('policies.managingCookiesDesc')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('policies.thirdPartyCookies')}</h3>
      <p className="text-gray-400 mb-4">{t('policies.thirdPartyCookiesDesc')}</p>

      <h3 className="text-lg font-semibold mb-3 text-white">{t('policies.contactUs')}</h3>
      <p className="text-gray-400">{t('policies.cookieContactDesc')}</p>
    </div>
  );
};

export default LandingPage;

