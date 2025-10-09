import Button from "../comman/button";
import toast from 'react-hot-toast';
import { useState } from 'react';
import { useForgotPasswordMutation } from '../../store/api/authApi';
import { useNavigate } from 'react-router-dom';   
export default function WebForgotPass() {
  const [email, setEmail] = useState('');
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const navigate = useNavigate();
  const handleForgotPassword = async (email: string) => {
    try {
      if (!email) {
        toast.error("Please enter your email address");
        return;
      }

      const result = await forgotPassword(email).unwrap();
      console.log("Forgot password result:", result);
      
      if (result?.status === 1) {
        toast.success("Password reset email sent! Please check your inbox.", {
          duration: 4000,
          position: 'top-center',
        });
        setEmail(''); // Clear the form
        navigate('/verify', { 
          state: { 
            email: email, 
            type: 'password-reset' 
          } 
        });
      } else {
        toast.error(result.message || "Failed to send reset email");
      }
    } catch (error: any) {
      console.error("Forgot password error:", error);
      toast.error(error?.data?.message || "An error occurred. Please try again.");
    }
  };

  return (
    <div className="w-full flex itemx-center flex-col justify-center  min-h-full  px-3 lg:px-16 py-8 md:py-12 bg-white rounded-[28px] shadow ">
      {/* Heading */}
      <h2 className="text-[30px] 2xl:text-[40px] font-bold text-center text-[#1F2937] mb-2">
      Forgot Password
      </h2>
      <p className="text-center font-medium text-[#4B5563] text-[18px] 2xl:text-[20px] mb-8">Enter your email below and we will send you a OTP to reset your password.</p>

      {/* Form */}
      <form className="" onSubmit={(e) => {
        e.preventDefault();
        handleForgotPassword(email);
      }}>
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

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            required
            className="w-full pl-16 pr-4 py-3 border font-[400] text-[16px] text-[#4B556399] mb-[26px] border-gray-300 rounded-full"
            onChange={(e) => setEmail(e.target.value)}
            />
        </div>

        {/* Send button */}
        <Button 
          title={isLoading ? "Sending..." : "Send Reset Email"} 
          type="submit"
          disabled={isLoading || !email}
        />
      </form>

    </div>
  );
}
