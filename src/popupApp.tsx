import { createHashRouter, RouterProvider, useNavigate, useLocation, Navigate } from "react-router-dom";
import Layout from "./components/popup/Layout";
import PopupLogin from "./popupPages/PopupLogin";
import ProtectedRoute from "./components/popup/ProtectedRoute";
import PopUpHome from "./popupPages/PopUpHome";
import About from "./popupPages/About";
import RecordSection from "./popupPages/RecordSection";
import { useEffect, useState } from "react";
import Processing from "./popupPages/Processing";
import UploadOptionsPage from "./popupPages/UploadOptionsPage";
import InputText from "./popupPages/InputText";
import UploadError from "./popupPages/UploadError";
import AudioProcessing from "./popupPages/AudioProcessing";
import SummaryPage from "./popupPages/SummaryPage";
import AIActionsPage from "./popupPages/AIActionsPage";
import LectureNotePage from "./popupPages/LectureNotePage";
import WebResetPassword from "./webPages/WebResetPassword";
import PDFViewPage from "./popupPages/PDFViewPage";


// Helper function to check if a route can be restored based on available data
function checkRouteDataRequirements(route: string, storageData: any): boolean {
  switch (route) {
    case '/popup/summary':
      // Summary page needs currentSummary data
      return !!storageData?.currentSummary;
    
    case '/popup/ai-actions':
      // AI Actions page needs currentSummary and transcription data
      return !!storageData?.currentSummary && 
             storageData?.currentSummary?.summary?.transcription;
    
    case '/popup/lecture-notes':
      // Lecture Notes page needs API response data (stored in location state)
      // This is harder to persist, so we'll allow restoration but let the page handle missing data
      return true;
    
    case '/popup/pdf-view':
      // PDF View page needs PDF data (stored in location state)
      // This is harder to persist, so we'll allow restoration but let the page handle missing data
      return true;
    
    case '/popup/record/process':
    case '/popup/upload/process':
      // Process pages need upload data
      return !!storageData?.upload;
    
    default:
      return false;
  }
}

function LayoutWithPersistence() {
  const navigate = useNavigate();
  const location = useLocation();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    // Check if user is authenticated and handle route persistence
    const checkAuthAndRoute = async () => {
      try {
        const result = await chrome?.storage?.local.get(['token', 'lastPopupRoute', 'currentSummary', 'popup:upload']);
        const token = result?.token;
        const lastRoute = result?.lastPopupRoute;
        const currentSummary = result?.currentSummary;
        const upload = result?.['popup:upload'];
        
        if (!token) {
          // No token found, redirect to login
          if (location.pathname !== '/') {
            navigate('/');
          }
        } else {
          // Token exists, check if trying to access login page
          if (location.pathname === '/') {
            // Check if we have a stored route and appropriate data to restore
            if (lastRoute && lastRoute !== '/popup/home') {
              // Check if the route has the required data
              const canRestoreRoute = checkRouteDataRequirements(lastRoute, { 
                currentSummary, 
                upload: result?.['popup:upload'] 
              });
              
              if (canRestoreRoute) {
                console.log('Restoring last route:', lastRoute);
                navigate(lastRoute);
              } else {
                console.log('Cannot restore route - missing required data:', lastRoute);
                navigate('/popup/home');
              }
            } else {
              navigate('/popup/home');
            }
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        // On error, redirect to login
        if (location.pathname !== '/') {
          navigate('/');
        }
      }
    };

    checkAuthAndRoute();
  }, [navigate, location.pathname]);

  // Store current route for persistence
  useEffect(() => {
    const storeRoute = async () => {
      // Define routes that should be persisted
      const persistableRoutes = [
        '/popup/summary',
        '/popup/ai-actions', 
        '/popup/lecture-notes',
        '/popup/pdf-view',
        '/popup/record/process',
        '/popup/upload/process'
      ];
      
      if (persistableRoutes.includes(location.pathname) && chrome?.storage?.local) {
        try {
          await chrome.storage.local.set({ lastPopupRoute: location.pathname });
          console.log('Stored route:', location.pathname);
          
          // Notify all tabs about the route change
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
              if (tab.id) {
                chrome.tabs.sendMessage(tab.id, {
                  type: 'ROUTE_CHANGED',
                  route: location.pathname
                }).catch(() => {
                  // Ignore errors for tabs that don't have content script
                });
              }
            });
          });
        } catch (error) {
          console.error('Error storing route:', error);
        }
      }
    };

    storeRoute();
  }, [location.pathname]);

  // Force popup refresh when needed
  const forcePopupRefresh = () => {
    console.log('🔄 Forcing popup refresh...');
    // Trigger a re-render by updating state
    setRefreshTrigger(prev => prev + 1);
  };

  // Listen for messages from content scripts or background
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'FORCE_POPUP_REFRESH') {
        console.log('Received force refresh message');
        forcePopupRefresh();
      } else if (message.type === 'SYNC_DATA') {
        console.log('Received sync data message:', message);
        // Handle data synchronization
        handleDataSync(message.data);
      }
    };

    if (chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage);
    }

    return () => {
      if (chrome?.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(handleMessage);
      }
    };
  }, []);

  // Handle data synchronization from other tabs
  const handleDataSync = async (data: any) => {
    if (data?.route) {
      console.log('Syncing route from other tab:', data.route);
      // Navigate to the synced route if it's different
      if (location.pathname !== data.route) {
        navigate(data.route);
      }
    }
    
    if (data?.summary) {
      console.log('Syncing summary from other tab');
      // Summary data is already in storage, just trigger a refresh
      forcePopupRefresh();
    }
    
    if (data?.upload) {
      console.log('Syncing upload from other tab');
      // Upload data is already in storage, just trigger a refresh
      forcePopupRefresh();
    }
  };

  // Listen for storage changes (e.g., logout from another tab)
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local') {
        // Handle token changes
        if (changes.token) {
          if (!changes.token.newValue) {
            // Token was removed, redirect to login
            navigate('/');
          }
        }
        
        // Handle route changes - notify content scripts
        if (changes.lastPopupRoute) {
          console.log('Route changed, notifying content scripts:', changes.lastPopupRoute.newValue);
          // Send message to all tabs about route change
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
              if (tab.id) {
                chrome.tabs.sendMessage(tab.id, {
                  type: 'ROUTE_CHANGED',
                  route: changes.lastPopupRoute.newValue
                }).catch(() => {
                  // Ignore errors for tabs that don't have content script
                });
              }
            });
          });
        }
        
        // Handle summary changes - notify content scripts
        if (changes.currentSummary) {
          console.log('Summary changed, notifying content scripts');
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
              if (tab.id) {
                chrome.tabs.sendMessage(tab.id, {
                  type: 'SUMMARY_CHANGED',
                  summary: changes.currentSummary.newValue
                }).catch(() => {
                  // Ignore errors for tabs that don't have content script
                });
              }
            });
          });
        }
        
        // Handle upload changes - notify content scripts
        if (changes['popup:upload']) {
          console.log('Upload changed, notifying content scripts');
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
              if (tab.id) {
                chrome.tabs.sendMessage(tab.id, {
                  type: 'UPLOAD_CHANGED',
                  upload: changes['popup:upload'].newValue
                }).catch(() => {
                  // Ignore errors for tabs that don't have content script
                });
              }
            });
          });
        }
      }
    };

    // Add listener for storage changes
    if (chrome?.storage?.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
    }

    // Cleanup listener on unmount
    return () => {
      if (chrome?.storage?.onChanged) {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      }
    };
  }, [navigate]);

  // Listen for messages from background script
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'NAVIGATE_TO_SUMMARY') {
        navigate('/popup/summary');
      } else if (message.type === 'NAVIGATE_TO_HOME') {
        navigate('/popup/home');
      } else if (message.type === 'NAVIGATE_TO_RECORD') {
        navigate('/popup/record');
      } else if (message.type === 'NAVIGATE_TO_UPLOAD') {
        navigate('/popup/upload');
      } else if (message.type === 'NAVIGATE_TO_TEXT') {
        navigate('/popup/text');
      } else if (message.type === 'NAVIGATE_TO_AI_ACTIONS') {
        navigate('/popup/ai-actions');
      } else if (message.type === 'NAVIGATE_TO_LECTURE_NOTES') {
        navigate('/popup/lecture-notes');
      }
    };

    // Add message listener
    if (chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage);
    }

    // Cleanup listener on unmount
    return () => {
      if (chrome?.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(handleMessage);
      }
    };
  }, [navigate, location.pathname]);

  return <Layout />;
}

const router = createHashRouter([
  {
    path: "/",
    element: <LayoutWithPersistence />,
    children: [
      {
        path: "/",
        element: <PopupLogin />,
      },
      {
        path: "*",
        element: <Navigate to="/" />,
      },
      {
        path: "/popup/home",
        element: (
          <ProtectedRoute>
            {/* <SummaryPage   /> */}
            {/* <AIActionsPage /> */}
            {/* <LectureNotePage /> */}
            <PopUpHome />

          </ProtectedRoute>
        ),
      },
      {
        path: "/popup/record",
        element: (
          <ProtectedRoute>
            <RecordSection />
          </ProtectedRoute>
        ),
      },
      {
        path: "/popup/record/process",
        element: (
          <ProtectedRoute>
            <AudioProcessing />
          </ProtectedRoute>
        ),
      },
      {
        path: "/popup/upload",
        element:(
          <ProtectedRoute>
            <UploadOptionsPage/>
          </ProtectedRoute>
        )

      },
      {
        path: "/popup/upload/process",
        element: (
          <ProtectedRoute>
            <Processing />
          </ProtectedRoute>
        ),
      },
      {
        path: "/popup/text",
        element: (
          <ProtectedRoute>
              <InputText/>
          </ProtectedRoute>
        ),
      },  
      {
        path: "/popup/summary",
        element: (
          <ProtectedRoute>
            <SummaryPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/popup/error",
        element: (
          <ProtectedRoute>
            <UploadError />
          </ProtectedRoute>
        ),
      },
      {
        path: "/popup/ai-actions",
        element: (
          <ProtectedRoute>
            <AIActionsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/popup/lecture-notes",
        element: (
          <ProtectedRoute>
            <LectureNotePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/popup/pdf-view",
        element: (
          <ProtectedRoute>
            <PDFViewPage />
          </ProtectedRoute>
        ),
      },
   
    ],
  },
]);

export default function PopupApp() {
  return <RouterProvider router={router} />;
}
