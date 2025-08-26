
import { useState, useCallback } from 'react';
import { Task, User, Workspace } from '../types';
import { mockTasks, mockUsers, mockWorkspaces } from '../data/mockData';

export const useTaskStore = () => {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [users] = useState<User[]>(mockUsers);
  const [workspaces] = useState<Workspace[]>(mockWorkspaces);
  const [currentUser] = useState<User>(mockUsers[0]); // Ali Hassan as default

  const createTask = useCallback((taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'createdBy'>) => {
    const newTask: Task = {
      ...taskData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser.id,
      comments: []
    };
    setTasks(prev => [newTask, ...prev]);
    return newTask;
  }, [currentUser.id]);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, ...updates, updatedAt: new Date().toISOString() }
        : task
    ));
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  }, []);

  const addComment = useCallback((taskId: string, content: string) => {
    const newComment = {
      id: Math.random().toString(36).substr(2, 9),
      content,
      author: currentUser.id,
      createdAt: new Date().toISOString()
    };
    updateTask(taskId, {
      comments: tasks.find(t => t.id === taskId)?.comments.concat(newComment) || [newComment]
    });
  }, [tasks, currentUser.id, updateTask]);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const updatedSubtasks = task.subtasks.map(st => 
        st.id === subtaskId ? { ...st, completed: !st.completed } : st
      );
      updateTask(taskId, { subtasks: updatedSubtasks });
    }
  }, [tasks, updateTask]);

  return {
    tasks,
    users,
    workspaces,
    currentUser,
    createTask,
    updateTask,
    deleteTask,
    addComment,
    toggleSubtask
  };
};
