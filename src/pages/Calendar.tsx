import { useState, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { TaskDetailDialog } from '../components/TaskDetailDialog';
import { useTaskContext } from '../contexts/TaskContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfDay } from 'date-fns';
import { Task } from '../types';

export const CalendarPage = () => {
  // FIX: Switched to the central TaskContext
  const { tasks, users, updateTask, addComment, updateAssignees, toggleSubtask } = useTaskContext();
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // FIX: Uses `due_date` to filter
  const tasksWithDueDates = useMemo(() => {
    return tasks.filter(task => task.due_date);
  }, [tasks]);

  const getTasksForDay = (day: Date) => {
    return tasksWithDueDates.filter(task => 
      isSameDay(new Date(task.due_date!), day)
    );
  };

  const todayTasks = getTasksForDay(new Date());

  const upcomingTasks = tasksWithDueDates
    .filter(task => {
      const dueDate = new Date(task.due_date!);
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      return dueDate > now && dueDate <= threeDaysFromNow;
    })
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  // FIX: Wrapper function to match the expected props for TaskDetailDialog
  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    const subtask = task?.subtasks.find(s => s.id === subtaskId);
    if (subtask) {
      toggleSubtask(subtaskId, !subtask.completed);
    }
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
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-medium px-4">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
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
                <div className="grid grid-cols-7 gap-1 mb-2 text-center text-sm font-medium text-gray-500">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map(day => {
                    const dayTasks = getTasksForDay(day);
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div
                        key={day.toISOString()}
                        className={`min-h-[100px] p-2 border rounded-lg ${isToday ? 'bg-orange-50 border-orange-200' : 'border-gray-200'} ${!isSameMonth(day, currentDate) ? 'opacity-50' : ''}`}
                      >
                        <div className={`text-sm font-medium mb-1 ${isToday ? 'text-orange-600' : ''}`}>{format(day, 'd')}</div>
                        <div className="space-y-1">
                          {dayTasks.slice(0, 2).map(task => (
                            <div key={task.id} onClick={() => setSelectedTask(task)} className="text-xs p-1 rounded bg-blue-100 text-blue-800 truncate hover:bg-blue-200 cursor-pointer">
                              {task.title}
                            </div>
                          ))}
                          {dayTasks.length > 2 && <div className="text-xs text-gray-500">+{dayTasks.length - 2} more</div>}
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
            <Card>
              <CardHeader><CardTitle className="text-base">Today's Tasks</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {todayTasks.length === 0 ? (<p className="text-sm text-gray-500">No tasks due today</p>) : (
                  todayTasks.map(task => (
                    <div key={task.id} onClick={() => setSelectedTask(task)} className="p-3 border rounded-lg cursor-pointer hover:shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm truncate">{task.title}</h4>
                        <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Upcoming (Next 3 Days)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {upcomingTasks.length === 0 ? (<p className="text-sm text-gray-500">No upcoming tasks</p>) : (
                  upcomingTasks.map(task => (
                    <div key={task.id} onClick={() => setSelectedTask(task)} className="p-3 border rounded-lg cursor-pointer hover:shadow-sm">
                      <h4 className="font-medium text-sm truncate">{task.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">Due {format(new Date(task.due_date!), 'MMM d')}</p>
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
          updateAssignees={updateAssignees}
          onToggleSubtask={handleToggleSubtask}
        />
      </div>
    </Layout>
  );
};

export default CalendarPage;
