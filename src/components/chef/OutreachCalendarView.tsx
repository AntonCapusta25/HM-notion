
import React, { useState, useEffect } from 'react';
import { useChefStore } from '@/stores/useChefStore';
import { OutreachLog, RESPONSE_TYPE_CONFIG } from '@/types/chef';
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react';

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
