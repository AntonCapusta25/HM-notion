// Education resources data with sample content
import { EducationItem, EducationContent } from '../types';

// HyperZot Content
const hyperzotContent: EducationContent = {
    title: 'Getting Started with HyperZot',
    subtitle: 'Everything you need to know about HyperZot platform',
    lastUpdated: '2024-12-04',
    sections: [
        {
            heading: 'What is HyperZot?',
            content: 'HyperZot is our comprehensive platform designed to streamline operations and enhance productivity. It provides a unified interface for managing various aspects of your workflow, from task management to team collaboration.'
        },
        {
            heading: 'Key Features',
            content: 'HyperZot offers a range of powerful features including real-time collaboration, automated workflows, advanced analytics, and seamless integrations with your favorite tools.',
            subsections: [
                {
                    heading: 'Real-time Collaboration',
                    content: 'Work together with your team in real-time. See updates as they happen and collaborate seamlessly across projects.'
                },
                {
                    heading: 'Automated Workflows',
                    content: 'Set up custom automation rules to reduce manual work and increase efficiency. Create triggers and actions that work for your team.'
                },
                {
                    heading: 'Advanced Analytics',
                    content: 'Gain insights into your team\'s performance with detailed analytics and reporting. Track metrics that matter to your business.'
                }
            ]
        },
        {
            heading: 'Getting Started',
            content: 'To get started with HyperZot, first create your workspace, invite team members, and begin setting up your first project. Our intuitive interface makes it easy to get up and running quickly.'
        },
        {
            heading: 'Best Practices',
            content: 'For optimal results, we recommend organizing your work into clear workspaces, using tags consistently, and setting up regular check-ins with your team. Take advantage of keyboard shortcuts to speed up your workflow.'
        }
    ],
    links: [
        {
            title: 'HyperZot Documentation',
            url: 'https://docs.hyperzot.com',
            description: 'Complete documentation and guides'
        },
        {
            title: 'Video Tutorials',
            url: 'https://tutorials.hyperzot.com',
            description: 'Step-by-step video guides'
        },
        {
            title: 'Community Forum',
            url: 'https://community.hyperzot.com',
            description: 'Connect with other users'
        }
    ]
};

// Meta Content
const metaContent: EducationContent = {
    title: 'Understanding Meta',
    subtitle: 'Learn about Meta and its ecosystem',
    lastUpdated: '2024-12-04',
    sections: [
        {
            heading: 'Introduction to Meta',
            content: 'Meta represents the next evolution in social technology, connecting people and businesses through innovative platforms and tools. Understanding Meta\'s ecosystem is crucial for modern digital engagement.'
        },
        {
            heading: 'Meta for Business',
            content: 'Meta offers powerful business tools including advertising platforms, analytics, and engagement tools. These platforms help businesses reach their target audiences effectively.',
            subsections: [
                {
                    heading: 'Advertising Solutions',
                    content: 'Meta\'s advertising platform provides sophisticated targeting options, allowing you to reach specific demographics and interests. Create campaigns across Facebook, Instagram, and other Meta properties.'
                },
                {
                    heading: 'Business Manager',
                    content: 'Centralize your business operations with Meta Business Manager. Manage pages, ad accounts, and team permissions all in one place.'
                },
                {
                    heading: 'Analytics & Insights',
                    content: 'Track your performance with detailed analytics. Understand your audience, measure engagement, and optimize your strategy based on data-driven insights.'
                }
            ]
        },
        {
            heading: 'Privacy & Security',
            content: 'Meta is committed to user privacy and data security. Learn about privacy settings, data protection measures, and how to keep your account secure.'
        },
        {
            heading: 'Future of Meta',
            content: 'Meta is investing heavily in the metaverse, AR/VR technologies, and AI. Stay informed about upcoming features and how they might impact your business strategy.'
        }
    ],
    links: [
        {
            title: 'Meta Business Help Center',
            url: 'https://business.facebook.com/help',
            description: 'Official business resources'
        },
        {
            title: 'Meta Blueprint',
            url: 'https://www.facebook.com/business/learn',
            description: 'Free online training courses'
        },
        {
            title: 'Meta Developer Docs',
            url: 'https://developers.facebook.com/docs',
            description: 'Technical documentation for developers'
        }
    ]
};

// AI Tools Overview Content
const aiToolsContent: EducationContent = {
    title: 'AI Tools Overview',
    subtitle: 'Comprehensive guide to AI tools in our workflow',
    lastUpdated: '2024-12-04',
    sections: [
        {
            heading: 'Why AI Tools Matter',
            content: 'Artificial Intelligence tools have become essential for modern businesses. They help automate tasks, generate content, analyze data, and enhance productivity across all departments.'
        },
        {
            heading: 'Our AI Tool Stack',
            content: 'We use a carefully selected suite of AI tools to enhance our workflow. Each tool serves a specific purpose and integrates with our existing processes to maximize efficiency.'
        },
        {
            heading: 'Best Practices',
            content: 'When using AI tools, always review AI-generated content, understand the limitations of each tool, and use them as assistants rather than replacements for human judgment. Maintain data privacy and security when working with sensitive information.'
        },
        {
            heading: 'Training & Support',
            content: 'We provide ongoing training for all AI tools. Reach out to your team lead for access to training materials and one-on-one support sessions.'
        }
    ],
    links: [
        {
            title: 'AI Tools Comparison',
            url: '#',
            description: 'Compare features across our AI tools'
        },
        {
            title: 'Training Schedule',
            url: '#',
            description: 'Upcoming AI tools training sessions'
        }
    ]
};

// Individual AI Tool Contents
const chatgptContent: EducationContent = {
    title: 'ChatGPT Guide',
    subtitle: 'How to use ChatGPT effectively',
    lastUpdated: '2024-12-04',
    sections: [
        {
            heading: 'What is ChatGPT?',
            content: 'ChatGPT is an advanced AI language model developed by OpenAI. It can help with writing, coding, analysis, brainstorming, and much more.'
        },
        {
            heading: 'Common Use Cases',
            content: 'Use ChatGPT for drafting emails, generating content ideas, debugging code, summarizing documents, and answering questions. It excels at tasks requiring natural language understanding.',
            subsections: [
                {
                    heading: 'Content Creation',
                    content: 'Generate blog posts, social media content, and marketing copy. Always review and edit AI-generated content to match your brand voice.'
                },
                {
                    heading: 'Code Assistance',
                    content: 'Get help with coding problems, code reviews, and learning new programming concepts. ChatGPT can explain complex code and suggest improvements.'
                },
                {
                    heading: 'Research & Analysis',
                    content: 'Summarize long documents, extract key insights, and analyze data. ChatGPT can help you understand complex topics quickly.'
                }
            ]
        },
        {
            heading: 'Tips for Better Results',
            content: 'Be specific in your prompts, provide context, and iterate on responses. Use system messages to set the tone and role for ChatGPT. Break complex tasks into smaller steps.'
        }
    ],
    links: [
        {
            title: 'ChatGPT Official Site',
            url: 'https://chat.openai.com',
            description: 'Access ChatGPT'
        },
        {
            title: 'Prompt Engineering Guide',
            url: 'https://platform.openai.com/docs/guides/prompt-engineering',
            description: 'Learn to write better prompts'
        }
    ]
};

const claudeContent: EducationContent = {
    title: 'Claude Guide',
    subtitle: 'Working with Anthropic Claude',
    lastUpdated: '2024-12-04',
    sections: [
        {
            heading: 'About Claude',
            content: 'Claude is an AI assistant created by Anthropic, designed to be helpful, harmless, and honest. It excels at long-form content, analysis, and complex reasoning tasks.'
        },
        {
            heading: 'When to Use Claude',
            content: 'Claude is particularly good for tasks requiring careful analysis, long document processing, and nuanced understanding. Use it for research, content editing, and strategic planning.',
            subsections: [
                {
                    heading: 'Document Analysis',
                    content: 'Claude can process and analyze long documents, extracting key information and providing detailed summaries.'
                },
                {
                    heading: 'Strategic Thinking',
                    content: 'Use Claude for brainstorming, strategic planning, and exploring complex problems from multiple angles.'
                }
            ]
        },
        {
            heading: 'Best Practices',
            content: 'Provide clear context, ask follow-up questions, and leverage Claude\'s ability to maintain context over long conversations. Claude is particularly good at understanding nuance and providing balanced perspectives.'
        }
    ],
    links: [
        {
            title: 'Claude Official Site',
            url: 'https://claude.ai',
            description: 'Access Claude'
        },
        {
            title: 'Anthropic Documentation',
            url: 'https://docs.anthropic.com',
            description: 'Technical documentation'
        }
    ]
};

const midjourneyContent: EducationContent = {
    title: 'Midjourney Guide',
    subtitle: 'Creating stunning visuals with AI',
    lastUpdated: '2024-12-04',
    sections: [
        {
            heading: 'What is Midjourney?',
            content: 'Midjourney is an AI-powered image generation tool that creates stunning visuals from text descriptions. It\'s perfect for creating concept art, marketing materials, and visual inspiration.'
        },
        {
            heading: 'Getting Started',
            content: 'Midjourney works through Discord. Join the Midjourney server, use the /imagine command followed by your prompt, and wait for the AI to generate your images.',
            subsections: [
                {
                    heading: 'Writing Effective Prompts',
                    content: 'Be descriptive and specific. Include details about style, lighting, composition, and mood. Use artist names or art movements as style references.'
                },
                {
                    heading: 'Parameters & Settings',
                    content: 'Learn to use parameters like --ar for aspect ratio, --stylize for stylization level, and --quality for image quality. These fine-tune your results.'
                }
            ]
        },
        {
            heading: 'Commercial Use',
            content: 'Understand the licensing terms for commercial use. Paid subscribers have commercial rights to their generated images, subject to Midjourney\'s terms of service.'
        }
    ],
    links: [
        {
            title: 'Midjourney Discord',
            url: 'https://discord.gg/midjourney',
            description: 'Join the Midjourney community'
        },
        {
            title: 'Midjourney Documentation',
            url: 'https://docs.midjourney.com',
            description: 'Official documentation and guides'
        }
    ]
};

// Education data structure
export const educationData: EducationItem[] = [
    {
        id: 'hyperzot',
        title: 'HyperZot',
        description: 'Learn about HyperZot platform',
        icon: 'Zap',
        route: '/education/hyperzot',
        content: hyperzotContent
    },
    {
        id: 'meta',
        title: 'Meta',
        description: 'Understanding Meta ecosystem',
        icon: 'Building2',
        route: '/education/meta',
        content: metaContent
    },
    {
        id: 'ai-tools',
        title: 'AI Tools',
        description: 'AI tools we use',
        icon: 'Sparkles',
        route: '/education/ai-tools',
        content: aiToolsContent,
        children: [
            {
                id: 'chatgpt',
                title: 'ChatGPT',
                description: 'OpenAI ChatGPT guide',
                icon: 'MessageSquare',
                route: '/education/ai-tools/chatgpt',
                content: chatgptContent
            },
            {
                id: 'claude',
                title: 'Claude',
                description: 'Anthropic Claude guide',
                icon: 'Bot',
                route: '/education/ai-tools/claude',
                content: claudeContent
            },
            {
                id: 'midjourney',
                title: 'Midjourney',
                description: 'AI image generation',
                icon: 'Image',
                route: '/education/ai-tools/midjourney',
                content: midjourneyContent
            }
        ]
    }
];

// Helper function to find education item by route
export const findEducationByRoute = (route: string): EducationItem | undefined => {
    for (const item of educationData) {
        if (item.route === route) return item;
        if (item.children) {
            const child = item.children.find(c => c.route === route);
            if (child) return child;
        }
    }
    return undefined;
};
