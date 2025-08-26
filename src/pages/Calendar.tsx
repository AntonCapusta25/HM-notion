
import { useState, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { TaskDetailDialog } from '../components/TaskDetailDialog';
import { useTaskStore } from '../hooks/useTaskStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';
import { Task } from '../types';

const Calendar = () => {
  const { tasks, users, updateTask, addComment, toggleSubtask } = useTaskStore();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const tasksWithDueDates = useMemo(() => {
    return tasks.filter(task => task.dueDate);
  }, [tasks]);

  const getTasksForDay = (day: Date) => {
    return tasksWithDueDates.filter(task => 
      task.dueDate && isSameDay(new Date(task.dueDate), day)
    );
  };

  const todayTasks = getTasksForDay(new Date());
  const upcomingTasks = tasksWithDueDates
    .filter(task => {
      const dueDate = new Date(task.dueDate!);
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      return dueDate > now && dueDate <= threeDaysFromNow;
    })
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
            <p className="text-gray-600 mt-1">View tasks by due date</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-medium px-4">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {format(currentDate, 'MMMM yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map(day => {
                    const dayTasks = getTasksForDay(day);
                    const isToday = isSameDay(day, new Date());
                    
                    return (
                      <div
                        key={day.toISOString()}
                        className={`
                          min-h-[100px] p-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors
                          ${isToday ? 'bg-homemade-orange/10 border-homemade-orange' : 'border-gray-200'}
                          ${!isSameMonth(day, currentDate) ? 'opacity-50' : ''}
                        `}
                      >
                        <div className={`text-sm font-medium mb-1 ${isToday ? 'text-homemade-orange' : 'text-gray-900'}`}>
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-1">
                          {dayTasks.slice(0, 2).map(task => (
                            <div
                              key={task.id}
                              onClick={() => setSelectedTask(task)}
                              className="text-xs p-1 rounded bg-blue-100 text-blue-800 truncate hover:bg-blue-200 cursor-pointer"
                            >
                              {task.title}
                            </div>
                          ))}
                          {dayTasks.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{dayTasks.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Today's Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Today's Tasks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {todayTasks.length === 0 ? (
                  <p className="text-sm text-gray-500">No tasks due today</p>
                ) : (
                  todayTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="p-3 border rounded-lg cursor-pointer hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm truncate">{task.title}</h4>
                        <Badge className={priorityColors[task.priority]}>
                          {task.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 truncate">{task.description}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Upcoming Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upcoming (Next 3 Days)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingTasks.length === 0 ? (
                  <p className="text-sm text-gray-500">No upcoming tasks</p>
                ) : (
                  upcomingTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="p-3 border rounded-lg cursor-pointer hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm truncate">{task.title}</h4>
                        <Badge className={priorityColors[task.priority]}>
                          {task.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 truncate">{task.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Due {format(new Date(task.dueDate!), 'MMM d')}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <TaskDetailDialog
          task={selectedTask}
          users={users}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          onUpdateTask={updateTask}
          onAddComment={addComment}
          onToggleSubtask={toggleSubtask}
        />
      </div>
    </Layout>
  );
};

export default Calendar;
