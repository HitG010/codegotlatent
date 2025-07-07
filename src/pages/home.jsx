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
import ReactMarkdown from "react-markdown";
import Rules from "../components/Rules";
import "../App.css";

const Home = () => {
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.accessToken);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  console.log(user, "User in Home");
  console.log(token, "Access Token in Home");
  console.log(isAuthenticated, "Is Authenticated in Home");
  const pathname = window.location.pathname;
  // alert("Home Page");
  return (
    <div className="h-screen w-100vh flex flex-row justify-between bg-[#0F0F0F] overflow-hidden scrollbar">
      <Navbar path={pathname} />
      <div className="home flex flex-col h-full w-[80%] p-10 pt-16 bg-[#0F0F0F] overflow-auto scrollbar">
        <div className="flex flex-col gap-1 justify-self-start">
          <h1 className="text-white text-4xl font-semibold">
            Welcome, {user.username} 👋
          </h1>
          <p className="text-gray-400 text-xl">
            Start showing your "Latent" today!
          </p>
        </div>
        <div className="explore flex flex-row gap-4 mt-8">
          <Link
            to={"/problemset"}
            className="problem-button flex-1 pt-5 pl-5 pb-5 flex flex-row items-center border-1 border-[#F4DD6A20] rounded-3xl hover:inset-shadow-xs hover:inset-shadow-[#F4DD6A45] hover:cursor-pointer transition-all duration-300 hover:bg-[#F4DD6A10]"
            style={{
              boxShadow:
                "inset 0 0 30px rgba(244, 221, 106, 0.15), inset 0 0 10px rgba(244, 221, 106, 0.08), inset 0 1px 2px rgba(244, 221, 106, 0.27)",
            }}
          >
            <div className="flex flex-col p-2">
              <div className="flex flex-row gap-3 items-center justify-items-start mb-3 hover:gap-4 transition-all duration-300">
                <h1 className="text-3xl font-semibold">Problems</h1>
                <FaArrowRightLong className="h-5 w-5" />
              </div>
              <p className="text-[#ffffff65]">
                Tackle a curated set of questions and strenghten your Data
                Structures and Algorithms skills!
              </p>
            </div>
            <img src={language} alt="Contest Trophy" className="h-35 w-35" />
          </Link>
          <Link
            to={"/contests"}
            className="problem-button flex-1 pt-5 pl-5 pb-5 flex flex-row items-center border-1 border-[#1267D020] rounded-3xl hover:inset-shadow-xs hover:inset-shadow-[#F4DD6A45] hover:cursor-pointer transition-all duration-300 hover:bg-[#1267D010]"
            style={{
              boxShadow:
                "inset 0 0 30px rgba(17, 112, 228, 0.15), inset 0 0 10px rgba(17, 112, 228, 0.08), inset 0 1px 2px rgba(17, 112, 228, 0.27)",
            }}
          >
            <div className="flex flex-col p-2">
              <div className="flex flex-row gap-3 items-center justify-items-start mb-3 hover:gap-4 transition-all duration-300">
                <h1 className="text-3xl font-semibold">Contests</h1>
                <FaArrowRightLong className="h-5 w-5" />
              </div>
              <p className="text-[#ffffff65]">
                Show your coding skills in Rated Contests with a Twist in
                Ratings. Attempt a Contest Now!
              </p>
            </div>
            <img
              src={contestTrophy}
              alt="Contest Trophy"
              className="h-25 w-25 mr-5"
            />
          </Link>
        </div>
        <Rules />
      </div>
    </div>
  );
};

export default Home;
