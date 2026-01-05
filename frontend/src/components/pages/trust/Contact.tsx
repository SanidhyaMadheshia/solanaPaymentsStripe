

const Contact = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl w-full bg-white shadow-md rounded-lg p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Contact Us</h1>

                <p className="text-gray-600 mb-8">
                    Have questions, feedback, or need assistance? We're here to help!
                    Reach out to our team using the contact details below, and we'll get back to you as soon as possible.
                </p>

                <div className="space-y-6">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div className="ml-3 text-base text-gray-700">
                            <p className="font-medium text-gray-900">Email Support</p>
                            <p className="mt-1">sandydummy69@gmail.com</p>
                        </div>
                    </div>

                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div className="ml-3 text-base text-gray-700">
                            <p className="font-medium text-gray-900">Headquarters</p>
                            <p className="mt-1">
                                Sanidhya Madeshia<br />
                                Sector Q ,Lucknow ,UP ,India
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-10 border-t border-gray-200 pt-6">
                    <p className="text-sm text-gray-500">
                        For urgent inquiries, please include "Urgent" in your email subject line.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Contact;
