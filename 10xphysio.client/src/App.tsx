import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { routeConfigs, routes } from './routes';

export const App = () => {
    const { isAuthenticated } = useAuth();

    return (
        <Routes>
            {routeConfigs.map((config) => {
                const Component = config.component;
                let element: React.ReactElement;

                if (config.isProtected && !isAuthenticated) {
                    element = <Navigate to={routes.login} replace />;
                } else if (!config.isProtected && isAuthenticated) {
                    element = <Navigate to={routes.patients} replace />;
                } else {
                    element = <Component />;
                }

                return <Route key={config.path} path={config.path} element={element} />;
            })}
            <Route path="*" element={<Navigate to={isAuthenticated ? routes.patients : routes.login} replace />} />
        </Routes>
    );
};