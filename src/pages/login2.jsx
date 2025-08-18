import { GoogleLogin } from '@react-oauth/google';
import useUserStore from '../store/userStore'
import axios from 'axios';
import { Navigate, Link } from 'react-router-dom';
import cgl_bg2 from '../assets/cgl_bg2.png';
import latentNavLogo from '../assets/latentNavLogo.png';
import { FaArrowLeft } from 'react-icons/fa6';
import { isIOSSafari, handleIOSAuthError } from '../utils/iosAuth';
import { useState, useEffect } from 'react';

const Login2 = () => {
  const setUser = useUserStore((state) => state.setUser);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [showIOSWarning, setShowIOSWarning] = useState(false);
  
  useEffect(() => {
    const iosCheck = isIOSSafari();
    setIsIOSDevice(iosCheck);
    if (iosCheck) {
      setShowIOSWarning(true);
    }
  }, []);
  
  if (isAuthenticated) {
    // return <Navigate to="/home" />;
    window.location.href = '/home'; // Redirect to home if already authenticated
  }

  const handleSuccess = async (credentialResponse) => {
    const idToken = credentialResponse.credential;

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/auth/google`,
        { idToken },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true, // to send/receive refreshToken cookie
          // Add timeout for iOS
          timeout: 30000,
        }
      );

      console.log('Auth response:', res.data);
      
      // Handle both iOS and non-iOS responses
      if (res.data.isIOS && res.data.refreshToken) {
        // iOS device - refresh token is in response body
        setUser({ 
          user: res.data.user, 
          accessToken: res.data.accessToken,
          refreshToken: res.data.refreshToken 
        });
      } else {
        // Non-iOS device - refresh token is in httpOnly cookie
        setUser({ 
          user: res.data.user, 
          accessToken: res.data.accessToken 
        });
      }
    } catch (error) {
      console.error('Google Auth Error:', error);
      if (error.response?.data?.message) {
        alert(`Authentication failed: ${error.response.data.message}`);
      } else {
        alert('Authentication failed. Please try again.');
      }
    }
  };

  const handleError = (error) => {
    console.log("Login Failed:", error);
    const errorMessage = handleIOSAuthError(error);
    alert(errorMessage);
  };

  return (
    <div className='flex flex-col items-center gap-4 justify-center min-h-screen bg-cover bg-center bg-[#1A1A1A] px-4 py-8' style={{ backgroundImage: `url(${cgl_bg2})`, backgroundSize: 'cover' }}>
      <img src={latentNavLogo} alt='Code Got Latent' className='absolute top-4 w-12 h-12 sm:w-16 sm:h-16' />

      <div className='bg-[#0f0f0f55] py-6 lg:py-8 px-6 lg:px-12 rounded-2xl shadow-lg flex flex-col gap-4 w-full max-w-md lg:max-w-lg'>
        <Link to={'/'} className='text-sm lg:text-md text-[#f1f3f575] flex gap-2 items-center w-fit rounded-md hover:cursor-pointer hover:text-[#f1f3f5] transition-all duration-300'>
          <FaArrowLeft className='w-3 h-3'/> Back
        </Link>
        
        <div className='flex flex-col gap-1 mb-2'>
          <h2 className='text-2xl sm:text-3xl lg:text-4xl font-medium text-[#f1f3f5]'>Sign In with Google</h2>
          <div className='text-sm sm:text-base lg:text-lg font-regular text-[#f1f3f585]'>
            Use your Google account to access Code's Got Latent
          </div>
        </div>

        <div className='flex flex-col gap-4 items-center w-full'>
          {showIOSWarning && isIOSDevice && (
            <div className='w-full p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-200 text-sm'>
              <strong>iOS Device Detected:</strong> We've optimized authentication for iOS devices.
              <ul className='mt-1 ml-4 list-disc'>
                <li>Authentication may take a few extra seconds</li>
                <li>Please ensure you have a stable internet connection</li>
                <li>If issues persist, try refreshing the page</li>
              </ul>
              <button 
                onClick={() => setShowIOSWarning(false)}
                className='mt-2 text-xs underline hover:no-underline'
              >
                Dismiss
              </button>
            </div>
          )}
          
          <div className='w-full flex justify-center'>
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={handleError}
              theme="filled_black"
              size="large"
              width="100%"
              className="w-full"
              useOneTap={false}
              auto_select={false}
              itp_support={true}
              cancel_on_tap_outside={false}
            />
          </div>
          
          {/* <div className='text-xs sm:text-sm text-[#f1f3f575] text-center'>
            Or continue with <Link to={'/login'} className="text-[#f1f3f5] hover:underline">email and password</Link>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default Login2;
