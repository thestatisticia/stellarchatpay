import { Link } from "react-router-dom";

export function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <div className="app-footer-status">
          <span className="app-footer-status-dot" aria-hidden />
          <span>Stellar network: operational</span>
        </div>

        <p className="app-footer-built">Built on Stellar</p>

        <nav className="app-footer-nav" aria-label="Footer">
          <Link to="/security">How keys work</Link>
          <Link to="/settings?feedback=1">Feedback</Link>
          <a
            href="https://github.com/thestatisticia/stellarchatpay"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/risk">Risk disclosure</Link>
        </nav>
      </div>
    </footer>
  );
}
