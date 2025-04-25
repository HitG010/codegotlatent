import React from "react";
import latentNavLogo from "../assets/latentNavLogo.png";

export default function Navbar() {
    return (
        <div className="flex justify-between items-center bg-[#1A1A1A] text-[#f1f3f5] px-4 py-2">
        {/* <div className="text-2xl font-bold">Code Got Latent</div> */}
        {/* <div className="text-2xl font-bold">Code Got Latent</div> */}
        <div className="flex gap-12 items-center">
        <img src={latentNavLogo} alt="Code Got Latent" className="w-11 h-11" />
            <a href="/home" className="hover:text-[#f1f3f550]">
            Home
            </a>
            <a href="/problemSet" className="hover:text-[#f1f3f550]">
            Problem Set
            </a>
            <a href="/contests" className="hover:text-[#f1f3f550]">
            Contests
            </a>
        </div>
            <a href="/profile" className="hover:text-[#f1f3f550]">
            Profile
            </a>
        </div>
    );
    }