import React from "react";
import { Link, Navigate } from "react-router-dom";
import cgl from "../assets/cgl.png";
import useUserStore from "../store/userStore";
import { useEffect } from "react";
import cgl_bg from "../assets/cgl_bg.png";
import cgl_bg2 from "../assets/cgl_bg2.png";
import codegotlatent_logo from "../assets/codegotlatent_logo.png";
import { FaArrowRightLong } from "react-icons/fa6";

const Landing = () => {
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.accessToken);
  // console.log(user, "User in Landing");
  // console.log(token, "Access Token in Landing");
  // useEffect(() => {
  //   if (user && token) {
  //     // <Navigate to="/home" />;
  //     window.location.href = "/home";
  //   }
  // }, [user, token]);
  return (
    <div
      className="flex flex-col items-center gap-4 justify-center min-h-screen bg-cover bg-center bg-[#1A1A1A] px-4 py-8"
      style={{ backgroundImage: `url(${cgl_bg2})`, backgroundSize: "cover" }}
    >
      {/* <div className='text-2xl font-semibold text-[#f1f3f5]'>This is the landing page</div> */}
      {/* <div className='text-4xl font-bold text-[#f1f3f5]'>Welcome to Code Got Latent!</div> */}
      <img
        src={codegotlatent_logo}
        alt="Code Got Latent"
        className="w-[90%] max-w-[500px] h-auto sm:w-[70%] md:w-[60%] lg:w-[42%] object-contain"
      />
      {/* <Link to={"/login"}>Login</Link> */}
      {/* <img src={cgl} alt='Code Got Latent' className='w-1/2 h-1/2' /> */}
      <div className="flex flex-col items-center gap-1 lg:gap-0 justify-center mt-2 lg:mt-[-30px] text-center px-4 max-w-4xl">
        <div className="text-lg sm:text-md lg:text-lg font-regular text-[#f1f3f585] leading-relaxed">
          Are You Self-Aware about Your Coding Skills? Let's Find Out!
        </div>
        <div className="text-lg sm:text-md lg:text-lg font-regular text-[#f1f3f585] leading-relaxed">
          If you feel like you have a Coding "Latent", Get Started Now!
        </div>
      </div>
      <div className="px-6 py-3 lg:px-4 lg:py-2 bg-[#f1f3f5] text-[#1a1a1a] font-semibold rounded-lg hover:bg-[#fafafa] transition-all duration-300 mt-4">
        <Link
          to={"/login"}
          className="flex gap-2 items-center text-sm lg:text-base"
        >
          Get Started <FaArrowRightLong />
        </Link>
      </div>
    </div>
  );
};

export default Landing;
