import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';

const ThemeToggle = () => {
    const { darkMode, toggleDarkMode } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const togglePage = () => {
        if (location.pathname === '/' || location.pathname === '/index.html') {
            navigate('/statistics');
        } else if (location.pathname === '/statistics' || location.pathname === '/statistics.html') {
            navigate('/');
        }
    };

    return (
        <div className="theme-toggle">
            <div className="toggle-group">
                <div className="theme-toggle-icon">
                    <svg
                        id="light-icon"
                        viewBox="0 0 24 24"
                        style={{ display: darkMode ? 'block' : 'none' }}
                    >
                        <path
                            fill="currentColor"
                            d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5s5-2.24 5-5s-2.24-5-5-5zm0 8c-1.65 0-3-1.35-3-3s1.35-3 3-3s3 1.35 3 3s-1.35 3-3 3zm1-13h-2v3h2V2zm0 17h-2v3h2v-3zm8-9h-3v2h3v-2zM6 12H3v2h3v-2zm12.88 5.88l-2.12-2.12l-1.41 1.41l2.12 2.12l1.41-1.41zM7.65 6.94L5.53 4.82L4.12 6.23l2.12 2.12l1.41-1.41zm.71 10.71l-2.12 2.12l1.41 1.41l2.12-2.12l-1.41-1.41zM16.36 7.65l2.12-2.12l-1.41-1.41l-2.12 2.12l1.41 1.41z"
                        />
                    </svg>
                    <svg
                        id="dark-icon"
                        viewBox="0 0 24 24"
                        style={{ display: darkMode ? 'none' : 'block' }}
                    >
                        <path
                            fill="currentColor"
                            d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9s9-4.03 9-9c0-.46-.04-.92-.1-1.36c-.98 1.37-2.58 2.26-4.4 2.26c-2.98 0-5.4-2.42-5.4-5.4c0-1.81.89-3.42 2.26-4.4c-.44-.06-.9-.1-1.36-.1z"
                        />
                    </svg>
                </div>
                <label className="switch">
                    <input
                        type="checkbox"
                        id="theme-toggle-checkbox"
                        checked={darkMode}
                        onChange={toggleDarkMode}
                    />
                    <span className="slider"></span>
                </label>
                <button id="page-toggle" className="page-toggle" onClick={togglePage}>
                    {location.pathname === '/' || location.pathname === '/index.html' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                            <rect x="3" y="13" width="4" height="8" fill="currentColor" opacity="0.7"/>
                            <rect x="9" y="9" width="4" height="12" fill="currentColor" opacity="0.9"/>
                            <rect x="15" y="5" width="4" height="16" fill="currentColor"/>
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ThemeToggle;