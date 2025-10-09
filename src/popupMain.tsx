// index.tsx (or main entry file)

import ReactDOM from "react-dom/client";
import { Provider } from 'react-redux';
import { store } from './store';
import PopupApp from "./popupApp";
import { UploadProvider } from "./context/UploadContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <UploadProvider>
      <PopupApp />
    </UploadProvider>
  </Provider>
);
