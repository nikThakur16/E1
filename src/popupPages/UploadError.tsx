
import ErrorPage from '../components/popup/ErrorPage'

const UploadError = () => {
  return (
    <div>
        <ErrorPage
  heading="Oops! File upload failed"
  descriptions={[
    "We couldn’t process your file right now but don’t worry, your recording is safe.",
    "You can find it anytime under the Unprocessed tab in mobile apps."
  ]}
  footerDescriptions={[
    "Check your internet connection",
    "Try again in a few moments "
  ]}
  onRetry={() => console.log("Retry clicked")}
  onHome={() => console.log("Go Home clicked")}
/>

      
    </div>
  )
}

export default UploadError;
