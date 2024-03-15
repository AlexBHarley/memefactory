import { EncodeObject, Registry, coins } from "@cosmjs/proto-signing";
import { AminoTypes, DeliverTxResponse } from "@cosmjs/stargate";
import { useChain } from "@cosmos-kit/react";
import { IntPretty } from "@keplr-wallet/unit";
import { useQuery } from "@tanstack/react-query";
import BigNumber from "bignumber.js";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";
import Image from "next/image";
import {
  GeneratedType,
  cosmos,
  cosmosAminoConverters,
  cosmosProtoRegistry,
  cosmwasmAminoConverters,
  cosmwasmProtoRegistry,
  ibcAminoConverters,
  ibcProtoRegistry,
  osmosis,
  osmosisAminoConverters,
  osmosisProtoRegistry,
} from "osmojs";
import { useState } from "react";
import Confetti from "react-confetti";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  appName,
  chainName,
  displayName,
  isTestnet,
  osmosisApp,
  poolCreationFee,
} from "@/constants";

const tokenfactory = osmosis.tokenfactory.v1beta1.MessageComposer.withTypeUrl;
const gamm =
  osmosis.gamm.poolmodels.balancer.v1beta1.MessageComposer.withTypeUrl;
const bank = cosmos.bank.v1beta1.MessageComposer.withTypeUrl;

// This is actually the Bonded Tokens Pool address
// Passing '' leads to: Invalid address (empty address string is not allowed): invalid address error
const BURN_ADDRESS = "osmo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqmcn030";

export default function Home() {
  const { toast } = useToast();
  const chain = useChain(chainName);

  const numPools = useQuery(
    [`num-pools-${chain.chain.chain_name}`],
    async () => {
      const client = await osmosis.ClientFactory.createRPCQueryClient({
        rpcEndpoint: await chain.getRpcEndpoint(),
      });

      const response = await client.osmosis.gamm.v1beta1.numPools();
      return response.numPools;
    },
    { refetchInterval: 5_000 }
  );

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [supply, setSupply] = useState(1_000_000);

  const [poolOptions, setPoolOptions] = useState(false);
  const [createPool, setCreatePool] = useState(false);
  const [osmosLp, setOsmoLp] = useState("");
  const [tokenLp, setTokenLp] = useState("");
  const [burnLp, setBurnLp] = useState(false);
  const [swapFee, setSwapFee] = useState("");
  const [exitFee, setExitFee] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [txResponse, setTxResponse] = useState<DeliverTxResponse | null>();

  const onWrite = async () => {
    if (symbol.length < 3) {
      return;
    }

    try {
      setSubmitting(true);
      // @ts-expect-error
      const protoRegistry: ReadonlyArray<[string, GeneratedType]> = [
        ...cosmosProtoRegistry,
        ...cosmwasmProtoRegistry,
        ...ibcProtoRegistry,
        ...osmosisProtoRegistry,
      ];

      const aminoConverters = {
        ...cosmosAminoConverters,
        ...cosmwasmAminoConverters,
        ...ibcAminoConverters,
        ...osmosisAminoConverters,
      };

      const registry = new Registry(protoRegistry);
      const aminoTypes = new AminoTypes(aminoConverters);

      const formatUnits = (amount: number | string, decimals: number) =>
        new BigNumber(amount.toString())
          .multipliedBy(10 ** decimals)
          .toString();

      const decimals = 6;
      const denom = `factory/${chain.address}/${symbol.toLowerCase()}`;
      const messages: EncodeObject[] = [
        tokenfactory.createDenom({
          sender: chain.address!,
          subdenom: symbol.toLowerCase(),
        }),
        tokenfactory.mint({
          amount: Coin.fromPartial({
            denom,
            amount: formatUnits(supply, decimals),
          }),
          mintToAddress: chain.address!,
          sender: chain.address!,
        }),
        tokenfactory.setDenomMetadata({
          // @ts-expect-error uriHash
          metadata: {
            base: denom,
            denomUnits: [
              { denom: denom, exponent: 0, aliases: [] },
              { denom: symbol.toLowerCase(), exponent: decimals, aliases: [] },
            ],
            description,
            name,
            symbol,
            display: symbol.toLowerCase(),
            uri: image,
            // uriHash: "0x",
          },
          sender: chain.address!,
        }),
        tokenfactory.changeAdmin({
          sender: chain.address!,
          newAdmin: BURN_ADDRESS,
          denom,
        }),
      ];
      const fees = [
        1_400_000, // createdenom
        100_000, // mint
        200_000, // setDenomMetadata
        200_000, // changeAdmin
      ];

      if (createPool) {
        messages.push(
          gamm.createBalancerPool({
            poolAssets: [
              {
                token: Coin.fromPartial({
                  denom,
                  amount: formatUnits(tokenLp, decimals),
                }),
                weight: "50",
              },
              {
                token: Coin.fromPartial({
                  denom: "uosmo",
                  amount: formatUnits(osmosLp, 6),
                }),
                weight: "50",
              },
            ],
            sender: chain.address!,
            poolParams: {
              exitFee,
              swapFee,
            },
            futurePoolGovernor: "",
          })
        );
        fees.push(200_000);
      }

      if (burnLp && createPool) {
        const lpDenom = `gamm/pool/${numPools.data! + BigInt(1)}`;
        messages.push(
          bank.send({
            amount: [
              Coin.fromPartial({
                denom: lpDenom,
                amount: "100000000000000000000",
              }),
            ],
            fromAddress: chain.address!,
            toAddress: BURN_ADDRESS,
          })
        );
        fees.push(100_000);
      }

      const client = await chain.getSigningStargateClient();
      // @ts-expect-error
      client.registry = registry;
      // @ts-expect-error
      client.aminoTypes = aminoTypes;

      const fee = {
        amount: coins(0, "uosmo"),
        gas: new IntPretty(fees.reduce((accum, fee) => accum + fee, 0))
          .maxDecimals(0)
          .locale(false)
          .toString(),
      };

      const response = await client.signAndBroadcast(
        chain.address!,
        messages,
        fee,
        `Created via ${appName}`
      );

      if (response.code === 0) {
        // @ts-expect-error
        setTxResponse(response);
      } else {
        toast({
          title: "Unable to create token",
          description: response.rawLog,
        });
      }
    } catch (e: any) {
      if (e.message.includes("rejected")) {
        toast({ title: "Request rejected" });
      } else {
        toast({ title: "Unable to create token", description: e.message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const SuccessDialog = () => {
    const poolId = txResponse?.events
      .find((x) => x.type === "pool_created")
      ?.attributes.find((x) => x.key === "pool_id")?.value;

    return (
      <Dialog open={!!txResponse} onOpenChange={() => setTxResponse(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {name} is deployed to {displayName}!
            </DialogTitle>
            <DialogDescription className="flex flex-col gap-2 pt-2">
              <div>{"What's next?"}</div>
              <ul className="list-disc ml-4 space-y-2">
                <li>
                  View the deployment transaction{" "}
                  <a
                    href={`https://mintscan.io/${
                      isTestnet ? "osmosis-testnet" : "osmosis"
                    }/tx/${txResponse?.transactionHash}`}
                    target="_blank"
                    className="underline"
                  >
                    on Mintscan
                  </a>
                </li>
                <li>
                  Get to{" "}
                  <a
                    href={`${osmosisApp}/?unverified_assets=true&from=ATOM&to=OSMO`}
                    target="_blank"
                    className="underline"
                  >
                    trading on Osmosis
                  </a>
                </li>
                {poolId ? (
                  <li>
                    Add and remove{" "}
                    <a
                      href={`${osmosisApp}/pool/${poolId}`}
                      target="_blank"
                      className="underline"
                    >
                      liquidity
                    </a>
                  </li>
                ) : (
                  <li>
                    <a
                      href={`${osmosisApp}/pools`}
                      target="_blank"
                      className="underline"
                    >
                      Create a liquidity pool{" "}
                    </a>{" "}
                    for the asset
                  </li>
                )}
                <li>
                  Share your newly deployed token on{" "}
                  <a
                    href={`https://twitter.com/intent/tweet?text=I just deployed ${name} to Osmosis with ${appName}`}
                    target="_blank"
                    className="underline"
                  >
                    X
                  </a>
                </li>
              </ul>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <main className="">
      <div className="max-w-screen-sm mx-auto flex-col items-center  px-3 py-6 space-y-3 md:px-8 md:py-12 md:space-y-2">
        <SuccessDialog />
        {!!txResponse && <Confetti />}

        <div>
          <div className="font-bold">{displayName} Token Factory</div>
          <div className="text-sm">
            Deploy native tokens on {displayName} and configure liquidity pools
            in one easy transaction.
          </div>
        </div>

        <div>
          <Label htmlFor="email">Name</Label>
          <Input
            id="name"
            placeholder="My awesome token"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="symbol">Symbol</Label>
          <Input
            id="symbol"
            placeholder="AWE"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="image">Image URL</Label>
          <Input
            id="image"
            placeholder="https://"
            value={image}
            onChange={(e) => setImage(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Say something nice about your new token"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex justify-center py-4">
          <button
            className="text-sm text-gray-600"
            onClick={() => setPoolOptions((b) => !b)}
          >
            <span>Pool options</span>
            <Image
              alt="fees icon"
              src={`/img/caret-${poolOptions ? "down" : "up"}.svg`}
              className="h-4 w-4 inline ml-1"
              height={16}
              width={16}
            />
          </button>
        </div>

        {poolOptions && (
          <div className="flex flex-col gap-4 pb-4">
            <div
              className="flex items-center gap-2"
              onClick={() => setCreatePool((b) => !b)}
            >
              <div>
                <span className="text-sm">
                  Create liquidity pool ({poolCreationFee} fee)
                </span>
                <div className="text-xs text-gray-700">
                  Note that the {poolCreationFee} fee is charged by Osmosis and
                  sent to the Community Pool. More information on this can be
                  found{" "}
                  <a
                    className="underline"
                    href="https://wallet.keplr.app/chains/osmosis/proposals/45"
                    target="_blank"
                  >
                    here
                  </a>
                  .
                </div>
              </div>

              <Checkbox
                // @ts-expect-error
                value={createPool}
                onCheckedChange={(b) => setCreatePool(b as boolean)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="">
                <div className="text-sm">Starting liquidity</div>
                <div className="text-xs text-gray-700">
                  This will be the initial liquidity in the trading pool, more
                  can always be added later.
                </div>
              </div>

              <div className="flex gap-4 w-full">
                <div className="relative w-1/2">
                  <Input
                    value={osmosLp}
                    disabled={!createPool}
                    onChange={(e) => setOsmoLp(e.target.value)}
                    placeholder="0"
                  />
                  <span className="absolute right-0 top-0 text-zinc-500 px-3 py-2 rounded-lg">
                    OSMO
                  </span>
                </div>
                <div className="relative w-1/2">
                  <Input
                    value={tokenLp}
                    disabled={!createPool}
                    onChange={(e) => setTokenLp(e.target.value)}
                    placeholder={`0`}
                  />
                  <span className="absolute right-0 top-0 text-zinc-500 px-3 py-2 rounded-lg">
                    {symbol || "TOKEN"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div>
                <span className="text-sm ">Burn LP tokens</span>
                <div className="text-xs text-gray-700">
                  Burning LP tokens can be a sign of confidence for people
                  buying tokens that the price {"won't crash"}. However, if you
                  opt to burn your LP tokens you {"won't"} be able to withdraw
                  your initial liquidity!
                </div>
              </div>

              <Checkbox
                disabled={!createPool}
                // @ts-expect-error
                value={burnLp}
                onCheckedChange={(b) => setBurnLp(b as boolean)}
              />
            </div>

            <div className="flex items-center space-x-8">
              <div className="flex flex-col w-1/2">
                <div className="text-sm">Swap fee</div>
                <div className="text-xs text-gray-700">
                  Less than 0.01 recommended,{" "}
                  <a
                    className="underline"
                    href="https://osmosis.gitbook.io/o/liquidity-providing/fees#swap-fees"
                    target="_blank"
                  >
                    learn more
                  </a>
                  .
                </div>
              </div>
              <Input
                id="swapFee"
                disabled={!createPool}
                placeholder="0.00"
                value={swapFee}
                onChange={(e) => setSwapFee(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-8">
              <div className="flex flex-col w-1/2">
                <div className="text-sm">Exit fee</div>
                <div className="text-xs text-gray-700">
                  Less than 0.01 recommended,{" "}
                  <a
                    className="underline"
                    href="https://osmosis.gitbook.io/o/liquidity-providing/fees#exit-fees"
                    target="_blank"
                  >
                    learn more
                  </a>
                  .
                </div>
              </div>
              <Input
                id="exitFee"
                disabled={!createPool}
                placeholder="0.00"
                value={exitFee}
                onChange={(e) => setExitFee(e.target.value)}
              />
            </div>
          </div>
        )}

        <Button
          variant={"default"}
          className="w-full"
          disabled={submitting}
          onClick={() => {
            if (!chain.address) {
              chain.connect();
              return;
            }
            onWrite();
          }}
        >
          {!chain.address
            ? "Connect wallet"
            : submitting
            ? "Submitting"
            : "Create token"}
          {submitting && (
            <div className="ml-2 border-gray-300 h-4 w-4 animate-spin rounded-full border-2 border-t-gray-600" />
          )}
        </Button>
      </div>
    </main>
  );
}
