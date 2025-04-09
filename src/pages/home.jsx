import React, {useEffect} from 'react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import axios from 'axios'
import useUserStore from '../store/userStore'
import api from '../api/axios'
import {logout} from '../utils/logout'

const Home = () => {
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.accessToken);
  console.log(user, "User in Home");
  console.log(token, "Access Token in Home");
  // alert("Home Page");
  return (
    <div>
      <h1>Welcome to Code got Latent!</h1>
      <Link to="/problemSet" style={{ textDecoration: 'none', color: 'blue' }}>
        <h2>Problem Set</h2>
      </Link>
      <Link to="/contests" style={{ textDecoration: 'none', color: 'blue' }}>
        <h2>Contests</h2>
      </Link>
      <h1>Welcome {user?.email}</h1>
      <h1>Welcome {user?.id}</h1>
      <button
        onClick={() => {
          logout();
        }}
        className="px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        Log Out
      </button>
    </div>
  );
}

export default Home;
