import { GoogleLogin } from '@react-oauth/google';
import useUserStore from '../store/userStore'
import axios from 'axios';
import { Navigate, Link } from 'react-router-dom';
import cgl_bg2 from '../assets/cgl_bg2.png';
import latentNavLogo from '../assets/latentNavLogo.png';
import { FaArrowLeft } from 'react-icons/fa6';

const Login2 = () => {
  const setUser = useUserStore((state) => state.setUser);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  
  if (isAuthenticated) {
    // return <Navigate to="/home" />;
    window.location.href = '/home'; // Redirect to home if already authenticated
  }

  const handleSuccess = async (credentialResponse) => {
    const idToken = credentialResponse.credential;

    const res = await axios.post(
      `${import.meta.env.VITE_BASE_URL}/auth/google`,
      { idToken },
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true, // to send/receive refreshToken cookie
      }
    );

    // localStorage.setItem("accessToken", res.data.accessToken); // optional
    setUser({ user: res.data.user, accessToken: res.data.accessToken });
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
          <div className='w-full flex justify-center'>
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => {
                console.log("Login Failed");
              }}
              theme="filled_black"
              size="large"
              width="100%"
              className="w-full"
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
