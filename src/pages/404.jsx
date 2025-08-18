import React from 'react'
import NotFoundImage from '../assets/404.png'
import cglbg from '../assets/cgl_bg.png'
import { Link } from 'react-router-dom'
import { FaArrowRightLong } from 'react-icons/fa6'

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-cover bg-center" style={{ backgroundImage: `url(${cglbg})` }}>
      {/* <h1>404 - Not Found</h1> */}
      <img src={NotFoundImage} alt="404 Not Found" className='w-1/2 md:w-1/3 lg:w-1/4' />
      <p>The page you are looking for does not exist.</p>
      <p>Either enter a valid URL or return back to the homepage.</p>
      <Link to="/home" className='flex gap-2 items-center text-sm text-black lg:text-base bg-white py-1.5 px-3 rounded mt-2 hover:bg-gray-200 transition-all duration-300'>
        Go to Homepage <FaArrowRightLong />
      </Link>
    </div>
  )
}

export default NotFound
