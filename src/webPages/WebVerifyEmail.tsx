import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ProcessingModal from "../components/web/ProcessingModal";
import VerificationModal from "../components/web/VerificationModal";
import { useVerifyEmailByLinkMutation } from "../store/api/authApi";

const WebVerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifyEmailByLink, { isLoading }] = useVerifyEmailByLinkMutation();
  const [verificationState, setVerificationState] = useState<
    "verifying" | "success" | "failed"
  >("verifying");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const verifyEmail = async () => {
      // Extract token from URL parameters
      const token = searchParams.get("token");

      if (!token) {
        setVerificationState("failed");
        setErrorMessage("Invalid verification link. No token found.");
        return;
      }

      try {
        const result = await verifyEmailByLink({ token }).unwrap();

        if (result.status === 1 && result?.data?.token) {
      
        
    
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
          setVerificationState("failed");
          setErrorMessage(
            result.message || "Verification failed. Please try again."
          );
        }
      } catch (error: any) {
        console.error("Email verification error:", error);
        setVerificationState("failed");
        setErrorMessage(
          error?.data?.message ||
            "The verification link is invalid or has expired. Please request a new verification link."
        );
      }
    };

    verifyEmail();
  }, [searchParams, verifyEmailByLink, navigate]);

  const handleResendVerification = () => {
    // Navigate back to verification page where user can resend
    navigate("/verify");
  };

  const handleBackToLogin = () => {
    navigate("/");
  };

  if (verificationState === "verifying" || isLoading) {
    return (
      <div className='bg-[url("/web/verify-bg.svg")] bg-cover bg-center min-h-screen w-full flex items-center justify-center'>
        <ProcessingModal
          iconSrc="/web/loader.gif"
          title="Verifying..."
          description="We are verifying your account. This will only take a few seconds."
        />
      </div>
    );
  }

  if (verificationState === "success") {
    return (
      <div className='bg-[url("/web/verify-bg.svg")] bg-cover bg-center min-h-screen w-full flex items-center justify-center'>
        <VerificationModal
          iconSrc="/web/email.svg"
          title="Email Verified Successfully!"
          description="Your email has been verified. You will be redirected to the download page shortly."
          buttonText="Go to Download"
          belowText=""
          border="border-[0.51px] border-solid border-[rgba(63,126,248,0.5)]"
          onButtonClick={() => navigate("/download")}
        />
      </div>
    );
  }

  // Failed state
  return (
    <div className='bg-[url("/web/verify-bg.svg")] bg-cover bg-center min-h-screen w-full flex items-center justify-center'>
      <VerificationModal
        iconSrc="/web/failed.svg"
        title="Verification Failed"
        description={errorMessage}
        buttonText="Resend Verification Link"
        belowText="Back to Log In"
        border="border border-solid border-red-500"
        onButtonClick={handleResendVerification}
        onBelowTextClick={handleBackToLogin}
      />
    </div>
  );
};

export default WebVerifyEmail;
