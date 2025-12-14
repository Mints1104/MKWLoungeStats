/**
 * Reusable page header component
 * @param {string} title - Main heading text
 * @param {string} subtitle - Descriptive subheading text
 * @param {ReactNode} children - Optional additional content (e.g., back button)
 */
function PageHeader({ title, subtitle, children }) {
    return (
        <div className="page-header">
            {children}
            <h1 className="player-title">{title}</h1>
            <p className="player-subtitle">{subtitle}</p>
        </div>
    );
}

export default PageHeader;
