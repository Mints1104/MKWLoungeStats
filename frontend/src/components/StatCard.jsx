function StatCard({ label, value, className = "" }) {
    return (
        <div className={`recent-stat ${className}`}>
            <span className="recent-stat-label">{label}</span>
            <span className="recent-stat-value">{value}</span>
        </div>
    );
}

export default StatCard;
