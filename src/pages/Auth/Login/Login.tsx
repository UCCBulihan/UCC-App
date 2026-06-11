import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../../../firebase/firebase";
import "./login.css";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Email/Password Login
  const handleLogin = async () => {
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/home");
    } catch (err: any) {
      setError("Mali ang email o password. Subukan ulit.");
    }
  };

  // Google Login
  const handleGoogleLogin = async () => {
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate("/home");
    } catch (err: any) {
      setError("Hindi makapag-login sa Google. Subukan ulit.");
    }
  };

  return (
    <div className="wrap">
      <div className="card">
        <h1>Login</h1>

        {error && <p style={{ color: "red", fontSize: "0.85rem" }}>{error}</p>}

        <div className="field">
          <label htmlFor="username">Email</label>
          <div className="input-wrap">
            <i className="fa-regular fa-user" aria-hidden="true" />
            <input
              type="email"
              id="username"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="pwd">Password</label>
          <div className="input-wrap">
            <i className="fa-solid fa-lock" aria-hidden="true" />
            <input
              type="password"
              id="pwd"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <a href="#" className="forgot">
            <i className="fa-regular fa-circle-question" aria-hidden="true" /> Forgot password?
          </a>
        </div>

        <button className="btn-primary" onClick={handleLogin}>
          <i className="fa-solid fa-arrow-right-to-bracket" aria-hidden="true" />
          Login
        </button>

        <div className="divider"><span>or</span></div>

        <button className="btn-google" onClick={handleGoogleLogin}>
          <i className="fa-brands fa-google" />
          Sign in with Google
        </button>

        <p className="footer">
          New user?{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); navigate("/signup"); }}>
            <i className="fa-regular fa-user" aria-hidden="true" /> Create account here
          </a>
        </p>
      </div>
    </div>
  );
}