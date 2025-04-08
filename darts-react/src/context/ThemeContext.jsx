import React, {createContext, useContext, useEffect, useState} from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({children}) => {
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('dartTheme');
        if (savedTheme === 'dark') {
            setDarkMode(true);
            document.documentElement.classList.add('dark-theme');
        } else {
            setDarkMode(false);
            document.documentElement.classList.remove('dark-theme');
            // Speichere die Präferenz falls noch nicht gesetzt
            if (!savedTheme) {
                localStorage.setItem('dartTheme', 'light');
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
        <ThemeContext.Provider value={{darkMode, toggleDarkMode}}>
            {children}
        </ThemeContext.Provider>
    );
};

export default ThemeContext;