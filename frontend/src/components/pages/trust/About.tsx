

const About = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl w-full bg-white shadow-md rounded-lg p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">About Us</h1>

                <div className="prose prose-indigo text-gray-500">
                    <p className="mb-4">
                        Welcome to Solana Payments. We are dedicated to revolutionizing the way payments are processed on the Solana blockchain.
                        Our mission is to provide seamless, secure, and fast payment solutions for developers and businesses worldwide.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Our Mission</h2>
                    <p className="mb-4">
                        We believe in the power of decentralized finance to democratize access to global markets.
                        By leveraging Solana's high-speed and low-cost infrastructure, we aim to bridge the gap between traditional finance and the crypto ecosystem.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Why Choose Us?</h2>
                    <ul className="list-disc pl-5 mb-4 space-y-2">
                        <li>Enterprise-grade security and reliability.</li>
                        <li>Easy-to-integrate APIs and SDKs.</li>
                        <li>Real-time settlement and transparency.</li>
                        <li>Dedicated support for your growth.</li>
                    </ul>

                    <p className="mt-6">
                        Thank you for being a part of our journey. We look forward to building the future of payments together.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default About;
