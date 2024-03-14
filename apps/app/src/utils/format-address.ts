import { fromBech32 } from "@cosmjs/encoding";

export function formatAddress(address: string) {
  const { prefix } = fromBech32(address);
  return (
    prefix +
    address.slice(prefix.length, prefix.length + 6) +
    "..." +
    address.slice(address.length - 6)
  );
}
