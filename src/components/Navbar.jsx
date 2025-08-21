import React from "react";
import latentNavLogo from "../assets/latentNavLogo.svg";
import { GoHomeFill, GoHome } from "react-icons/go";
import { IoExtensionPuzzleOutline, IoExtensionPuzzleSharp } from "react-icons/io5";
import { HiMiniTrophy, HiOutlineTrophy } from "react-icons/hi2";
import { IoSettingsOutline, IoSettingsSharp } from "react-icons/io5";
import { Link } from "react-router-dom";
import { getUserDetails } from "../api/api";
import useUserStore from "../store/userStore";
import { avatars } from "./Avatars";

export default function Navbar({ path }) {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  console.log(user, "User in Navbar");

  // Desktop Sidebar Navigation
  const DesktopNav = () => (
    <div className="navbar hidden lg:flex h-full w-[20%] bg-[#1A1A1A] flex-col p-6 justify-between transition-all duration-300">
      <div className="flex flex-col">
        <div className="logo mb-5">
          <img src={latentNavLogo} alt="Latent Logo" className="h-14 w-14" />
        </div>
        <div className="section-buttons flex flex-col gap-2">
          <Link
            to={"/home"}
            className={`flex flex-row justify-items-start items-center text-center p-1.5 text-white hover:bg-[#2A2A2A] rounded-lg cursor-pointer gap-2 ${
              path === "/home" ? "bg-[#2A2A2A]" : ""
            } transition-all duration-300`}
          >
            {path === "/home" ? (
              <GoHomeFill className="text-white text-2xl mr-2 ml-2" />
            ) : (
              <GoHome className="text-white/65 text-2xl mr-2 ml-2" />
            )}
            <p className="text-lg">Home</p>
          </Link>
          <Link
            to={"/problemset"}
            className={`flex flex-row justify-items-start items-center text-center p-1.5 text-white hover:bg-[#2A2A2A] rounded-lg cursor-pointer gap-2 ${
              path === "/problemset" ? "bg-[#2A2A2A]" : ""
            } transition-all duration-300`}
          >
            {path === "/problemset" ? (
              <IoExtensionPuzzleSharp className="text-white text-2xl mr-2 ml-2" />
            ) : (
              <IoExtensionPuzzleOutline className="text-white/65 text-2xl mr-2 ml-2" />
            )}
            <p className="text-lg">Problems</p>
          </Link>
          <Link
            to={"/contests"}
            className={`flex flex-row justify-items-start items-center text-center p-1.5 text-white hover:bg-[#2A2A2A] rounded-lg cursor-pointer gap-2 ${
              path === "/contests" ? "bg-[#2A2A2A]" : ""
            } transition-all duration-300`}
          >
            {path === "/contests" ? (
              <HiMiniTrophy className="text-white text-2xl mr-2 ml-2" />
            ) : (
              <HiOutlineTrophy className="text-white/65 text-2xl mr-2 ml-2" />
            )}
            <p className="text-lg">Contests</p>
          </Link>
        </div>
      </div>
      <div className="end-section flex flex-col gap-2">
        <Link
          to={"/settings"}
          className={`flex flex-row justify-items-start items-center text-center p-1.5 text-white hover:bg-[#2A2A2A] rounded-lg cursor-pointer gap-2 transition-all duration-300 ${
            path === "/settings" ? "bg-[#2A2A2A]" : ""
          }`}
        >
          {path === "/settings" ? (
              <IoSettingsSharp className="text-white text-2xl mr-2 ml-2" />
            ) : (
              <IoSettingsOutline className="text-white/65 text-2xl mr-2 ml-2" />
            )}
          <p
            className={`text-lg ${
              path === "/settings" ? "text-white" : "text-white/65"
            }`}
          >
            Settings
          </p>
        </Link>
        <div className="h-[1px] bg-white opacity-10"></div>
        <Link
          to={`/user/${user?.username}`}
          className={`flex flex-row justify-items-start items-center text-center p-1.5 text-white hover:bg-[#2A2A2A] rounded-lg cursor-pointer gap-2 transition-all duration-300 ${
            path === `/user/${user?.username}` ? "bg-[#2A2A2A]" : ""
          }`}
        >
          <img
            src={avatars[user?.pfpId - 1] || null}
            alt=""
            className="h-10 w-10 rounded-full mr-2 bg-black"
          />
          <p className="text-lg">{user?.username}</p>
        </Link>
      </div>
    </div>
  );

  // Mobile Bottom Navigation
  const MobileNav = () => (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#1A1A1A] border-t border-[#ffffff15] z-50">
      <div className="flex justify-around items-center py-2 px-4">
        <Link
          to={"/home"}
          className={`flex flex-col items-center p-2 rounded-lg transition-all duration-300 ${
            path === "/home" ? "bg-[#2A2A2A]" : ""
          }`}
        >
          <GoHomeFill className={`text-xl ${path === "/home" ? "text-white" : "text-white/65"}`} />
          <span className={`text-xs mt-1 ${path === "/home" ? "text-white" : "text-white/65"}`}>Home</span>
        </Link>
        <Link
          to={"/problemset"}
          className={`flex flex-col items-center p-2 rounded-lg transition-all duration-300 ${
            path === "/problemset" ? "bg-[#2A2A2A]" : ""
          }`}
        >
          <IoExtensionPuzzleOutline className={`text-xl ${path === "/problemset" ? "text-white" : "text-white/65"}`} />
          <span className={`text-xs mt-1 ${path === "/problemset" ? "text-white" : "text-white/65"}`}>Problems</span>
        </Link>
        <Link
          to={"/contests"}
          className={`flex flex-col items-center p-2 rounded-lg transition-all duration-300 ${
            path === "/contests" ? "bg-[#2A2A2A]" : ""
          }`}
        >
          <HiMiniTrophy className={`text-xl ${path === "/contests" ? "text-white" : "text-white/65"}`} />
          <span className={`text-xs mt-1 ${path === "/contests" ? "text-white" : "text-white/65"}`}>Contests</span>
        </Link>
        <Link
          to={"/settings"}
          className={`flex flex-col items-center p-2 rounded-lg transition-all duration-300 ${
            path === "/settings" ? "bg-[#2A2A2A]" : ""
          }`}
        >
          <IoSettingsOutline className={`text-xl ${path === "/settings" ? "text-white" : "text-white/65"}`} />
          <span className={`text-xs mt-1 ${path === "/settings" ? "text-white" : "text-white/65"}`}>Settings</span>
        </Link>
        <Link
          to={`/user/${user?.username}`}
          className={`flex flex-col items-center p-2 rounded-lg transition-all duration-300 ${
            path === `/user/${user?.username}` ? "bg-[#2A2A2A]" : ""
          }`}
        >
          <img
            src={avatars[user?.pfpId - 1] || null}
            alt=""
            className="h-6 w-6 rounded-full bg-black"
          />
          <span className={`text-xs mt-1 ${path === `/user/${user?.username}` ? "text-white" : "text-white/65"}`}>Profile</span>
        </Link>
      </div>
    </div>
  );

  

  return (
    <>
      <DesktopNav />
      <MobileNav />
      {/* <ContestNavbar /> */}
    </>
  );
}