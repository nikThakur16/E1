import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      try {
        if (typeof chrome !== "undefined" && chrome?.storage?.local) {
          chrome?.storage?.local.get(["loggedIn", "token" , "isVerified"], (result) => {
            console.log('ProtectedRoute - checking auth:', result);
              if ((result.loggedIn && result.token ) || result.isVerified) {
              setAuth(true);
            } else {
              setAuth(false);
              navigate("/"); // redirect to login
            }
            setLoading(false);
          });
        } else {
          const loggedIn = localStorage.getItem("loggedIn") === "true";
          const token = localStorage.getItem("token");
          if (loggedIn && token) {
            setAuth(true);
          } else {
            setAuth(false);
            navigate("/");
          }
          setLoading(false);
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        setAuth(false);
        navigate("/");
        setLoading(false);
      }
    };

    // Initial auth check
    checkAuth();

    // Listen for storage changes to detect login/logout in real-time
    let storageListener: ((changes: any, namespace: string) => void) | null = null;
    
    if (typeof chrome !== "undefined" && chrome?.storage?.onChanged) {
      storageListener = (changes, namespace) => {
        if (namespace === 'local' && (changes.loggedIn || changes.token)) {
          console.log('ProtectedRoute - detected auth change:', changes);
          checkAuth(); // Re-check auth when login state changes
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

  if (loading) {
    return <div>Loading...</div>; // 🔄 You can replace with a spinner
  }

  return auth ? <>{children}</> : null;
}
