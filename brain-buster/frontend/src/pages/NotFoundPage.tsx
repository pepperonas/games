import {Link, useNavigate, useLocation} from 'react-router-dom'
import {motion} from 'framer-motion'
import {useEffect} from 'react'
import Button from '../components/ui/Button'

const NotFoundPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Check if this is a direct page load (refresh) that resulted in a 404
        const isDirectAccess = !window.performance
            .getEntriesByType('navigation')
            .some((nav: any) => nav.type === 'navigate');

        if (isDirectAccess) {
            console.log('Direct 404 access detected, redirecting to home...');
            // Short delay to allow the user to see the page before redirect
            const timer = setTimeout(() => {
                navigate('/', { replace: true });
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [navigate]);

    return (
        <div className="flex flex-col items-center justify-center text-center py-12">
            <motion.div
                initial={{scale: 0.8, opacity: 0}}
                animate={{scale: 1, opacity: 1}}
                transition={{duration: 0.5}}
                className="text-8xl mb-6"
            >
                🤔
            </motion.div>

            <h1 className="text-4xl font-bold mb-4">Seite nicht gefunden</h1>

            <p className="text-lg text-gray-300 mb-2 max-w-md">
                Die gesuchte Seite existiert nicht oder wurde verschoben.
            </p>

            {location.pathname !== '/' && (
                <p className="text-md text-accent-blue mb-8 max-w-md">
                    Sie werden in wenigen Sekunden zur Startseite weitergeleitet.
                </p>
            )}

            <Link to="/">
                <Button size="lg" variant="primary">
                    Zurück zur Startseite
                </Button>
            </Link>
        </div>
    )
}

export default NotFoundPage