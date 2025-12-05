import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// Updated interface to handle new API response format
export interface KeyPoint {
  point: string;
}

export interface SummaryData {
  summarization?: any;
  summary?: any;
  transcription?: any;
  aiActionList?: any[];
  mediaFile?: {
    path: string;
    deleted_at: string | null;
    id: number;
    uuid: string;
    user_id: number;
    media_type: string;
    file_extension: string;
    file_size: string;
    file_length: string | null;
    input_source: string;
    updated_at: string;
    created_at: string;
    location: string;
  }; 
  extraction?: any;


}

// API Response wrapper interface
export interface ApiResponse {
  status: number; 
  message: string;
  code: number;
  data: SummaryData[];
}

interface SummaryState {
  currentSummary: SummaryData | null;
  isLoading: boolean;
  error: string | null;
  apiError: string | null; // New field for API-specific errors
}

const initialState: SummaryState = {
  currentSummary: null,
  isLoading: false,
  error: null,
  apiError: null,
};

// Helper function to validate and transform API response
const validateAndTransformResponse = (response: any): SummaryData | null => {
  try {
    // Check if response has the expected structure
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response format: Response is not an object');
    }

    // Check if it's an array response (new format)
    if (Array.isArray(response)) {
      if (response.length === 0) {
        throw new Error('No data found in response');
      }
      return response[0]; // Return first item
    }

    // Check if it's a wrapped response (new format)
    if (response.status !== undefined && response.data) {
      if (response.status !== 1) {
        throw new Error(`API Error: ${response.message || 'Unknown error'}`);
      }
      if (!Array.isArray(response.data) || response.data.length === 0) {
        throw new Error('No data found in API response');
      }
      return response.data[0]; // Return first item
    }

    // Check if it's text/url format (has extraction and summarization at root)
    if (response.extraction && response.summarization) {
      return response;
    }

    // Check if it's the old format
    if (response.summary && response.mediaFile) {
      return response;
    }

    // If it's already a SummaryData format (e.g., from storage rehydration)
    // Check for common summary data fields
    if (response.summary || response.summarization || response.aiActionList) {
      return response;
    }

    throw new Error('Unknown response format');
  } catch (error) {
    console.error('Error validating response:', error);
    throw error;
  }
};

// Helper function to extract key points safely
const extractKeyPoints = (summary: any): KeyPoint[] => {
  try {
    // Handle new format with key_points array
    if (summary.key_points && Array.isArray(summary.key_points)) {
      return summary.key_points.map((point: any) => ({
        point: typeof point === 'string' ? point : point.point || String(point)
      }));
    }

    // Handle old format with string array
    if (Array.isArray(summary.key_points)) {
      return summary.key_points.map((point: string) => ({ point }));
    }

    // Fallback
    return [];
  } catch (error) {
    console.error('Error extracting key points:', error);
    return [];
  }
};

const summarySlice = createSlice({
  name: 'summary',
  initialState,
  reducers: {
    setSummary: (state, action: PayloadAction<SummaryData>) => {
      state.currentSummary = action.payload;
      state.isLoading = false;
      state.error = null;
      state.apiError = null;
    },
    setSummaryFromApiResponse: (state, action: PayloadAction<any>) => {
      try {
        const validatedResponse = validateAndTransformResponse(action.payload);
        if (validatedResponse) {
          // Ensure key_points are in the correct format
          if (validatedResponse.summary?.summary?.key_points) {
            validatedResponse.summary.summary.key_points = extractKeyPoints(validatedResponse.summary.summary);
          }
          if (validatedResponse.summary?.summarization?.keyPoints) {
            validatedResponse.summary.summarization.keyPoints = extractKeyPoints(validatedResponse.summary.summarization);
          }
          
          state.currentSummary = validatedResponse;
          state.isLoading = false;
          state.error = null;
          state.apiError = null;
        }
      } catch (error) {
        state.error = error instanceof Error ? error.message : 'Failed to process summary data';
        state.apiError = error instanceof Error ? error.message : 'Unknown error occurred';
        state.isLoading = false;
        state.currentSummary = null;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
      if (action.payload) {
        state.error = null;
        state.apiError = null;
      }
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    setApiError: (state, action: PayloadAction<string>) => {
      state.apiError = action.payload;
      state.isLoading = false;
    },
    clearSummary: (state) => {
      state.currentSummary = null;
      state.isLoading = false;
      state.error = null;
      state.apiError = null;
    },
  },
});

export const { 
  setSummary, 
  setSummaryFromApiResponse, 
  setLoading, 
  setError, 
  setApiError, 
  clearSummary 
} = summarySlice.actions;
export default summarySlice.reducer;
