const Divider = ({ dark, m }) => (
  <div className={dark ? 'div-dark' : 'div-light'} style={{ margin: m || 0 }} />
);

export default Divider;
