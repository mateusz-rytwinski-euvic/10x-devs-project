import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './index.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <QueryClientProvider client={queryClient}>
                <FluentProvider theme={webLightTheme}>
                    <App />
                </FluentProvider>
            </QueryClientProvider>
        </BrowserRouter>
    </StrictMode>,
);
