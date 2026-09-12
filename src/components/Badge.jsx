const Badge = ({ children, type = 'dim' }) => (
  <span className={`badge b-${type}`}>{children}</span>
);

export default Badge;
