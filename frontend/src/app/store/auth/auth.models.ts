export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  authProvider: 'local' | 'google';
  phoneNumber: string | null;
  telegramChatId: string | null;
  isActive: boolean;
  isApproved: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  requiresPhoneSetup: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  expiresIn: number;
}
