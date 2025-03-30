import React from 'react'
import { Link } from 'react-router-dom'

const Home = () => {
  return (
    <div>
      Welcome to Code got Latent!
      <Link to="/problemSet" style={{ textDecoration: 'none', color: 'blue' }}>
        <h2>Problem Set</h2>
        </Link>
    </div>
  )
}

export default Home
