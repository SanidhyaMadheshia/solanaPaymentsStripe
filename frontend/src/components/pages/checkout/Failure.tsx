export default function Failure() {
    return (    
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-8 rounded shadow-md text-center">
                <h1 className="text-3xl font-bold mb-4 text-red-600">Payment Failed</h1>
                <p className="mb-6 text-gray-700">Unfortunately, your payment could not be processed. Please try again or contact support if the issue persists.</p>
                <a href="/" className="inline-block bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition">Return to Home</a>
            </div>
        </div>
    );
}