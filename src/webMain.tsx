import React from "react";
import ReactDOM from "react-dom/client";
import WebApp from "./webApp";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Provider } from 'react-redux';
import { store } from './store';

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <WebApp />
      </GoogleOAuthProvider>
    </Provider>
  </React.StrictMode>
);
