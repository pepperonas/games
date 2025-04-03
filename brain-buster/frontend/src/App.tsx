import {Route, Routes} from 'react-router-dom';
import Layout from './components/ui/Layout';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import './App.css';

function App() {
    return (
        <Layout>
            <Routes>
                <Route path="/" element={<HomePage/>}/>
                <Route path="/game" element={<GamePage/>}/>
                <Route path="/stats" element={<StatsPage/>}/>
                <Route path="/settings" element={<SettingsPage/>}/>
                <Route path="*" element={<NotFoundPage/>}/>
            </Routes>
        </Layout>
    );
}

export default App;