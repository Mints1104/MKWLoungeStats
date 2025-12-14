import { Link, useLocation } from "react-router-dom";

function Navigation() {
    const location = useLocation();

    return (
        <nav className="navigation">
            <div className="nav-container">
                <Link to="/" className="nav-logo">
                    🏁 MK Lounge Stats
                </Link>
                <div className="nav-links">
                    <Link 
                        to="/" 
                        className={`nav-link ${location.pathname === "/" ? "nav-link-active" : ""}`}
                    >
                        Player Stats
                    </Link>
                    <Link 
                        to="/compare" 
                        className={`nav-link ${location.pathname === "/compare" ? "nav-link-active" : ""}`}
                    >
                        Compare
                    </Link>
                    <Link 
                        to="/leaderboard" 
                        className={`nav-link ${location.pathname === "/leaderboard" ? "nav-link-active" : ""}`}
                    >
                        Leaderboard
                    </Link>
                </div>
            </div>
        </nav>
    );
}

export default Navigation;
