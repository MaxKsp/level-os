import { createContext, useContext, type ReactNode } from 'react';
import { useOverviewData, type OverviewData } from '../modules/overview/useOverviewData';
import type { Task } from '../modules/routine/contracts';
import { occurrenceId } from '../modules/routine/selectors';
import { saveDataKey } from '../services/data';
import type { ExpenseLineV4 } from '../modules/finance/contracts';
import { saveFinanceSet, type FinanceSetKey } from '../services/finance';

interface BootstrapState {
  data: OverviewData | null;
  loading: boolean;
  error: Error | null;
  demo: boolean;
  createTask: (task: Task) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (task: Task, date: Date) => Promise<void>;
  createExpense: (expense: ExpenseLineV4) => Promise<void>;
  saveStoreKey: (key: string, value: unknown) => Promise<void>;
  replaceFinanceSet: (key: FinanceSetKey, value: unknown[]) => Promise<void>;
  updateProfile: (patch: Partial<OverviewData['profile']>) => void;
}
const BootstrapContext = createContext<BootstrapState | null>(null);

export function BootstrapProvider({ children }: { children: ReactNode }) {
  const state = useOverviewData();
  const requireData = () => {
    if (!state.data) throw new Error('bootstrap_not_ready');
    return state.data;
  };
  const createTask = async (task: Task) => {
    const current = requireData();
    const tasks = [...current.tasks, task];
    if (!state.demo) await saveDataKey('tasks_v6', tasks);
    state.setData({ ...current, tasks });
  };
  const deleteTask = async (id: string) => {
    const current = requireData();
    const tasks = current.tasks.filter((task) => task.id !== id);
    if (!state.demo) await saveDataKey('tasks_v6', tasks);
    state.setData({ ...current, tasks });
  };
  const updateTask = async (task: Task) => {
    const current = requireData();
    const tasks = current.tasks.map((item) => item.id === task.id ? task : item);
    if (!state.demo) await saveDataKey('tasks_v6', tasks);
    state.setData({ ...current, tasks });
  };
  const toggleTask = async (task: Task, date: Date) => {
    const current = requireData();
    const key = occurrenceId(task, date);
    const checklist = { ...current.checklist, [key]: !current.checklist[key] };
    if (!state.demo) await saveDataKey('checklist_v6', checklist);
    state.setData({ ...current, checklist });
  };
  const createExpense = async (expense: ExpenseLineV4) => {
    const current = requireData();
    const expenseLines = [...current.finance.expense_lines_v4, expense];
    if (!state.demo) await saveFinanceSet('expense_lines_v4', expenseLines);
    state.setData({ ...current, store: { ...current.store, expense_lines_v4: expenseLines }, finance: { ...current.finance, expense_lines_v4: expenseLines } });
  };
  const saveStoreKey = async (key: string, value: unknown) => {
    const current = requireData();
    if (!state.demo) await saveDataKey(key, value);
    const finance = key === 'vaults' || key === 'transfers'
      ? { ...current.finance, [key]: value } as OverviewData['finance']
      : current.finance;
    state.setData({ ...current, store: { ...current.store, [key]: value }, finance });
  };
  const replaceFinanceSet = async (key: FinanceSetKey, value: unknown[]) => {
    const current = requireData();
    if (!state.demo) await saveFinanceSet(key, value);
    const finance = { ...current.finance, [key]: value } as OverviewData['finance'];
    state.setData({ ...current, store: { ...current.store, [key]: value }, finance });
  };
  const updateProfile = (patch: Partial<OverviewData['profile']>) => { if (state.data) state.setData({ ...state.data, profile: { ...state.data.profile, ...patch } }); };
  return <BootstrapContext.Provider value={{ data: state.data, loading: state.loading, error: state.error, demo: state.demo, createTask, updateTask, deleteTask, toggleTask, createExpense, saveStoreKey, replaceFinanceSet, updateProfile }}>{children}</BootstrapContext.Provider>;
}

export function useBootstrap() {
  const state = useContext(BootstrapContext);
  if (!state) throw new Error('useBootstrap deve ser usado dentro de BootstrapProvider');
  return state;
}

export function useOptionalBootstrap() {
  return useContext(BootstrapContext);
}
