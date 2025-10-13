import Button from "../comman/button";
import { useNavigate, useSearchParams } from "react-router";
import { useResetPasswordMutation } from "../../store/api/authApi";
import toast from "react-hot-toast";
import { useState } from "react";
import { Formik, Form, Field, ErrorMessage, type FormikHelpers } from "formik";
import * as Yup from "yup";

// Validation schema
const resetPasswordSchema = Yup.object().shape({
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Please confirm your password"),
});

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

export default function WebResetPass() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [resetPassword, { isLoading: isResetting }] = useResetPasswordMutation();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const token = searchParams.get("token") as string;
    console.log("token", token); 

    const initialValues: ResetPasswordFormData = {
      password: "",
      confirmPassword: "",
    };

    const handleSubmit = async (
      values: ResetPasswordFormData,
      { setSubmitting }: FormikHelpers<ResetPasswordFormData>
    ) => {
        if (!token) {
            toast.error("Token is required");
            setSubmitting(false);
            return;
        }

        try {
            const result = await resetPassword({ password: values.password, token: token }).unwrap();
            console.log("Reset password response:", result);
            
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
        } catch (error: any) {
            console.error("Reset password error:", error);
            const errorMessage = error?.data?.message || "Failed to reset password";
            toast.error(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };
        
  return (
    <div className="w-full h-full flex itemx-center flex-col justify-center px-3 md:px-12 py-16 bg-white rounded-[28px] shadow">
      {/* Heading */}
      <h2 className="text-[30px] 2xl:text-[40px] font-bold text-center text-[#1F2937] mb-2">
        Reset Password 
      </h2>
      <p className="text-center font-medium text-[#1F2937] text-[18px] 2xl:text-[20px] mb-8">
        The password must be different than the previous one.
      </p>

      {/* Formik Form */}
      <Formik
        initialValues={initialValues}
        validationSchema={resetPasswordSchema}
        onSubmit={handleSubmit}
      >
        {({ errors, touched, isSubmitting, values }) => (
          <Form className="space-y-4">
            {/* Password Field */}
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

              <Field
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                autoComplete="new-password"
                className={`w-full pl-12 pr-12 py-3 border-2 font-[400] text-[14px] text-[#1F2937] rounded-full focus:border-[#5B9AFF] focus:outline-none transition-colors ${
                  errors.password && touched.password ? "border-red-300" : "border-gray-200"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="25" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="#4B5563" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 9l-6 6" stroke="#4B5563" strokeWidth="1.7" strokeLinecap="round"/>
                    <circle cx="12" cy="12" r="3" stroke="#4B5563" strokeWidth="1.7"/>
                  </svg>
                ) : (
                  <svg width="25" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="#4B5563" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="#4B5563" strokeWidth="1.7"/>
                  </svg>
                )}
              </button>
             
            </div>
            <ErrorMessage
                name="password"
                component="div"
                className="text-red-500 text-sm mt-1 ml-4"
              />

            {/* Confirm Password Field */}
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

              <Field
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                autoComplete="new-password"
                className={`w-full pl-12 pr-12 py-3 border-2 font-[400] text-[14px] text-[#1F2937] rounded-full focus:border-[#5B9AFF] focus:outline-none transition-colors ${
                  errors.confirmPassword && touched.confirmPassword ? "border-red-300" : "border-gray-200"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(v => !v)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 cursor-pointer"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <svg width="25" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="#4B5563" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 9l-6 6" stroke="#4B5563" strokeWidth="1.7" strokeLinecap="round"/>
                    <circle cx="12" cy="12" r="3" stroke="#4B5563" strokeWidth="1.7"/>
                  </svg>
                ) : (
                  <svg width="25" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="#4B5563" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="#4B5563" strokeWidth="1.7"/>
                  </svg>
                )}
              </button>
            
            </div>
            <ErrorMessage
                name="confirmPassword"
                component="div"
                className="text-red-500 text-sm mt-1 ml-4"
              />

            {/* Reset button */}
            <Button 
              type="submit" 
              title={isSubmitting ? "Resetting..." : "Reset"} 
            disabled={isSubmitting || isResetting || !values.password || !values.confirmPassword || !!errors.password || !!errors.confirmPassword}
            />
          </Form>
        )}
      </Formik>
    </div>
  );
}
