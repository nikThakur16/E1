import Button from "../comman/button";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useResetPasswordMutation } from "../../store/api/authApi";
import toast from "react-hot-toast";
import { useState } from "react";





export default function WebResetPass() {
    const [searchParams] = useSearchParams();
    const navigate=useNavigate()
    const [resetPassword, { isLoading: isResetting }] = useResetPasswordMutation();
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

const token= searchParams.get("token") as string;
console.log("token",token); 

  

    const handleClick=async(password: string)=>{
        const result = await resetPassword({password: password, token: token}).unwrap();
        console.log("Reset password response:", result);
        if (!password) {
            toast.error("Password is required");
            return;
        }
        if (!token) {
            toast.error("Token is required");
            return;
        }
        if (result.status === 1) {
            toast.success("Password reset successfully! Redirecting to login...", {
              duration: 3000,
              position: 'top-center',
            });
            
            // Redirect to login page after successful password reset
            setTimeout(() => {
              navigate("/");
            }, 1000);
        } else {
            toast.error(result.message || "Failed to reset password");
        }
    }
        
  return (
    <div className="w-full h-full flex itemx-center flex-col justify-center px-3 md:px-12 py-16 bg-white rounded-[28px] shadow">
      {/* Heading */}
      <h2 className="text-[30px] 2xl:text-[40px] font-bold text-center text-[#1F2937] mb-2">
      Reset Password 
      </h2>
      <p className="text-center font-medium text-[#1F2937] text-[18px] 2xl:text-[20px] mb-8">The password must be different than the previous one.</p>

      {/* Form */}
      <form className="space-y-6">
        {/* Email */}
        <div className="relative">  
          <svg
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#4B556399]"
            width="20"
            height="20"
            viewBox="0 0 23 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16.6392 7.33333V5.5C16.6392 4.04131 16.0597 2.64236 15.0282 1.61091C13.9968 0.579463 12.5979 0 11.1392 0C9.68047 0 8.28152 0.579463 7.25007 1.61091C6.21862 2.64236 5.63916 4.04131 5.63916 5.5V7.33333C4.91048 7.33551 4.21227 7.62594 3.69702 8.14119C3.18177 8.65645 2.89134 9.35466 2.88916 10.0833V16.5C2.88916 17.9587 3.46862 19.3576 4.50007 20.3891C5.53152 21.4205 6.93047 22 8.38916 22H13.8892C15.3479 22 16.7468 21.4205 17.7782 20.3891C18.8097 19.3576 19.3892 17.9587 19.3892 16.5V10.0833C19.387 9.35466 19.0966 8.65645 18.5813 8.14119C18.066 7.62594 17.3678 7.33551 16.6392 7.33333ZM7.47249 5.5C7.47249 4.52754 7.8588 3.59491 8.54644 2.90728C9.23407 2.21964 10.1667 1.83333 11.1392 1.83333C12.1116 1.83333 13.0443 2.21964 13.7319 2.90728C14.4195 3.59491 14.8058 4.52754 14.8058 5.5V7.33333H7.47249V5.5ZM12.0558 16.5C12.0558 16.7431 11.9592 16.9763 11.7873 17.1482C11.6154 17.3201 11.3823 17.4167 11.1392 17.4167C10.896 17.4167 10.6629 17.3201 10.491 17.1482C10.3191 16.9763 10.2225 16.7431 10.2225 16.5V12.8333C10.2225 12.5902 10.3191 12.3571 10.491 12.1852C10.6629 12.0132 10.896 11.9167 11.1392 11.9167C11.3823 11.9167 11.6154 12.0132 11.7873 12.1852C11.9592 12.3571 12.0558 12.5902 12.0558 12.8333V16.5Z"
              fill="#4B5563"
            />
          </svg>
          {/* <svg
            className="absolute right-4 top-1/2 transform -translate-y-1/2"
            width="25"
            height="24"
            viewBox="0 0 25 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21.9719 12.43C21.8889 12.311 19.9099 9.486 17.1789 7.555C15.7629 6.552 13.9769 6 12.1509 6C10.3259 6 8.53987 6.552 7.12087 7.555C4.38987 9.486 2.41287 12.311 2.32987 12.43C2.09187 12.773 2.09187 13.228 2.32987 13.571C2.41287 13.69 4.38987 16.515 7.12087 18.446C8.53987 19.448 10.3259 20 12.1509 20C13.9769 20 15.7629 19.448 17.1789 18.445C19.9099 16.514 21.8889 13.689 21.9719 13.57C22.2109 13.228 22.2109 12.772 21.9719 12.43ZM12.1509 16.5C10.2169 16.5 8.65087 14.93 8.65087 13C8.65087 11.066 10.2169 9.5 12.1509 9.5C14.0809 9.5 15.6509 11.066 15.6509 13C15.6509 14.93 14.0809 16.5 12.1509 16.5Z"
              fill="#4B5563"
              fill-opacity="0.5"
            />
            <path
              d="M14.1504 12.9993C14.1504 14.1013 13.2524 14.9993 12.1504 14.9993C11.0454 14.9993 10.1504 14.1013 10.1504 12.9993C10.1504 11.8943 11.0454 10.9993 12.1504 10.9993C13.2524 10.9993 14.1504 11.8943 14.1504 12.9993Z"
              fill="#4B5563"
              fill-opacity="0.5"
            />
          </svg> */}

          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            required
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 font-[400] text-[14px] text-[#1F2937] rounded-full focus:border-[#5B9AFF] focus:outline-none transition-colors"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2  cursor-pointer"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg  width="25" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="#4B5563" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 9l-6 6" stroke="#4B5563" strokeWidth="1.7" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="3" stroke="#4B5563" strokeWidth="1.7"/>
              </svg>
            ) : (
              <svg  width="25" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="#4B5563" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="#4B5563" strokeWidth="1.7"/>
              </svg>
            )}
          </button>
        </div>
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#4B556399]"
            width="20"
            height="20"
            viewBox="0 0 23 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16.6392 7.33333V5.5C16.6392 4.04131 16.0597 2.64236 15.0282 1.61091C13.9968 0.579463 12.5979 0 11.1392 0C9.68047 0 8.28152 0.579463 7.25007 1.61091C6.21862 2.64236 5.63916 4.04131 5.63916 5.5V7.33333C4.91048 7.33551 4.21227 7.62594 3.69702 8.14119C3.18177 8.65645 2.89134 9.35466 2.88916 10.0833V16.5C2.88916 17.9587 3.46862 19.3576 4.50007 20.3891C5.53152 21.4205 6.93047 22 8.38916 22H13.8892C15.3479 22 16.7468 21.4205 17.7782 20.3891C18.8097 19.3576 19.3892 17.9587 19.3892 16.5V10.0833C19.387 9.35466 19.0966 8.65645 18.5813 8.14119C18.066 7.62594 17.3678 7.33551 16.6392 7.33333ZM7.47249 5.5C7.47249 4.52754 7.8588 3.59491 8.54644 2.90728C9.23407 2.21964 10.1667 1.83333 11.1392 1.83333C12.1116 1.83333 13.0443 2.21964 13.7319 2.90728C14.4195 3.59491 14.8058 4.52754 14.8058 5.5V7.33333H7.47249V5.5ZM12.0558 16.5C12.0558 16.7431 11.9592 16.9763 11.7873 17.1482C11.6154 17.3201 11.3823 17.4167 11.1392 17.4167C10.896 17.4167 10.6629 17.3201 10.491 17.1482C10.3191 16.9763 10.2225 16.7431 10.2225 16.5V12.8333C10.2225 12.5902 10.3191 12.3571 10.491 12.1852C10.6629 12.0132 10.896 11.9167 11.1392 11.9167C11.3823 11.9167 11.6154 12.0132 11.7873 12.1852C11.9592 12.3571 12.0558 12.5902 12.0558 12.8333V16.5Z"
              fill="#4B5563"
            />
          </svg>
          {/* <svg
            className="absolute right-4 top-1/2 transform -translate-y-1/2"
            width="25"
            height="24"
            viewBox="0 0 25 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21.9719 12.43C21.8889 12.311 19.9099 9.486 17.1789 7.555C15.7629 6.552 13.9769 6 12.1509 6C10.3259 6 8.53987 6.552 7.12087 7.555C4.38987 9.486 2.41287 12.311 2.32987 12.43C2.09187 12.773 2.09187 13.228 2.32987 13.571C2.41287 13.69 4.38987 16.515 7.12087 18.446C8.53987 19.448 10.3259 20 12.1509 20C13.9769 20 15.7629 19.448 17.1789 18.445C19.9099 16.514 21.8889 13.689 21.9719 13.57C22.2109 13.228 22.2109 12.772 21.9719 12.43ZM12.1509 16.5C10.2169 16.5 8.65087 14.93 8.65087 13C8.65087 11.066 10.2169 9.5 12.1509 9.5C14.0809 9.5 15.6509 11.066 15.6509 13C15.6509 14.93 14.0809 16.5 12.1509 16.5Z"
              fill="#4B5563"
              fill-opacity="0.5"
            />
            <path
              d="M14.1504 12.9993C14.1504 14.1013 13.2524 14.9993 12.1504 14.9993C11.0454 14.9993 10.1504 14.1013 10.1504 12.9993C10.1504 11.8943 11.0454 10.9993 12.1504 10.9993C13.2524 10.9993 14.1504 11.8943 14.1504 12.9993Z"
              fill="#4B5563"
              fill-opacity="0.5"
            />
          </svg> */}

            <input
              type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password"
            required
         className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 font-[400] text-[14px] text-[#1F2937] rounded-full focus:border-[#5B9AFF] focus:outline-none transition-colors"
        
          />
                  <button
            type="button"
            onClick={() => setShowConfirmPassword(v => !v)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2  cursor-pointer"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? (
              <svg  width="25" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="#4B5563" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 9l-6 6" stroke="#4B5563" strokeWidth="1.7" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="3" stroke="#4B5563" strokeWidth="1.7"/>
              </svg>
            ) : (
              <svg  width="25" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="#4B5563" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="#4B5563" strokeWidth="1.7"/>
              </svg>
            )}
          </button>
        </div>


        {/* Sign In button */}
        <Button onClick={()=>handleClick(password)} title="Reset" disabled={isResetting}/>
      </form>

    </div>
  );
}
