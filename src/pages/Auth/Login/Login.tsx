import { useNavigate } from "react-router-dom";
import "./login.css";

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate("/home");
  };

  return (
    <div className="wrap">
      <div className="card">
        <h1>Login</h1>

        <div className="field">
          <label htmlFor="username">Username</label>
          <div className="input-wrap">
            <i className="fa-regular fa-user" aria-hidden="true" />
            <input
              type="text"
              id="username"
              placeholder="Enter your username"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="pwd">Password</label>
          <div className="input-wrap">
            <i className="fa-solid fa-lock" aria-hidden="true" />
            <input type="password" id="pwd" />
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

        <button className="btn-google" onClick={handleLogin}>
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