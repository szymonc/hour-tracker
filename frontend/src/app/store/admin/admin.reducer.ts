import { createFeature, createReducer, on } from '@ngrx/store';
import { AdminActions } from './admin.actions';

export interface PendingUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AdminDashboard {
  recentEntries: any[];
  missingPreviousWeek: { weekStartDate: string; users: any[]; count: number };
  missingTwoWeeks: { weekStartDates: string[]; users: any[]; count: number };
  statusCounts: { missing: number; zeroReason: number; underTarget: number; met: number };
  circleMetrics: any[];
}

export interface AdminState {
  dashboard: AdminDashboard | null;
  dashboardLoading: boolean;
  pendingUsers: PendingUser[];
  pendingUsersLoading: boolean;
  pendingActionLoading: boolean;
  users: any[];
  usersLoading: boolean;
  usersPagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
  circles: any[];
  circlesLoading: boolean;
  circlesActionLoading: boolean;
  reminderTargets: any[];
  remindersLoading: boolean;
  selectedWeek: string;
  reportGenerating: boolean;
  backfillStatus: 'idle' | 'loading' | 'success' | 'error';
  backfillError: string | null;
  telegramSending: string | null; // userId being sent, or null
  error: string | null;
}

const initialState: AdminState = {
  dashboard: null,
  dashboardLoading: false,
  pendingUsers: [],
  pendingUsersLoading: false,
  pendingActionLoading: false,
  users: [],
  usersLoading: false,
  usersPagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
  circles: [],
  circlesLoading: false,
  circlesActionLoading: false,
  reminderTargets: [],
  remindersLoading: false,
  selectedWeek: '',
  reportGenerating: false,
  backfillStatus: 'idle',
  backfillError: null,
  telegramSending: null,
  error: null,
};

export const adminFeature = createFeature({
  name: 'admin',
  reducer: createReducer(
    initialState,
    on(AdminActions.loadDashboard, (state) => ({
      ...state,
      dashboardLoading: true,
      error: null,
    })),
    on(AdminActions.loadDashboardSuccess, (state, { dashboard }) => ({
      ...state,
      dashboard,
      dashboardLoading: false,
    })),
    on(AdminActions.loadDashboardFailure, (state, { error }) => ({
      ...state,
      dashboardLoading: false,
      error,
    })),
    // Pending Users
    on(AdminActions.loadPendingUsers, (state) => ({
      ...state,
      pendingUsersLoading: true,
      error: null,
    })),
    on(AdminActions.loadPendingUsersSuccess, (state, { users }) => ({
      ...state,
      pendingUsers: users,
      pendingUsersLoading: false,
    })),
    on(AdminActions.loadPendingUsersFailure, (state, { error }) => ({
      ...state,
      pendingUsersLoading: false,
      error,
    })),
    on(AdminActions.approveUser, AdminActions.declineUser, (state) => ({
      ...state,
      pendingActionLoading: true,
      error: null,
    })),
    on(AdminActions.approveUserSuccess, (state, { userId }) => ({
      ...state,
      pendingUsers: state.pendingUsers.filter(u => u.id !== userId),
      pendingActionLoading: false,
    })),
    on(AdminActions.declineUserSuccess, (state, { userId }) => ({
      ...state,
      pendingUsers: state.pendingUsers.filter(u => u.id !== userId),
      pendingActionLoading: false,
    })),
    on(AdminActions.approveUserFailure, AdminActions.declineUserFailure, (state, { error }) => ({
      ...state,
      pendingActionLoading: false,
      error,
    })),
    on(AdminActions.loadUsers, (state) => ({
      ...state,
      usersLoading: true,
      error: null,
    })),
    on(AdminActions.loadUsersSuccess, (state, { users, pagination }) => ({
      ...state,
      users,
      usersPagination: pagination,
      usersLoading: false,
    })),
    on(AdminActions.loadUsersFailure, (state, { error }) => ({
      ...state,
      usersLoading: false,
      error,
    })),
    on(AdminActions.loadCircles, (state) => ({
      ...state,
      circlesLoading: true,
      error: null,
    })),
    on(AdminActions.loadCirclesSuccess, (state, { circles }) => ({
      ...state,
      circles,
      circlesLoading: false,
    })),
    on(AdminActions.loadCirclesFailure, (state, { error }) => ({
      ...state,
      circlesLoading: false,
      error,
    })),
    on(AdminActions.createCircle, AdminActions.deleteCircle, (state) => ({
      ...state,
      circlesActionLoading: true,
      error: null,
    })),
    on(AdminActions.createCircleSuccess, AdminActions.deleteCircleSuccess, (state) => ({
      ...state,
      circlesActionLoading: false,
      error: null,
    })),
    on(AdminActions.createCircleFailure, AdminActions.deleteCircleFailure, (state, { error }) => ({
      ...state,
      circlesActionLoading: false,
      error,
    })),
    on(AdminActions.loadReminderTargets, (state) => ({
      ...state,
      remindersLoading: true,
      error: null,
    })),
    on(AdminActions.loadReminderTargetsSuccess, (state, { targets, weekStart }) => ({
      ...state,
      reminderTargets: targets,
      selectedWeek: weekStart,
      remindersLoading: false,
    })),
    on(AdminActions.loadReminderTargetsFailure, (state, { error }) => ({
      ...state,
      remindersLoading: false,
      error,
    })),
    on(AdminActions.generateCSVReport, (state) => ({
      ...state,
      reportGenerating: true,
    })),
    on(AdminActions.generateCSVReportSuccess, AdminActions.generateCSVReportFailure, (state) => ({
      ...state,
      reportGenerating: false,
    })),
    on(AdminActions.backfillEntry, (state) => ({
      ...state,
      backfillStatus: 'loading' as const,
      backfillError: null,
    })),
    on(AdminActions.backfillEntrySuccess, (state) => ({
      ...state,
      backfillStatus: 'success' as const,
      backfillError: null,
    })),
    on(AdminActions.backfillEntryFailure, (state, { error }) => ({
      ...state,
      backfillStatus: 'error' as const,
      backfillError: error,
    })),
    on(AdminActions.resetBackfillStatus, (state) => ({
      ...state,
      backfillStatus: 'idle' as const,
      backfillError: null,
    })),
    // Telegram Reminders
    on(AdminActions.sendTelegramReminder, (state, { userId }) => ({
      ...state,
      telegramSending: userId,
      error: null,
    })),
    on(AdminActions.sendTelegramReminderSuccess, (state, { userId, sentAt }) => ({
      ...state,
      telegramSending: null,
      dashboard: state.dashboard ? {
        ...state.dashboard,
        missingPreviousWeek: {
          ...state.dashboard.missingPreviousWeek,
          users: state.dashboard.missingPreviousWeek.users.map((u: any) =>
            u.id === userId ? { ...u, lastReminderSentAt: sentAt } : u
          ),
        },
      } : null,
    })),
    on(AdminActions.sendTelegramReminderFailure, (state, { error }) => ({
      ...state,
      telegramSending: null,
      error,
    })),
  ),
});

export const {
  selectAdminState,
  selectDashboard,
  selectDashboardLoading,
  selectPendingUsers,
  selectPendingUsersLoading,
  selectPendingActionLoading,
  selectUsers,
  selectUsersLoading,
  selectUsersPagination,
  selectCircles,
  selectCirclesLoading,
  selectCirclesActionLoading,
  selectReminderTargets,
  selectRemindersLoading,
  selectSelectedWeek,
  selectReportGenerating,
  selectBackfillStatus,
  selectBackfillError,
  selectTelegramSending,
  selectError,
} = adminFeature;
