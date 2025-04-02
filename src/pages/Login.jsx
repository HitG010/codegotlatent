import React from 'react'

const Login = () => {
  return (
    <div>
      <p> Login Form</p>
        <form>
            <div>
            <label htmlFor="username">Username</label>
            <input type="text" id="username" name="username" className='border border-1'/>
            </div>
            <div>
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" className='border border-1'/>
            </div>
            <button type="submit">Login</button>
        </form>
    </div>
  )
}

export default Login
