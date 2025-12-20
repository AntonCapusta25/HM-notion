import { useState, useMemo } from 'react';
import { Layout } from '../Layout';
import { PremiumTaskDetailDialog } from './PremiumTaskDetailDialog'; // Use Premium version
import { useTaskContext } from '../../contexts/TaskContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';
import { Task } from '../../types';
import { cn } from '@/lib/utils';

export const PremiumCalendar = () => {
    const { tasks, users, updateTask, addComment, toggleSubtask } = useTaskContext();

    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

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
        low: 'bg-green-500/20 text-green-300 border-green-500/30',
        medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        high: 'bg-red-500/20 text-red-300 border-red-500/30'
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Calendar</h1>
                        <p className="text-gray-400 mt-1">View tasks by due date</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                            className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <h2 className="text-lg font-medium px-4 text-white">
                            {format(currentDate, 'MMMM yyyy')}
                        </h2>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                            className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Calendar Grid */}
                    <div className="lg:col-span-2">
                        <Card className="bg-black/40 backdrop-blur-xl border-white/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <CalendarIcon className="h-5 w-5 text-homemade-orange" />
                                    {format(currentDate, 'MMMM yyyy')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-7 gap-1 mb-2 text-center text-sm font-medium text-gray-400">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                    {calendarDays.map(day => {
                                        const dayTasks = getTasksForDay(day);
                                        const isToday = isSameDay(day, new Date());
                                        const isCurrentMonth = isSameMonth(day, currentDate);

                                        return (
                                            <div
                                                key={day.toISOString()}
                                                className={cn(
                                                    "min-h-[100px] p-2 border rounded-lg transition-colors",
                                                    isToday
                                                        ? "bg-homemade-orange/10 border-homemade-orange/50"
                                                        : "border-white/5 bg-white/5 hover:bg-white/10",
                                                    !isCurrentMonth && "opacity-30"
                                                )}
                                            >
                                                <div className={cn(
                                                    "text-sm font-medium mb-1",
                                                    isToday ? "text-homemade-orange" : "text-gray-400"
                                                )}>
                                                    {format(day, 'd')}
                                                </div>
                                                <div className="space-y-1">
                                                    {dayTasks.slice(0, 2).map(task => (
                                                        <div
                                                            key={task.id}
                                                            onClick={() => setSelectedTask(task)}
                                                            className="text-xs p-1 rounded bg-homemade-orange/20 text-homemade-orange truncate hover:bg-homemade-orange/30 cursor-pointer transition-colors"
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
                        <Card className="bg-black/40 backdrop-blur-xl border-white/10">
                            <CardHeader>
                                <CardTitle className="text-base text-white">Today's Tasks</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {todayTasks.length === 0 ? (
                                    <p className="text-sm text-gray-500">No tasks due today</p>
                                ) : (
                                    todayTasks.map(task => (
                                        <div
                                            key={task.id}
                                            onClick={() => setSelectedTask(task)}
                                            className="p-3 border border-white/5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors group"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className="font-medium text-sm text-gray-200 truncate group-hover:text-white transition-colors">
                                                    {task.title}
                                                </h4>
                                                <Badge variant="outline" className={priorityColors[task.priority]}>
                                                    {task.priority}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        <Card className="bg-black/40 backdrop-blur-xl border-white/10">
                            <CardHeader>
                                <CardTitle className="text-base text-white">Upcoming (Next 3 Days)</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {upcomingTasks.length === 0 ? (
                                    <p className="text-sm text-gray-500">No upcoming tasks</p>
                                ) : (
                                    upcomingTasks.map(task => (
                                        <div
                                            key={task.id}
                                            onClick={() => setSelectedTask(task)}
                                            className="p-3 border border-white/5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors group"
                                        >
                                            <h4 className="font-medium text-sm text-gray-200 truncate group-hover:text-white transition-colors">
                                                {task.title}
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Due {format(new Date(task.due_date!), 'MMM d')}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <PremiumTaskDetailDialog
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
