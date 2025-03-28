import {Link} from 'react-router-dom'
import {motion} from 'framer-motion'
import Button from '../components/ui/Button'

const NotFoundPage = () => {
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

            <p className="text-lg text-gray-300 mb-8 max-w-md">
                Die gesuchte Seite existiert nicht oder wurde verschoben.
            </p>

            <Link to="/">
                <Button size="lg" variant="primary">
                    Zurück zur Startseite
                </Button>
            </Link>
        </div>
    )
}

export default NotFoundPage