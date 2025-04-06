import React, { useState } from 'react'
import api from '../api/axios'
import useUserStore from '../store/userStore'
import { Navigate } from 'react-router-dom'

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const setUser = useUserStore((state) => state.setUser);
  const clearUser = useUserStore((state) => state.clearUser);

  const handleLogin = async () => {
    try {
      const response = await api.post('/login', { email, password });
      const { accessToken, user } = response.data;
      setUser(user, accessToken);
      console.log('Login successful:', user);
      console.log('Access Token:', accessToken);
      // alert('Login successful!');
      // Redirect to home or any other page after successful login
      window.location.href = '/home';
    } catch (error) {
      console.error('Login error:', error);
      clearUser();
    }
  };

  return (
    <div>
      <p> Login Form</p>
          <div>
          <label htmlFor="username">Email</label>
          <input type="text" id="username" name="username" className='border border-1' value={email} onChange={(e) => {
            setEmail(e.target.value)
          }}/>
          </div>
          <div>
          <label htmlFor="password">Password</label>
          <input type="password" id="password" name="password" className='border border-1' value={password} onChange={(e) => {
            setPassword(e.target.value)
          }}/>
          </div>
          <button type="submit" onClick={handleLogin}>Login</button>
    </div>
  )
}

export default Login
