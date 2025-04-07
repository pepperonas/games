import React, {useEffect, useRef} from 'react';

/**
 * Komponente zum Rendern verschiedener Diagramme für die Spielstatistiken
 *
 * @param {string} type - Der Diagrammtyp ('bar', 'pie', 'line')
 * @param {object} data - Die zu visualisierenden Daten
 * @param {object} options - Zusätzliche Konfigurationsoptionen für das Diagramm
 */
const StatsChart = ({type, data, options = {}}) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        if (chartRef.current && data) {
            // Wenn bereits ein Chart existiert, zerstöre ihn zuerst
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }

            // Standard-Optionen für alle Diagramme
            const defaultOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            font: {
                                size: 12
                            }
                        },
                        position: 'top'
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            };

            // Spezifische Optionen für verschiedene Diagrammtypen
            const typeSpecificOptions = {};

            if (type === 'pie' || type === 'doughnut') {
                // Entferne Achsen für Kreisdiagramme
                typeSpecificOptions.scales = {};
            }

            // Erstelle das neue Chart
            const ctx = chartRef.current.getContext('2d');
            chartInstance.current = new window.Chart(ctx, {
                type: type,
                data: data,
                options: {...defaultOptions, ...typeSpecificOptions, ...options}
            });
        }

        // Cleanup beim Unmount
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [type, data, options]);

    return <canvas ref={chartRef}/>;
};

export default StatsChart;