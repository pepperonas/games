import {ReactNode} from 'react'
import {motion} from 'framer-motion'

interface CardProps {
    children: ReactNode
    className?: string
    onClick?: () => void
    interactive?: boolean
}

const Card = ({children, className = '', onClick, interactive = false}: CardProps) => {
    // Angepasst an das dunkle Farbschema des Screenshots
    const baseClasses = 'bg-background-card backdrop-blur-sm rounded-xl p-6 shadow-lg border border-secondary-700/20'
    const interactiveClasses = interactive ? 'cursor-pointer card-hover' : ''

    return (
        <motion.div
            className={`${baseClasses} ${interactiveClasses} ${className}`}
            onClick={onClick}
            whileHover={interactive ? {scale: 1.02} : {}}
            whileTap={interactive ? {scale: 0.98} : {}}
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.3}}
        >
            {children}
        </motion.div>
    )
}

export default Card