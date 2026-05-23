export default function Topbar({ breadcrumb }) {
  return (
    <header className="topbar">
      <span className="topbar-breadcrumb">{breadcrumb}</span>
      <div className="topbar-user">
        <div className="avatar-circle small" />
        <span className="topbar-username">Teacher Name</span>
      </div>
    </header>
  )
}
