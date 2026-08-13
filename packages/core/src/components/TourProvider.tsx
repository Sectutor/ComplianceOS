import React, { useEffect, createContext, useContext, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { trpc } from '../lib/trpc';
import { useAuth } from '../contexts/AuthContext';

interface TourContextType {
    startTour: () => void;
}

const TourContext = createContext<TourContextType>({
    startTour: () => { }
});

export const useTour = () => useContext(TourContext);

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const utils = trpc.useUtils();

    // We need to fetch the full user profile to check hasSeenTour
    // The auth context user might be stale or minimal
    const { data: dbUser } = trpc.users.me.useQuery(undefined, {
        enabled: !!user
    });

    const completeTourMutation = trpc.users.completeTour.useMutation({
        onSuccess: () => {
            utils.users.me.invalidate();
        }
    });

    const startTour = () => {
        const driverObj = driver({
            showProgress: true,
            animate: true,
            overlayColor: 'rgba(0, 0, 0, 0.5)',
            stagePadding: 8,
            doneBtnText: 'Finish',
            nextBtnText: 'Next →',
            prevBtnText: '← Back',
            allowClose: true,
            steps: [
                {
                    popover: {
                        title: 'Welcome to GRCompliance',
                        description:
                            'Your all-in-one governance, risk, and compliance operating system. Manage clients, track compliance status, collect evidence, mitigate risks, and generate audit-ready reports — all from a single platform. Let us walk you through the essentials.',
                        align: 'center',
                        side: 'center'
                    }
                },
                {
                    element: '[data-tour="sidebar-overview"]',
                    popover: {
                        title: 'Sidebar Navigation',
                        description:
                            'This sidebar is your command center. Every section of GRCompliance is accessible from here — dashboards, client workspaces, compliance journeys, controls, evidence, risks, vendors, privacy, and reports. Click any item to jump to that module instantly.',
                        side: 'right'
                    }
                },
                {
                    element: '[data-tour="sidebar-dashboard"]',
                    popover: {
                        title: 'Dashboard',
                        description:
                            'Your central hub for monitoring compliance status across all clients. Get a bird\'s-eye view of overall ratings, pending tasks, recent activity, and compliance scores — all in one place. Pin this as your daily launchpad.',
                        side: 'right'
                    }
                },
                {
                    element: '[data-tour="client-switcher"]',
                    popover: {
                        title: 'Organization Switcher',
                        description:
                            'Easily switch between different client organizations without losing your place. Each client has its own dedicated workspace with separate compliance frameworks, evidence, and risk profiles. Click here to jump between them seamlessly.',
                        side: 'right'
                    }
                },
                {
                    element: '[data-tour="sidebar-clients"]',
                    popover: {
                        title: 'Clients',
                        description:
                            'View and manage all your client organizations from a single list. Add new clients, edit their profiles, archive inactive ones, and keep your portfolio organized. Each client gets their own isolated compliance environment.',
                        side: 'right'
                    }
                },
                {
                    element: '[data-tour="sidebar-compliance"]',
                    popover: {
                        title: 'Compliance Journey',
                        description:
                            'Track your compliance roadmap from start to finish. Each framework (SOC 2, ISO 27001, HIPAA, etc.) has a step-by-step journey showing your progress. See which controls are implemented, which need attention, and what\'s coming next.',
                        side: 'right'
                    }
                },
                {
                    element: '[data-tour="sidebar-controls"]',
                    popover: {
                        title: 'Controls Library',
                        description:
                            'A global library of all compliance controls across every framework you manage. Map controls to multiple frameworks, assign owners, set implementation status, and track remediation. Think of this as your single source of truth for control management.',
                        side: 'right'
                    }
                },
                {
                    element: '[data-tour="sidebar-evidence"]',
                    popover: {
                        title: 'Evidence Collection',
                        description:
                            'Upload, organize, and link evidence files to your controls and frameworks. Supports screenshots, documents, logs, and config files. Each piece of evidence can be reviewed, approved, and packaged for auditor requests. Never scramble for proof again.',
                        side: 'right'
                    }
                },
                {
                    element: '[data-tour="sidebar-risks"]',
                    popover: {
                        title: 'Risk Management',
                        description:
                            'Identify, assess, and mitigate risks across your organization. Log new risks with impact and likelihood scores, build heat maps, define mitigation plans, and track residual risk. Keep your risk register audit-ready at all times.',
                        side: 'right'
                    }
                },
                {
                    element: '[data-tour="sidebar-vendors"]',
                    popover: {
                        title: 'Vendor Management (TPRM)',
                        description:
                            'Manage third-party vendor risk with comprehensive vendor profiles. Assess vendor security posture, track contracts, schedule reviews, and monitor vendor compliance. Third-Party Risk Management made simple and continuous.',
                        side: 'right'
                    }
                },
                {
                    element: '[data-tour="sidebar-privacy"]',
                    popover: {
                        title: 'Privacy Hub',
                        description:
                            'Manage privacy programs across jurisdictions (GDPR, CCPA, LGPD, etc.). Handle data subject access requests (DSARs), maintain records of processing activities (ROPA), manage consent, and stay on top of privacy impact assessments.',
                        side: 'right'
                    }
                },
                {
                    element: '[data-tour="sidebar-reports"]',
                    popover: {
                        title: 'Reports & Analytics',
                        description:
                            'Generate auditor-ready compliance reports with one click. Choose from SOC 2 Type II reports, executive summaries, control matrices, evidence packages, and custom exports. Schedule recurring reports or generate on demand for stakeholder reviews.',
                        side: 'right'
                    }
                },
                {
                    element: '[data-tour="user-menu"]',
                    popover: {
                        title: 'Profile & Settings',
                        description:
                            'Manage your account settings, notification preferences, two-factor authentication, and team invitations. Update your profile photo, change your password, or configure integrations. This is your personal hub for all account-level controls.',
                        side: 'left'
                    }
                },
                {
                    popover: {
                        title: 'You\'re All Set! 🚀',
                        description:
                            'You now know your way around GRCompliance. Start by creating your first client or dive into the dashboard to see your compliance landscape. If you ever need a refresher, find this tour again from the help menu. Happy compliance!',
                        align: 'center',
                        side: 'center'
                    }
                }
            ],
            onDestroyStarted: () => {
                if (!dbUser?.hasSeenTour) {
                    completeTourMutation.mutate();
                }
                driverObj.destroy();
            }
        });

        driverObj.drive();
    };

    useEffect(() => {
        if (dbUser && !dbUser.hasSeenTour && !completeTourMutation.isLoading && !completeTourMutation.isSuccess) {
            // Small delay to ensure UI is ready
            const timer = setTimeout(() => {
                startTour();
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [dbUser]);

    return (
        <TourContext.Provider value={{ startTour }}>
            {children}
        </TourContext.Provider>
    );
};
