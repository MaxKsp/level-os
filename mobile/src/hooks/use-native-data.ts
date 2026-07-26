import { useCallback, useEffect, useState } from 'react';

import {
  apiRequest,
  type DashboardPayload,
  type NativeProfile,
  type SubscriptionState,
} from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

type State<T> = {
  data: T | null;
  error: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

function useEndpoint<T>(path: string): State<T> {
  const { authenticated } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    if (!authenticated) return;
    setError(false);
    try {
      setData(await apiRequest<T>(path));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [authenticated, path]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, error, loading, refresh };
}

export const useDashboard = () => useEndpoint<DashboardPayload>('/api/data.php?all=1');
export const useProfile = () => useEndpoint<NativeProfile>('/api/me.php');
export const useSubscription = () => useEndpoint<SubscriptionState>('/api/subscription.php');

export type NativeWorkout = {
  id: string;
  name: string;
  modality?: string;
  exercises?: unknown[];
};

export type NativeTraining = {
  workouts: NativeWorkout[];
  measurements: { id: string; date?: string; weightKg?: number; weight?: number }[];
  sessions: { id: string; name: string; date: string; durationSec?: number }[];
  programs: unknown[];
  programHistory: unknown[];
};

export const useTraining = () => useEndpoint<NativeTraining>('/api/training.php');

export type NativeShoppingItem = {
  item: string;
  quantity: string;
  category: string;
};

export type NativeDietMeal = {
  name: string;
  description: string;
  estimatedCostBRL: number;
};

export type NativeDietPlan = {
  id?: string;
  goal: string;
  periodDays: number;
  budgetBRL: number;
  estimatedCostBRL: number;
  days: { day: number; meals: NativeDietMeal[] }[];
  shoppingList?: NativeShoppingItem[];
  createdAt?: string;
};

export type NativeNutrition = {
  plan: NativeDietPlan | null;
  history: NativeDietPlan[];
};

export const useNutrition = () => useEndpoint<NativeNutrition>('/api/nutrition.php');
