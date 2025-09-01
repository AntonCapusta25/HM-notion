import { createContext, useContext, ReactNode } from 'react';
import { useTaskStore } from '../hooks/useTaskStore';
import { useProfile } from '../hooks/useProfile';

const TaskContext = createContext<ReturnType<typeof useTaskStore> | null>(null);

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const { profile } = useProfile();
  const taskStore = useTaskStore({ userProfile: profile });
  
  return (
    <TaskContext.Provider value={taskStore}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within TaskProvider');
  }
  return context;
};
