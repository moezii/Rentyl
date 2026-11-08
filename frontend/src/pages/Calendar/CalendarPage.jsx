import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import secureApi from '../../utils/secureApi';
import { useLanguage } from '../../contexts/LanguageContext';
import AgendaView from './AgendaView';
import './calendar.css';

const localizer = momentLocalizer(moment);

const CalendarPage = () => {
  const { t, isRTL } = useLanguage();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [urgentCount, setUrgentCount] = useState(0);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.body.className = 'bg-gray-900 text-white';

    return () => {
      document.body.className = '';
    };
  }, []);

  useEffect(() => {
    fetchCalendarEvents();
  }, []);

  const fetchCalendarEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await secureApi.get('/calendar/events');

      if (response.data && response.data.events) {
        // Transform backend events to calendar format
        const calendarEvents = response.data.events.map(event => {
          // Rental events should use the rental start timestamp for the start time.
          const isRentalEvent = event.type === 'rental_end';
          const eventEndDate = new Date(event.date);
          const eventStartDate =
            isRentalEvent && event.start_date ? new Date(event.start_date) : eventEndDate;

          return {
            id: event.id,
            title: event.title,
            start: eventStartDate,
            end: eventEndDate,
            allDay: !isRentalEvent, // Rentals are NOT all-day, others are
            resource: {
              type: event.type,
              description: event.description,
              priority: event.priority,
              car_id: event.car_id,
              rental_id: event.rental_id,
              client_name: event.client_name,
              car_make: event.car_make,
              car_model: event.car_model,
              license_plate: event.license_plate,
              car_color: event.car_color,
              car_year: event.car_year,
              contract_status: event.contract_status,
              start_date: event.start_date, // Include start date for rentals
            },
          };
        });

        setEvents(calendarEvents);
        setUrgentCount(response.data.urgent_count || 0);
      }
    } catch (err) {
      console.error('Error fetching calendar events:', err);
      setError(t('calendar.failedToLoadEvents') || 'Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  // Event style getter - color coding by type and priority
  const eventStyleGetter = event => {
    let backgroundColor = '#3b82f6'; // Default blue

    // Check if rental is completed first
    const isCompleted =
      event.resource.type === 'rental_end' && event.resource.contract_status === 'completed';

    // Color by type
    switch (event.resource.type) {
      case 'rental_end':
        backgroundColor = '#3b82f6'; // Blue
        break;
      case 'registration_expiry':
        backgroundColor = '#ef4444'; // Red
        break;
      case 'insurance_expiry':
        backgroundColor = '#f97316'; // Orange
        break;
      default:
        backgroundColor = '#6366f1'; // Indigo
    }

    // Darken for overdue/urgent - but NOT for completed rentals
    if (!isCompleted) {
      if (event.resource.priority === 'overdue') {
        backgroundColor = '#991b1b'; // Dark red
      } else if (event.resource.priority === 'urgent') {
        backgroundColor = '#dc2626'; // Bright red
      }
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: isCompleted ? 0.6 : 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '13px',
        padding: '2px 5px',
        textDecoration: isCompleted ? 'line-through' : 'none',
      },
    };
  };

  const handleSelectEvent = event => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedEvent(null);
  };

  const getEventTypeLabel = type => {
    switch (type) {
      case 'rental_end':
        return t('calendar.rentalEnd') || 'Rental End';
      case 'registration_expiry':
        return t('calendar.registrationExpiry') || 'Registration Expiry';
      case 'insurance_expiry':
        return t('calendar.insuranceExpiry') || 'Insurance Expiry';
      default:
        return type;
    }
  };

  const getPriorityBadge = priority => {
    switch (priority) {
      case 'overdue':
        return (
          <span className="px-2 py-1 text-xs rounded bg-red-900 text-red-200">
            {t('calendar.overdue') || 'Overdue'}
          </span>
        );
      case 'urgent':
        return (
          <span className="px-2 py-1 text-xs rounded bg-orange-900 text-orange-200">
            {t('calendar.urgent') || 'Urgent'}
          </span>
        );
      case 'upcoming':
        return (
          <span className="px-2 py-1 text-xs rounded bg-yellow-900 text-yellow-200">
            {t('calendar.upcoming') || 'Upcoming'}
          </span>
        );
      case 'completed':
        return (
          <span className="px-2 py-1 text-xs rounded bg-green-900 text-green-200">
            {t('calendar.completed') || 'Completed'}
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs rounded bg-blue-900 text-blue-200">
            {t('calendar.scheduled') || 'Scheduled'}
          </span>
        );
    }
  };

  const CustomToolbar = toolbar => {
    const { t, isRTL } = useLanguage();

    const goToBack = () => {
      toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
      toolbar.onNavigate('NEXT');
    };

    const goToCurrent = () => {
      toolbar.onNavigate('TODAY');
    };

    const label = () => {
      const date = moment(toolbar.date);
      return (
        <span className="text-lg font-bold text-white capitalize">
          {date.format('MMMM')} <span className="text-gray-400">{date.format('YYYY')}</span>
        </span>
      );
    };

    return (
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 p-4 bg-gradient-to-r from-gray-900 to-black rounded-xl border border-gray-700/50">
        <div className="flex items-center gap-2 mb-4 md:mb-0">
          <div className="flex items-center bg-gray-700 rounded-lg p-1">
            <button
              onClick={goToBack}
              className="p-2 hover:bg-gray-600 rounded-md transition-colors text-gray-300 hover:text-white"
              aria-label="Previous"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isRTL ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'}
                />
              </svg>
            </button>
            <button
              onClick={goToCurrent}
              className="px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 rounded-md transition-colors mx-1"
            >
              {t('calendar.today') || 'Today'}
            </button>
            <button
              onClick={goToNext}
              className="p-2 hover:bg-gray-600 rounded-md transition-colors text-gray-300 hover:text-white"
              aria-label="Next"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isRTL ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
                />
              </svg>
            </button>
          </div>
          <div className="ml-4 rtl:mr-4 rtl:ml-0">{label()}</div>
        </div>

        <div className="flex bg-gray-700 rounded-lg p-1">
          {['month', 'week', 'day'].map(viewOption => (
            <button
              key={viewOption}
              onClick={() => toolbar.onView(viewOption)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                toolbar.view === viewOption
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-600'
              }`}
            >
              {t(`calendar.${viewOption}`) ||
                viewOption.charAt(0).toUpperCase() + viewOption.slice(1)}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const CustomDateHeader = ({ label, date }) => {
    const isToday = moment(date).isSame(moment(), 'day');
    return (
      <div className="pb-1">
        {isToday ? (
          <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white font-bold">
            {label}
          </div>
        ) : (
          <span>{label}</span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div
      className={`p-6 w-full text-white min-h-screen ${isRTL ? 'text-right' : 'text-left'}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="mb-6">
        <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} justify-between items-center`}>
          <div>
            <h1 className="text-3xl font-bold">{t('calendar.title') || 'Calendar'}</h1>
            <p className="text-gray-400 mt-1">
              {t('calendar.subtitle') || 'View and manage upcoming events'}
            </p>
          </div>

          {urgentCount > 0 && (
            <div className="bg-red-900/30 border border-red-600 rounded-lg px-4 py-2">
              <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} items-center gap-2`}>
                <svg
                  className="w-5 h-5 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span className="text-red-200 font-medium">
                  {urgentCount} {t('calendar.urgentItems') || 'urgent items'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <div className="bg-red-900/30 text-red-200 px-4 py-3 rounded-lg mb-6">{error}</div>}

      {/* Legend */}
      <div
        className={`bg-gradient-to-r from-gray-900 to-black rounded-xl p-4 mb-6 flex ${isRTL ? 'flex-row-reverse' : ''} justify-between items-center flex-wrap gap-4 border border-gray-700/50 shadow-sm`}
      >
        <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} flex-wrap gap-4`}>
          <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} items-center gap-2`}>
            <div className="w-3 h-3 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]"></div>
            <span className="text-sm font-medium text-gray-300">
              {t('calendar.rentalEnd') || 'Rental End'}
            </span>
          </div>
          <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} items-center gap-2`}>
            <div className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]"></div>
            <span className="text-sm font-medium text-gray-300">
              {t('calendar.registrationExpiry') || 'Registration Expiry'}
            </span>
          </div>
          <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} items-center gap-2`}>
            <div className="w-3 h-3 rounded-full bg-orange-600 shadow-[0_0_8px_rgba(234,88,12,0.5)]"></div>
            <span className="text-sm font-medium text-gray-300">
              {t('calendar.insuranceExpiry') || 'Insurance Expiry'}
            </span>
          </div>
        </div>

        {/* View Toggle Buttons */}
        <div className="flex bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setView('month')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              view !== 'agenda'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-gray-600'
            }`}
          >
            {t('calendar.calendar') || 'Calendar'}
          </button>
          <button
            onClick={() => setView('agenda')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              view === 'agenda'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-gray-600'
            }`}
          >
            {t('calendar.agenda') || 'Agenda'}
          </button>
        </div>
      </div>

      {/* Calendar or Agenda View */}
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-xl border-t-4 border-blue-600 calendar-container relative">
        <div className="p-4">
          {view === 'agenda' ? (
            <AgendaView events={events} onSelectEvent={handleSelectEvent} />
          ) : (
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 800 }}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={handleSelectEvent}
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              views={['month', 'week', 'day']}
              popup
              components={{
                toolbar: CustomToolbar,
                month: {
                  dateHeader: CustomDateHeader,
                },
              }}
            />
          )}
        </div>
      </div>

      {/* Event Details Modal */}
      {showModal && selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className={`bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-700/50 ${isRTL ? 'text-right' : 'text-left'}`}
            onClick={e => e.stopPropagation()}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <div className="p-6">
              <div
                className={`flex ${isRTL ? 'flex-row-reverse' : ''} justify-between items-start mb-6`}
              >
                <h2 className="text-xl font-bold text-white">
                  {t('calendar.eventDetails') || 'Event Details'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white transition-colors bg-gray-700 hover:bg-gray-600 rounded-full p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-5">
                <div className="bg-gray-700/50 p-4 rounded-xl">
                  <p className="text-xs text-blue-400 uppercase font-bold tracking-wider mb-1">
                    {t('calendar.eventType') || 'Type'}
                  </p>
                  <p className="text-white font-medium text-lg">
                    {getEventTypeLabel(selectedEvent.resource.type)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-700/30 p-3 rounded-lg">
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">
                      {selectedEvent.resource?.type === 'rental_end'
                        ? t('calendar.pickupTime') || 'Pickup Time'
                        : t('common.date') || 'Date'}
                    </p>
                    <p className="text-white font-medium">
                      {selectedEvent.resource?.type === 'rental_end'
                        ? moment(selectedEvent.start).format('MMM DD, YYYY h:mm A')
                        : selectedEvent.allDay
                          ? moment(selectedEvent.start).format('MMM DD, YYYY')
                          : moment(selectedEvent.start).format('MMM DD, YYYY h:mm A')}
                    </p>
                  </div>

                  <div className="bg-gray-700/30 p-3 rounded-lg">
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">
                      {t('calendar.priority') || 'Priority'}
                    </p>
                    <div className="mt-1">{getPriorityBadge(selectedEvent.resource.priority)}</div>
                  </div>
                </div>

                {selectedEvent.resource.client_name && (
                  <div className="bg-gray-700/30 p-4 rounded-lg">
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">
                      {t('calendar.client') || 'Client'}
                    </p>
                    <p className="text-white font-medium text-lg">
                      {selectedEvent.resource.client_name}
                    </p>
                  </div>
                )}

                {(selectedEvent.resource.car_make || selectedEvent.resource.license_plate) && (
                  <div className="bg-gray-700/30 p-4 rounded-lg">
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">
                      {t('calendar.vehicle') || 'Vehicle'}
                    </p>
                    <div className="flex flex-col gap-1">
                      {selectedEvent.resource.car_make && (
                        <p className="text-white font-medium text-lg">
                          {selectedEvent.resource.car_make} {selectedEvent.resource.car_model}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedEvent.resource.license_plate && (
                          <span className="inline-block bg-black/70 px-3 py-1 rounded text-sm text-gray-300 font-mono border border-gray-700 w-fit">
                            {selectedEvent.resource.license_plate}
                          </span>
                        )}
                        {selectedEvent.resource.car_color && (
                          <span className="inline-block bg-black/70 px-3 py-1 rounded text-sm text-gray-300 border border-gray-700 w-fit capitalize">
                            {selectedEvent.resource.car_color}
                          </span>
                        )}
                        {selectedEvent.resource.car_year && (
                          <span className="inline-block bg-black/70 px-3 py-1 rounded text-sm text-gray-300 border border-gray-700 w-fit">
                            {selectedEvent.resource.car_year}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8">
                <button
                  onClick={closeModal}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-blue-600/20"
                >
                  {t('common.close') || 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;

