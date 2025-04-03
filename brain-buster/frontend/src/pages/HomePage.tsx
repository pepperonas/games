import {Link} from 'react-router-dom';
import {motion} from 'framer-motion';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const HomePage = () => {
    return (
        <div className="max-w-3xl mx-auto text-center">
            <motion.h1
                initial={{opacity: 0, y: -20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.5}}
                className="text-4xl font-extrabold mb-6"
            >
                BrainBuster Quiz
            </motion.h1>

            <motion.p
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                transition={{duration: 0.5, delay: 0.2}}
                className="text-xl mb-10"
            >
                Teste dein Wissen und fordere deine Freunde heraus!
            </motion.p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                    initial={{opacity: 0, x: -20}}
                    animate={{opacity: 1, x: 0}}
                    transition={{duration: 0.5, delay: 0.4}}
                >
                    <Card className="flex flex-col h-full items-center justify-center p-8">
                        <h2 className="text-2xl font-bold mb-4">Einzelspieler</h2>
                        <p className="mb-6">Spiele alleine und verbessere deine Bestleistung</p>
                        <Link to="/game">
                            <Button size="lg">Starten</Button>
                        </Link>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{opacity: 0, x: 20}}
                    animate={{opacity: 1, x: 0}}
                    transition={{duration: 0.5, delay: 0.4}}
                >
                    <Card className="flex flex-col h-full items-center justify-center p-8">
                        <h2 className="text-2xl font-bold mb-4">Multiplayer</h2>
                        <p className="mb-6">Fordere deine Freunde zu einem Quiz-Duell heraus</p>
                        <Link to="/multiplayer">
                            <Button size="lg" variant="primary">Starten</Button>
                        </Link>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
};

export default HomePage;