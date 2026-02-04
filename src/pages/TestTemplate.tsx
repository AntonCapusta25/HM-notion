import React from 'react';
import { AmsterdamStory } from '@/components/LaunchPosts/templates/AmsterdamStory';

const TestTemplate = () => {
    // Dummy Data simulating what the AI would generate/user would input
    const demoData = {
        images: {
            top: "https://images.unsplash.com/photo-1556910103-1c02745a30bf?w=1080&h=960&fit=crop",
            bottom: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1080&h=960&fit=crop"
        },
        titles: {
            main: "AMSTERDAM DINNER",
            subtitle: "Ideas and Prices",
            badge: "HOMEMADE"
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-8">
            <h1 className="text-2xl font-bold mb-8 text-gray-800">Template Test: Amsterdam Story</h1>

            <div className="flex flex-wrap gap-12 justify-center items-center">
                {/* Mobile View Container */}
                <div className="w-[375px] h-[667px] bg-white shadow-2xl rounded-[3rem] overflow-hidden border-8 border-gray-900 relative">
                    {/* Notch simulation */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-xl z-50"></div>

                    {/* The Template Component */}
                    <div className="w-full h-full">
                        <AmsterdamStory
                            images={demoData.images}
                            titles={demoData.titles}
                            className="h-full w-full"
                        />
                    </div>
                </div>

                {/* Controls / Info */}
                <div className="max-w-md space-y-4">
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <h2 className="font-semibold mb-2">Structure</h2>
                        <ul className="list-disc pl-5 text-sm space-y-1 text-gray-600">
                            <li>Pure HTML/CSS (Tailwind)</li>
                            <li>No Canvas Rendering</li>
                            <li>Responsive Grid/Flex Layout</li>
                            <li>Standard Google Fonts (Playfair Display)</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestTemplate;
