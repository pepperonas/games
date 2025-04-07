import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('dartTheme');
        if (savedTheme === 'light') {
            setDarkMode(false);
            document.documentElement.classList.remove('dark-theme');
        } else {
            setDarkMode(true);
            document.documentElement.classList.add('dark-theme');
            if (!savedTheme) {
                localStorage.setItem('dartTheme', 'dark');
            }
        }
    }, []);

    const toggleDarkMode = () => {
        setDarkMode(prevMode => {
            const newMode = !prevMode;
            if (newMode) {
                document.documentElement.classList.add('dark-theme');
                localStorage.setItem('dartTheme', 'dark');
            } else {
                document.documentElement.classList.remove('dark-theme');
                localStorage.setItem('dartTheme', 'light');
            }
            return newMode;
        });
    };

    return (
        <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export default ThemeContext;