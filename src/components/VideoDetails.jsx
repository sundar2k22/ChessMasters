import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';

const VideoDetail = () => {
  const { id } = useParams();
  const [video, setVideo] = useState(null);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const response = await fetch(`http://localhost:3000/coach/VideoDetail/${id}`, {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setVideo(data);
        } else {
          console.error('Failed to fetch video');
        }
      } catch (error) {
        console.error('Error fetching video:', error);
      }
    };

    fetchVideo();
  }, [id]);

  if (!video) return (
    <div className="flex justify-center items-center h-screen bg-gradient-to-r from-green-400 to-green-600">
      <div className="animate-pulse flex space-x-2 sm:space-x-4">
        <div className="rounded-full bg-black h-8 w-8 sm:h-12 sm:w-12"></div>
        <div className="rounded-full bg-black h-8 w-8 sm:h-12 sm:w-12"></div>
        <div className="rounded-full bg-black h-8 w-8 sm:h-12 sm:w-12"></div>
      </div>
    </div>
  );

  let path = video.filePath;
  let newPath = "../../Backend/" + path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-100 to-green-200 py-6 sm:py-8 md:py-12 px-3 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8"
      >
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-center mb-4 sm:mb-6 md:mb-8 text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-black"
        >
          {video.title}
        </motion.h1>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="bg-white shadow-lg sm:shadow-xl md:shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden transform hover:scale-105 transition duration-300"
        >
          <div className="p-4 sm:p-6 md:p-8">
            <p className="text-base sm:text-lg md:text-xl text-gray-800 leading-relaxed mb-4 sm:mb-6 md:mb-8">
              {video.content}
            </p>
            
            <div className="flex justify-center">
              <motion.a 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href={newPath} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-full shadow-sm text-white bg-gradient-to-r from-green-600 to-black hover:from-green-700 hover:to-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300"
              >
                <svg 
                  className="w-4 h-4 sm:w-5 sm:h-5 mr-2" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  >
                  </path>
                </svg>
                <span className="hidden sm:inline">Download Video</span>
                <span className="sm:hidden">Download</span>
              </motion.a>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default VideoDetail;
