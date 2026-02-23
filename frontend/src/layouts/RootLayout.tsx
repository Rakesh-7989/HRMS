import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { ConfirmProvider } from '@/contexts/ConfirmContext';
import { CallOverlay } from '@/components/chat/CallOverlay';

export const RootLayout = () => {
    return (
        <ThemeProvider>
            <AuthProvider>
                <ConfirmProvider>
                    <ChatProvider>
                        <Toaster
                            position="top-right"
                            containerStyle={{
                                zIndex: 100000,
                            }}
                            toastOptions={{
                                duration: 4000,
                                style: {
                                    background: '#1F2937',
                                    color: '#fff',
                                    borderRadius: '16px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    padding: '12px 20px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                },
                                success: {
                                    duration: 3000,
                                    style: {
                                        background: '#A78BFA',
                                    },
                                    iconTheme: {
                                        primary: '#fff',
                                        secondary: '#A78BFA',
                                    },
                                },
                                error: {
                                    duration: 4000,
                                    style: {
                                        background: '#EF4444',
                                    },
                                    iconTheme: {
                                        primary: '#fff',
                                        secondary: '#EF4444',
                                    },
                                },
                            }}
                        />
                        <Outlet />
                        <CallOverlay />
                    </ChatProvider>
                </ConfirmProvider>
            </AuthProvider>
        </ThemeProvider>
    );
};
