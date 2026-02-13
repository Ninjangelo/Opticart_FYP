import { Link } from "react-router-dom";

function HomeNavbar() {

    return (
        <nav className="grid grid-cols-8 items-center bg-temporary-turqoise px-8 py-4 text-white">
            <Link to="/" className="flex flex-row items-center space-x-5 font-montserrat text-2xl">
                <img className="w-12" src="/temporary_logo.svg" alt="opticart_logo"/>
                <h1>Opticart</h1>
            </Link>
            <div className="flex flex-row col-start-9 text-right items-center space-x-14">
                <Link to="#about">About</Link>
                <Link to="https://github.com/Ninjangelo/Opticart_FYP" target="_blank"><img className="w-10" src="/github.svg" alt="github_link"/></Link>
            </div>
        </nav>
    );
}

export default HomeNavbar