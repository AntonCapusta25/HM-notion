import { useParams, Link } from 'react-router-dom';
import { ChevronRight, ExternalLink, Calendar } from 'lucide-react';
import { findEducationByRoute } from '../data/education-data';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layout } from '../components/Layout';

const Education = () => {
    const { topic, subtopic } = useParams<{ topic: string; subtopic?: string }>();

    // Construct the route from params
    const route = subtopic
        ? `/education/${topic}/${subtopic}`
        : `/education/${topic}`;

    const educationItem = findEducationByRoute(route);

    if (!educationItem || !educationItem.content) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Content Not Found</h1>
                        <p className="text-gray-600 mb-4">The educational content you're looking for doesn't exist.</p>
                        <Link to="/" className="text-homemade-orange hover:underline">
                            Return to Dashboard
                        </Link>
                    </div>
                </div>
            </Layout>
        );
    }

    const { content } = educationItem;

    // Build breadcrumb
    const breadcrumbs = [
        { label: 'Education', path: '/' }
    ];

    if (subtopic) {
        breadcrumbs.push({ label: topic.charAt(0).toUpperCase() + topic.slice(1).replace('-', ' '), path: `/education/${topic}` });
        breadcrumbs.push({ label: educationItem.title, path: route });
    } else {
        breadcrumbs.push({ label: educationItem.title, path: route });
    }

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50">
                {/* Breadcrumb Navigation */}
                <div className="bg-white border-b border-gray-200">
                    <div className="max-w-3xl mx-auto px-6 py-4">
                        <nav className="flex items-center gap-2 text-sm">
                            {breadcrumbs.map((crumb, index) => (
                                <div key={crumb.path} className="flex items-center gap-2">
                                    {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
                                    {index === breadcrumbs.length - 1 ? (
                                        <span className="text-gray-900 font-medium">{crumb.label}</span>
                                    ) : (
                                        <Link
                                            to={crumb.path}
                                            className="text-gray-600 hover:text-homemade-orange transition-colors"
                                        >
                                            {crumb.label}
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Main Content - Medium Style */}
                <article className="max-w-3xl mx-auto px-6 py-12">
                    {/* Header */}
                    <header className="mb-12">
                        <h1 className="text-5xl font-bold text-gray-900 mb-4 leading-tight">
                            {content.title}
                        </h1>
                        {content.subtitle && (
                            <p className="text-xl text-gray-600 leading-relaxed mb-6">
                                {content.subtitle}
                            </p>
                        )}
                        {content.lastUpdated && (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Calendar className="h-4 w-4" />
                                <span>Last updated: {new Date(content.lastUpdated).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}</span>
                            </div>
                        )}
                    </header>

                    {/* Table of Contents */}
                    {content.sections.length > 3 && (
                        <Card className="mb-12 bg-gray-50 border-gray-200">
                            <CardContent className="p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Table of Contents</h2>
                                <nav className="space-y-2">
                                    {content.sections.map((section, index) => (
                                        <a
                                            key={index}
                                            href={`#section-${index}`}
                                            className="block text-gray-700 hover:text-homemade-orange transition-colors"
                                        >
                                            {section.heading}
                                        </a>
                                    ))}
                                </nav>
                            </CardContent>
                        </Card>
                    )}

                    {/* Content Sections */}
                    <div className="space-y-12">
                        {content.sections.map((section, index) => (
                            <section key={index} id={`section-${index}`} className="scroll-mt-8">
                                <h2 className="text-3xl font-bold text-gray-900 mb-6 leading-tight">
                                    {section.heading}
                                </h2>
                                <div className="prose prose-lg max-w-none">
                                    <p className="text-gray-700 leading-relaxed text-lg mb-6">
                                        {section.content}
                                    </p>
                                </div>

                                {/* Subsections */}
                                {section.subsections && section.subsections.length > 0 && (
                                    <div className="mt-8 space-y-8 pl-6 border-l-2 border-gray-200">
                                        {section.subsections.map((subsection, subIndex) => (
                                            <div key={subIndex}>
                                                <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                                                    {subsection.heading}
                                                </h3>
                                                <p className="text-gray-700 leading-relaxed text-lg">
                                                    {subsection.content}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        ))}
                    </div>

                    {/* Resource Links */}
                    {content.links && content.links.length > 0 && (
                        <div className="mt-16 pt-12 border-t border-gray-200">
                            <h2 className="text-3xl font-bold text-gray-900 mb-8">Helpful Resources</h2>
                            <div className="grid gap-4">
                                {content.links.map((link, index) => (
                                    <a
                                        key={index}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group"
                                    >
                                        <Card className="transition-all hover:shadow-md hover:border-homemade-orange">
                                            <CardContent className="p-6">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-homemade-orange transition-colors">
                                                            {link.title}
                                                        </h3>
                                                        {link.description && (
                                                            <p className="text-gray-600 text-sm">
                                                                {link.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <ExternalLink className="h-5 w-5 text-gray-400 group-hover:text-homemade-orange transition-colors flex-shrink-0" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Related Topics (if has children or siblings) */}
                    {educationItem.children && educationItem.children.length > 0 && (
                        <div className="mt-16 pt-12 border-t border-gray-200">
                            <h2 className="text-3xl font-bold text-gray-900 mb-8">Related Topics</h2>
                            <div className="grid gap-4">
                                {educationItem.children.map((child) => (
                                    <Link
                                        key={child.id}
                                        to={child.route}
                                        className="group"
                                    >
                                        <Card className="transition-all hover:shadow-md hover:border-homemade-orange">
                                            <CardContent className="p-6">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-homemade-orange transition-colors">
                                                            {child.title}
                                                        </h3>
                                                        <p className="text-gray-600 text-sm">
                                                            {child.description}
                                                        </p>
                                                    </div>
                                                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-homemade-orange transition-colors flex-shrink-0" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </article>
            </div>
        </Layout>
    );
};

export default Education;
