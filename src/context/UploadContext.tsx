import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { saveFile, getFile, deleteFile } from "../helper/fileStore";
import { getAudioDuration } from "../helper/musicMetadata";

export type UploadType =
  | "audio"
  | "video"
  | "image"
  | "pdf"
  | "document"
  | "url"
  | "text";

export interface UploadData {
  type: UploadType;
  file?: File; 
  fileUrl?: string; 
  name?: string;
  size?: number;
  mime?: string;
  text?: string; 
  url?: string; 
  thumbnail?: string;
  fileName?: string;
  idbKey?: string; 
  duration?: number; 
}

interface UploadContextType {
  upload: UploadData | null;
  setUpload: (data: UploadData | null) => Promise<void>;
  clearUpload: () => Promise<void>;
  isRehydrating: boolean; // <- expose rehydration state
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

const STORAGE_KEY = "popup:upload";

// Utility: generate key for IDB
function makeKey(name?: string) {
  try {
    return `${crypto.randomUUID()}-${name || "file"}`;
  } catch {
    return `${Date.now()}-${name || "file"}`;
  }
}

// Utility: calculate audio/video duration using music-metadata library
async function calculateMediaDuration(file: File): Promise<number> {
  return await getAudioDuration(file);
}

export function UploadProvider({ children }: { children: ReactNode }) {
  const [upload, _setUpload] = useState<UploadData | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isRehydrating, setIsRehydrating] = useState(false);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  // Helper function to rehydrate upload data from storage
  const rehydrateUpload = async (saved: UploadData, skipIfSame: boolean = false) => {
    // Skip if we already have the same upload loaded
    if (skipIfSame && upload?.idbKey === saved.idbKey && upload?.name === saved.name) {
      console.log('Upload already loaded, skipping rehydration');
      return;
    }

    try {
      // For url/text types, no IDB fetch needed
      if (saved.type === "url" || saved.type === "text") {
        _setUpload({
          ...saved,
          fileUrl: saved.fileUrl || saved.url, // Ensure fileUrl is available for URL types
        });
        return;
      }

      // For file-based types, fetch from IDB
      if (saved.idbKey) {
        setIsRehydrating(true);
        try {
          const blob = (await getFile(saved.idbKey)) as Blob | null;
          if (blob) {
            const file = new File([blob], saved.name || saved.fileName || "file", {
              type: saved.mime || blob.type || "application/octet-stream",
            });
            const objUrl = URL.createObjectURL(file);
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            setObjectUrl(objUrl);
            _setUpload({
              ...saved,
              file,
              fileUrl: objUrl,
              size: saved.size ?? file.size,
              mime: saved.mime ?? file.type,
              duration: saved.duration, // Preserve duration from saved data
            });
            console.log('Upload rehydrated successfully from IDB:', saved.name);
          } else {
            console.warn('File not found in IDB for key:', saved.idbKey);
            _setUpload(saved);
          }
        } finally {
          setIsRehydrating(false);
        }
      } else {
        _setUpload(saved);
      }
    } catch (err) {
      console.error("Rehydrate error:", err);
    }
  };

  // Initial rehydration on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (chrome?.storage?.local) {
          const res = await chrome.storage.local.get(STORAGE_KEY);
          const saved: UploadData | undefined = res?.[STORAGE_KEY];
          if (mounted && saved) {
            await rehydrateUpload(saved);
          }
        }
      } catch (err) {
        console.error("Initial rehydrate error:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Listen for storage changes to rehydrate when upload data changes (from other tabs)
  useEffect(() => {
    if (!chrome?.storage?.onChanged) return;

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes[STORAGE_KEY]) {
        const newUpload = changes[STORAGE_KEY].newValue as UploadData | undefined;
        const oldUpload = changes[STORAGE_KEY].oldValue as UploadData | undefined;
        
        // Only rehydrate if upload data actually changed
        if (newUpload && newUpload !== oldUpload) {
          console.log('Upload data changed in storage, rehydrating...', newUpload.name);
          // Skip rehydration if it's the same upload we already have
          const skipIfSame = oldUpload?.idbKey === newUpload.idbKey && 
                            oldUpload?.name === newUpload.name;
          rehydrateUpload(newUpload, skipIfSame);
        } else if (!newUpload && oldUpload) {
          // Upload was cleared
          console.log('Upload cleared in storage');
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            setObjectUrl(null);
          }
          _setUpload(null);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [upload, objectUrl]);

  // Set upload
  async function setUpload(data: UploadData | null) {
    try {
      if (!data) {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          setObjectUrl(null);
        }
        _setUpload(null);
        if (chrome?.storage?.local) {
          await chrome.storage.local.remove(STORAGE_KEY);
          await chrome.storage.local.remove("lastPathBeforeClose");
          await chrome.storage.local.remove("lastPopupRoute");
        }
        return;
      }

      let idbKey = data.idbKey;
      let inMemoryUrl: string | undefined;
      let calculatedDuration = data.duration;

      if (data.file) {
        // Calculate duration for audio/video files
        if ((data.type === "audio" || data.type === "video") && !calculatedDuration) {
          console.log('🎵 R&D: Starting duration calculation for uploaded file:', {
            fileName: data.file.name,
            fileType: data.file.type,
            fileSize: data.file.size,
            isWebM: data.file.type.includes('webm'),
            isMP3: data.file.type.includes('mp3')
          });
          calculatedDuration = await calculateMediaDuration(data.file);
          console.log('🎵 R&D: Duration calculation result:', {
            fileName: data.file.name,
            fileType: data.file.type,
            calculatedDuration: calculatedDuration,
            success: calculatedDuration > 0
          });
        }
        
        // Save file in IDB and create in-memory object URL
        idbKey = idbKey || makeKey(data.file.name);
        await saveFile(idbKey, data.file);
        inMemoryUrl = URL.createObjectURL(data.file);
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        setObjectUrl(inMemoryUrl);
      } else if (data.type === "url" || data.type === "text") {
        // No IDB; keep provided fileUrl/text
        inMemoryUrl = data.fileUrl;
      }

      const toStore: UploadData = {
        type: data.type,
        fileUrl: data.type === "url" ? data.fileUrl : undefined, // Keep fileUrl for URL types
        name: data.name ?? data.file?.name,
        size:
          data.size ??
          data.file?.size ??
          (data.type === "text" && data.text ? new Blob([data.text]).size : 0),
        mime: data.mime ?? data.file?.type,
        text: data.text,
        url: data.url ?? data.fileUrl,
        thumbnail: data.thumbnail,
        fileName: data.fileName ?? data.file?.name,
        idbKey, // persist IDB reference
        duration: calculatedDuration, // persist duration
      };

      console.log('UploadContext - Setting upload with duration:', calculatedDuration, 'seconds');
      _setUpload({
        ...data,
        idbKey,
        fileUrl: inMemoryUrl ?? data.fileUrl ?? undefined,
        name: toStore.name,
        size: toStore.size,
        mime: toStore.mime,
        fileName: toStore.fileName,
        duration: calculatedDuration,
      });

      if (chrome?.storage?.local) {
        // Determine the correct route based on upload type
        // Check if this is a recording (file name starts with "recording_")
        const isRecording = toStore.fileName?.startsWith("recording_") || 
                           toStore.name?.startsWith("recording_");
        const route = (isRecording && toStore.type === "audio") 
          ? "/popup/record/process" 
          : "/popup/upload/process";
        
        await chrome.storage.local.set({
          [STORAGE_KEY]: toStore,
          lastPathBeforeClose: route,
          lastPopupRoute: route, // Store route for cross-tab syncing
        });
        console.log("Stored upload route for syncing:", route);
      }
    } catch (err) {
      console.error("setUpload error:", err);
      _setUpload(data);
    }
  }

  async function clearUpload() {
    try {
      const key = upload?.idbKey;
      if (key) {
        try { await deleteFile(key); } catch {}
      }
    } finally {
      await setUpload(null);
    }
  }

  return (
    <UploadContext.Provider value={{ upload, setUpload, clearUpload, isRehydrating }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUpload must be used inside UploadProvider");
  return ctx;
}