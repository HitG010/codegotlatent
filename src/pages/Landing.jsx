import React from 'react'
import { Link } from 'react-router-dom'

const Landing = () => {
  return (
    <div className='flex flex-col justify-center items-center gap-4rem'>
        <div>This is the landing page mfs</div>
        <Link to={"/login"}>Login</Link>
        <Link to={"/register"}>Register</Link>
    </div>
  )
}

export default Landing
