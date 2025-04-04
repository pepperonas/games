import {ReactNode} from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

interface LayoutProps {
    children: ReactNode;
}

const Layout = ({children}: LayoutProps) => {
    return (
        <div className="min-h-screen flex flex-col">
            {/* Hintergrundfläche, die den gesamten Viewport füllt */}
            <div className="fixed inset-0 bg-gradient-to-b from-background-darker to-background-dark -z-10"></div>

            {/* Content-Container mit abgerundeten Ecken */}
            <div className="flex flex-col min-h-screen mx-4 my-4 bg-background-dark rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
                <Navbar />
                <main className="flex-grow px-4 py-6">
                    <div className="container mx-auto">
                        {children}
                    </div>
                </main>
                <Footer />
            </div>
        </div>
    );
};

export default Layout;