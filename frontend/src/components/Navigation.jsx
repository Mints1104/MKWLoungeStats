import { Link, useLocation } from "react-router-dom";

function Navigation() {
    const location = useLocation();

    return (
        <nav className="navigation" aria-label="Main navigation">
            <div className="nav-container">
                <Link to="/" className="nav-logo" aria-label="MKW Lounge Stats - Home">
                    <span className="nav-logo-mark" aria-hidden="true"></span>
                    <span className="nav-logo-text">MKW Lounge Stats</span>
                </Link>
                <div className="nav-links" role="list">
                    <Link 
                        to="/" 
                        className={`nav-link ${location.pathname === "/" ? "nav-link-active" : ""}`}
                        aria-current={location.pathname === "/" ? "page" : undefined}
                    >
                        Player Stats
                    </Link>
                    <Link 
                        to="/compare" 
                        className={`nav-link ${location.pathname === "/compare" ? "nav-link-active" : ""}`}
                        aria-current={location.pathname === "/compare" ? "page" : undefined}
                    >
                        Compare
                    </Link>
                    <Link 
                        to="/leaderboard" 
                        className={`nav-link ${location.pathname === "/leaderboard" ? "nav-link-active" : ""}`}
                        aria-current={location.pathname === "/leaderboard" ? "page" : undefined}
                    >
                        Leaderboard
                    </Link>
                    <Link 
                        to="/stats" 
                        className={`nav-link ${location.pathname === "/stats" ? "nav-link-active" : ""}`}
                        aria-current={location.pathname === "/stats" ? "page" : undefined}
                    >
                        Stats
                    </Link>
                </div>
            </div>
        </nav>
    );
}

export default Navigation;
