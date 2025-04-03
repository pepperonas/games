import {ReactNode} from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

interface LayoutProps {
    children: ReactNode;
}

const Layout = ({children}: LayoutProps) => {
    return (
        <div className="min-h-screen flex flex-col bg-gray-900 text-white">
            <Navbar/>
            <main className="flex-grow container mx-auto px-4 py-8">
                {children}
            </main>
            <Footer/>
        </div>
    );
};

export default Layout;