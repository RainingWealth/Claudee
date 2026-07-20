import { useLocalStorage } from "./useLocalStorage";

export type ViewMode = "grid" | "list";

export function useViewMode() {
  return useLocalStorage<ViewMode>("ft.viewmode", "grid");
}
