import { useNavigate } from "react-router-dom";
import "./sign-up.css";

export default function Signup() {
  const navigate = useNavigate();

  const handleSignup = () => {
    navigate("/");
  };

  return (
    <div className="wrap">
      <div className="card">
        <h1>Create account</h1>

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

        <div className="row-fields">
          <div className="field">
            <label htmlFor="firstname">First name</label>
            <div className="input-wrap">
              <i className="fa-regular fa-id-card" aria-hidden="true" />
              <input
                type="text"
                id="firstname"
                placeholder="First name"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="lastname">Last name</label>
            <div className="input-wrap">
              <i className="fa-regular fa-id-card" aria-hidden="true" />
              <input
                type="text"
                id="lastname"
                placeholder="Last name"
              />
            </div>
          </div>
        </div>

        <div className="field">
          <label htmlFor="middlename">
            Middle name <span className="optional">(optional)</span>
          </label>
          <div className="input-wrap">
            <i className="fa-regular fa-id-card" aria-hidden="true" />
            <input
              type="text"
              id="middlename"
              placeholder="Enter your middle name"
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
              placeholder="Create a password"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="confirmpwd">Confirm password</label>
          <div className="input-wrap">
            <i className="fa-solid fa-lock" aria-hidden="true" />
            <input
              type="password"
              id="confirmpwd"
              placeholder="Re-enter your password"
            />
          </div>
        </div>

        <button className="btn-primary" onClick={handleSignup}>
          <i className="fa-solid fa-user-plus" aria-hidden="true" />
          Create account
        </button>

        <div className="divider"><span>or</span></div>

        <button className="btn-google" onClick={handleSignup}>
          <i className="fa-brands fa-google" />
          Sign in with Google
        </button>

        <p className="footer">
          Already have an account?{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); navigate("/"); }}>
            <i className="fa-solid fa-arrow-right-to-bracket" aria-hidden="true" /> Login here
          </a>
        </p>
      </div>
    </div>
  );
}