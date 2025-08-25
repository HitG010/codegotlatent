import React from "react";
import { Navigate } from "react-router-dom";
import useUserStore from "../store/userStore";
import PropTypes from "prop-types";

export default function AuthRoute({ children }) {
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  // console.log("isAuthenticated:", isAuthenticated);

  return isAuthenticated ? children : (window.location.href = "/login");
}

AuthRoute.propTypes = {
  children: PropTypes.node.isRequired,
};
