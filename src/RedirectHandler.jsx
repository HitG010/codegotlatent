import { useParams } from "react-router-dom";
import { useEffect } from "react";
import Redirects from "./redirects";

export default function RedirectHandler() {
  const { path } = useParams();

  useEffect(() => {
    const url = Redirects[path];
    console.log(`Redirecting from ${path} to ${url}`);
    if (url) {
      window.location.href = url; // Redirect
    } else {
      // Optional: redirect to 404 or show error
      window.location.href = "/404-page";
    }
  }, [path]);

  return null;
}
