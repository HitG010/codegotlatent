import React, { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import useUserStore from "../store/userStore";
import api from "../api/axios";
import { logout } from "../utils/logout";
import Navbar from "../components/Navbar";
import contestTrophy from "../assets/trophy.svg";
import language from "../assets/language.svg";
import { FaArrowRightLong } from "react-icons/fa6";

const Home = () => {
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.accessToken);
  console.log(user, "User in Home");
  console.log(token, "Access Token in Home");
  const pathname = window.location.pathname;
  // alert("Home Page");
  return (
    <div className="h-screen w-100vh flex flex-row justify-between bg-[#0F0F0F]">
      <Navbar path={pathname}/>
      <div className="home flex flex-col h-full w-[80%] p-10 pt-16 bg-[#0F0F0F]">
        <div className="flex flex-col gap-1 justify-self-start">
          <h1 className="text-white text-4xl font-bold">
            Welcome, {user.email} 👋
          </h1>
          <p className="text-gray-400 text-xl">
            Start showing your "Latent" today!
          </p>
        </div>
        <div className="explore flex flex-row gap-10 p-5">
          <div className="problem-button flex-1 pt-5 pl-5 pb-5 flex flex-row items-center border-2">
            <div className="flex flex-col p-2">
              <div className="flex flex-row gap-3 items-center justify-items-start mb-3">
                <h1 className="text-3xl">Problems</h1>
                <FaArrowRightLong className="h-6 w-6" />
              </div>
              <p className="opacity-75">
                Tackle a curated set of questions and strenghten your Data
                Structures and Algorithms skills!
              </p>
            </div>
            <img src={language} alt="Contest Trophy" className="h-35 w-35" />
          </div>
          <div className="problem-button flex-1 pt-5 pl-5 pb-5 flex flex-row items-center border-2">
            <div className="flex flex-col p-2">
              <div className="flex flex-row gap-3 items-center justify-items-start mb-3">
                <h1 className="text-3xl">Contests</h1>
                <FaArrowRightLong className="h-6 w-6" />
              </div>
              <p className="opacity-75">
                Show your coding skills in Rated Contests with a Twist in
                Ratings. Attempt a Contest Now!
              </p>
            </div>
            <img
              src={contestTrophy}
              alt="Contest Trophy"
              className="h-30 w-30"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
