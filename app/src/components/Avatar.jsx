const initials = (user) => `${user.firstname?.[0] ?? ""}${user.lastname?.[0] ?? ""}`.toUpperCase();

const Avatar = ({ user, className = "h-8 w-8" }) =>
  user.photo ? (
    <img src={user.photo} alt="" aria-hidden="true" className={`${className} shrink-0 rounded-full object-cover`} />
  ) : (
    <span aria-hidden="true" className={`${className} bg-blue-france-925 text-blue-france flex shrink-0 items-center justify-center rounded-full text-xs font-semibold`}>
      {initials(user)}
    </span>
  );

export default Avatar;
