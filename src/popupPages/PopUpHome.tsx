import { useNavigate } from "react-router";
import Footer from "../components/popup/Footer";
import { useEffect, useState } from "react";
import { useLogoutMutation, useUserDetailsQuery } from "../store/api/authApi";
import Loader from "../components/popup/Loader";

export default function PopUpHome() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loader, setLoader] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [logoutTimerId, setLogoutTimerId] = useState<number | null>(null);

  // Use the hook at component level with conditional execution
  const { data: userDetails, isLoading, isError, error } = useUserDetailsQuery(token!, {
    skip: !token, // Only run query when token exists
  });

  const [logout] = useLogoutMutation();

  // Decode JWT exp claim (in seconds since epoch)
  function getJwtExp(t?: string | null): number | null {
    try {
      if (!t) return null;
      const parts = t.split(".");
      if (parts.length !== 3) return null;
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = atob(base64);
      const payload = JSON.parse(json);
      if (typeof payload?.exp === "number") return payload.exp;
      return null;
    } catch {
      return null;
    }
  }

  // Schedule automatic logout when token expires.
  useEffect(() => {
    // Clear previous timer
    if (logoutTimerId) {
      clearTimeout(logoutTimerId);
      setLogoutTimerId(null);
    }

    if (!token) return;

    const exp = getJwtExp(token);
    const nowMs = Date.now();
    let delayMs: number | null = null;

    if (typeof exp === "number") {
      delayMs = exp * 1000 - nowMs;
    } else {
      // Fallback: assume token validity of 24h from now if exp missing
      delayMs = 24 * 60 * 60 * 1000;
    }

    if (delayMs !== null) {
      if (delayMs <= 0) {
        // Already expired
        (async () => {
          await handleLogout();
        })();
      } else {
        const id = window.setTimeout(async () => {
          await handleLogout();
        }, delayMs);
        setLogoutTimerId(id);
      }
    }

    return () => {
      if (logoutTimerId) {
        clearTimeout(logoutTimerId);
      }
    };
  }, [token]);

  useEffect(() => {
   
    const loadUser = async () => {
      try {
        // Try to get from chrome storage first
        if (chrome?.storage?.local) {
          const result = await chrome.storage.local.get(["token", "user", "userDetails"]);
          
          // Set token to trigger the query
          if (result?.token) {
            console.log('Setting token from chrome storage:', result.token);
            setToken(result.token);
          }
          
          // Prioritize stored user data from chrome storage
          if (result?.user && result.user?.first_name) {
            console.log('Found stored user data from chrome storage:', result.user);
            setUser(result.user);
            return; // Exit early if we have valid user data
          }
        }
        
        // Fallback to localStorage if chrome storage is not available or empty
        const localStorageToken = localStorage.getItem("token");
        if (localStorageToken) {
          console.log('Setting token from localStorage:', localStorageToken);
          setToken(localStorageToken);
        }
        
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const userObj = JSON.parse(userStr || "{}");
          if (userObj?.first_name) {
            console.log('Found user data from localStorage:', userObj);
            setUser(userObj);
          }
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };

    // Initial user load
    loadUser();

    // Listen for storage changes to detect user data updates
    let storageListener: ((changes: any, namespace: string) => void) | null = null;
    let localStorageListener: ((e: StorageEvent) => void) | null = null;
    
    // Listen to chrome storage changes
    if (typeof chrome !== "undefined" && chrome?.storage?.onChanged) {
      storageListener = (changes, namespace) => {
        if (namespace === 'local' && changes.user) {
          const newUser = changes.user.newValue;
          if (newUser?.first_name) {
            console.log('User updated via chrome storage:', newUser);
            setUser(newUser);
          }
        }
        
        if (namespace === 'local' && changes.token) {
          const newToken = changes.token.newValue;
          if (newToken) {
            console.log('Token updated via chrome storage:', newToken);
            setToken(newToken);
          }
        }
      };
      
      chrome.storage.onChanged.addListener(storageListener);
    }
    
    // Listen to localStorage changes (for fallback)
    localStorageListener = (e: StorageEvent) => {
      if (e.key === 'user' && e.newValue) {
        try {
          const newUser = JSON.parse(e.newValue);
          if (newUser?.first_name) {
            console.log('User updated via localStorage:', newUser);
            setUser(newUser);
          }
        } catch (error) {
          console.error('Error parsing user from localStorage:', error);
        }
      }
      
      if (e.key === 'token' && e.newValue) {
        console.log('Token updated via localStorage:', e.newValue);
        setToken(e.newValue);
      }
    };
    
    window.addEventListener('storage', localStorageListener);

    // Cleanup listener on unmount
    return () => {
      if (storageListener && chrome?.storage?.onChanged) {
        chrome.storage.onChanged.removeListener(storageListener);
      }
      if (localStorageListener) {
        window.removeEventListener('storage', localStorageListener);
      }
    };
  }, [navigate]);

  // Handle userDetails query response
  useEffect(() => {
    if (userDetails && !isLoading && !isError) {
      // Extract user data from the nested API response structure
      const userData = userDetails.data?.user || userDetails.data || userDetails;
      
      if (userData?.first_name || userData?.name || userData?.firstName) {
        setUser(userData);
        
        // Store in storage for future use
        if (typeof chrome !== "undefined" && chrome?.storage?.local) {
          chrome.storage.local.set({ 
            user: userData,
            userDetails: userDetails 
          });
        } else {
          localStorage.setItem("user", JSON.stringify(userData));
          localStorage.setItem("userDetails", JSON.stringify(userDetails));
        }
      }
    } else if (isError) {
      console.error('Error fetching user details:', error);
      // If unauthorized, logout immediately
      const status = (error as any)?.status ?? (error as any)?.originalStatus;
      if (status === 401 || status === 403) {
        (async () => { await handleLogout(); })();
      }
    } else if (isLoading && token) {
      console.log('Loading user details...');
    }
  }, [userDetails, isLoading, isError, error, token]);

  const handleRedirect = (value: string) => {
    navigate(value)
  };

  const handleLogout = async () => {
    try {
      setLoader(true);
      // Call the logout mutation with the token
      if (token) {
         logout(token).unwrap();
      }
      
      // Clear local storage
      if (chrome?.storage?.local) {
        await chrome?.storage?.local.remove(["token", "user", "loggedIn", "userDetails" , "isVerified", "lastPopupRoute", "currentSummary"  ]);
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("loggedIn");
        localStorage.removeItem("userDetails");
        localStorage.removeItem("isVerified");
        localStorage.removeItem("lastPopupRoute");
        localStorage.removeItem("currentSummary");
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoader(false);
      navigate("/");    
    }
  };
 

  return (
    <div className="bg-gradient-to-b from-[#3F7EF8] to-[#5B9AFF] h-full overflow-auto justify-between ">
      <div className="w-full mx-auto flex justify-center py-12 h-[20%]  ">
        <img src="/web/logo.svg" alt="logo" className="" />
      </div>
      <div className="bg-white  rounded-[26px] h-[80%] flex flex-col justify-between">
        <div className="px-6 pt-8 flex space-y-8 flex-col items-center justify-center">
          <div className="text-[#3F7EF8] text-[18px] items-center  flex gap-2 justify-end w-full cursor-pointer" onClick={handleLogout} role="button">
            <img src="/popup/logout.svg" alt="logout" /> Logout
          </div>
          <h3 className="text-[#4B5563] text-[20px] 2xl:text-[26px] font-[400]  w-full text-center">
              👋 Hello, {user?.first_name} {user?.last_name  || "!"}
          </h3>
          <h2 className="text-[24px] font-semibold tracking-[-1%] text-[#1F2937]  w-[80%]  text-center">
            Summarize meetings, lectures, and conversations instantly.
          </h2>
         

          <div className=" flex gap-4 items-center  ">
            {/* record audio */}

            <button onClick={() => handleRedirect("/popup/record")} className="flex items-center  min-w-[150px] gap-2 p-2 bg-[rgba(43,116,255,0.08)] rounded-xl border border-[rgba(43,116,255,1)] cursor-pointer">
              <svg
                width="39"
                height="38"
                viewBox="0 0 39 38"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="19.355" cy="19" r="19" fill="#2B74FF" />
                <path
                  d="M19.3547 24.7056V27.1508"
                  stroke="white"
                  stroke-width="1.65886"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M25.1879 17.3691V18.9993C25.1879 20.5126 24.5733 21.9638 23.4794 23.0338C22.3854 24.1039 20.9017 24.705 19.3546 24.705C17.8075 24.705 16.3237 24.1039 15.2298 23.0338C14.1358 21.9638 13.5212 20.5126 13.5212 18.9993V17.3691"
                  stroke="white"
                  stroke-width="1.65886"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M21.8545 13.2934C21.8545 11.9429 20.7352 10.8481 19.3545 10.8481C17.9738 10.8481 16.8545 11.9429 16.8545 13.2934V18.9991C16.8545 20.3496 17.9738 21.4444 19.3545 21.4444C20.7352 21.4444 21.8545 20.3496 21.8545 18.9991V13.2934Z"
                  stroke="white"
                  stroke-width="1.65886"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>

              <div>
                <h3 className="font-semibold   text-[#4B5563] text-[15px]">
                  Record
                </h3>
              </div>
            </button>

            {/* Upload Video */}
            <button onClick={()=>handleRedirect("/popup/upload")} className="flex min-w-[150px] items-center gap-2 p-2 bg-[rgba(166,108,255,0.08)] rounded-xl border border-[rgba(166,108,255,1)] cursor-pointer">
              <svg
                width="39"
                height="38"
                viewBox="0 0 39 38"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="19.355" cy="19" r="19" fill="#A66CFF" />
                <path
                  d="M12.5396 10.6655V27.3322H26.1712V15.3239L21.4087 10.6655H12.5396ZM21.3064 21.2572L20.2074 20.1739V23.9989H18.5034V20.1739L17.4044 21.2572L16.1945 20.0739L19.3554 16.9905L22.5162 20.0739L21.3064 21.2572ZM21.9113 13.5072L23.266 14.8322H21.9113V13.5072Z"
                  fill="white"
                />
              </svg>

              <div>
                <h3 className="font-semibold text-[#4B5563] text-[15px]">
                  Upload
                </h3>
              </div>
            </button>
          </div>
          <p className="font-[400] text-[#4B5563] text-[16px]  px-6 text-center">
          This extension only shows your current session summary. To view all past sessions and summaries, use our mobile apps.
          </p>
          
         
          <div className="flex gap-4  justify-center flex-wrap">
          {/* Google Play Button */}
          <button onClick={()=>window.open("https://play.google.com/store/apps/details?id=com.softradix.summarizex&pli=1", "_blank")} className="cursor-pointer">
          <div className="flex gap-2 bg-black rounded-md h-[54px] w-[162px] items-center justify-center cursor-pointer">
            <img
              src="/web/googlePlay.svg"
              alt="google play"
    
            />
            <div className="flex flex-col items-start">
              <p className="text-white text-xs">Get it on</p>
              <p className="text-white font-semibold text-[16px]">Google Play</p>
            </div>
          </div>
          </button>


          {/* App Store Button */}
         <button onClick={()=>window.open("https://apps.apple.com/us/app/summarizex-ai-note-taker/id6747373968", "_blank")} className="cursor-pointer">
         <div className="flex gap-2 bg-black rounded-md h-[54px] w-[162px] items-center justify-center  cursor-pointer">
            <img
              src="/web/whiteApple.svg" 
              alt="app store"
            
            />
            <div className="flex flex-col items-start">
              <p className="text-white text-xs">Download on the</p>
              <p className="text-white font-semibold text-[16px]">App Store</p>
            </div>
          </div>
          </button>
        </div>
        </div>
        <Footer />
      </div>
      {loader && <Loader isLoading={loader} />}
    </div>
  );
}
