import { memo } from "react";

const StatCard = memo(function StatCard({ label, value, className = "", valueClassName = "" }) {
    return (
        <div className={`recent-stat ${className}`}>
            <span className="recent-stat-label">{label}</span>
            <span className={`recent-stat-value ${valueClassName}`}>{value}</span>
        </div>
    );
});

export default StatCard;
