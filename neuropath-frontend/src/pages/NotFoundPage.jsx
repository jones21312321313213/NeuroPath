import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/NotFound.css";

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="notfound-container">
      <div className="notfound-card">
        <div className="notfound-badge">404</div>
        <h1 className="notfound-title">Page Not Found</h1>
        <p className="notfound-message">
          The page you are looking for does not exist, has been removed, or is temporarily unavailable.
        </p>
        <div className="notfound-actions">
          <button
            className="notfound-btn notfound-btn-primary"
            onClick={() => navigate(user ? "/dashboard" : "/login")}
          >
            {user ? "Go to Dashboard" : "Go to Login"}
          </button>
          <button
            className="notfound-btn notfound-btn-secondary"
            onClick={() => navigate("/")}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
