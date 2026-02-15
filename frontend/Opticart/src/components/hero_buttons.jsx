import { Link } from "react-router-dom";

function HeroButtons() {

    return (
        <div className="grid grid-cols-2 items-center gap-x-25 text-white">
            <Link to="#chat" className="flex flex-row bg-temporary-turqoise p-5 items-center space-x-5 font-montserrat rounded-2xl">
                <img className="w-8" src="/robot.svg" alt="robot_icon"/>
                <div>Try it out!</div>
            </Link>
            <Link to="#unknown" className="bg-temporary-turqoise p-6 items-center font-montserrat rounded-2xl">Contact Us</Link>
        </div>
    );
}

export default HeroButtons