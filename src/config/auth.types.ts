// Authentication Types
export interface LoginFormData {
  email: string;
  password: string;
  general?:string
}

export interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
}

export interface ForgotPasswordFormData {
  email: string;
}

export interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
  token: string;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
} 

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;

  refreshToken?: string;
  status: number;
  data: {     
    token: string;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;   
  firstName?: string;
  lastName?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  password: string;
  token: string;  
        }

export interface SocialAuthRequest {
  provider: 'google' | 'apple';
  token: string;
}

export interface VerifyEmailRequest {
  token: string;
}

// Form validation error types
export interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  general?: string;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  errors?: FormErrors;
  status?: number;
  user?: T;
}

// AI Actions Types
export interface AIActionCategory {
  id: number;
  name: string;
  title: string;
}


export interface AIActionsResponse {
  status: number;
  message: string;
  code: number;
    data: any[];
  }


// Auth context types
export interface AuthContextType {
  authState: AuthState;
  login: (credentials: LoginRequest) => Promise<AuthResponse>;
  signup: (userData: SignupRequest) => Promise<AuthResponse>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<ApiResponse>;
  resetPassword: (data: ResetPasswordRequest) => Promise<ApiResponse>;
  socialLogin: (data: SocialAuthRequest) => Promise<AuthResponse>;
  refreshToken: () => Promise<AuthResponse>;
  clearError: () => void;
}

