import "./login.css";

function Login() {

  const handleGoogleLogin = () => {
    console.log("Sign in with Google");
  };

  return (
    <div className="wrap">
      <div className="card">
        <h1>Login</h1>

        <div className="field">
          <label htmlFor="email">Email</label>
          <div className="input-wrap">
            <i className="fa-regular fa-envelope" aria-hidden="true" />
            <input type="email" id="email" placeholder="email@example.com" />
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

        <button className="btn-primary">
          <i className="fa-solid fa-arrow-right-to-bracket" aria-hidden="true" />
          Login
        </button>

        <div className="divider"><span>or</span></div>

        <button className="btn-google" onClick={handleGoogleLogin}>
          <i className="fa-brands fa-google" />
          Sign in with Google
        </button>

        <p className="footer">
          New user? <a href="#"><i className="fa-regular fa-user" aria-hidden="true" /> Create account here</a>
        </p>
      </div>
    </div>
  );
}


export default Login