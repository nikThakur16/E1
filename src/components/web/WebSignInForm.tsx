import { Formik, Form, Field, ErrorMessage } from "formik";
import { useState } from "react";
import * as Yup from "yup";
import Button from "../comman/button";
import { useNavigate } from "react-router-dom";
import type { LoginFormData } from "../../config/auth.types";
import axios from "axios";
import { useGoogleLogin } from "@react-oauth/google";
import { useLoginMutation } from "../../store/api/authApi";
import toast from 'react-hot-toast';




// Validation schema
const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email("Please enter a valid email address")
    .required("Email is required"),
  password: Yup.string()
    .min(4, "Password must be at least 4 characters")
    .required("Password is required"),
});

export default function WebSignInForm() {
  const navigate = useNavigate();
  const [loginMutation, { isLoading: isLoginLoading }] = useLoginMutation();
  const [showPassword, setShowPassword] = useState(false);

  // Initial form values
  const initialValues: LoginFormData = {
    email: "",
    password: "",
  };

  const handleSignIn = async (
    values: LoginFormData,
    { setSubmitting, setFieldError }: any
  ) => {
    try {
      setSubmitting(true);
      
      // Test toast to ensure it's working
   
  
      // Use RTK Query mutation
      const result = await loginMutation({
        email: values.email,
        password: values.password,
      }).unwrap();

      console.log("Full login result:", result);

        if (result.status === 1 && result?.data?.token) {
      
        console.log("Login successful, showing success toast");
        toast.success("Login successful!", {
          duration: 3000,
          position: 'top-center',
        });
  
        // ✅ Save to extension storage
        if (chrome?.storage?.local) {
          await chrome.storage.local.set({ 
            token: result.data.token, 
            loggedIn: true 
          });
        } else {
          // For local development - try to communicate with extension
          try {
            // Method 1: Try to send message to extension if it's loaded
            if (chrome?.runtime?.id) {
              await chrome.runtime.sendMessage({
                type: 'STORE_LOGIN_DATA',
                data: {
                  token: result.data.token,
                  loggedIn: true
                }
              });
              console.log('Login data sent to extension');
            } else {
              // Method 2: Use postMessage to communicate with extension
              window.postMessage({
                type: 'EXTENSION_LOGIN_DATA',
                data: {
                  token: result.data.token,
                  loggedIn: true
                }
              }, '*');
              console.log('Login data posted to extension via postMessage');
            }
          } catch (error) {
            console.log('Extension not available, using localStorage fallback');
            localStorage.setItem("token", result.data.token);
            localStorage.setItem("loggedIn", "true");
          }
        }
  
        // ✅ Redirect to download page with slight delay to show toast
        setTimeout(() => {
          navigate("/download");
        }, 1000);
      } else {
        console.log("Login condition not met:", result);
        setFieldError("general", result.message || "Login failed");
      } 
    } catch (error: any) {
      console.error("Sign in error:", error);
      
      // Handle RTK Query error
      if (error?.data) {
        setFieldError("general", error.data.message || "Invalid email or password");
      } else {
        setFieldError("general", "An error occurred during sign in");
      }
    } finally {
      setSubmitting(false);
    }
  };
  





  const handleGoogleLogin = async (tokenResponse: any) => {
    try {
      const accessToken = tokenResponse.access_token;

      // 🔹 Fetch user profile
      const { data: userInfo } = await axios.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const user = {
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture,
      };

      // ✅ Store in chrome?.storage?.local (works across popup, background, content scripts)
      if (chrome?.storage?.local) {
        await chrome?.storage?.local.set({
          token: accessToken,
          user,
          loggedIn: true,
        });
      } else {
        // For local development - try to communicate with extension
        try {
          // Method 1: Try to send message to extension if it's loaded
          if (chrome?.runtime?.id) {
            await chrome.runtime.sendMessage({
              type: 'STORE_LOGIN_DATA',
              data: {
                token: accessToken,
                user: user,
                loggedIn: true
              }
            });
            console.log('Google login data sent to extension');
          } else {
            // Method 2: Use postMessage to communicate with extension
            window.postMessage({
              type: 'EXTENSION_LOGIN_DATA',
              data: {
                token: accessToken,
                user: user,
                loggedIn: true
              }
            }, '*');
            console.log('Google login data posted to extension via postMessage');
          }
        } catch (error) {
          console.log('Extension not available, using localStorage fallback');
          localStorage.setItem("token", accessToken);
          localStorage.setItem("user", JSON.stringify(user));
          localStorage.setItem("loggedIn", "true");
        }
      }

      // ✅ Show success toast
      toast.success("Google login successful! Welcome back.", {
        duration: 3000,
        position: 'top-center',
      });

      navigate("/download");
    } catch (error) {
      console.error("Google login failed:", error);
    }
  };

  // Hook that triggers login popup
  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleLogin,
    onError: () => console.error("Google login failed"),
  });


  return (
    <div className="w-full min-h-full px-6 lg:px-16 py-8 md:py-12 bg-white rounded-[28px] shadow-xl">
      {/* Heading */}
      <h2 className="text-[30px] 2xl:text-[40px] font-bold text-center text-[#1F2937] mb-2">
        Log in
      </h2>
      <p className="text-center font-medium text-[#1F2937] text-[18px] 2xl:text-[20px] mb-8">
        Login in to your account
      </p>

      {/* Form */}
      <Formik
        initialValues={initialValues}
        validationSchema={loginSchema}
        onSubmit={handleSignIn}
      >
        {({ isSubmitting, errors, touched }) => (
          
          <Form className="space-y-6">
            {errors.general && (
  <div className="text-red-500 text-sm text-center">{errors.general}</div>
)}
            {/* Email */}
            <div className="email">
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
                    d="M11.3547 15.1253C10.6445 15.1253 9.93419 14.8923 9.32833 14.4202L0.354736 7.44249V17.1878C0.354736 18.3265 1.27813 19.2503 2.41724 19.2503H20.2922C21.4313 19.2503 22.3547 18.3269 22.3547 17.1878V7.44249L13.3829 14.4249C12.777 14.8933 12.0637 15.1253 11.3547 15.1253ZM1.0547 6.24366L10.1727 13.3378C10.8683 13.8792 11.8429 13.8792 12.5385 13.3378L21.6565 6.24366C22.0583 5.89991 22.3547 5.3714 22.3547 4.81281C22.3547 3.6737 21.4309 2.75031 20.2922 2.75031H2.41724C1.27813 2.75031 0.354736 3.6737 0.354736 4.81281C0.354736 5.3714 0.612979 5.89991 1.0547 6.24366Z"
                    fill="#4B5563"
                  />
                </svg>

                <Field
                  name="email"
                  type="email"
                  placeholder="Email Address"
                  className={`w-full pl-12 pr-4 py-3 border-2 font-[400] text-[14px] text-[#1F2937] rounded-full focus:outline-none transition-colors ${
                    errors.email && touched.email
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-200 focus:border-[#5B9AFF]"
                  }`}
                />
              </div>
              <ErrorMessage
                name="email"
                component="div"
                className="text-red-500 text-sm mt-1 ml-4"
              />
            </div>

            {/* Password */}
            <div className="password">
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
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    // eye-off icon
                    <svg width="25" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="#4B5563" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M15 9l-6 6" stroke="#4B5563" strokeWidth="1.7" strokeLinecap="round"/>
                      <circle cx="12" cy="12" r="3" stroke="#4B5563" strokeWidth="1.7"/>
                    </svg>
                  ) : (
                    // eye icon
                    <svg width="25" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="#4B5563" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="3" stroke="#4B5563" strokeWidth="1.7"/>
                    </svg>
                  )}
                </button>

                <Field
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className={`w-full pl-12 pr-4 py-3 border-2 font-[400] text-[14px] text-[#1F2937] rounded-full focus:outline-none transition-colors ${
                    errors.password && touched.password
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-200 focus:border-[#5B9AFF]"
                  }`}
                />
              </div>
              <ErrorMessage
                name="password"
                component="div"
                className="text-red-500 text-sm mt-1 ml-4"
              />
            </div>

            {/* Forgot password */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => navigate("/forgot")}
                className="text-[16px] text-[#5B9AFF] underline underline-offset-1 hover:text-[#3F7EF8] hover:underline transition-colors cursor-pointer"
              >
                Forgot password
              </button>
            </div>

            {/* Sign In button */}
            <Button
              title={isSubmitting ? "Signing In..." : "Sign In"}
              type="submit"
              disabled={isSubmitting}
            />
          </Form>
        )}
      </Formik>

      {/* Divider */}
      <div className="flex items-center my-8">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="mx-4 text-[14px] font-[400] text-[#4B5563]">
          or continue with
        </span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      {/* Social Buttons */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <button
          type="button"
      
          className="flex-1 flex items-center justify-center gap-3 border-2 border-gray-200 rounded-full py-3 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
        >
          <svg
            width="16"
            height="20"
            viewBox="0 0 14 17"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8.19909 3.86112C7.96916 3.93141 7.64414 3.98569 7.22855 4.02417C7.24726 3.06905 7.48898 2.2452 7.95733 1.55377C8.41707 0.866797 9.19369 0.39213 10.2885 0.129883C10.2953 0.148245 10.3041 0.185007 10.3126 0.236054C10.3211 0.287102 10.3295 0.322111 10.3364 0.341388C10.3364 0.366759 10.3381 0.399178 10.3415 0.437654C10.3432 0.476473 10.3449 0.507978 10.3449 0.534492C10.3449 0.925426 10.2545 1.3607 10.0742 1.84146C9.88853 2.32223 9.5989 2.76447 9.2073 3.16825C8.87178 3.51365 8.53456 3.74527 8.19909 3.86112ZM12.3797 10.601C11.9507 9.96733 11.7361 9.25141 11.7361 8.45674C11.7361 7.73209 11.9372 7.06866 12.3423 6.46687C12.5603 6.13868 12.9145 5.76143 13.4065 5.33175C13.083 4.92101 12.7596 4.60184 12.436 4.37019C11.8502 3.95419 11.1877 3.74531 10.4471 3.74531C10.006 3.85411 9.46772 3.85411 8.83437 4.07175C8.22485 4.29114 7.77857 4.3988 7.49922 4.3988C7.288 4.3988 6.85902 4.30341 6.2118 4.11057C5.55807 3.91804 5.00797 3.82261 4.56006 3.82261C3.48896 3.82261 2.60679 4.28383 1.90858 5.20687C1.20531 6.14219 0.854492 7.34238 0.854492 8.80219C0.854492 10.3554 1.3126 11.966 2.22709 13.6399C3.15352 15.2999 4.09008 16.1299 5.03515 16.1299C5.35195 16.1299 5.76393 16.021 6.26648 15.8034C6.77044 15.5914 7.21321 15.4857 7.59286 15.4857C7.99667 15.4857 8.46661 15.5884 9.00118 15.7929C9.56658 15.9983 10.0026 16.1007 10.3075 16.1007C11.1045 16.1007 11.9029 15.4729 12.7067 14.2164C13.2279 13.4153 13.611 12.6145 13.8545 11.8134C13.2993 11.6396 12.8089 11.2361 12.3797 10.601Z"
              fill="#292524"
            />
          </svg>
          <span className="text-sm font-[500] text-[#4B5563]">
            Continue with Apple
          </span>
        </button>
        <button
          type="button"
          onClick={() => googleLogin()} 
          className="flex-1 flex items-center justify-center gap-3 border-2 border-gray-200 rounded-full py-3 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 17 17"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M3.57034 8.34673C3.57034 7.82711 3.65659 7.32886 3.81072 6.86161L1.11447 4.80273C0.588969 5.86961 0.292969 7.07186 0.292969 8.34673C0.292969 9.62061 0.588719 10.822 1.11334 11.8882L3.80809 9.82536C3.65547 9.36023 3.57034 8.86386 3.57034 8.34673Z"
              fill="#FBBC05"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M8.30413 3.62041C9.43301 3.62041 10.4526 4.02041 11.2538 4.67491L13.5843 2.34766C12.1641 1.11128 10.3434 0.347656 8.30413 0.347656C5.13813 0.347656 2.41713 2.15816 1.11426 4.80366L3.81038 6.86253C4.43163 4.97678 6.20251 3.62041 8.30413 3.62041Z"
              fill="#EA4335"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M8.30413 13.0742C6.20263 13.0742 4.43176 11.7178 3.81051 9.83203L1.11426 11.8905C2.41713 14.5364 5.13813 16.3469 8.30413 16.3469C10.2581 16.3469 12.1238 15.653 13.5239 14.353L10.9646 12.3745C10.2425 12.8294 9.33313 13.0742 8.30413 13.0742Z"
              fill="#34A853"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M15.9513 8.34708C15.9513 7.87433 15.8784 7.3652 15.7692 6.89258H8.3042V9.98345H12.6012C12.3863 11.0373 11.8016 11.8475 10.9647 12.3747L13.5239 14.3532C14.9947 12.9882 15.9513 10.9547 15.9513 8.34708Z"
              fill="#4285F4"
            />
          </svg>
          <span className="text-sm font-[500] text-[#4B5563]">
            Continue with Google
          </span>
        </button>
      </div>

      {/* Sign Up Link */}
      <div className="text-center">
        <span className="text-[#4B5563] font-[500] text-[16px]">
          Don't have an account?{" "}
        </span>
        <button
          type="button"
          onClick={() => navigate("/signup")}
          className="text-[#1F2937] hover:underline text-[16px] font-bold cursor-pointer"
        >
          Sign up
        </button>
      </div>
    </div>
  );
}
