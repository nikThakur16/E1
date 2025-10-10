import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import VerificationModal from "../components/web/VerificationModal";
import { useResendVerificationLinkMutation, useForgotPasswordMutation, useVerifyEmailByLinkMutation } from "../store/api/authApi";
import toast from 'react-hot-toast';

const WebVerification = () => {
  const location = useLocation();
  const [resendVerificationLink, { isLoading: isResending }] = useResendVerificationLinkMutation();
  const [forgotPassword, { isLoading: isResendingReset }] = useForgotPasswordMutation();
  const [verifyEmailByLink, { isLoading: isVerifying }] = useVerifyEmailByLinkMutation();
  const [email, setEmail] = useState("");
  const [verificationType, setVerificationType] = useState<'signup' | 'password-reset'>('signup');
  const [isVerified, setIsVerified] = useState(false);
  const navigate = useNavigate();

  // Get email and verification type from location state or localStorage
  useEffect(() => {
    // Check if this is a verification link click (has token in URL)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      // This is a verification link click, handle verification
      handleEmailVerification(token);
      return;
    }

    // Try to get email and type from location state first
    const stateEmail = location.state?.email;
    const stateType = location.state?.type; // 'signup' or 'password-reset'

    if (stateEmail) {
      setEmail(stateEmail);
      setVerificationType(stateType || 'signup'); // Default to signup if type not specified
      console.log("✅ Set email and type from state:", stateEmail, stateType || 'signup');
    } else {
      // Fallback: get from localStorage (if stored during signup)
      const storedEmail = localStorage.getItem('signupEmail');
      if (storedEmail) {
        setEmail(storedEmail);
        setVerificationType('signup');
        console.log("✅ Set email and type from localStorage:", storedEmail, 'signup');
      }
    }
  }, [location.state]);

  // Handle email verification when user clicks verification link
  const handleEmailVerification = async (token: string) => {
    try {
      const result = await verifyEmailByLink({ token }).unwrap();
      console.log("Email verification response:", result);
      
      if (result.status === 1) {
        setIsVerified(true);
        
        // Check if the response includes user data and token for automatic login
        if (result.data?.token || result.user?.token) {
          const userToken = result.data?.token || result.user?.token;
          const userData = result.data?.user || result.user;
          
          console.log("Auto-login after verification:", { userToken, userData });
          
          // Store credentials just like WebSignInForm does
          if (chrome?.storage?.local) {
            await chrome.storage.local.set({ 
              token: userToken, 
              user: userData,
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
                    token: userToken,
                    user: userData,
                    loggedIn: true
                  }
                });
                console.log('Verification login data sent to extension');
              } else {
                // Method 2: Use postMessage to communicate with extension
                window.postMessage({
                  type: 'EXTENSION_LOGIN_DATA',
                  data: {
                    token: userToken,
                    user: userData,
                    loggedIn: true
                  }
                }, '*');
                console.log('Verification login data posted to extension via postMessage');
              }
            } catch (error) {
              console.log('Extension not available, using localStorage fallback');
              localStorage.setItem("token", userToken);
              localStorage.setItem("user", JSON.stringify(userData));
              localStorage.setItem("loggedIn", "true");
            }
          }
          
          toast.success("Email verified and logged in successfully! Redirecting...", {
            duration: 3000,
            position: 'top-center',
          });
          
          // Redirect to download page (same as WebSignInForm)
          setTimeout(() => {
            navigate("/download");
          }, 1000);
        } else {
          // No auto-login data, redirect to login page
          toast.success("Email verified successfully! Redirecting to login...", {
            duration: 3000,
            position: 'top-center',
          });
          
          // Clear stored email
          localStorage.removeItem('signupEmail');
          
          // Redirect to login page after successful verification
          setTimeout(() => {
            navigate("/");
          }, 2000);
        }
      } else {
        toast.error(result.message || "Email verification failed");
      }
    } catch (error: any) {
      console.error("Email verification error:", error);
      const errorMessage = error?.data?.message || "Email verification failed";
      toast.error(errorMessage);
    }
  };

  // Debug effect to see when verificationType changes
  useEffect(() => {
    console.log("🔄 Verification type updated:", verificationType);
    console.log("🔄 Email updated:", email);
  }, [verificationType, email]);

  const handleResendVerificationLink = async () => {
    if (!email) {
      const errorMessage = verificationType === 'password-reset' 
        ? "Email address not found. Please try forgot password again."
        : "Email address not found. Please sign up again.";
      toast.error(errorMessage);
      return;
    }

    try {
      const result = await resendVerificationLink(email).unwrap();
      console.log("Resend verification response:", result);
      
      if (result.status === 1) {
        const successMessage = verificationType === 'password-reset'
          ? "Password reset email sent again! Please check your inbox."
          : "Verification email sent again! Please check your inbox.";
        toast.success(successMessage, {
          duration: 4000,
          position: 'top-center',
        });
      } else {
        toast.error(result.message || "Failed to resend verification email");
      }
    } catch (error: any) {
      console.error("Resend verification error:", error);
      const errorMessage = error?.data?.message || "Failed to resend verification email";
      toast.error(errorMessage);
    }
  };

  const handleResendResetLink = async () => {
    if (!email) {
      toast.error("Email address not found. Please try forgot password again.");
      return;
    }
    
    try {
      const result = await forgotPassword(email).unwrap();
      console.log("Resend reset link response:", result);
      if (result.status === 1) {
        toast.success("Reset link sent again! Please check your inbox.", {
          duration: 4000,
          position: 'top-center',
        });
      } else {
        toast.error(result.message || "Failed to resend reset link");
      }
    } catch (error: any) {
      console.error("Resend reset link error:", error);
      const errorMessage = error?.data?.message || "Failed to resend reset link";
      toast.error(errorMessage);
    }
  };

  const handleBelowTextClick = () => {
    navigate('/');
  };

  // Different modal content based on verification type
  const getModalContent = () => {
    console.log("🎨 Getting modal content for type:", verificationType);
    
    // Show success state if email was verified
    if (isVerified) {
      return {
        iconSrc: "/web/verify-bg.svg", // You can use a success icon here
        title: "Email Verified!",
        description: "Your email has been successfully verified and you're now logged in. Redirecting...",
        buttonText: "Continue",
        belowText: "",
        border: "border-[0.51px] border-solid border-[rgba(34,197,94,0.5)]"
      };
    }
    
    if (verificationType === 'password-reset') {
      return {
        iconSrc: "/web/email.svg",
        title: "Email Sent!",
        description: `We've emailed you to reset your password. Check your inbox and if you don't see it, be sure to look in your Spam folder.`,
        buttonText: isResending ? "Sending..." : "Resend Reset Link",
        belowText: "Back to Login",
        border: "border-[0.51px] border-solid border-[rgba(63,126,248,0.5)]"
      };
    } else {
      return {
        iconSrc: "/web/email.svg",
        title: "Verification Link Sent",
        description: `We've sent a verification link to ${email || 'your email address'}. Please check your inbox and spam folder to complete the verification process.`,
        buttonText: isResending ? "Sending..." : "Resend Verification Link",
        belowText: "Log In",
        border: ""
      };
    }
  };

  const modalContent = getModalContent();

  return (
    <div className='bg-[url("/web/verify-bg.svg")] bg-cover bg-center min-h-screen w-full flex items-center justify-center'>
      <VerificationModal
        iconSrc={modalContent.iconSrc}
        title={modalContent.title}
        description={modalContent.description}
        buttonText={modalContent.buttonText}
        belowText={modalContent.belowText}
        onBelowTextClick={handleBelowTextClick}
        border={modalContent.border}
        onButtonClick={isVerified ? handleBelowTextClick : (verificationType === 'password-reset' ? handleResendResetLink : handleResendVerificationLink)}
        disabled={isResending || isResendingReset || isVerifying}
      />
    </div>
  );
};

export default WebVerification;
