import { Chain } from "@chain-registry/types";

export function getTransactionLink(chain: Chain, hash: string) {
  const link = (
    chain.explorers?.find((x) => x.kind === "mintscan") ?? chain.explorers?.[0]
  )?.tx_page?.replace("${txHash}", hash);
  return link;
}

export function getAddressLink(chain: Chain, address: string) {
  const link = (
    chain.explorers?.find((x) => x.kind === "mintscan") ?? chain.explorers?.[0]
  )?.account_page?.replace("${accountAddress}", address);
  return link;
}

export function getExplorerLink(chain: Chain) {
  return (
    chain.explorers?.find((x) => x.kind === "mintscan") ?? chain.explorers?.[0]
  )?.url;
}
