import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import Header from "../components/Header";

export const Route = createRootRoute({
	component: () => (
		<div className="flex min-h-dvh flex-col bg-background">
			<Header />
			<main className="flex-1 overflow-y-auto">
				<Outlet />
			</main>
			<TanStackDevtools
				config={{
					position: "bottom-right",
				}}
				plugins={[
					{
						name: "Tanstack Router",
						render: <TanStackRouterDevtoolsPanel />,
					},
				]}
			/>
			<ReactQueryDevtools initialIsOpen={false} />
		</div>
	),
});
