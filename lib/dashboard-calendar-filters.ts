export type DashboardCalendarFilterKey = "pending" | "delayed" | "completed" | "meetings";

export type DashboardCalendarFilters = Record<DashboardCalendarFilterKey, boolean>;

export type DashboardCalendarView = {
  year: number;
  month: number;
  day: number;
};

export const DASHBOARD_CALENDAR_FILTER_EVENT = "dashboard-calendar-filters-change";
export const DASHBOARD_CALENDAR_VIEW_EVENT = "dashboard-calendar-view-change";

export const defaultDashboardCalendarFilters: DashboardCalendarFilters = {
  pending: true,
  delayed: true,
  completed: true,
  meetings: true,
};
