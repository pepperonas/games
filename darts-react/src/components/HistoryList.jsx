import React from 'react';

const HistoryList = ({history}) => {
    // Show at most 20 entries, newest first
    const recentHistory = [...history].reverse().slice(0, 20);

    return (
        <div className="history-container">
            <div id="history-container">
                {recentHistory.map((entry, index) => {
                    const time = new Date(entry.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    return (
                        <div className="history-entry" key={index}>
                            {time} - {entry.text}
                        </div>
                    );
                })}

                {history.length === 0 && (
                    <div className="history-entry">Noch keine Würfe eingegeben.</div>
                )}
            </div>
        </div>
    );
};

export default HistoryList;