type ScreenModule = Record<string, unknown>

const loaders: Record<string, () => Promise<ScreenModule>> = {
  "/": () => import("../modules/overview/OverviewScreen"),
  "/financeiro": () => import("../modules/finance/FinanceScreen"),
  "/agenda": () => import("../modules/routine/RoutineScreen"),
  "/treinos": () => import("../modules/training/TrainingScreen"),
  "/alimentacao": () => import("../modules/nutrition/NutritionScreen"),
  "/perfil": () => import("../modules/profile/ProfileScreen"),
}

export const loadOverview = loaders["/"]
export const loadFinance = loaders["/financeiro"]
export const loadRoutine = loaders["/agenda"]
export const loadTraining = loaders["/treinos"]
export const loadNutrition = loaders["/alimentacao"]
export const loadProfile = loaders["/perfil"]

export function prefetchRoute(pathname: string) {
  const normalized = pathname.split("?")[0]
  const loader = loaders[normalized]
  if (loader) void loader()
}
