import React, { useEffect, useState } from "react";
import Loader from "./Loader";
import ErrorPage from "./ErrorPage";
import { useNavigate } from "react-router";

interface UrlPreviewCardProps {
  fileUrl: string;
}

interface MetaData {
  title?: string;
  description?: string;
  image?: string;
}

const UrlPreviewCard: React.FC<UrlPreviewCardProps> = ({ fileUrl }) => {
  const [meta, setMeta] = useState<MetaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate=useNavigate();

  // Static fallback data or for testing
  useEffect(() => {
    if (!fileUrl) {
      setError("Invalid URL");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchMetadata() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `https://api.microlink.io?url=${encodeURIComponent(fileUrl)}`
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        if (!cancelled) {
          if (data.status === "success" && data.data) {
            setMeta({
              title: data.data.title,
              description: data.data.description,
              image: data.data.image?.url,
            });
          } else {
            setError("Failed to fetch metadata");
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("UrlPreviewCard fetch error:", err);
          setError(err.message || "Failed to fetch metadata");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMetadata();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);
  

  if(error){
    return (
      <ErrorPage
      heading="Oops! Something went wrong"
      descriptions={[
        "We couldn't fetch the metadata for this URL. Please try again."
      ]}
      footerDescriptions={[
        "Check your internet connection",
        "Try again in a few moments "
      ]}
      onRetry={() => navigate("/popup/upload")}
      onHome={() => navigate("/popup/home")}
    />
    )
  }

  return (
    <div className="p-4">
      {/* Loading state */}
      {loading && (
     <Loader isLoading={loading} />
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="p-4 bg-white rounded-xl shadow-md text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Metadata display */}
      {!loading && meta && (
        <div className="flex gap-4  bg-white rounded-xl  w-full max-w-md">
          {meta.image && (
            <img
              src={meta.image}
              alt={meta.title || "Preview Image"}
              className="w-14 h-14 rounded-lg object-cover"
            />
          )}
          <div className="flex flex-col">
            <p className="font-semibold text-[#4B5563] text-[20px]">{meta.title || "Untitled"}</p>
            <p className="text-[16px] text-[#4B5563] font-[400] line-clamp-2">
              {meta.description || "No description available"}
            </p>
            <div className="flex items-center gap-2 mt-1">
            <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.5672 6.01222C12.041 2.7715 10.7998 0.496094 9.35547 0.496094C7.91111 0.496094 6.66999 2.7715 6.14378 6.01222H12.5672ZM5.8716 9.49609C5.8716 10.3017 5.91515 11.0747 5.99136 11.8187H12.716C12.7922 11.0747 12.8357 10.3017 12.8357 9.49609C12.8357 8.69045 12.7922 7.91746 12.716 7.17351H5.99136C5.91515 7.91746 5.8716 8.69045 5.8716 9.49609ZM17.6551 6.01222C16.6172 3.54811 14.516 1.64287 11.9212 0.873513C12.8067 2.10013 13.4164 3.9473 13.7357 6.01222H17.6551ZM6.78611 0.873513C4.19498 1.64287 2.09015 3.54811 1.05587 6.01222H4.97523C5.29095 3.9473 5.90063 2.10013 6.78611 0.873513ZM18.0434 7.17351H13.8809C13.9571 7.93561 14.0006 8.71585 14.0006 9.49609C14.0006 10.2763 13.9571 11.0566 13.8809 11.8187H18.0397C18.2393 11.0747 18.3518 10.3017 18.3518 9.49609C18.3518 8.69045 18.2393 7.91746 18.0434 7.17351ZM4.71031 9.49609C4.71031 8.71585 4.75386 7.93561 4.83007 7.17351H0.667566C0.471598 7.91746 0.355469 8.69045 0.355469 9.49609C0.355469 10.3017 0.471598 11.0747 0.667566 11.8187H4.82644C4.75386 11.0566 4.71031 10.2763 4.71031 9.49609ZM6.14378 12.98C6.66999 16.2207 7.91111 18.4961 9.35547 18.4961C10.7998 18.4961 12.041 16.2207 12.5672 12.98H6.14378ZM11.9248 18.1187C14.516 17.3493 16.6208 15.4441 17.6587 12.98H13.7393C13.42 15.0449 12.8103 16.8921 11.9248 18.1187ZM1.05587 12.98C2.09378 15.4441 4.19499 17.3493 6.78974 18.1187C5.90426 16.8921 5.29458 15.0449 4.97523 12.98H1.05587Z" fill="#4B5563"/>
</svg>
<a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 text-sm underline "
            >
              {fileUrl}
            </a>

            </div>
           
          </div>
        </div>
      )}
    </div>
  );
};

export default UrlPreviewCard;
