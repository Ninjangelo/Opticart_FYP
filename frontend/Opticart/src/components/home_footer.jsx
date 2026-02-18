import { Link } from "react-router-dom";

function HomeFooter() {

    function scrollReset() {
        window.scrollTo({
            top: 0,
            behavior: "auto"
        });
    };

    return (
        <footer className="flex flex-col bg-temporary-turqoise text-white py-12">
            <div className="font-montserrat text-4xl pb-7 border-white border-b-2 mx-22" onClick={scrollReset}>
                <Link to="/" className="flex flex-col items-center justify-center space-y-4">
                    <img className="w-18" src="/temporary_logo.svg" alt="opticart_logo"/>
                    <h1>Opticart</h1>
                </Link>
            </div>
            <h2 className="flex justify-center pt-7 pb">© 2025 Angelo Luis Lagdameo, All Rights Reserved</h2>
        </footer>
    );
}

export default HomeFooter