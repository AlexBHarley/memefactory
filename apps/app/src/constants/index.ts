export const isTestnet = process.env["NEXT_PUBLIC_TESTNET"] === "true";

export const osmosisApp = isTestnet
  ? "https://testnet.osmosis.zone"
  : "https://app.osmosis.zone";

export const appName = "Meme Token Factory";
