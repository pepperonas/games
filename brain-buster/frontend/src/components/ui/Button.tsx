import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface ButtonProps {
    children: ReactNode
    onClick?: () => void
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline'
    size?: 'sm' | 'md' | 'lg'
    fullWidth?: boolean
    className?: string
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
}

const Button = ({
                    children,
                    onClick,
                    variant = 'primary',
                    size = 'md',
                    fullWidth = false,
                    className = '',
                    disabled = false,
                    type = 'button',
                }: ButtonProps) => {
    const baseClasses = 'rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2'

    // Angepasst an das Screenshot-Farbschema
    const variantClasses = {
        primary: 'bg-accent-blue hover:bg-accent-blue/80 focus:ring-accent-blue/40 text-white',
        secondary: 'bg-accent-green hover:bg-accent-green/80 focus:ring-accent-green/40 text-white',
        success: 'bg-green-500 hover:bg-green-600 focus:ring-green-400 text-white',
        danger: 'bg-accent-red hover:bg-accent-red/80 focus:ring-accent-red/40 text-white',
        outline: 'bg-transparent border border-accent-blue text-accent-blue hover:bg-accent-blue/10 focus:ring-accent-blue/30',
    }

    const sizeClasses = {
        sm: 'text-xs py-1.5 px-3',
        md: 'text-sm py-2 px-4',
        lg: 'text-base py-3 px-6',
    }

    const disabledClasses = disabled
        ? 'opacity-50 cursor-not-allowed'
        : 'cursor-pointer'

    const widthClass = fullWidth ? 'w-full' : ''

    return (
        <motion.button
            type={type}
            onClick={onClick}
            disabled={disabled}
            whileTap={{ scale: disabled ? 1 : 0.97 }}
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${disabledClasses} ${className}`}
        >
            {children}
        </motion.button>
    )
}

export default Button