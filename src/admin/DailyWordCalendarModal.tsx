/**
 * Daily Word Calendar Modal - Date picker for sidebar editor
 * Shows calendar with month/year navigation and indicators for existing words
 */

import React, { useState, useEffect, useCallback } from 'react';
import Icon from '../components/common/Icon';
import { dailyWordService } from '../services/dailyWord.service';

interface DailyWordCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
  currentDate?: string;
}

const DailyWordCalendarModal: React.FC<DailyWordCalendarModalProps> = ({
  isOpen,
  onClose,
  onSelectDate,
  currentDate = new Date().toISOString().split('T')[0],
}) => {
  const [displayMonth, setDisplayMonth] = useState<Date>(new Date(currentDate));
  const [daysWithWords, setDaysWithWords] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Load calendar data for current month
  const loadCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      const year = displayMonth.getFullYear();
      const month = displayMonth.getMonth() + 1;
      
      const response = await dailyWordService.getCalendar(month, year);
      
      // Extract dates that have words
      const datesSet = new Set<string>();
      if (response.days) {
        response.days.forEach((day) => {
          if (day.has_post && day.is_current_month) {
            const dayStr = String(day.day).padStart(2, '0');
            const monthStr = String(month).padStart(2, '0');
            const dateStr = `${year}-${monthStr}-${dayStr}`;
            datesSet.add(dateStr);
          }
        });
      }
      setDaysWithWords(datesSet);
    } catch (err) {
      console.log('No calendar data for this month');
    } finally {
      setLoading(false);
    }
  }, [displayMonth]);

  useEffect(() => {
    if (!isOpen) return;
    
    loadCalendarData();
  }, [displayMonth, isOpen, loadCalendarData]);

  const handleDateClick = (day: number) => {
    const year = displayMonth.getFullYear();
    const month = String(displayMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const selectedDate = `${year}-${month}-${dayStr}`;
    
    onSelectDate(selectedDate);
    onClose();
  };

  const handlePrevMonth = () => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1));
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthName = displayMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(displayMonth);
  const firstDay = getFirstDayOfMonth(displayMonth);
  const today = new Date().toISOString().split('T')[0];
  
  // Build calendar grid
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-80 bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-light">
          <button
            onClick={handlePrevMonth}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
            title="Previous month"
          >
            <Icon name="chevron_left" size={20} />
          </button>

          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-deep">
            {monthName}
          </h3>

          <button
            onClick={handleNextMonth}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
            title="Next month"
          >
            <Icon name="chevron_right" size={20} />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-bold text-slate-soft uppercase py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="aspect-square" />;
              }

              const year = displayMonth.getFullYear();
              const month = String(displayMonth.getMonth() + 1).padStart(2, '0');
              const dayStr = String(day).padStart(2, '0');
              const dateStr = `${year}-${month}-${dayStr}`;
              const hasWord = daysWithWords.has(dateStr);
              const isToday = dateStr === today;
              const isCurrent = dateStr === currentDate;

              return (
                <button
                  key={`day-${day}`}
                  onClick={() => handleDateClick(day)}
                  className={`
                    aspect-square rounded flex flex-col items-center justify-center text-xs font-bold
                    relative transition-all
                    ${isToday ? 'ring-2 ring-primary' : ''}
                    ${isCurrent ? 'bg-primary text-white' : hasWord ? 'bg-emerald-50 text-slate-deep hover:bg-emerald-100' : 'bg-slate-50 text-slate-deep hover:bg-slate-100'}
                  `}
                  disabled={loading}
                >
                  {day}
                  {hasWord && !isCurrent && (
                    <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Info */}
        <div className="px-4 py-3 border-t border-border-light bg-slate-50 rounded-b-lg">
          <p className="text-xs text-slate-soft text-center">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1 align-middle" />
            Dates with daily words
          </p>
        </div>
      </div>
    </>
  );
};

export default DailyWordCalendarModal;
