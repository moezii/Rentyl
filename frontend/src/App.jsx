// src/App.jsx
import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/context/ThemeContext';
import { AuthProvider, AuthContext } from './components/context/AuthContext';
import { CurrencyProvider } from './components/context/CurrencyContext';
import { MileageProvider } from './components/context/MileageContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Layout from './components/Layout/Layout';
import DeviceRouter from './components/DeviceRouter';
import Dashboard from './pages/Dashboard';
import AnalyticsPage from './pages/AnalyticsPage/index';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';

// Car Management
import CarsPage from './pages/Cars/CarsPage';
import CarDetailsPage from './pages/Cars/CarDetailsPage';
import AddCarPage from './pages/Cars/AddCarPage';

// Client Management
import ClientsPage from './pages/Clients/ClientsPage';
import AddClientPage from './pages/Clients/AddClientPage';
import ClientDetailsPage from './pages/Clients/ClientDetailsPage';
import EditClientPage from './pages/Clients/EditClientPage';

// Rental Management
import RentalsPage from './pages/Rentals/RentalsPage';
import CreateRentalPage from './pages/Rentals/CreateRentalPage';
import RentalDetailsPage from './pages/Rentals/RentalDetailsPage';

// Maintenance Management
import MaintenancePage from './pages/Maintenance/Maintenance';
import EditCarPage from './pages/Cars/EditCarPage';

// Calendar
import CalendarPage from './pages/Calendar/CalendarPage';

// Public Booking Pages
import BookPage from './pages/BookPage';
import BookingPage from './pages/BookingPage';

// Auth Pages
import ResetPasswordPage from './pages/ResetPasswordPage';

const LandingRedirect = ({ initialShowLogin = false }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return null; // AuthProvider manages the global loading UI
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <DeviceRouter page="landing" initialShowLogin={initialShowLogin} />;
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <LanguageProvider>
            <CurrencyProvider>
              <MileageProvider>
                <ScrollToTop /> {/* Scroll to top on route change */}
                <Routes>
                  {/* Reset Password Route - No Layout */}
                  <Route path="/resetpass" element={<ResetPasswordPage />} />

                  {/* Routes with Layout */}
                  <Route
                    path="/*"
                    element={
                      <Layout>
                        <Routes>
                          {/* Public Routes with Device Detection */}
                          <Route path="/" element={<LandingRedirect />} />
                          <Route
                            path="/login"
                            element={<LandingRedirect initialShowLogin={true} />}
                          />
                          <Route path="/features" element={<DeviceRouter page="features" />} />
                          <Route path="/pricing" element={<DeviceRouter page="pricing" />} />
                          <Route path="/about" element={<DeviceRouter page="about" />} />
                          <Route path="/contact" element={<DeviceRouter page="contact" />} />
                          <Route path="/book" element={<BookPage />} />
                          <Route path="/booking/:carId" element={<BookingPage />} />

                          {/* Dashboard and Analytics*/}
                          <Route
                            path="/dashboard"
                            element={
                              <ProtectedRoute>
                                <Dashboard />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/analytics"
                            element={
                              <ProtectedRoute>
                                <AnalyticsPage />
                              </ProtectedRoute>
                            }
                          />

                          {/* Calendar */}
                          <Route
                            path="/calendar"
                            element={
                              <ProtectedRoute>
                                <CalendarPage />
                              </ProtectedRoute>
                            }
                          />

                          {/* Car Management */}
                          <Route
                            path="/cars"
                            element={
                              <ProtectedRoute>
                                <CarsPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/cars/add"
                            element={
                              <ProtectedRoute>
                                <AddCarPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/cars/:id"
                            element={
                              <ProtectedRoute>
                                <CarDetailsPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/cars/:id/edit"
                            element={
                              <ProtectedRoute>
                                <EditCarPage />
                              </ProtectedRoute>
                            }
                          />

                          {/* Client Management */}
                          <Route
                            path="/clients"
                            element={
                              <ProtectedRoute>
                                <ClientsPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/clients/add"
                            element={
                              <ProtectedRoute>
                                <AddClientPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/clients/:id"
                            element={
                              <ProtectedRoute>
                                <ClientDetailsPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/clients/:id/edit"
                            element={
                              <ProtectedRoute>
                                <EditClientPage />
                              </ProtectedRoute>
                            }
                          />

                          {/* Rental Management */}
                          <Route
                            path="/rentals"
                            element={
                              <ProtectedRoute>
                                <RentalsPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/rentals/new"
                            element={
                              <ProtectedRoute>
                                <CreateRentalPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/rentals/new/:carId"
                            element={
                              <ProtectedRoute>
                                <CreateRentalPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/rentals/:id"
                            element={
                              <ProtectedRoute>
                                <RentalDetailsPage />
                              </ProtectedRoute>
                            }
                          />

                          {/* Maintenance */}
                          <Route
                            path="/maintenance"
                            element={
                              <ProtectedRoute>
                                <MaintenancePage />
                              </ProtectedRoute>
                            }
                          />

                          {/* Fallback */}
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </Layout>
                    }
                  />
                </Routes>
              </MileageProvider>
            </CurrencyProvider>
          </LanguageProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
