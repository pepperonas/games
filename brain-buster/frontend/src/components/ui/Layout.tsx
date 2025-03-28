import {Outlet} from 'react-router-dom'
import {motion} from 'framer-motion'
import Navbar from './Navbar'
import Footer from './Footer'

const Layout = () => {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar/>

            <main className="flex-grow container mx-auto px-4 py-8">
                <motion.div
                    initial={{opacity: 0, y: 20}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0, y: -20}}
                    transition={{duration: 0.3}}
                >
                    <Outlet/>
                </motion.div>
            </main>

            <Footer/>
        </div>
    )
}

export default Layout
