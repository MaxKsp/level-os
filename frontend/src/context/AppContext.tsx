import React, { createContext, useContext, useState, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface Task {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  completed: boolean;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

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
  // Navigation
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;

  // Global State
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  exercises: Exercise[];
  setExercises: React.Dispatch<React.SetStateAction<Exercise[]>>;
  
  // Finances
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  invoice: number;
  setInvoice: React.Dispatch<React.SetStateAction<number>>;
  projection: number;
  setProjection: React.Dispatch<React.SetStateAction<number>>;

  // Alerts & Modals
  isAlertVisible: boolean;
  setIsAlertVisible: (visible: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
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
  expenseType: 'invoice' | 'sub_balance';
  setExpenseType: (type: 'invoice' | 'sub_balance') => void;

  weightValue: string;
  setWeightValue: (weight: string) => void;
  loggedWeights: WeightRecord[];
  setLoggedWeights: React.Dispatch<React.SetStateAction<WeightRecord[]>>;

  // Registration strength checks
  registerPassword: string;
  setRegisterPassword: (password: string) => void;
  passwordChecks: {
    minChar: boolean;
    hasUpper: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };

  // Timers
  blockedTime: number;
  setBlockedTime: React.Dispatch<React.SetStateAction<number>>;
  isWorkoutActive: boolean;
  setIsWorkoutActive: (active: boolean) => void;
  workoutTimer: number;
  setWorkoutTimer: React.Dispatch<React.SetStateAction<number>>;

  // Handlers
  handleToggleTask: (id: string) => void;
  handleAddTaskSubmit: (e: React.FormEvent) => void;
  handlePayAlertBill: () => void;
  handleAddExpenseSubmit: (e: React.FormEvent) => void;
  handleAddWeightSubmit: (e: React.FormEvent) => void;
  handleToggleExercise: (id: string) => void;
  handleResetSimulation: () => void;
}

const DEFAULT_TASKS: Task[] = [
  { id: '1', time: '07:00', title: 'Meditação Matinal', subtitle: 'Mental health session', completed: true },
  { id: '2', time: '08:30', title: 'Treino de Cardio', subtitle: 'Corrida leve na esteira', completed: true },
  { id: '3', time: '10:00', title: 'Planejamento Semanal', subtitle: 'Metas do time', completed: true },
  { id: '4', time: '14:00', title: 'Reunião de Alinhamento', subtitle: 'Videochamada', completed: false },
  { id: '5', time: '16:30', title: 'Revisão de Código', subtitle: 'GitHub Pull Requests', completed: false },
  { id: '6', time: '17:30', title: 'Lanche da Tarde', subtitle: 'Shake proteico', completed: true },
  { id: '7', time: '18:00', title: 'Comprar Suplementos', subtitle: 'Farmácia central', completed: true },
];

const DEFAULT_EXERCISES: Exercise[] = [
  { id: 'ex-1', name: 'Supino Reto (Barra)', sets: '4 séries x 10 reps', completed: true },
  { id: 'ex-2', name: 'Supino Inclinado (Halteres)', sets: '3 séries x 12 reps', completed: true },
  { id: 'ex-3', name: 'Crucifixo Reto (Halteres)', sets: '3 séries x 12 reps', completed: true },
  { id: 'ex-4', name: 'Desenvolvimento de Ombros', sets: '4 séries x 10 reps', completed: false },
  { id: 'ex-5', name: 'Tríceps Pulley', sets: '3 séries x 12 reps', completed: false },
  { id: 'ex-6', name: 'Tríceps Testa', sets: '3 séries x 10 reps', completed: false },
  { id: 'ex-7', name: 'Elevação Lateral de Ombros', sets: '4 séries x 15 reps', completed: false },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<string>('dashboard');

  // Load from local storage or defaults
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('orby_tasks');
    return saved ? JSON.parse(saved) : DEFAULT_TASKS;
  });

  const [exercises, setExercises] = useState<Exercise[]>(() => {
    const saved = localStorage.getItem('orby_exercises');
    return saved ? JSON.parse(saved) : DEFAULT_EXERCISES;
  });

  // Financial States
  const [balance, setBalance] = useState<number>(12450.80);
  const [invoice, setInvoice] = useState<number>(2120.45);
  const [projection, setProjection] = useState<number>(4890.12);

  // Alert & Search
  const [isAlertVisible, setIsAlertVisible] = useState<boolean>(true);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

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
  const [expenseType, setExpenseType] = useState<'invoice' | 'sub_balance'>('invoice');

  const [weightValue, setWeightValue] = useState('80.0');
  const [loggedWeights, setLoggedWeights] = useState<WeightRecord[]>([
    { date: '12/07', weight: 81.2 },
    { date: '13/07', weight: 80.9 },
    { date: '14/07', weight: 80.5 },
    { date: '15/07', weight: 80.2 },
  ]);

  // Auth Checklist
  const [registerPassword, setRegisterPassword] = useState('');
  const [passwordChecks, setPasswordChecks] = useState({
    minChar: false,
    hasUpper: false,
    hasNumber: false,
    hasSpecial: false,
  });

  // Timers
  const [blockedTime, setBlockedTime] = useState<number>(14 * 60 + 56);
  const [isWorkoutActive, setIsWorkoutActive] = useState<boolean>(false);
  const [workoutTimer, setWorkoutTimer] = useState<number>(1800);

  // Save state on change
  useEffect(() => {
    localStorage.setItem('orby_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('orby_exercises', JSON.stringify(exercises));
  }, [exercises]);

  // Handle countdown timer for blocked screen
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (currentScreen === 'bloqueada') {
      interval = setInterval(() => {
        setBlockedTime((prev) => (prev > 0 ? prev - 1 : 14 * 60 + 56));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentScreen]);

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

  // Password Strength Check
  useEffect(() => {
    setPasswordChecks({
      minChar: registerPassword.length >= 8,
      hasUpper: /[A-Z]/.test(registerPassword),
      hasNumber: /[0-9]/.test(registerPassword),
      hasSpecial: /[^A-Za-z0-9]/.test(registerPassword),
    });
  }, [registerPassword]);

  // Handlers
  const handleToggleTask = (id: string) => {
    setTasks(
      tasks.map((task) => {
        if (task.id === id) {
          return { ...task, completed: !task.completed };
        }
        return task;
      })
    );
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

  const handlePayAlertBill = () => {
    setBalance((prev) => prev - 342.10);
    setProjection((prev) => prev - 342.10);
    setIsAlertVisible(false);
  };

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(expenseAmount);
    if (!expenseDesc.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    if (expenseType === 'invoice') {
      setInvoice((prev) => prev + parsedAmount);
      setProjection((prev) => prev - parsedAmount);
    } else {
      setBalance((prev) => prev - parsedAmount);
      setProjection((prev) => prev - parsedAmount);
    }

    setExpenseDesc('');
    setExpenseAmount('');
    setIsExpenseModalOpen(false);
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

  const handleResetSimulation = () => {
    setTasks(DEFAULT_TASKS);
    setExercises(DEFAULT_EXERCISES);
    setBalance(12450.80);
    setInvoice(2120.45);
    setProjection(4890.12);
    setIsAlertVisible(true);
    setBlockedTime(14 * 60 + 56);
    setLoggedWeights([
      { date: '12/07', weight: 81.2 },
      { date: '13/07', weight: 80.9 },
      { date: '14/07', weight: 80.5 },
      { date: '15/07', weight: 80.2 },
    ]);
  };

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        tasks,
        setTasks,
        exercises,
        setExercises,
        balance,
        setBalance,
        invoice,
        setInvoice,
        projection,
        setProjection,
        isAlertVisible,
        setIsAlertVisible,
        isSearchOpen,
        setIsSearchOpen,
        searchQuery,
        setSearchQuery,
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
        expenseType,
        setExpenseType,
        weightValue,
        setWeightValue,
        loggedWeights,
        setLoggedWeights,
        registerPassword,
        setRegisterPassword,
        passwordChecks,
        blockedTime,
        setBlockedTime,
        isWorkoutActive,
        setIsWorkoutActive,
        workoutTimer,
        setWorkoutTimer,
        handleToggleTask,
        handleAddTaskSubmit,
        handlePayAlertBill,
        handleAddExpenseSubmit,
        handleAddWeightSubmit,
        handleToggleExercise,
        handleResetSimulation,
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
