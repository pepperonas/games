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

    const variantClasses = {
        primary: 'bg-violet-600 hover:bg-violet-700 focus:ring-violet-500 text-white',
        secondary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white',
        success: 'bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white',
        danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white',
        outline: 'bg-transparent border border-violet-500 text-violet-500 hover:bg-violet-500/10 focus:ring-violet-500',
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