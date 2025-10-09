import React from 'react';

interface LoaderProps {
  isLoading: boolean;
  message?: string;
}

const Loader: React.FC<LoaderProps> = ({ isLoading, message = "Loading..." }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60  backdrop-blur-sm">
      <div className="flex flex-col items-center justify-center rounded-lg p-6 ">
        {/* Spinner */}
        <div id='spinner'>
                <div className='bounce1'></div>
                <div className='bounce2'></div>
                <div className='bounce3'></div>
            </div>
      </div>
    </div>
  );
};

export default Loader;
