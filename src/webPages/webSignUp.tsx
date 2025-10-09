import "../../style/web.css";
import AuthLayout from "../components/web/AuthLayout";

import WebSignUpForm from "../components/web/WebSignUpForm";
import { useNavigate } from "react-router-dom";

const WebLogin = () => {
  const navigate = useNavigate();

  const onSignUpSuccess = (formEmail: string) => {
    navigate("/verify", { 
      state: { email: formEmail } // Pass email in navigation state
    });
  };

  return (
    <>
      <div className="hidden lg:block min-h-screen flex items-center justify-center">
        <AuthLayout>
          <WebSignUpForm onSignUpSuccess={onSignUpSuccess} />
        </AuthLayout>
      </div>
      <div className='w-full min-h-screen lg:hidden bg-[url("/web/login-bg.svg")] flex items-center justify-center'>
       <div className="max-w-[80%] w-full m-auto">
       <WebSignUpForm onSignUpSuccess={onSignUpSuccess} />
        </div>
      </div>
    </>
  );
};

export default WebLogin;
