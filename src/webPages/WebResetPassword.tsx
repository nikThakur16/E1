import "../../style/web.css";
import AuthLayout from "../components/web/AuthLayout";

import WebResetPass from "../components/web/webResetPass";


const WebResetPassword = () => {
  return (
    <>
      <div className="hidden lg:block min-h-screen flex items-center justify-center">
        <AuthLayout>
          <WebResetPass/>
        </AuthLayout>
      </div>
      <div className='w-full min-h-screen lg:hidden bg-[url("/web/login-bg.svg")] flex items-center justify-center'>
       <div className="max-w-[80%] w-full m-auto">
       <WebResetPass />
       </div>
      </div>
    </>
  );
};

export default WebResetPassword;
