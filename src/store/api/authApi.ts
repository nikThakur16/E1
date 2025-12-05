import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { LoginRequest, SignupRequest, AuthResponse, ApiResponse, VerifyEmailRequest, ResetPasswordRequest, AIActionsResponse } from '../../config/auth.types';

// Base query configuration
const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  prepareHeaders: async (headers: Headers, { endpoint }) => {
    // Only set Content-Type to application/json for non-file upload endpoints
    if (endpoint !== 'uploadFileAndGetSummary') {
      headers.set('Content-Type', 'application/json');
    }
    
    headers.set('SecretKey', import.meta.env.VITE_SECRETKEY);
    
    // Add ngrok skip browser warning header for ngrok URLs
    if (import.meta.env.VITE_API_BASE_URL?.includes('ngrok')) {
      headers.set('ngrok-skip-browser-warning', 'true');
    }
    
    // Get token from chrome storage
    try {
      const result = await chrome?.storage?.local.get('token');
      console.log('Token from storage:', result);
      if (result?.token) {
        headers.set('authorization', result.token);
        console.log('Authorization header set:', result.token);
      }
    } catch (error) {
      console.error('Error getting token from storage:', error);
    }
    
    // Debug logging
    console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
    console.log('Secret Key:', import.meta.env.VITE_SECRETKEY ? 'Set' : 'Not set');

    
    return headers;
  },
});

// Define the auth API slice
export const authApi = createApi({
  reducerPath: 'authApi', 
  baseQuery,
  tagTypes: ['Auth', 'User'],
  endpoints: (builder) => ({
    // Login endpoint - POST /login
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials: LoginRequest) => ({
        url: '/login',
        method: 'POST',
        body: {
          email: credentials.email,
          password: credentials.password,
          platform: 'web',
        },
      }),
      invalidatesTags: ['Auth'],
    }),

    // Signup endpoint - POST /signup
    signup: builder.mutation<ApiResponse, SignupRequest>({
      query: (userData: SignupRequest) => ({
        url: '/signup',
        method: 'POST',
        body: {
          email: userData.email,
          password: userData.password,
          first_name: userData.firstName,
          last_name: userData.lastName,
          platform: 'web',
        },
      }),
      invalidatesTags: ['Auth'],
    }),
    //for logout
    logout: builder.mutation<ApiResponse, string>({
      query: (token: string) => ({
        url: '/logout',
        method: 'GET',
        headers: {
          'authorization': token,
        },
      }),
    }),
    // For forgot password
    forgotPassword: builder.mutation<ApiResponse, string>({
      query: (email: string) => ({
        url: '/forgot-password',
        method: 'POST',
        body: { email: email, platform: 'web'},
      }),
    }),

    // For reset password
    resetPassword: builder.mutation<ApiResponse, {password: string, token: string}>({
      query: (data: {password: string, token: string}) => ({
        url: '/reset-password',
        method: 'POST',
        body: {password: data.password},
        headers: {
          'Authorization': data.token,
        },
        }),
    }),

    // Verify email endpoint - POST /verify-email
    verifyEmail: builder.mutation<ApiResponse, string>({
      query: (email: string) => ({
        url: '/verify-email',
        method: 'POST',
        body: { email },
      }),
    }),
    //for resend verification link
    resendVerificationLink: builder.mutation<ApiResponse, string>({
      query: (email: string) => ({
        url: '/resend-otp ',
        method: 'POST',
        body: { email },  
      }),
    }),

    // Verify email by link endpoint - POST /verify-email-by-link
    verifyEmailByLink: builder.mutation<ApiResponse, VerifyEmailRequest>({
      query: (data: VerifyEmailRequest) => ({
        url: '/verify-email-by-link',
        method: 'POST',
        headers: {
          'Authorization': data.token,
        },
      }),
    }),
    //for google login
    googleLogin: builder.mutation<ApiResponse, string>({
      query: (token: string) => ({
        url: '/google-login',
        method: 'POST',
        body: { id_token: token },
      }),
      invalidatesTags: ['Auth'],
    }),
    //for apple login
    appleLogin: builder.mutation<ApiResponse, string>({
      query: (token: string) => ({
        url: '/apple-login',
        method: 'POST',
        body: { id_token: token },
      }),
    }),
    //for user details
    userDetails: builder.query<ApiResponse, string>({
      query: (token: string) => ({
        url: '/users-details',
        method: 'GET',
        headers: {
          'authorization': token,
        },
        providesTags: ['User'],
        keepUnusedDataFor: 3600,
        
      }),
    }),
    //upload file and get summary
    uploadFileAndGetSummary: builder.mutation<ApiResponse, {file: File | undefined, type: string}>({
      query: (data: {file: File | undefined, type: string}) => {
        if (!data.file) {
          throw new Error('File is required for upload');
        }
        const formData = new FormData();
        formData.append('files', data.file); // Note: API expects 'files' (plural)
        formData.append('type', data.type);
        
        return {
          url: '/summary-with-upload-file',
          method: 'POST',
          body: formData,

        };
      },
    }),

    // get summary for urls
    getSummaryForUrl: builder.mutation<ApiResponse, {url: string|undefined}>({
      query: (data: {url: string}) => ({
        url: '/summary-with-url',
        method: 'POST',
        body: data,
      }),
    }),
    //update summary
    updateSummary: builder.mutation<ApiResponse, {id: number, title:string}>({
      query: (data: {id: number, title:string}) => ({
        url: '/update-summary',
        method: 'PUT',
        body: {id: data.id, title: data.title},
      }),
    }),
    //delete summary
    deleteSummary: builder.mutation<ApiResponse, {id: number}>({
      query: (data: {id: number}) => ({
        url: '/delete-summary',
        method: 'DELETE',
        body: {id: data.id},
      }),
    }),
        //get ai actions
        getAIActions: builder.query<AIActionsResponse, number>({
          query: (id: number) => ({
          url: `/get-active-ai-actions?category_id=${id}`,
            method: 'GET',
    
          }), 
        }),

    // get ai actions categories
    getAIActionsCategories: builder.query<ApiResponse, void>({
      query: () => ({
        url: '/get-active-ai-action-categories',
        method: 'GET',
      }),
    }),
    // get summary with actions
    getSummaryWithActions: builder.mutation<ApiResponse, {summary_id: number, action_id: number,ai_content: string}>({
      query: (data: {summary_id: number, action_id: number,ai_content: string}) => ({
        url: '/summary-with-ai-action',
        method: 'POST',
        body: data,
      }),
    }),
    // get summary with text 
    getSummaryWithText: builder.mutation<ApiResponse, {text: string}>({
      query: (data: {text: string}) => ({
        url: '/summary-with-text',
        method: 'POST',
        body: {text_content: data.text},    
      }),
    }),

  }),
});

// Export hooks for usage in functional components
export const {
  useLoginMutation,
  useSignupMutation,
  useVerifyEmailMutation,
  useVerifyEmailByLinkMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useUserDetailsQuery,
  useLogoutMutation,
  useUploadFileAndGetSummaryMutation,
  useGetAIActionsQuery,
  useResendVerificationLinkMutation,
  useGetAIActionsCategoriesQuery,
  useGetSummaryWithActionsMutation,
  useGetSummaryForUrlMutation,
  useGetSummaryWithTextMutation,
  useGoogleLoginMutation,
  useAppleLoginMutation,
  useUpdateSummaryMutation,
  useDeleteSummaryMutation
    } = authApi; 