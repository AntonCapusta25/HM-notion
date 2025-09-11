// components/chef/OutreachCalendarView.tsx

import React, { useState, useEffect } from 'react';
import { useChefStore } from '@/hooks/useChefStore';
import { OutreachLog, RESPONSE_TYPE_CONFIG } from '@/types';
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react';
import { OutreachLogModal } from './OutreachLogModal';

interface OutreachCalendarViewProps {
  workspaceId: string;
}

export const OutreachCalendarView: React.FC<OutreachCalendarViewProps> = ({ workspaceId }) => {
  const { outreachLogs, chefs, loading, fetchOutreachLogs, fetchChefs } = useChefStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchOutreachLogs(workspaceId);
    fetchChefs(workspaceId);
  }, [workspaceId, fetchOutreachLogs, fetchChefs]);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getFollowUpLogsForDate = (dateString: string) => {
    return outreachLogs.filter(log => log.follow_up_date === dateString);
  };

  const formatDateString = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const isToday = (year: number, month: number, day: number) => {
    const today = new Date();
    return today.getFullYear() === year && 
           today.getMonth() === month && 
           today.getDate() === day;
  };

  const isPastDate = (year: number, month: number, day: number) => {
    const today = new Date();
    const checkDate = new Date(year, month, day);
    return checkDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Header with day names
    days.push(
      <div key="header" className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
            {day}
          </div>
        ))}
      </div>
    );

    // Calendar grid
    const calendarDays = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(
        <div key={`empty-${i}`} className="h-32 border border-gray-200 bg-gray-50"></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = formatDateString(year, month, day);
      const followUpLogs = getFollowUpLogsForDate(dateString);
      const isSelectedDate = selectedDate === dateString;
      const todayClass = isToday(year, month, day) ? 'bg-blue-50 border-blue-200' : 'bg-white';
      const pastClass = isPastDate(year, month, day) ? 'opacity-60' : '';
      
      calendarDays.push(
        <div
          key={day}
          className={`h-32 border border-gray-200 p-2 cursor-pointer hover:bg-gray-50 ${todayClass} ${pastClass} ${
            isSelectedDate ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => setSelectedDate(isSelectedDate ? null : dateString)}
        >
          <div className="flex justify-between items-start mb-1">
            <span className={`text-sm font-medium ${isToday(year, month, day) ? 'text-blue-600' : 'text-gray-900'}`}>
              {day}
            </span>
            {followUpLogs.length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1 min-w-5 h-5 flex items-center justify-center">
                {followUpLogs.length}
              </span>
            )}
          </div>
          
          <div className="space-y-1 overflow-hidden">
            {followUpLogs.slice(0, 3).map(log => {
              const chef = chefs.find(c => c.id === log.chef_id);
              const responseConfig = log.response_type ? RESPONSE_TYPE_CONFIG[log.response_type] : null;
              
              return (
                <div
                  key={log.id}
                  className={`text-xs p-1 rounded truncate ${
                    responseConfig?.color || 'bg-gray-100 text-gray-800'
                  }`}
                  title={`${chef?.name} - ${responseConfig?.label || 'Follow-up'}`}
                >
                  {chef?.name}
                </div>
              );
            })}
            {followUpLogs.length > 3 && (
              <div className="text-xs text-gray-500 text-center">
                +{followUpLogs.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
    }

    days.push(
      <div key="calendar" className="grid grid-cols-7 gap-1">
        {calendarDays}
      </div>
    );

    return days;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const selectedDateLogs = selectedDate ? getFollowUpLogsForDate(selectedDate) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Follow-up Calendar</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Log Outreach
        </button>
      </div>

      {/* Calendar Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <h2 className="text-xl font-semibold text-gray-900">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div>
          {renderCalendarGrid()}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded"></div>
            <span>Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Follow-ups scheduled</span>
          </div>
        </div>
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Follow-ups for {new Date(selectedDate).toLocaleDateString()}
          </h3>
          
          {selectedDateLogs.length > 0 ? (
            <div className="space-y-4">
              {selectedDateLogs.map(log => {
                const chef = chefs.find(c => c.id === log.chef_id);
                const responseConfig = log.response_type ? RESPONSE_TYPE_CONFIG[log.response_type] : null;
                
                return (
                  <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{chef?.name}</div>
                        <div className="text-sm text-gray-600">
                          Last outreach: {new Date(log.outreach_date).toLocaleDateString()}
                        </div>
                        {log.notes && (
                          <div className="text-sm text-gray-600 mt-1">
                            <strong>Notes:</strong> {log.notes}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        {responseConfig && (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${responseConfig.color}`}>
                            {responseConfig.label}
                          </span>
                        )}
                        
                        <div className="text-xs text-gray-500">
                          {chef?.city && `${chef.city} • `}
                          {chef?.phone}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No follow-ups scheduled for this date
            </div>
          )}
        </div>
      )}

      {/* Today's Follow-ups Summary */}
      {(() => {
        const today = new Date().toISOString().split('T')[0];
        const todayLogs = getFollowUpLogsForDate(today);
        
        if (todayLogs.length > 0) {
          return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3">
                Today's Follow-ups ({todayLogs.length})
              </h3>
              <div className="space-y-2">
                {todayLogs.map(log => {
                  const chef = chefs.find(c => c.id === log.chef_id);
                  const responseConfig = log.response_type ? RESPONSE_TYPE_CONFIG[log.response_type] : null;
                  
                  return (
                    <div key={log.id} className="flex items-center justify-between bg-white p-3 rounded">
                      <span className="text-yellow-800 font-medium">{chef?.name}</span>
                      {responseConfig && (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${responseConfig.color}`}>
                          {responseConfig.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm text-blue-800">
          💡 <strong>Tip:</strong> Click on any date to see detailed follow-up information. Red badges indicate the number of follow-ups scheduled for that day.
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <OutreachLogModal
          workspaceId={workspaceId}
          chefs={chefs}
          onClose={() => setShowCreateModal(false)}
          onSave={() => {
            setShowCreateModal(false);
            fetchOutreachLogs(workspaceId);
          }}
        />
      )}
    </div>
  );
};
