
import { User, Task, Workspace } from '../types';

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Ali Hassan',
    email: 'ali@homemade.com',
    role: 'admin',
    department: 'Management',
    avatar: 'AH'
  },
  {
    id: '2',
    name: 'Menna Ahmed',
    email: 'menna@homemade.com',
    role: 'member',
    department: 'Marketing',
    avatar: 'MA'
  },
  {
    id: '3',
    name: 'Mahmoud Khaled',
    email: 'mahmoud@homemade.com',
    role: 'admin',
    department: 'Management',
    avatar: 'MK'
  },
  {
    id: '4',
    name: 'Sara Mohamed',
    email: 'sara@homemade.com',
    role: 'member',
    department: 'Chef Onboarding',
    avatar: 'SM'
  }
];

export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Launch Q2 Marketing Campaign',
    description: 'Design and execute the spring recipe collection campaign across all social media platforms',
    dueDate: '2024-06-15',
    assignedTo: '2',
    priority: 'high',
    status: 'in_progress',
    tags: ['Marketing', 'Social Media', 'Urgent'],
    subtasks: [
      { id: '1', title: 'Create campaign mockups', completed: true },
      { id: '2', title: 'Schedule social posts', completed: false },
      { id: '3', title: 'Coordinate with chefs', completed: false }
    ],
    createdAt: '2024-06-01',
    updatedAt: '2024-06-03',
    createdBy: '1',
    comments: [
      {
        id: '1',
        content: 'Great progress on the mockups! The spring theme looks amazing.',
        author: '1',
        createdAt: '2024-06-03'
      }
    ]
  },
  {
    id: '2',
    title: 'Onboard New Chef - Italian Cuisine',
    description: 'Complete onboarding process for Marco, our new Italian cuisine specialist',
    dueDate: '2024-06-10',
    assignedTo: '4',
    priority: 'medium',
    status: 'todo',
    tags: ['Chef Onboarding', 'Italian'],
    subtasks: [
      { id: '4', title: 'Send welcome package', completed: false },
      { id: '5', title: 'Schedule training sessions', completed: false },
      { id: '6', title: 'Setup kitchen access', completed: false }
    ],
    createdAt: '2024-06-02',
    updatedAt: '2024-06-02',
    createdBy: '3',
    comments: []
  },
  {
    id: '3',
    title: 'Update Recipe Database',
    description: 'Review and update all Mediterranean recipes with new nutritional information',
    dueDate: '2024-06-20',
    assignedTo: '1',
    priority: 'low',
    status: 'done',
    tags: ['Recipes', 'Database'],
    subtasks: [
      { id: '7', title: 'Review current recipes', completed: true },
      { id: '8', title: 'Add nutritional data', completed: true },
      { id: '9', title: 'Update database', completed: true }
    ],
    createdAt: '2024-05-28',
    updatedAt: '2024-06-04',
    createdBy: '1',
    comments: [
      {
        id: '2',
        content: 'All Mediterranean recipes have been updated successfully!',
        author: '1',
        createdAt: '2024-06-04'
      }
    ]
  }
];

export const mockWorkspaces: Workspace[] = [
  {
    id: '1',
    name: 'Marketing',
    department: 'Marketing',
    color: '#ED713B'
  },
  {
    id: '2',
    name: 'Chef Onboarding',
    department: 'Chef Onboarding', 
    color: '#10B981'
  },
  {
    id: '3',
    name: 'Management',
    department: 'Management',
    color: '#8B5CF6'
  }
];
