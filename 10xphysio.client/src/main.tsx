import { FluentProvider } from '@fluentui/react-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ToastProvider } from './components/common/ToastProvider';
import { appTheme } from './theme';
import './index.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <QueryClientProvider client={queryClient}>
                {/* The custom Fluent UI theme keeps the UI aligned with the logo palette. */}
                <FluentProvider theme={appTheme}>
                    <ToastProvider />
                    <App />
                </FluentProvider>
            </QueryClientProvider>
        </BrowserRouter>
    </StrictMode>,
);
