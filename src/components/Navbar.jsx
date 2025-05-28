import React from "react";
import latentNavLogo from "../assets/latentNavLogo.svg";
import { GoHomeFill } from "react-icons/go";
import { SlPuzzle } from "react-icons/sl";
import { HiMiniTrophy } from "react-icons/hi2";
import { IoSettingsOutline } from "react-icons/io5";

export default function Navbar({
  isHome = false,
  isProblemSet = false,
  isContests = false,
}) {
  // This component renders a sidebar navigation bar with links to Home, Problems, and Contests.
  return (
    <div className="navbar h-full w-[20%] bg-[#1A1A1A] flex flex-col p-6 justify-between">
      <div className="flex flex-col">
        <div className="logo mb-5">
          <img src={latentNavLogo} alt="Latent Logo" className="h-14 w-14" />
        </div>
        <div className="section-buttons flex flex-col gap-2">
          <div className="flex flex-row justify-items-start items-center text-center p-1.5 text-white hover:bg-[#2A2A2A] rounded-lg cursor-pointer gap-2">
            <GoHomeFill className="text-white text-2xl mr-2 ml-2" />
            <p className="text-lg">Home</p>
          </div>
          <div className="flex flex-row justify-items-start items-center text-center p-1.5 text-white hover:bg-[#2A2A2A] rounded-lg cursor-pointer gap-2">
            <SlPuzzle className="text-white text-2xl mr-2 ml-2" />
            <p className="text-lg">Problems</p>
          </div>
          <div className="flex flex-row justify-items-start items-center text-center p-1.5 text-white hover:bg-[#2A2A2A] rounded-lg cursor-pointer gap-2">
            <HiMiniTrophy className="text-white text-2xl mr-2 ml-2" />
            <p className="text-lg">Contests</p>
          </div>
        </div>
      </div>
      <div className="end-section flex flex-col gap-2">
        <div className="flex flex-row justify-items-start items-center text-center p-1.5 text-white hover:bg-[#2A2A2A] rounded-lg cursor-pointer gap-2">
          <IoSettingsOutline className="text-white opacity-50 text-2xl mr-2" />
          <p className="text-lg opacity-50">Settings</p>
        </div>
        <div className="h-[1px] bg-white opacity-10"></div>
        <div className="flex flex-row justify-items-start items-center text-center p-1.5 text-white hover:bg-[#2A2A2A] rounded-lg cursor-pointer gap-2">
          <IoSettingsOutline className="text-white opacity-50 text-2xl mr-2" />
          <p className="text-lg">Kartik Bindra</p>
        </div>
      </div>
    </div>
  );
}
