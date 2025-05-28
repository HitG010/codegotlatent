import { useState } from "react";
import api from "../api/axios";
import useUserStore from "../store/userStore";
import { Navigate, useNavigate } from "react-router-dom";
import cgl_bg2 from "../assets/cgl_bg2.png";
import latentNavLogo from "../assets/latentNavLogo.png";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa6";
import { Link } from "react-router-dom";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const setUser = useUserStore((state) => state.setUser);
  const clearUser = useUserStore((state) => state.clearUser);
  const navigate = useNavigate();

  // if user is already present in the store, redirect to home
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/home" />;
  }


  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/signup", {
        username,
        email,
        password,
      });
      const { accessToken, user } = response.data;
      setUser(user, accessToken);
      navigate("/");
    } catch (error) {
      console.error("Registration error:", error.response.data.message);
      clearUser();
    }
  };

  return (
    <div className='flex flex-col items-center gap-4 justify-center h-screen bg-cover bg-center bg-[#1A1A1A]' style={{ backgroundImage: `url(${cgl_bg2})`, backgroundSize: 'cover' }}>
        <img src={latentNavLogo} alt='Code Got Latent' className='absolute top-4' />

          <div className='bg-[#0f0f0f55] py-8 px-12 rounded-2xl shadow-lg flex flex-col gap-4 w-[30%]'>
          <Link to={'/'} className='text-md text-[#f1f3f575] flex gap-2 items-center w-fit rounded-md hover:cursor-pointer hover:text-[#f1f3f5] transition-all duration-300'><FaArrowLeft className='w-3 h-3'/> Back</Link>
          <div className='flex flex-col gap-1 mb-2'>
          <h2 className='text-4xl font-medium text-[#f1f3f5]'>Sign Up</h2>
          <div className='text-lg font-regular text-[#f1f3f585]'>Already have an account? <Link to={'/login'} className="bg-[#f1f3f515] py-1 px-3 text-[#f1f3f5] text-sm justify-center items-center rounded-lg hover:bg-[#f1f3f540] hover:gap-3 transition-all duration-300 border border-1 border-[#ffffff45] inset-shadow-black cursor-pointer">Log In</Link></div></div>
          <div>
          <input type="text" id="username" name="username" placeholder='Enter Username' className='border border-1 border-[#ffffff45] px-4 py-2 w-full rounded-lg active:border-2 active:border-[#f1f3f5] active:bg-[#ffffff25] focus:bg-[#ffffff15]' value={username} onChange={(e) => {
            setUsername(e.target.value)
          }}/>
          </div>
          <div>
          <input type="email" id="email" name="email" placeholder='Enter Email' className='border border-1 border-[#ffffff45] px-4 py-2 w-full rounded-lg active:border-2 active:border-[#f1f3f5] active:bg-[#ffffff25] focus:bg-[#ffffff15]' value={email} onChange={(e) => {
            setEmail(e.target.value)
          }}/>
          </div>
          <div>
          <input type="password" id="password" name="password" placeholder='Enter Password' className='border border-1 border-[#ffffff45] px-4 py-2 w-full rounded-lg active:border-2 active:border-[#f1f3f5] active:bg-[#ffffff25] focus:bg-[#ffffff15]' value={password} onChange={(e) => {
            setPassword(e.target.value)
          }}/>
          </div>
          <button type="submit" className="bg-[#f1f3f5] py-3 w-full text-[#1a1a1a] font-semibold flex gap-2 justify-center items-center rounded-lg hover:bg-[#e0e0e0] hover:gap-3 transition-all duration-300 cursor-pointer" onClick={handleRegister}>Get Started! <FaArrowRight className='w-3 h-3'/></button>
          </div>
    </div>
  );
}