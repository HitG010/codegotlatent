import { useState } from "react";
import api from "../api/axios";
import useUserStore from "../store/userStore";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const setUser = useUserStore((state) => state.setUser);
  const clearUser = useUserStore((state) => state.clearUser);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/signup", {
        username,
        email,
        password,
      });
      const { accessToken, user } = response.data;
      setUser(user, accessToken);
      navigate("/");
    } catch (error) {
      console.error("Registration error:", error.response.data.message);
      clearUser();
    }
  };

  return (
    <div className="p-4">
      <h2>Signup</h2>
      <input
        className="block border p-2 my-2"
        placeholder="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        className="block border p-2 my-2"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="block border p-2 my-2"
        placeholder="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={handleRegister}>
        Sign Up
      </button>
    </div>
  );
}