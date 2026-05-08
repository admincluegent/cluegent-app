import React, { useEffect, useRef, useState } from 'react';
import { Camera, Monitor } from 'lucide-react';
import { MockInterfaceWalkthrough, MockScreenshotWalkthrough } from './settings/HelpSettings';

type WalkthroughBanner = {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    content: React.ReactNode;
};

const walkthroughs: WalkthroughBanner[] = [
    {
        id: 'interface',
        title: 'Cluegent interface',
        description: 'Start listening, use quick actions, and submit when you want Cluegent to answer.',
        icon: <Monitor size={16} />,
        content: <MockInterfaceWalkthrough />,
    },
    {
        id: 'screenshot',
        title: 'Screenshot response',
        description: 'Capture the screen, attach context, and get a direct visual answer.',
        icon: <Camera size={16} />,
        content: <MockScreenshotWalkthrough />,
    },
];

export const FeatureSpotlight: React.FC = () => {
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const timer = window.setInterval(() => {
            setActiveIndex((current) => (current + 1) % walkthroughs.length);
        }, 3000);

        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        container.scrollTo({
            left: activeIndex * container.clientWidth,
            behavior: 'smooth',
        });
    }, [activeIndex]);

    return (
        <div className="relative h-full w-full overflow-hidden rounded-xl border border-border-subtle bg-bg-card shadow-sm">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(59,130,246,0.10),transparent_32%),radial-gradient(circle_at_88%_76%,rgba(245,158,11,0.10),transparent_34%)]" />

            <div
                ref={scrollRef}
                className="relative h-full w-full overflow-x-auto overflow-y-hidden scroll-smooth custom-scrollbar"
            >
                <div className="flex h-full snap-x snap-mandatory">
                    {walkthroughs.map((item) => (
                        <article
                            key={item.id}
                            className="h-full min-w-full snap-start p-3"
                        >
                            <div className="relative h-full overflow-hidden rounded-2xl border border-border-subtle bg-bg-elevated/70 shadow-sm">
                                <div className="absolute left-3 right-3 top-3 z-10 flex items-center justify-between gap-3 rounded-full border border-border-subtle bg-bg-card/90 px-4 py-2.5 backdrop-blur-md">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-item-active text-accent-primary">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-text-primary">{item.title}</h3>
                                            <p className="hidden text-xs text-text-secondary sm:block">{item.description}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute inset-x-2 top-12 bottom-0 overflow-hidden">
                                    <div className="w-[112%] origin-top-left scale-[0.9]">
                                        {item.content}
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </div>

            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 px-2 py-1">
                {walkthroughs.map((item, index) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveIndex(index)}
                        className={`h-1.5 rounded-full transition-all ${activeIndex === index ? 'w-5 bg-accent-primary' : 'w-1.5 bg-text-tertiary/40'}`}
                        aria-label={`Show ${item.title}`}
                    />
                ))}
            </div>
        </div>
    );
};
