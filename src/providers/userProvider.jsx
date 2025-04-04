import { firebaseApp } from "../api/firebase";
import { createContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export const UserContext = createContext({user: null})
export default (props) => {
    const auth = getAuth(firebaseApp);
    const [user, setuser] = useState(()=> {
      const storedUser = localStorage.getItem("user");
      console.log("Stored user:", storedUser);
      return storedUser ? JSON.parse(storedUser) : null;
    });
    
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if(user){
            const { displayName, email, photoURL, accessToken }  = user;
            setuser({
                displayName,
                email,
                photoURL,
                uuid: null,
                accessToken,
                username: null
            })
          }
          else{
            setuser(null);
          }
        })
        return () => unsubscribe();
    },[]);

  return (
    <UserContext.Provider value={user}>{props.children}</UserContext.Provider>
  )
}