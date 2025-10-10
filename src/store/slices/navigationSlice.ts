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
    },
    setPdfViewData: (state, action: PayloadAction<{ pdfData: any }>) => {
      state.pdfViewData = action.payload;
    },
    clearLectureNotesData: (state) => {
      state.lectureNotesData = null;
    },
    clearPdfViewData: (state) => {
      state.pdfViewData = null;
    },
    clearAllNavigationData: (state) => {
      state.lectureNotesData = null;
      state.pdfViewData = null;
    },
  },
});

export const {
  setLectureNotesData,
  setPdfViewData,
  clearLectureNotesData,
  clearPdfViewData,
  clearAllNavigationData,
} = navigationSlice.actions;

export default navigationSlice.reducer;
