import {Link} from 'react-router-dom';
import {motion} from 'framer-motion';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const HomePage = () => {
    return (
        <div className="min-h-[calc(100vh-130px)] flex flex-col items-center justify-center">
            <div className="w-full max-w-3xl mx-auto px-4">
                <motion.div
                    initial={{opacity: 0, y: -20}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.6}}
                    className="text-center mb-8"
                >
                    <motion.h1
                        initial={{scale: 0.9, opacity: 0}}
                        animate={{scale: 1, opacity: 1}}
                        transition={{duration: 0.7, delay: 0.1}}
                        className="text-5xl font-extrabold mb-4 text-white"
                    >
                        BrainBuster Quiz
                    </motion.h1>

                    <motion.p
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        transition={{duration: 0.5, delay: 0.3}}
                        className="text-xl text-gray-300 mb-6"
                    >
                        Teste dein Wissen und fordere deine Freunde heraus!
                    </motion.p>
                </motion.div>

                <div className="relative">
                    {/* Decorative background gradient for cards */}
                    <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/10 to-accent-blue/5 rounded-2xl -z-10 blur-xl"></div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        <motion.div
                            initial={{opacity: 0, x: -20}}
                            animate={{opacity: 1, x: 0}}
                            transition={{duration: 0.5, delay: 0.4}}
                            className="card-hover"
                        >
                            <Card className="flex flex-col items-center justify-center p-5 shadow-lg border-white/10 hover:border-accent-blue/30 transition-all">
                                <div className="w-12 h-12 flex items-center justify-center mb-3 bg-accent-blue/10 rounded-full">
                                    <span className="text-xl">🎮</span>
                                </div>
                                <h2 className="text-xl font-bold mb-2 text-white">Einzelspieler</h2>
                                <p className="mb-4 text-gray-300">Spiele alleine und verbessere deine Bestleistung</p>
                                <Link to="/game">
                                    <Button size="md">Starten</Button>
                                </Link>
                            </Card>
                        </motion.div>

                        <motion.div
                            initial={{opacity: 0, x: 20}}
                            animate={{opacity: 1, x: 0}}
                            transition={{duration: 0.5, delay: 0.5}}
                            className="card-hover"
                        >
                            <Card className="flex flex-col items-center justify-center p-5 shadow-lg border-white/10 hover:border-accent-blue/30 transition-all">
                                <div className="w-12 h-12 flex items-center justify-center mb-3 bg-accent-blue/10 rounded-full">
                                    <span className="text-xl">🏆</span>
                                </div>
                                <h2 className="text-xl font-bold mb-2 text-white">Multiplayer</h2>
                                <p className="mb-4 text-gray-300">Fordere deine Freunde zu einem Quiz-Duell heraus</p>
                                <Link to="/multiplayer">
                                    <Button size="md" variant="primary">Starten</Button>
                                </Link>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;