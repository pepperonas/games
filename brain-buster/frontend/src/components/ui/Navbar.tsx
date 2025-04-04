import {useState} from 'react'
import {Link, useLocation} from 'react-router-dom'
import {motion} from 'framer-motion'

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const location = useLocation()

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen)

    const navItems = [
        {path: '/', label: 'Home'},
        {path: '/game', label: 'Einzelspieler'},
        {path: '/multiplayer', label: 'Multiplayer'},
        {path: '/stats', label: 'Statistiken'},
        {path: '/settings', label: 'Einstellungen'},
    ]

    return (
        <nav className="bg-background-darker shadow-lg py-4">
            <div className="container mx-auto px-4 flex justify-between items-center">
                <Link to="/" className="flex items-center space-x-2">
                    <motion.div
                        whileHover={{rotate: 10}}
                        className="text-2xl font-bold text-white"
                    >
                        🧠
                    </motion.div>
                    <span className="text-xl font-bold text-secondary-300">
                        BrainBuster
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex space-x-6">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`relative px-2 py-1 ${
                                location.pathname === item.path
                                    ? 'text-accent-blue'
                                    : 'text-gray-300 hover:text-white'
                            }`}
                        >
                            {location.pathname === item.path && (
                                <motion.div
                                    layoutId="navbar-indicator"
                                    className="absolute inset-0 bg-secondary-700/30 rounded-md -z-10"
                                    initial={false}
                                    transition={{type: 'spring', duration: 0.5}}
                                />
                            )}
                            {item.label}
                        </Link>
                    ))}
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden text-white"
                    onClick={toggleMenu}
                    aria-label="Menü öffnen"
                >
                    <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        {isMenuOpen ? (
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        ) : (
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6h16M4 12h16M4 18h16"
                            />
                        )}
                    </svg>
                </button>
            </div>

            {/* Mobile Navigation */}
            {isMenuOpen && (
                <motion.div
                    initial={{opacity: 0, height: 0}}
                    animate={{opacity: 1, height: 'auto'}}
                    exit={{opacity: 0, height: 0}}
                    transition={{duration: 0.3}}
                    className="md:hidden bg-background-darker"
                >
                    <div className="container mx-auto px-4 py-2 flex flex-col space-y-2">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`px-4 py-2 rounded-md ${
                                    location.pathname === item.path
                                        ? 'bg-secondary-700 text-white'
                                        : 'text-gray-300 hover:bg-secondary-700/30'
                                }`}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </motion.div>
            )}
        </nav>
    )
}

export default Navbar