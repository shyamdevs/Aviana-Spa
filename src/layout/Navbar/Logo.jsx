import { Link } from "react-router-dom";
import logo from "../../assets/images/logo-default.png";

const Logo = () => {
  return (
    <Link to="/" className="inline-flex shrink-0 py-1" aria-label="Aviana Spa Home">
      <img
        src={logo}
        alt="Aviana Spa"
        className="h-8 w-auto object-contain transition-transform duration-300 hover:scale-105 md:h-10"
      />
    </Link>
  );
};

export default Logo;
