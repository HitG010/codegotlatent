import React, { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import useUserStore from "../store/userStore";
import api from "../api/axios";
import { logout } from "../utils/logout";
import Navbar from "../components/Navbar";

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
            Welcome, {user.name} 👋
          </h1>
          <p className="text-gray-400 text-xl">
            Start showing your "Latent" today!
          </p>
        </div>
        <div className="explore flex flex-row gap-2 p-3">
          <div className="problem-button flex-1 p-5 flex flex-col">
            <h1 className="text-2xl">Problems</h1>
            <p>
              Tackle a curated set of questions and strengthen your Data
              Structures & Algorithms Skills
            </p>
          </div>
          <div className="problem-button flex-1 p-5 flex flex-col">
            <h1 className="text-2xl">Problems</h1>
            <p>
              Tackle a curated set of questions and strengthen your Data
              Structures & Algorithms Skills
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
