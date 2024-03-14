import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EncodeObject, Registry, coins } from "@cosmjs/proto-signing";
import { AminoTypes } from "@cosmjs/stargate";
import { useChain } from "@cosmos-kit/react";
import { IntPretty } from "@keplr-wallet/unit";
import { useQuery } from "@tanstack/react-query";
import BigNumber from "bignumber.js";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";
import {
  GeneratedType,
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

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const tokenfactory = osmosis.tokenfactory.v1beta1.MessageComposer.withTypeUrl;
const gamm =
  osmosis.gamm.poolmodels.balancer.v1beta1.MessageComposer.withTypeUrl;

export default function Home() {
  const { toast } = useToast();
  const chain = useChain("osmosistestnet");

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
  const [description, setDescription] = useState("hello");
  const [supply, setSupply] = useState(1_000_000);

  const [poolOptions, setPoolOptions] = useState(false);
  const [createPool, setCreatePool] = useState(false);
  const [osmosLp, setOsmoLp] = useState("");
  const [tokenLp, setTokenLp] = useState("");
  const [burnLp, setBurnLp] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [successDialog, setSuccessDialog] = useState(false);

  const onWrite = async () => {
    if (symbol.length < 3) {
      return;
    }

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
      new BigNumber(amount.toString()).multipliedBy(10 ** decimals).toString();

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
          uri: "https://",
          uriHash: "0x",
        },
        sender: chain.address!,
      }),
      // : Invalid address (empty address string is not allowed): invalid address
      // tokenfactory.changeAdmin({
      //   sender: chain.address!,
      //   newAdmin: "",
      //   denom,
      // }),
    ];
    const fees = [
      1_400_000, // createdenom
      100_000, // mint
      200_000, // setDenomMetadata
      // 200_000, // changeAdmin
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
            exitFee: "0",
            swapFee: "0.01",
          },
          futurePoolGovernor: "",
        })
      );
      fees.push(200_000);
    }

    if (burnLp && createPool) {
      // todo: use fetched numPools to calculate LP token denom
      // todo: burn LP token
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

    try {
      const response = await client.signAndBroadcast(
        chain.address!,
        messages,
        fee,
        "Created via memefactory"
      );
      console.log(response);
      console.log(denom);
    } catch (e: any) {
      toast({ title: "Unable to create token", description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const SuccessDialog = () => (
    <Dialog open={successDialog} onOpenChange={setSuccessDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{name} deployed to Osmosis!</DialogTitle>
          <DialogDescription>
            Get to trading on Osmosis{" "}
            <a
              href="https://app.osmosis.zone/?unverified_assets=true&from=ATOM&to=OSMO"
              target="_blank"
            >
              here
            </a>
            . You can add and remove liquidity{" "}
            <a href="https://app.osmosis.zone/pool/1263" target="_blank">
              here
            </a>
            .
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );

  return (
    <main className="">
      <div className="max-w-screen-sm mx-auto flex-col items-center  px-3 py-6 space-y-3 md:px-8 md:py-12 md:space-y-2">
        <SuccessDialog />

        {chain.address ? (
          <div>{chain.address}</div>
        ) : (
          <Button variant={"default"} onClick={() => chain.connect()}>
            Connect
          </Button>
        )}

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
            className="text-sm text-gray-700"
            onClick={() => setPoolOptions((b) => !b)}
          >
            Pool options
          </button>
        </div>

        {poolOptions && (
          <div className="flex flex-col gap-2 pb-4">
            <div
              className="flex items-center gap-2"
              onClick={() => setCreatePool((b) => !b)}
            >
              <Checkbox
                // @ts-expect-error
                value={createPool}
                onCheckedChange={(b) => setCreatePool(b as boolean)}
              />

              <div>
                <span className="text-sm">Create Osmosis pool (100 USDC)</span>
                <div className="text-xs text-gray-700">
                  Note that the 100 USDC fee is charged by Osmosis and ...
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="ml-6">
                <div className="text-sm">Add liquidity</div>
                <div className="text-xs text-gray-700">
                  This will be the initial liquidity in the trading pool. More
                  can always be added later
                </div>
              </div>

              <div className="flex gap-4 ">
                <Input
                  value={osmosLp}
                  onChange={(e) => setOsmoLp(e.target.value)}
                  placeholder="0 OSMO"
                />
                <Input
                  value={tokenLp}
                  onChange={(e) => setTokenLp(e.target.value)}
                  placeholder={`0 ${symbol}`}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                // @ts-expect-error
                value={burnLp}
                onCheckedChange={(b) => setBurnLp(b as boolean)}
              />

              <div>
                <span className="text-sm ">Burn LP tokens</span>
                <div className="text-xs text-gray-700">
                  Burning LP tokens can be a sign of confidence for people
                  buying tokens. However, if you opt to burn your LP tokens you
                  {" won't"} be able to get your money back!
                </div>
              </div>
            </div>
          </div>
        )}

        <Button
          variant={"default"}
          className="w-full"
          disabled={submitting}
          onClick={() => {
            if (!chain.address) {
              return;
            }
            onWrite();
          }}
        >
          {submitting ? "Submitting" : "Create token"}
        </Button>
      </div>
    </main>
  );
}
