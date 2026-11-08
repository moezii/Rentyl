import React, { useState, useMemo } from 'react';
import moment from 'moment';
import { useLanguage } from '../../contexts/LanguageContext';
import './AgendaView.css';

const AgendaView = ({ events, onSelectEvent }) => {
  const { t, isRTL } = useLanguage();
  const [rangeType, setRangeType] = useState('month'); // 'month', 'week', 'day'
  const [currentDate, setCurrentDate] = useState(new Date());

  // Calculate date range based on rangeType and currentDate
  const dateRange = useMemo(() => {
    const current = moment(currentDate);
    let start, end, label;

    switch (rangeType) {
      case 'month':
        start = current.clone().startOf('month');
        end = current.clone().endOf('month');
        label = current.format('MMMM YYYY');
        break;
      case 'week':
        start = current.clone().startOf('week');
        end = current.clone().endOf('week');
        label = `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`;
        break;
      case 'day':
        start = current.clone().startOf('day');
        end = current.clone().endOf('day');
        label = current.format('MMMM D, YYYY');
        break;
      default:
        start = current.clone().startOf('month');
        end = current.clone().endOf('month');
        label = current.format('MMMM YYYY');
    }

    return { start, end, label };
  }, [rangeType, currentDate]);

  // Filter events within the date range
  const filteredEvents = useMemo(() => {
    return events
      .filter(event => {
        const eventDate = moment(event.start);
        return eventDate.isBetween(dateRange.start, dateRange.end, null, '[]');
      })
      .sort((a, b) => moment(a.start).diff(moment(b.start)));
  }, [events, dateRange]);

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups = {};
    filteredEvents.forEach(event => {
      const dateKey = moment(event.start).format('YYYY-MM-DD');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    });
    return groups;
  }, [filteredEvents]);

  const handlePrevious = () => {
    const newDate = moment(currentDate).subtract(1, rangeType).toDate();
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = moment(currentDate).add(1, rangeType).toDate();
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
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
        return <span className="priority-badge overdue">{t('calendar.overdue') || 'Overdue'}</span>;
      case 'urgent':
        return <span className="priority-badge urgent">{t('calendar.urgent') || 'Urgent'}</span>;
      case 'upcoming':
        return (
          <span className="priority-badge upcoming">{t('calendar.upcoming') || 'Upcoming'}</span>
        );
      case 'completed':
        return (
          <span className="priority-badge completed">{t('calendar.completed') || 'Completed'}</span>
        );
      default:
        return (
          <span className="priority-badge normal">{t('calendar.scheduled') || 'Scheduled'}</span>
        );
    }
  };

  return (
    <div className={`agenda-view ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Agenda Toolbar */}
      <div className="agenda-toolbar">
        <div className={`agenda-header ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div>
            <h2 className="agenda-title">{t('calendar.eventAgenda') || 'Event Agenda'}</h2>
            <p className="agenda-range-label">
              {t('calendar.showing') || 'Showing'}:{' '}
              <span className="range-highlight">{dateRange.label}</span>
            </p>
          </div>
        </div>

        <div className={`agenda-controls ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Navigation */}
          <div className={`nav-buttons ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button onClick={handlePrevious} className="nav-btn" aria-label="Previous">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isRTL ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'}
                />
              </svg>
            </button>
            <button onClick={handleToday} className="today-btn">
              {t('calendar.today') || 'Today'}
            </button>
            <button onClick={handleNext} className="nav-btn" aria-label="Next">
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

          {/* Range Type Selector */}
          <div className="range-selector">
            <button
              onClick={() => setRangeType('month')}
              className={`range-btn ${rangeType === 'month' ? 'active' : ''}`}
            >
              {t('calendar.month') || 'Month'}
            </button>
            <button
              onClick={() => setRangeType('week')}
              className={`range-btn ${rangeType === 'week' ? 'active' : ''}`}
            >
              {t('calendar.week') || 'Week'}
            </button>
            <button
              onClick={() => setRangeType('day')}
              className={`range-btn ${rangeType === 'day' ? 'active' : ''}`}
            >
              {t('calendar.day') || 'Day'}
            </button>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="agenda-content">
        {Object.keys(groupedEvents).length === 0 ? (
          <div className="empty-state">
            <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="empty-text">{t('calendar.noEvents') || 'No events in this period'}</p>
          </div>
        ) : (
          <div className="events-list">
            {Object.entries(groupedEvents).map(([dateKey, dayEvents]) => (
              <div key={dateKey} className="date-group">
                <div className="date-header">
                  <span className="date-label">{moment(dateKey).format('dddd, MMMM D, YYYY')}</span>
                  <span className="event-count">
                    {dayEvents.length}{' '}
                    {dayEvents.length === 1
                      ? t('calendar.eventSingular') || 'event'
                      : t('calendar.eventPlural') || 'events'}
                  </span>
                </div>
                <div className="events-table">
                  {dayEvents.map((event, idx) => {
                    const isCompleted = event.resource?.contract_status === 'completed';
                    return (
                      <div
                        key={idx}
                        className={`event-row ${isCompleted ? 'completed' : ''} cursor-pointer hover:bg-gray-700/50 transition-colors`}
                        onClick={() => onSelectEvent && onSelectEvent(event)}
                        role="button"
                        tabIndex={0}
                        onKeyPress={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            onSelectEvent && onSelectEvent(event);
                          }
                        }}
                      >
                        <div className="event-time">
                          {event.allDay ? (
                            <span className="text-gray-400 text-sm">All Day</span>
                          ) : event.resource?.type === 'rental_end' ? (
                            <span className="text-gray-200 text-sm">
                              {t('calendar.pickupTime') || 'Pickup Time'}:{' '}
                              {moment(event.start).format('MMM DD, YYYY h:mm A')}
                            </span>
                          ) : (
                            moment(event.start).format('h:mm A')
                          )}
                        </div>
                        <div className="event-details">
                          <div className="event-title">
                            {getEventTypeLabel(event.resource?.type)}
                            {event.resource?.client_name && `: ${event.resource.client_name}`}
                          </div>
                          {event.resource?.description && (
                            <div className="event-description">{event.resource.description}</div>
                          )}
                        </div>
                        {event.resource?.priority && (
                          <div className="event-badge">
                            {getPriorityBadge(event.resource.priority)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgendaView;
