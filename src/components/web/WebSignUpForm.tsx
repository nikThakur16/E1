import { Formik, Form, Field, ErrorMessage, type FormikHelpers } from "formik";
import * as Yup from "yup";
import { useNavigate } from "react-router-dom";
import Button from "../comman/button";
import type { SignupFormData } from "../../config/auth.types";
import { useSignupMutation, useResendVerificationLinkMutation } from "../../store/api/authApi";
import toast from 'react-hot-toast';
import { useState } from "react";

// Validation schema
const signupSchema = Yup.object().shape({
  firstName: Yup.string()
    .min(2, "First name must be at least 2 characters")
    .required("First name is required"),
  lastName: Yup.string()
    .min(2, "Last name must be at least 2 characters")
    .required("Last name is required"),
  email: Yup.string()
    .email("Please enter a valid email address")
    .required("Email is required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Please confirm your password"),
});

export default function WebSignUpForm({ onSignUpSuccess }: { onSignUpSuccess: (formEmail: string) => void }) {
  const navigate = useNavigate();
  const [signup, { isLoading: isSignupLoading }] = useSignupMutation();
  const [resendVerification, { isLoading: isResending }] = useResendVerificationLinkMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Initial form values
  const initialValues: SignupFormData = {
    firstName: "",
    lastName: "",
    email: "",  
    password: "",
    confirmPassword: "",
  };

  const handleSignUp = async (
    values: SignupFormData,
    { setSubmitting, setFieldError }: FormikHelpers<SignupFormData>
  ) => {
    try {
      setSubmitting(true);
  
      // Use RTK Query mutation
      const result = await signup({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
      }).unwrap();

      console.log("Signup API Response:", result);

      if (result?.status === 1) {
        // Store email in localStorage for verification page
        localStorage.setItem('signupEmail', values.email);
        
        // ✅ Show success toast for verification email sent
        toast.success("Verification email has been sent! Please check your inbox.", {
          duration: 4000,
          position: 'top-center',
        });
        
        // Redirect to verification page with email in state
        onSignUpSuccess(values.email);
        console.log("Redirecting to verification page");
      } else {
        // Handle API error response
        const errorMessage = result?.message || "Signup failed";
        setFieldError("general", errorMessage);
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error("Sign up error:", error);
      
      // Handle RTK Query error
      let errorMessage = "An error occurred during signup";
      if (error.data) {
        errorMessage = error.data.message || error.data.error || errorMessage;
      }
      
      setFieldError("general", errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async (email: string) => {
    try {
      const result = await resendVerification(email).unwrap();
      
      if (result?.status === 1) {
        toast.success("Verification email sent again! Please check your inbox.", {
          duration: 4000,
          position: 'top-center',
        });
      } else {
        toast.error(result?.message || "Failed to resend verification email");
      }
    } catch (error: any) {
      console.error("Resend verification error:", error);
      const errorMessage = error?.data?.message || "Failed to resend verification email";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="w-full px-6 md:px-12 py-16 bg-white rounded-[28px] shadow p-8">
      {/* Heading */}
      <h2 className="text-[30px] 2xl:text-[40px] font-bold text-center text-[#1F2937] mb-2">
        Sign Up
      </h2>
      <p className="text-center font-medium text-[#1F2937] text-[18px] 2xl:text-[20px] mb-8">
        Sign up to your account
      </p>

      {/* Form */}
      <Formik
        initialValues={initialValues}
        validationSchema={signupSchema}
        onSubmit={handleSignUp}
      >
        {({ isSubmitting, errors, touched, values }) => (
          <Form className="">
            {/* General error */}
            <ErrorMessage
              name="general"
              component="div"
              className="text-red-500 text-sm mb-4 text-center"
            />

            {/* First Name */}
            <div className="relative">
              <svg
                className="absolute left-[5%] top-[18%] text-gray-400"
                width="23"
                height="23"
                viewBox="0 0 23 23"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.1417 13.3635C13.673 13.3635 15.725 10.9011 15.725 7.86353C15.725 4.82596 13.673 2.36353 11.1417 2.36353C8.61038 2.36353 6.55835 4.82596 6.55835 7.86353C6.55835 10.9011 8.61038 13.3635 11.1417 13.3635Z"
                  fill="#4B5563"
                />
                <path
                  d="M20.1252 18.0384C19.3002 16.3884 17.7419 15.0134 15.7252 14.1884C15.1752 14.0051 14.5335 14.0051 14.0752 14.2801C13.1585 14.8301 12.2419 15.1051 11.1419 15.1051C10.0419 15.1051 9.12522 14.8301 8.20855 14.2801C7.75022 14.0968 7.10855 14.0051 6.55855 14.2801C4.54188 15.1051 2.98355 16.4801 2.15855 18.1301C1.51688 19.3218 2.52521 20.6968 3.90022 20.6968H18.3836C19.7586 20.6968 20.7669 19.3218 20.1252 18.0384Z"
                  fill="#4B5563"
                />
              </svg>

              <Field
                name="firstName"
                type="text"
                placeholder="First Name"
                className={`w-full pl-16 pr-4 py-3 border font-[400] text-[14px] text-[rgba(75, 85, 99, 0.6)] mb-2 border-gray-300 rounded-full ${
                  errors.firstName && touched.firstName
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
              />
              <ErrorMessage
                name="firstName"
                component="div"
                className="text-red-500 text-sm mb-4 ml-4"
              />
            </div>

            {/* Last Name */}
            <div className="relative">
              <svg
                className="absolute left-[5%] top-[18%] text-gray-400"
                width="23"
                height="23"
                viewBox="0 0 23 23"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.1417 13.3635C13.673 13.3635 15.725 10.9011 15.725 7.86353C15.725 4.82596 13.673 2.36353 11.1417 2.36353C8.61038 2.36353 6.55835 4.82596 6.55835 7.86353C6.55835 10.9011 8.61038 13.3635 11.1417 13.3635Z"
                  fill="#4B5563"
                />
                <path
                  d="M20.1252 18.0384C19.3002 16.3884 17.7419 15.0134 15.7252 14.1884C15.1752 14.0051 14.5335 14.0051 14.0752 14.2801C13.1585 14.8301 12.2419 15.1051 11.1419 15.1051C10.0419 15.1051 9.12522 14.8301 8.20855 14.2801C7.75022 14.0968 7.10855 14.0051 6.55855 14.2801C4.54188 15.1051 2.98355 16.4801 2.15855 18.1301C1.51688 19.3218 2.52521 20.6968 3.90022 20.6968H18.3836C19.7586 20.6968 20.7669 19.3218 20.1252 18.0384Z"
                  fill="#4B5563"
                />
              </svg>

              <Field
                name="lastName"
                type="text"
                placeholder="Last Name"
                className={`w-full pl-16 pr-4 py-3 border font-[400] text-[14px] text-[rgba(75, 85, 99, 0.6)] mb-2 border-gray-300 rounded-full ${
                  errors.lastName && touched.lastName
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
              />
              <ErrorMessage
                name="lastName"
                component="div"
                className="text-red-500 text-sm mb-4 ml-4"
              />
            </div>

            {/* Email */}
            <div className="relative">
              <svg
                className="absolute left-[5%] top-[18%] text-gray-400"
                width="23"
                height="22"
                viewBox="0 0 23 22"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g clipPath="url(#clip0_1166_5643)">
                  <path
                    d="M11.3547 15.1253C10.6445 15.1253 9.93419 14.8923 9.32833 14.4202L0.354736 7.44249V17.1878C0.354736 18.3265 1.27813 19.2503 2.41724 19.2503H20.2922C21.4313 19.2503 22.3547 18.3269 22.3547 17.1878V7.44249L13.3829 14.4249C12.777 14.8933 12.0637 15.1253 11.3547 15.1253ZM1.0547 6.24366L10.1727 13.3378C10.8683 13.8792 11.8429 13.8792 12.5385 13.3378L21.6565 6.24366C22.0583 5.89991 22.3547 5.3714 22.3547 4.81281C22.3547 3.6737 21.4309 2.75031 20.2922 2.75031H2.41724C1.27813 2.75031 0.354736 3.6737 0.354736 4.81281C0.354736 5.3714 0.612979 5.89991 1.0547 6.24366Z"
                    fill="#4B5563"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_1166_5643">
                    <rect
                      width="22"
                      height="22"
                      fill="white"
                      transform="translate(0.354736 0.000305176)"
                    />
                  </clipPath>
                </defs>
              </svg>

              <Field
                name="email"
                type="email"
                placeholder="Email Address"
                className={`w-full pl-16 pr-4 py-3 border font-[400] text-[14px] text-[rgba(75, 85, 99, 0.6)] mb-2 border-gray-300 rounded-full ${
                  errors.email && touched.email
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
              />
              <ErrorMessage
                name="email"
                component="div"
                className="text-red-500 text-sm mb-4 ml-4"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <svg
                className="absolute left-[5%] top-[18%]"
                width="23"
                height="22"
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
                className={`w-full pl-16 pr-4 py-3 border font-[400] text-[14px] text-[rgba(75, 85, 99, 0.6)] mb-2 border-gray-300 rounded-full ${
                  errors.password && touched.password
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-[3%] top-[42%] -translate-y-1/2  cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg  width="23" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="#4B5563" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 9l-6 6" stroke="#4B5563" strokeWidth="1.7" strokeLinecap="round"/>
                    <circle cx="12" cy="12" r="3" stroke="#4B5563" strokeWidth="1.7"/>
                  </svg>
                ) : (
                  <svg width="23" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="#4B5563" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="#4B5563" strokeWidth="1.7"/>
                  </svg>
                )}
              </button>
              <ErrorMessage
                name="password"
                component="div"
                className="text-red-500 text-sm mb-4 ml-4"
              />
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <svg
                className="absolute left-[5%] top-[18%]"
                width="23"
                height="22"
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
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm Password"
                className={`w-full pl-16 pr-4 py-3 border font-[400] text-[14px] text-[rgba(75, 85, 99, 0.6)] mb-2 border-gray-300 rounded-full ${
                  errors.confirmPassword && touched.confirmPassword
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-[2%] top-[42%] -translate-y-1/2 p-1 cursor-pointer"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? (
                  <svg width="23" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="#4B5563" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 9l-6 6" stroke="#4B5563" strokeWidth="1.7" strokeLinecap="round"/>
                    <circle cx="12" cy="12" r="3" stroke="#4B5563" strokeWidth="1.7"/>
                  </svg>
                ) : (
                  <svg width="23" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="#4B5563" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="#4B5563" strokeWidth="1.7"/>
                  </svg>
                )}
              </button>
              <ErrorMessage
                name="confirmPassword"
                component="div"
                className="text-red-500 text-sm mb-4 ml-4"
              />
            </div>

            {/* Sign Up button */}
            <Button
              title={isSubmitting ? "Signing Up..." : "Sign Up"}
              type="submit"
              disabled={isSubmitting}
            />

            {/* Resend Verification Button - Show after successful signup */}
            {values.email && (
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => handleResendVerification(values.email)}
                  disabled={isResending}
                  className="text-[#3F7EF8] text-[14px] font-[500] hover:underline disabled:opacity-50 cursor-pointer"
                >
                  {isResending ? "Sending..." : "Resend Verification Email"}
                </button>
              </div>
            )}
          </Form>
        )}
      </Formik>

      {/* Divider */}
      <div className="flex items-center my-6">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="mx-2 text-[14px] font-[400] text-[#4B5563]">
          or Sign up with
        </span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      {/* Social Buttons */}
      <div className="flex my-[28px] flex-col lg:flex-row gap-3">
        <button className="flex-1 flex items-center justify-center gap-2 border border-gray-300 rounded-full py-3 hover:bg-gray-50 cursor-pointer">
          <svg
            width="14"
            height="17"
            viewBox="0 0 14 17"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8.19909 3.86112C7.96916 3.93141 7.64414 3.98569 7.22855 4.02417C7.24726 3.06905 7.48898 2.2452 7.95733 1.55377C8.41707 0.866797 9.19369 0.39213 10.2885 0.129883C10.2953 0.148245 10.3041 0.185007 10.3126 0.236054C10.3211 0.287102 10.3295 0.322111 10.3364 0.341388C10.3364 0.366759 10.3381 0.399178 10.3415 0.437654C10.3432 0.476473 10.3449 0.507978 10.3449 0.534492C10.3449 0.925426 10.2545 1.3607 10.0742 1.84146C9.88853 2.32223 9.5989 2.76447 9.2073 3.16825C8.87178 3.51365 8.53456 3.74527 8.19909 3.86112ZM12.3797 10.601C11.9507 9.96733 11.7361 9.25141 11.7361 8.45674C11.7361 7.73209 11.9372 7.06866 12.3423 6.46687C12.5603 6.13868 12.9145 5.76143 13.4065 5.33175C13.083 4.92101 12.7596 4.60184 12.436 4.37019C11.8502 3.95419 11.1877 3.74531 10.4471 3.74531C10.006 3.74531 9.46772 3.85411 8.83437 4.07175C8.22485 4.29114 7.77857 4.3988 7.49922 4.3988C7.288 4.3988 6.85902 4.30341 6.2118 4.11057C5.55807 3.91804 5.00797 3.82261 4.56006 3.82261C3.48896 3.82261 2.60679 4.28383 1.90858 5.20687C1.20531 6.14219 0.854492 7.34238 0.854492 8.80219C0.854492 10.3554 1.3126 11.966 2.22709 13.6399C3.15352 15.2999 4.09008 16.1299 5.03515 16.1299C5.35195 16.1299 5.76393 16.021 6.26648 15.8034C6.77044 15.5914 7.21321 15.4857 7.59286 15.4857C7.99667 15.4857 8.46661 15.5884 9.00118 15.7929C9.56658 15.9983 10.0026 16.1007 10.3075 16.1007C11.1045 16.1007 11.9029 15.4729 12.7067 14.2164C13.2279 13.4153 13.611 12.6145 13.8545 11.8134C13.2993 11.6396 12.8089 11.2361 12.3797 10.601Z"
              fill="#292524"
            />
          </svg>
          <span className="text-sm font-[400] text-[#4B5563]">
            Continue with Apple
          </span>
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 border border-gray-300 rounded-full py-3 hover:bg-gray-50 cursor-pointer">
          <svg
            width="17"
            height="17"
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
          <span className="text-sm font-[400] text-[#4B5563]">
            Continue with Google
          </span>
        </button>
      </div>

      {/* Sign In */}
      <p className="text-center text-[16px] text-[#4B5563] font-[400] mt-6">
        Already have an account?{" "}
        <button
          onClick={() => navigate("/")}
          className="text-[#1F2937] text-[16px] font-bold hover:underline cursor-pointer"
        >
          Sign In
        </button>
      </p>
    </div>
  );
}
