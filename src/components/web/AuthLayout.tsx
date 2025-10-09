import React from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className='min-h-screen min-w-screen py-16 bg-[url("/web/login-bg.svg")] flex items-center justify-center'>
      <div className="max-w-[1000px] 2xl:max-w-[1200px] min-h-[650px] bg-gradient-to-b  from-[#3F7EF8] to-[#5B9AFF] justify-between rounded-[32px] flex flex-col lg:flex-row">
        {/* Left Section - Always remains the same */}
        <div className="login-left px-6 w-[45%] flex flex-col items-center justify-center">
          <img src="/web/logo.svg" alt="logo" className="max-w-[250px] max-h-[46px]" />
          <img src="/web/login-img.svg" alt="login-img" />
          <p className="font-[400] text-[18px] leading-[1.4] text-center text-white w-[90%]">
            No More Note-Taking. AI Records and Summarizes Everything for You.
          </p>
        </div>
        
        {/* Right Section - Dynamic content */}
        <div className="login-right w-[55%]  ">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
