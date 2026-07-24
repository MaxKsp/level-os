import React, { createContext, useCallback, useContext, useState, useEffect, useRef } from 'react';
import { useProgress } from '../modules/progress/store';
import { hasRoutineBackend, loadTasks, saveTasks } from '../modules/routine/api';
import { userStorageKey } from '../lib/userStorage';
import type { Task as RoutineTask } from '../modules/routine/contracts';

// ============================================================================
// TYPES
// ============================================================================

export type Task = RoutineTask;

export interface Exercise {
  id: string;
  name: string;
  sets: string;
  completed: boolean;
}

export interface WeightRecord {
  date: string;
  weight: number;
}

interface AppContextType {
  // Global State
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  refreshTasks: () => Promise<void>;
  exercises: Exercise[];
  setExercises: React.Dispatch<React.SetStateAction<Exercise[]>>;
  
  // Modals
  isTaskModalOpen: boolean;
  setIsTaskModalOpen: (open: boolean) => void;
  isExpenseModalOpen: boolean;
  setIsExpenseModalOpen: (open: boolean) => void;
  isWeightModalOpen: boolean;
  setIsWeightModalOpen: (open: boolean) => void;
  isWorkoutModalOpen: boolean;
  setIsWorkoutModalOpen: (open: boolean) => void;
  isProfileMenuOpen: boolean;
  setIsProfileMenuOpen: (open: boolean) => void;

  // Form States
  newTaskTitle: string;
  setNewTaskTitle: (title: string) => void;
  newTaskTime: string;
  setNewTaskTime: (time: string) => void;
  newTaskSubtitle: string;
  setNewTaskSubtitle: (subtitle: string) => void;

  expenseDesc: string;
  setExpenseDesc: (desc: string) => void;
  expenseAmount: string;
  setExpenseAmount: (amount: string) => void;
  weightValue: string;
  setWeightValue: (weight: string) => void;
  loggedWeights: WeightRecord[];
  setLoggedWeights: React.Dispatch<React.SetStateAction<WeightRecord[]>>;

  // Timers
  isWorkoutActive: boolean;
  setIsWorkoutActive: (active: boolean) => void;
  workoutTimer: number;
  setWorkoutTimer: React.Dispatch<React.SetStateAction<number>>;

  // Handlers
  handleToggleTask: (id: string, occurrenceDate?: string) => void;
  handleAddTaskSubmit: (e: React.FormEvent) => void;
  handleAddWeightSubmit: (e: React.FormEvent) => void;
  handleToggleExercise: (id: string) => void;
}

const DEFAULT_TASKS: Task[] = [];
const DEFAULT_EXERCISES: Exercise[] = [];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { awardEvent } = useProgress();
  const remoteTasks = hasRoutineBackend();
  const tasksReady = useRef(!remoteTasks);
  // Load from local storage or defaults
  const [tasks, setTasks] = useState<Task[]>(() => {
    if (remoteTasks) return DEFAULT_TASKS;
    const saved = localStorage.getItem(userStorageKey('level-os:tasks'));
    return saved ? JSON.parse(saved) : DEFAULT_TASKS;
  });

  const [exercises, setExercises] = useState<Exercise[]>(() => {
    if (remoteTasks) return DEFAULT_EXERCISES;
    const saved = localStorage.getItem(userStorageKey('level-os:exercises'));
    return saved ? JSON.parse(saved) : DEFAULT_EXERCISES;
  });

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState<boolean>(false);
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState<boolean>(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);

  // Form states
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('12:00');
  const [newTaskSubtitle, setNewTaskSubtitle] = useState('Geral');

  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  const [weightValue, setWeightValue] = useState('80.0');
  const [loggedWeights, setLoggedWeights] = useState<WeightRecord[]>([]);

  // Timers
  const [isWorkoutActive, setIsWorkoutActive] = useState<boolean>(false);
  const [workoutTimer, setWorkoutTimer] = useState<number>(1800);

  const refreshTasks = useCallback(async () => {
    if (!remoteTasks) return;
    const next = await loadTasks();
    tasksReady.current = true;
    setTasks(next);
  }, [remoteTasks]);

  useEffect(() => { void refreshTasks().catch(() => { tasksReady.current = false; }); }, [refreshTasks]);

  // Save state on change
  useEffect(() => {
    if (!remoteTasks) { localStorage.setItem(userStorageKey('level-os:tasks'), JSON.stringify(tasks)); return; }
    if (!tasksReady.current) return;
    const timer = window.setTimeout(() => { void saveTasks(tasks); }, 450);
    return () => window.clearTimeout(timer);
  }, [remoteTasks, tasks]);

  useEffect(() => {
    if (remoteTasks) {
      localStorage.removeItem(userStorageKey('level-os:exercises'));
      return;
    }
    localStorage.setItem(userStorageKey('level-os:exercises'), JSON.stringify(exercises));
  }, [exercises, remoteTasks]);

  // Active workout timer tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isWorkoutActive && isWorkoutModalOpen) {
      interval = setInterval(() => {
        setWorkoutTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWorkoutActive, isWorkoutModalOpen]);

  // Handlers
  const handleToggleTask = (id: string, occurrenceDate?: string) => {
    const target = tasks.find((task) => task.id === id);
    const targetCompleted = target?.repeat && target.repeat !== 'none' && occurrenceDate
      ? (target.completedDates ?? []).includes(occurrenceDate)
      : Boolean(target?.completed);
    setTasks(
      tasks.map((task) => {
        if (task.id === id) {
          if (task.repeat && task.repeat !== 'none' && occurrenceDate) {
            const completedDates = new Set(task.completedDates ?? []);
            if (completedDates.has(occurrenceDate)) completedDates.delete(occurrenceDate);
            else completedDates.add(occurrenceDate);
            return { ...task, completedDates: [...completedDates].sort() };
          }
          return { ...task, completed: !task.completed };
        }
        return task;
      })
    );
    if (target && !targetCompleted) {
      const date = occurrenceDate ?? target.date ?? new Date().toLocaleDateString('sv-SE');
      const safeId = target.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
      void awardEvent('rotina', `rotina:${date}:${safeId}`);
    }
  };

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      time: newTaskTime,
      subtitle: newTaskSubtitle || 'Geral',
      completed: false,
    };
    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setNewTaskSubtitle('');
    setIsTaskModalOpen(false);
  };

  const handleAddWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const weightNum = parseFloat(weightValue);
    if (isNaN(weightNum) || weightNum <= 0) return;

    const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    setLoggedWeights([...loggedWeights, { date: dateStr, weight: weightNum }]);
    setIsWeightModalOpen(false);
  };

  const handleToggleExercise = (id: string) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id === id) {
          return { ...ex, completed: !ex.completed };
        }
        return ex;
      })
    );
  };

  return (
    <AppContext.Provider
      value={{
        tasks,
        setTasks,
        refreshTasks,
        exercises,
        setExercises,
        isTaskModalOpen,
        setIsTaskModalOpen,
        isExpenseModalOpen,
        setIsExpenseModalOpen,
        isWeightModalOpen,
        setIsWeightModalOpen,
        isWorkoutModalOpen,
        setIsWorkoutModalOpen,
        isProfileMenuOpen,
        setIsProfileMenuOpen,
        newTaskTitle,
        setNewTaskTitle,
        newTaskTime,
        setNewTaskTime,
        newTaskSubtitle,
        setNewTaskSubtitle,
        expenseDesc,
        setExpenseDesc,
        expenseAmount,
        setExpenseAmount,
        weightValue,
        setWeightValue,
        loggedWeights,
        setLoggedWeights,
        isWorkoutActive,
        setIsWorkoutActive,
        workoutTimer,
        setWorkoutTimer,
        handleToggleTask,
        handleAddTaskSubmit,
        handleAddWeightSubmit,
        handleToggleExercise,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppContextProvider');
  }
  return context;
};
