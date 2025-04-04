const Footer = () => {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="bg-background-darker text-white/60 py-4 text-center text-sm">
            <div className="container mx-auto px-4">
                <p>
                    &copy; {currentYear} BrainBuster Quiz App | Made with ❤️ by Martin Pfeffer
                </p>
            </div>
        </footer>
    )
}

export default Footer