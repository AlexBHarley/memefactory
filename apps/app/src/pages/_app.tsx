import "@/styles/globals.css";
import "@interchain-ui/react/styles";

import { wallets } from "@cosmos-kit/keplr";
import { ChainProvider } from "@cosmos-kit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { assets, chains } from "chain-registry";
import type { AppProps } from "next/app";

import { Toaster } from "@/components/ui/toaster";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      refetchOnMount: false,
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ChainProvider
        chains={chains}
        assetLists={assets}
        wallets={wallets}
        signerOptions={{
          preferredSignType: () => "direct",
        }}
        walletConnectOptions={{
          signClient: {
            projectId: "f60875b587cdaa8c66b7f155ef7b34d4",
          },
        }}
      >
        <Component {...pageProps} />
        <Toaster />
      </ChainProvider>
    </QueryClientProvider>
  );
}
