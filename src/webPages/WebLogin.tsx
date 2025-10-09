import "../../style/web.css";
import AuthLayout from "../components/web/AuthLayout";
import WebSignInForm from "../components/web/WebSignInForm";

const WebLogin = () => {
  return (
    <>
      <div className="hidden lg:block min-h-screen flex items-center rounded-xl justify-center">
        <AuthLayout>
          <WebSignInForm />
        </AuthLayout>
      </div>
      <div className='w-full min-h-screen lg:hidden bg-[url("/web/login-bg.svg")] flex items-center justify-center'>
       <div className="max-w-[80%] w-full m-auto">
       <WebSignInForm />
       </div>
      </div>
    </>
  );
};

export default WebLogin;
