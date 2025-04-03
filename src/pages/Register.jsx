import React, { useState, useContext, useEffect } from 'react'
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { handleGoogleSignUp } from '../api/firebase'
import { UserContext } from '../providers/userProvider'
import { Navigate } from 'react-router-dom'

const Register = () => {
    const user = useContext(UserContext);
    const [redirectUrl, setRedirectUrl] = useState(false);

    useEffect(() => {
        if (user) {
          setRedirectUrl('/setusername');
        }
      }, [user])
      if (redirectUrl) {
        return <Navigate to={redirectUrl} />;
        // window.location.href = redirectUrl;
      }

  return (
    <div>
      <p>Register With Google</p>
        <button onClick={handleGoogleSignUp} 
        className='px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600'
        >Sign Up/ Log In With Google</button>
    </div>
  )
}

export default Register
