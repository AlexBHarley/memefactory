export const isTestnet = process.env["NEXT_PUBLIC_TESTNET"] === "true";

export const osmosisApp = isTestnet
  ? "https://testnet.osmosis.zone"
  : "https://app.osmosis.zone";

export const appName = "Meme Token Factory";

export const poolCreationFee = isTestnet ? "100 OSMO" : "100 USDC";

export const chainName = isTestnet ? "osmosis-testnet" : "osmosis";
export const displayName = isTestnet ? "Osmosis Testnet" : "Osmosis";
