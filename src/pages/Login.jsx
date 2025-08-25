import React, { useState } from "react";
import api from "../api/axios";
import useUserStore from "../store/userStore";
import { Link, Navigate } from "react-router-dom";
import cgl_bg2 from "../assets/cgl_bg2.png";
import latentNavLogo from "../assets/latentNavLogo.png";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa6";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const setUser = useUserStore((state) => state.setUser);
  const clearUser = useUserStore((state) => state.clearUser);

  // if user already exists in store, redirect to home
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/home" />;
  }

  const handleLogin = async () => {
    try {
      const response = await api.post("/login", { email, password });
      const { accessToken, user } = response.data;
      setUser(user, accessToken);
      // console.log("Login successful:", user);
      // console.log("Access Token:", accessToken);
      // alert('Login successful!');
      // Redirect to home or any other page after successful login
      window.location.href = "/home";
    } catch (error) {
      console.error("Login error:", error);
      clearUser();
    }
  };

  return (
    <div
      className="flex flex-col items-center gap-4 justify-center min-h-screen bg-cover bg-center bg-[#1A1A1A] px-4 py-8"
      style={{ backgroundImage: `url(${cgl_bg2})`, backgroundSize: "cover" }}
    >
      <img
        src={latentNavLogo}
        alt="Code Got Latent"
        className="absolute top-4 w-12 h-12 sm:w-16 sm:h-16"
      />

      <div className="bg-[#0f0f0f55] py-6 lg:py-8 px-6 lg:px-12 rounded-2xl shadow-lg flex flex-col gap-4 w-full max-w-md lg:max-w-lg">
        <Link
          to={"/"}
          className="text-sm lg:text-md text-[#f1f3f575] flex gap-2 items-center w-fit rounded-md hover:cursor-pointer hover:text-[#f1f3f5] transition-all duration-300"
        >
          <FaArrowLeft className="w-3 h-3" /> Back
        </Link>
        <div className="flex flex-col gap-1 mb-2">
          <h2 className="text-3xl lg:text-4xl font-medium text-[#f1f3f5]">
            Log In
          </h2>
          <div className="text-base lg:text-lg font-regular text-[#f1f3f585]">
            New to Code's Got Latent?{" "}
            <Link
              to={"/signup"}
              className="bg-[#f1f3f515] py-1 px-3 text-[#f1f3f5] text-sm justify-center items-center rounded-lg hover:bg-[#f1f3f540] hover:gap-3 transition-all duration-300 border-1 border-[#ffffff45] inset-shadow-black cursor-pointer"
            >
              Sign Up
            </Link>
          </div>
        </div>
        <div>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Enter Email"
            className="border-1 border-[#ffffff45] px-4 py-2 w-full rounded-lg active:border-2 active:border-[#f1f3f5] active:bg-[#ffffff25] focus:bg-[#ffffff15] bg-transparent text-white text-sm lg:text-base"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
          />
        </div>
        <div>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Enter Password"
            className="border-1 border-[#ffffff45] px-4 py-2 w-full rounded-lg active:border-2 active:border-[#f1f3f5] active:bg-[#ffffff25] focus:bg-[#ffffff15] bg-transparent text-white text-sm lg:text-base"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
          />
        </div>
        <button
          type="submit"
          className="bg-[#f1f3f5] py-3 w-full text-[#1a1a1a] font-semibold flex gap-2 justify-center items-center rounded-lg hover:bg-[#e0e0e0] hover:gap-3 transition-all duration-300 cursor-pointer text-sm lg:text-base"
          onClick={handleLogin}
        >
          Let's Go! <FaArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default Login;
