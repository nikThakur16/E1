import { HashRouter, Routes, Route } from "react-router-dom";
import { Toaster } from 'react-hot-toast';

import "../style/web.css"
import WebLogin from "./webPages/WebLogin";
import WebSignUp from "./webPages/webSignUp";
import WebForgotPassword from "./webPages/WebForgotPassword";
import WebResetPassword from "./webPages/WebResetPassword";
import WebVerification from "./webPages/WebVerification";
import WebDownload from "./webPages/WebDownload";
import WebVerifyEmail from "./webPages/WebVerifyEmail";

export default function WebApp() {
  return (
    <HashRouter>
      <Routes>
        {/* Authentication routes using common layout */}
        <Route path="/" element={<WebLogin/>} />
        <Route path="/signup" element={<WebSignUp/>} />
        <Route path="/forgot" element={<WebForgotPassword/>} />
        <Route path="/reset" element={<WebResetPassword/>} />
        <Route path="/verify" element={<WebVerification/>} />
        <Route path="/download" element={<WebDownload/>} />
        <Route path="/verify-email" element={<WebVerifyEmail/>} />
        <Route path="/reset-password" element={<WebResetPassword/>} />
      </Routes>
      
      {/* Global Toaster */}
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
          },
        }}
      />
    </HashRouter> 
  );
}
