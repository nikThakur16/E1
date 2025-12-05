import { Outlet } from "react-router";
import { useEffect, useRef } from "react";

export default function Layout() {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        // User clicked outside the popup - allow closing
        // This is the default behavior, so we don't need to do anything special
        console.log("User clicked outside popup - allowing close");
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent closing with Escape key unless explicitly allowed
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        console.log("Escape key pressed - preventing popup close");
      }
    };

    // Listen for timer state updates from content script
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "RECORDING_STATE_UPDATE") {
        console.log("Received recording state update:", event.data.data);
        // Dispatch custom event for RecordSection to listen to
        window.dispatchEvent(
          new CustomEvent("recordingStateUpdate", {
            detail: event.data.data,
          })
        );
      }
    };

    // Add event listeners
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("message", handleMessage);

    // Cleanup
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  return (
    <div ref={popupRef} className="popup-container z-50">
      <Outlet />
    </div>
  );
}
