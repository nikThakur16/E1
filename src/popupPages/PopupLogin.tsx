import { useNavigate } from "react-router";
import Footer from "../components/popup/Footer";
import { useEffect } from "react";

export default function PopupLogin() {
  const navigate = useNavigate();

  const handleLoginRedirect = () => {
    if (typeof chrome !== "undefined" && chrome?.tabs) {
      chrome.tabs.create({ url: "web.html" });
    } else {
      // Fallback for dev (open in same window)
      window.location.href = "/web.html";
    }
  };
  const handleSignUpRedirect = () => {
    if (typeof chrome !== "undefined" && chrome?.tabs) {
      chrome.tabs.create({ url: "web.html#/signup" });
    } else {
      // Fallback for dev (open in same window)
      window.location.href = "web.html#/signup";
    }
  }

  useEffect(() => {
    const checkLogin = () => {
      if (typeof chrome !== "undefined" && chrome?.storage?.local) {
        // ✅ Extension mode
        chrome?.storage?.local.get(["loggedIn" , "isVerified"], (result) => {
          console.log('PopupLogin - checking login state:', result);
          if (result.loggedIn || result.isVerified) {
            navigate("/popup/home"); // redirect inside popup
          }
        });
      } else {
        // ✅ Dev mode (vite localhost)
          const loggedIn = localStorage.getItem("loggedIn") === "true" || localStorage.getItem("isVerified") === "true";
        if (loggedIn ) {
          navigate("/popup/home");
        }
      }
    };

    // Initial login check
    checkLogin();

    // Listen for storage changes to detect login in real-time
    let storageListener: ((changes: any, namespace: string) => void) | null = null;
    
    if (typeof chrome !== "undefined" && chrome?.storage?.onChanged) {
      storageListener = (changes, namespace) => {
        if (namespace === 'local') {
          console.log('PopupLogin - detected storage change:', changes);
          
          // Check for login changes
          if (changes.loggedIn && changes.loggedIn.newValue) {
            console.log('User logged in, redirecting to home...');
            navigate("/popup/home");
          }
          
          // Check for token changes (from web page login)
          if (changes.token && changes.token.newValue) {
            console.log('Token received from web page, checking login status...');
            // Check if we have both token and loggedIn status
            chrome.storage.local.get(['loggedIn', 'token'], (result) => {
              if (result.loggedIn && result.token) {
                console.log('Login complete with token, redirecting to home...');
                navigate("/popup/home");
              }
            });
          }
        }
      };
      
      chrome.storage.onChanged.addListener(storageListener);
    }

    // Cleanup listener on unmount
    return () => {
      if (storageListener && chrome?.storage?.onChanged) {
        chrome.storage.onChanged.removeListener(storageListener);
      }
    };
  }, [navigate]);

  return (
    <div className="bg-gradient-to-b from-[#3F7EF8] to-[#5B9AFF]   w-full h-full ">
      <div className="w-full mx-auto flex justify-center h-[20%]">
        <img src="/web/logo.svg" alt="logo" className="h-[40%] w-[45%] my-auto" />
      </div>
      <div className="bg-white h-[80%] flex flex-col justify-between rounded-[26px]">
        <div className="px-6 pt-4 ">
          <h2 className="text-[22px] font-semibold tracking-[-1%] text-[#1F2937] mb-3 text-center">
            Let’s Get Started
          </h2>
          <p className="font-[400] text-[#4B5563] text-[15px] px-6 text-center">
            Boost your productivity by enabling Summarizex to transcribe and
            summarize your meetings & recordings live.
          </p>

          <div className="space-y-2 mt-[14px] grid grid-cols-2">
            {/* record audio */}
            <div className="col-span-1">
              <div className="flex items-center  max-h-[80px]  gap-4 p-2  ">
                <svg
                 className="h-8 w-8"
                  width="41"
                  height="41"
                  viewBox="0 0 41 41"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="20.334"
                    cy="20.9795"
                    r="19.6"
                    fill="#E5EFFF"
                    fill-opacity="0.4"
                    stroke="#E5EFFF"
                    stroke-width="0.8"
                  />
                  <g clip-path="url(#clip0_1166_6597)">
                    <path
                      d="M20.334 24.7295C22.4052 24.7295 24.084 23.0507 24.084 20.9795V14.7295C24.084 12.6582 22.4052 10.9795 20.334 10.9795C18.2627 10.9795 16.584 12.6582 16.584 14.7295V20.9795C16.584 23.0507 18.2627 24.7295 20.334 24.7295Z"
                      fill="#E11D48"
                    />
                    <path
                      d="M26.584 20.9795V18.4795H25.334V20.7845C25.334 23.1845 23.7315 25.3945 21.379 25.8732C18.1665 26.527 15.334 24.0782 15.334 20.9795V18.4795H14.084V20.9795C14.084 23.997 16.2352 26.522 19.084 27.1032V29.7295H16.584V30.9795H24.084V29.7295H21.584V27.1032C24.4327 26.522 26.584 23.997 26.584 20.9795Z"
                      fill="#E11D48"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_1166_6597">
                      <rect
                        width="20"
                        height="20"
                        fill="white"
                        transform="translate(10.334 10.9795)"
                      />
                    </clipPath>
                  </defs>
                </svg>

                <div>
                  <h3 className="font-medium text-[#4B5563] text-[15px]">
                    Record Audio{" "}
                  </h3>
                </div>
              </div>

              {/* Upload Video */}
              <div className="flex items-center gap-4 p-2  ">
                <svg
                 className="h-8 w-8"
                  width="41"
                  height="41"
                  viewBox="0 0 41 41"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="20.3452"
                    cy="20.9717"
                    r="19.6"
                    fill="#E5EFFF"
                    fill-opacity="0.4"
                    stroke="#E5EFFF"
                    stroke-width="0.8"
                  />
                  <path
                    d="M25.4257 22.236V19.7057C25.4257 19.4527 25.5101 19.1613 25.6266 19.0402L28.3961 16.1894C29.3024 15.257 30.3452 14.9948 30.3452 15.9946V25.9486C30.3452 26.9469 29.3024 26.6863 28.3961 25.7539L25.6266 22.9031C25.5101 22.7835 25.4257 22.4906 25.4257 22.236ZM24.1161 25.0439C24.1161 25.4506 23.9545 25.8406 23.667 26.1282C23.3794 26.4158 22.9893 26.5774 22.5826 26.5774H11.8787C11.472 26.5774 11.082 26.4158 10.7944 26.1282C10.5068 25.8406 10.3452 25.4506 10.3452 25.0439V16.8963C10.3452 16.4896 10.5068 16.0996 10.7944 15.812C11.082 15.5244 11.472 15.3628 11.8787 15.3628H22.5826C22.9893 15.3628 23.3794 15.5244 23.667 15.812C23.9545 16.0996 24.1161 16.4896 24.1161 16.8963V25.0439Z"
                    fill="#A66CFF"
                  />
                </svg>

                <div>
                  <h3 className="font-medium text-[#4B5563] text-[15px]">
                    Upload Video
                  </h3>
                </div>
              </div>

              {/* Upload image */}
              <div className="flex items-center gap-4 p-2  ">
                <svg
                 className="h-8 w-8"
                  width="41"
                  height="41"
                  viewBox="0 0 41 41"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="20.353"
                    cy="20.9795"
                    r="19.6"
                    fill="#E5EFFF"
                    fill-opacity="0.4"
                    stroke="#E5EFFF"
                    stroke-width="0.8"
                  />
                  <path
                    d="M30.353 15.9798C30.353 14.1465 28.853 12.6465 27.0197 12.6465H13.6864C11.853 12.6465 10.353 14.1465 10.353 15.9798V25.9798C10.353 27.8132 11.853 29.3132 13.6864 29.3132H27.0197C28.853 29.3132 30.353 27.8132 30.353 25.9798V15.9798ZM15.353 15.9798C16.2697 15.9798 17.0197 16.7298 17.0197 17.6465C17.0197 18.5632 16.2697 19.3132 15.353 19.3132C14.4364 19.3132 13.6864 18.5632 13.6864 17.6465C13.6864 16.7298 14.4364 15.9798 15.353 15.9798ZM28.6864 25.9798C28.6864 26.8965 27.9364 27.6465 27.0197 27.6465H14.0197C13.2697 27.6465 12.9364 26.7298 13.4364 26.2298L16.4364 23.2298C16.7697 22.8965 17.2697 22.8965 17.603 23.2298L18.103 23.7298C18.4364 24.0632 18.9364 24.0632 19.2697 23.7298L24.7697 18.2298C25.103 17.8965 25.603 17.8965 25.9364 18.2298L28.4364 20.7298C28.603 20.8965 28.6864 21.0632 28.6864 21.3132V25.9798Z"
                    fill="#007AFF"
                  />
                </svg>

                <div>
                  <h3 className="font-medium text-[#4B5563] text-[15px]">
                    Upload image
                  </h3>
                </div>
              </div>

              {/* Image */}
              <div className="flex items-center gap-4 p-2  ">
                <svg
                 className="h-8 w-8"
                  width="41"
                  height="41"
                  viewBox="0 0 41 41"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="20.353"
                    cy="20.9795"
                    r="19.6"
                    fill="#E5EFFF"
                    fill-opacity="0.4"
                    stroke="#E5EFFF"
                    stroke-width="0.8"
                  />
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M19.74 26.7158L25.421 21.0347C26.2801 20.1755 27.6732 20.1755 28.5323 21.0347C29.3913 21.8938 29.3913 23.2867 28.5323 24.1459L22.8512 29.827C22.5199 30.1582 22.1049 30.3931 21.6505 30.5068L19.8884 30.9473C19.1222 31.1388 18.428 30.4448 18.6196 29.6785L19.0601 27.9165C19.1737 27.462 19.4087 27.047 19.74 26.7158ZM15.0583 12.1558H17.9992H19.1756H22.1164H23.2928H23.881C24.8555 12.1558 25.6455 12.9458 25.6455 13.9204V19.4864C25.2618 19.6508 24.9024 19.8896 24.5891 20.2028L18.9081 25.884C18.426 26.3659 18.0841 26.9698 17.9188 27.6312L17.4783 29.3931C17.4439 29.5306 17.423 29.6669 17.4144 29.8011H13.2938C12.3193 29.8011 11.5293 29.011 11.5293 28.0366V13.9204C11.5293 12.9458 12.3193 12.1558 13.2938 12.1558H13.882H15.0583ZM22.1164 17.4494C22.1164 17.1246 21.8531 16.8612 21.5283 16.8612H15.6465C15.3217 16.8612 15.0583 17.1246 15.0583 17.4494C15.0583 17.7743 15.3217 18.0376 15.6465 18.0376H21.5283C21.8531 18.0376 22.1164 17.7743 22.1164 17.4494ZM21.5283 21.5666C21.8531 21.5666 22.1164 21.3033 22.1164 20.9785C22.1164 20.6537 21.8531 20.3903 21.5283 20.3903H15.6465C15.3217 20.3903 15.0583 20.6537 15.0583 20.9785C15.0583 21.3033 15.3217 21.5666 15.6465 21.5666H21.5283ZM17.9992 23.9193H15.6465C15.3217 23.9193 15.0583 24.1827 15.0583 24.5075C15.0583 24.8323 15.3217 25.0957 15.6465 25.0957H17.9992C18.3241 25.0957 18.5874 24.8323 18.5874 24.5075C18.5874 24.1827 18.3241 23.9193 17.9992 23.9193Z"
                    fill="#8F2B9F"
                  />
                </svg>

                <div>
                  <h3 className="font-medium text-[#4B5563] text-[15px]">
                    Original Text
                  </h3>
                </div>
              </div>
            </div>
            <div className=" col-span-1">
              <div>
                {" "}
                {/* URL */}
                <div className="flex items-center gap-4 p-2  ">
                  <svg
                   className="h-8 w-8"
                    width="41"
                    height="41"
                    viewBox="0 0 41 41"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="20.334"
                      cy="20.9795"
                      r="19.6"
                      fill="#E5EFFF"
                      fill-opacity="0.4"
                      stroke="#E5EFFF"
                      stroke-width="0.8"
                    />
                    <path
                      d="M22.334 10.9795H14.334C13.234 10.9795 12.334 11.8795 12.334 12.9795V28.9795C12.334 30.0795 13.234 30.9795 14.334 30.9795H26.334C27.434 30.9795 28.334 30.0795 28.334 28.9795V16.9795L22.334 10.9795ZM21.334 21.9795C21.334 21.9795 21.334 24.6795 21.334 24.7795C21.334 25.6795 20.434 26.6795 19.334 26.8795C18.234 27.1795 17.334 26.5795 17.334 25.6795C17.334 24.7795 18.234 23.7795 19.334 23.5795C19.734 23.4795 20.034 23.4795 20.334 23.5795V19.9795H21.334C23.434 19.9795 24.334 22.9795 24.334 22.9795C24.334 22.9795 23.434 21.9795 21.334 21.9795ZM21.334 17.9795V12.4795L26.834 17.9795H21.334Z"
                      fill="#3F7EF8"
                    />
                  </svg>

                  <div>
                    <h3 className="font-medium text-[#4B5563] text-[15px]">
                      URL
                    </h3>
                  </div>
                </div>
                {/* Enter Text */}
                <div className="flex items-center gap-4 p-2  ">
                  <svg
                   className="h-8 w-8"
                    width="41"
                    height="41"
                    viewBox="0 0 41 41"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="20.334"
                      cy="20.9717"
                      r="19.6"
                      fill="#E5EFFF"
                      fill-opacity="0.4"
                      stroke="#E5EFFF"
                      stroke-width="0.8"
                    />
                    <path
                      d="M22.1519 15.5159V11.8887C22.2064 11.9341 22.2609 11.9887 22.3064 12.0341L27.4519 17.1796C27.4973 17.225 27.5519 17.2796 27.5973 17.3341H23.97C23.4883 17.3327 23.0266 17.1407 22.686 16.8C22.3453 16.4593 22.1533 15.9977 22.1519 15.5159Z"
                      fill="#F59E0B"
                    />
                    <path
                      d="M28.4611 19.1535H23.9702C23.0057 19.1535 22.0808 18.7704 21.3989 18.0884C20.7169 17.4065 20.3338 16.4816 20.3338 15.5171V11.0262C20.1358 10.99 19.935 10.9718 19.7338 10.9717H14.8793C14.1559 10.9717 13.4622 11.259 12.9508 11.7705C12.4393 12.2819 12.152 12.9756 12.152 13.699V28.2444C12.152 28.9677 12.4393 29.6614 12.9508 30.1729C13.4622 30.6843 14.1559 30.9717 14.8793 30.9717H25.7883C26.5117 30.9717 27.2054 30.6843 27.7168 30.1729C28.2283 29.6614 28.5156 28.9677 28.5156 28.2444V19.7535C28.5155 19.5523 28.4972 19.3515 28.4611 19.1535ZM15.7883 22.7899H19.4247C19.6658 22.7899 19.897 22.8856 20.0675 23.0561C20.238 23.2266 20.3338 23.4578 20.3338 23.699C20.3338 23.9401 20.238 24.1713 20.0675 24.3418C19.897 24.5123 19.6658 24.608 19.4247 24.608H15.7883C15.5472 24.608 15.316 24.5123 15.1455 24.3418C14.975 24.1713 14.8793 23.9401 14.8793 23.699C14.8793 23.4578 14.975 23.2266 15.1455 23.0561C15.316 22.8856 15.5472 22.7899 15.7883 22.7899ZM24.8793 28.2444H15.7883C15.5472 28.2444 15.316 28.1486 15.1455 27.9781C14.975 27.8077 14.8793 27.5764 14.8793 27.3353C14.8793 27.0942 14.975 26.863 15.1455 26.6925C15.316 26.522 15.5472 26.4262 15.7883 26.4262H24.8793C25.1204 26.4262 25.3516 26.522 25.5221 26.6925C25.6926 26.863 25.7883 27.0942 25.7883 27.3353C25.7883 27.5764 25.6926 27.8077 25.5221 27.9781C25.3516 28.1486 25.1204 28.2444 24.8793 28.2444Z"
                      fill="#F59E0B"
                    />
                  </svg>

                  <div>
                    <h3 className="font-medium text-[#4B5563] text-[15px]">
                      Upload Document{" "}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-2  ">
                  <svg
                   className="h-8 w-8"
                    width="41"
                    height="41"
                    viewBox="0 0 41 41"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="20.334"
                      cy="20.9795"
                      r="19.6"
                      fill="#E5EFFF"
                      fill-opacity="0.4"
                      stroke="#E5EFFF"
                      stroke-width="0.8"
                    />
                    <g clip-path="url(#clip0_1166_6604)">
                      <path
                        d="M17.6585 26.8473L16.6465 27.8523C15.7692 28.7218 14.3425 28.7225 13.4657 27.8523C13.0442 27.434 12.8127 26.8785 12.8127 26.288C12.8127 25.6975 13.0445 25.1418 13.4655 24.7235L17.1905 21.0278C17.9625 20.2623 19.4147 19.135 20.4732 20.1848C20.959 20.6673 21.7435 20.664 22.2257 20.1785C22.7082 19.693 22.7052 18.9083 22.2195 18.4263C20.4202 16.6408 17.761 16.9708 15.445 19.2688L11.7197 22.9648C10.826 23.852 10.334 25.032 10.334 26.288C10.334 27.544 10.826 28.7238 11.72 29.611C12.6397 30.5235 13.8475 30.9795 15.0557 30.9795C16.2642 30.9795 17.4725 30.5235 18.3927 29.6105L19.4055 28.6053C19.891 28.1233 19.8937 27.3388 19.4112 26.853C18.9295 26.3678 18.1442 26.365 17.6585 26.8473ZM28.9475 12.4905C27.015 10.573 24.313 10.469 22.524 12.244L21.2625 13.4963C20.7767 13.9785 20.7737 14.7628 21.2562 15.2485C21.7387 15.7343 22.5232 15.737 23.009 15.2548L24.27 14.0033C25.1967 13.083 26.4102 13.4645 27.2017 14.2498C27.6237 14.668 27.8555 15.2238 27.8555 15.8143C27.8555 16.405 27.6235 16.9608 27.2022 17.379L23.228 21.3215C21.4107 23.1245 20.5582 22.2783 20.1945 21.9173C19.7087 21.435 18.9245 21.438 18.442 21.9235C17.9595 22.409 17.9625 23.1938 18.4482 23.6758C19.2825 24.5038 20.2347 24.9143 21.233 24.9143C22.4552 24.9143 23.7462 24.2988 24.9737 23.08L28.948 19.1375C29.8415 18.2503 30.334 17.07 30.334 15.814C30.334 14.5585 29.8415 13.3783 28.9475 12.4905Z"
                        fill="#34C759"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_1166_6604">
                        <rect
                          width="20"
                          height="20"
                          fill="white"
                          transform="translate(10.334 10.9795)"
                        />
                      </clipPath>
                    </defs>
                  </svg>

                  <h3 className="font-medium text-[#4B5563] text-[15px] ">
                    Upload URL
                  </h3>
                </div>
              </div>
            </div>
          </div>
       
        </div>
        <div>
      <div className="px-6">
      <div className="p-3 rounded-[9px] mb-2  bg-[#F1F1F166]">
            <p className="text-[#4B5563] text-center text-[14px] font-bold">
              🔒 100% Private & Secure | No recordings saved
            </p>
          </div>
          <div className="buttons flex gap-4">
            <button
              onClick={handleLoginRedirect}
              className=" bg-[#F1F1F1] w-full cursor-pointer text-[16px] rounded-full text-[#4B5563] font-bold border py-[8px] border-b-2 border-[#DFDFDF] text-center "
            >
              sign in
            </button>
            <button onClick={handleSignUpRedirect} className=" bg-gradient-to-b cursor-pointer from-[#3F7EF8] rounded-full to-[#5B9AFF] w-full  text-[16px] py-[8px] text-white   font-bold   border border-b-2 border-[#4281F9] text-center">
              sign up
            </button>
          </div>
      </div>
          <Footer />
        </div>
        
      </div>
    </div>
  );
}