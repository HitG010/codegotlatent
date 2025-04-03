import React from 'react'
import { Link } from 'react-router-dom'
import cgl from '../assets/cgl.png'

const Landing = () => {
  return (
    <div className='flex flex-col items-center gap-4'>
        <div className='text-2xl font-semibold'>This is the landing page</div>
        <div className='text-4xl font-bold'>Welcome to Code Got Latent!</div>
        {/* <Link to={"/login"}>Login</Link> */}
        <img src={cgl} alt='Code Got Latent' className='w-1/2 h-1/2' />
        <div className='px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600' > 
          <Link to={"/register"}>Get Started by Log In/ Sign Up</Link>
        </div>
    </div>
  )
}

export default Landing
