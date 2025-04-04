import {CSSProperties, ReactNode} from 'react';
import {motion} from 'framer-motion';

export interface CardProps {
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
}

const Card = ({children, className = '', style}: CardProps) => {
    const defaultStyle: CSSProperties = {
        backgroundColor: '#2C2E3B',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        ...style
    };

    return (
        <motion.div
            className={`rounded-xl border border-white/10 shadow-xl backdrop-blur-sm p-6 ${className}`}
            initial={{opacity: 0, y: 10}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.3}}
            style={defaultStyle}
        >
            {children}
        </motion.div>
    );
};

export default Card;