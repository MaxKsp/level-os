import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';
import { useCallback, useEffect, useState } from 'react';

import {
  apiRequest,
  type ActivityEvent,
  type CalendarConnection,
  type CalendarEvent,
  type DashboardPayload,
  type NativeProfile,
  type Preferences,
  type ProfileDetails,
  type ProgressState,
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

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  // Se o usuário alterou algo no site enquanto o app estava em segundo plano,
  // a tela ativa busca novamente a mesma fonte de dados ao voltar.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  return { data, error, loading, refresh };
}

export const useDashboard = () => useEndpoint<DashboardPayload>('/api/data.php?all=1');
export const useProfile = () => useEndpoint<NativeProfile>('/api/me.php');
export const useSubscription = () => useEndpoint<SubscriptionState>('/api/subscription.php');
export const useProgress = () => useEndpoint<ProgressState>('/api/progress.php');
export const useProfileDetails = () => useEndpoint<ProfileDetails>('/api/profile.php');
export const usePreferences = () => useEndpoint<Preferences>('/api/prefs.php');
export const useActivity = () => useEndpoint<{ events: ActivityEvent[] }>('/api/activity.php');
export const useCalendarConnection = () =>
  useEndpoint<{ connection: CalendarConnection; events: CalendarEvent[] }>('/api/calendar.php');

export type NativeWorkout = {
  id: string;
  name: string;
  focus: string;
  modality?: string;
  exercises: {
    id?: string;
    name: string;
    sets?: string | number | null;
    reps?: string | number | null;
    loadKg?: number | null;
  }[];
};

export type NativeTraining = {
  workouts: NativeWorkout[];
  measurements: {
    id: string;
    type: string;
    value: number;
    unit: string;
    date: string;
    weightKg?: number;
    weight?: number;
  }[];
  sessions: {
    id: string;
    name: string;
    modality: string;
    date: string;
    durationSec?: number | null;
    exercises?: {
      sets?: number | null;
      reps?: number | null;
      loadKg?: number | null;
      distanceKm?: number | null;
    }[];
  }[];
  programs: {
    id: string;
    name: string;
    focus: string;
    status: 'active' | 'archived';
    daysPerWeek: number;
  }[];
  programHistory: {
    id: string;
    name: string;
    focus: string;
    status: 'active' | 'archived';
    daysPerWeek: number;
  }[];
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
