import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface NavigationState {
  lectureNotesData: {
    apiResponse: any;
    actionTitle: string;
  } | null;
  pdfViewData: {
    pdfData: any;
  } | null;
}

const initialState: NavigationState = {
  lectureNotesData: null,
  pdfViewData: null,
};

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    setLectureNotesData: (state, action: PayloadAction<{ apiResponse: any; actionTitle: string }>) => {
      state.lectureNotesData = action.payload;
      
      // Persist to chrome storage
      if (chrome?.storage?.local) {
        chrome.storage.local.set({ 
          'lectureNotesData': action.payload 
        });
      } else {
        localStorage.setItem('lectureNotesData', JSON.stringify(action.payload));
      }
    },
    setPdfViewData: (state, action: PayloadAction<{ pdfData: any }>) => {
      state.pdfViewData = action.payload;
      
      // Persist to chrome storage
      if (chrome?.storage?.local) {
        chrome.storage.local.set({ 
          'pdfViewData': action.payload 
        });
      } else {
        localStorage.setItem('pdfViewData', JSON.stringify(action.payload));
      }
    },
    clearLectureNotesData: (state) => {
      state.lectureNotesData = null;
      
      // Clear from storage
      if (chrome?.storage?.local) {
        chrome.storage.local.remove(['lectureNotesData']);
      } else {
        localStorage.removeItem('lectureNotesData');
      }
    },
    clearPdfViewData: (state) => {
      state.pdfViewData = null;
      
      // Clear from storage
      if (chrome?.storage?.local) {
        chrome.storage.local.remove(['pdfViewData']);
      } else {
        localStorage.removeItem('pdfViewData');
      }
    },
    clearAllNavigationData: (state) => {
      state.lectureNotesData = null;
      state.pdfViewData = null;
      
      // Clear from storage
      if (chrome?.storage?.local) {
        chrome.storage.local.remove(['lectureNotesData', 'pdfViewData']);
      } else {
        localStorage.removeItem('lectureNotesData');
        localStorage.removeItem('pdfViewData');
      }
    },
    loadLectureNotesData: (state, action: PayloadAction<{ apiResponse: any; actionTitle: string }>) => {
      state.lectureNotesData = action.payload;
    },
    loadPdfViewData: (state, action: PayloadAction<{ pdfData: any }>) => {
      state.pdfViewData = action.payload;
    },
  },
});

export const {
  setLectureNotesData,
  setPdfViewData,
  clearLectureNotesData,
  clearPdfViewData,
  clearAllNavigationData,
  loadLectureNotesData,
  loadPdfViewData,
} = navigationSlice.actions;

export default navigationSlice.reducer;
