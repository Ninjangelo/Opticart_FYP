import { Link } from "react-router-dom";

function HeroButtons() {

    return (
        <div className="items-center text-white">
            <Link to="/chat" className="flex flex-row bg-temporary-turqoise p-5 items-center space-x-4 font-montserrat rounded-2xl">
                <img className="w-10" src="/robot.svg" alt="robot_icon"/>
                <div>Try out now!</div>
            </Link>
            {/*<Link to="#contactUs" className="bg-temporary-turqoise p-6 items-center font-montserrat rounded-2xl">Contact Us</Link>*/}
        </div>
    );
}

export default HeroButtons