// import React from 'react';

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl w-full bg-white shadow-md rounded-lg p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
                <div className="text-sm text-gray-500 mb-6">Last Updated: January 1, 2025</div>

                <div className="prose prose-sm text-gray-600 space-y-4">
                    <p>
                        At Solana Payments, we value your privacy and are committed to protecting your personal information.
                        This Privacy Policy explains how we collect, use, and safeguard your data when you use our services.
                    </p>

                    <h3 className="text-lg font-semibold text-gray-800 mt-4">1. Information We Collect</h3>
                    <p>
                        We may collect personal information such as your name, email address, and wallet address when you register or use our platform.
                        We also collect usage data and transaction history to improve our services and ensure security.
                    </p>

                    <h3 className="text-lg font-semibold text-gray-800 mt-4">2. How We Use Your Information</h3>
                    <ul className="list-disc pl-5 mt-1">
                        <li>To provide and maintain our Service.</li>
                        <li>To notify you about changes to our Service.</li>
                        <li>To provide customer support.</li>
                        <li>To monitor the usage of our Service.</li>
                        <li>To detect, prevent and address technical issues.</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-800 mt-4">3. Data Security</h3>
                    <p>
                        The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure.
                        While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
                    </p>

                    <h3 className="text-lg font-semibold text-gray-800 mt-4">4. Third-Party Services</h3>
                    <p>
                        We may employ third party companies and individuals to facilitate our Service ("Service Providers"), to provide the Service on our behalf, or to assist us in analyzing how our Service is used.
                    </p>

                    <h3 className="text-lg font-semibold text-gray-800 mt-4">5. Contact Us</h3>
                    <p>
                        If you have any questions about this Privacy Policy, please contact us at sandydummy69@gmail.com.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
