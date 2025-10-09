import "../../style/web.css";
import AuthLayout from "../components/web/AuthLayout";
import WebForgotPass from "../components/web/WebForgotPass";


const WebForgotPassword= () => {
  return (
    <>
      <div className="hidden lg:block min-h-screen flex items-center justify-center">
        <AuthLayout>
          <WebForgotPass />
        </AuthLayout>
      </div>
      <div className='w-full min-h-screen lg:hidden bg-[url("/web/login-bg.svg")] flex items-center justify-center'>
       <div className="max-w-[80%] w-full m-auto">
       <WebForgotPass />
       </div>
      </div>
    </>
  );
};

export default WebForgotPassword;
