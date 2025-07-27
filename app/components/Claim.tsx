"use client";

import { useState, useEffect, useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits, encodeFunctionData } from "viem";
import { CONTRACTS, CLAIM_CONTRACT_ABI } from "../../lib/contracts";
import {
  Transaction,
  TransactionButton,
  TransactionToast,
  TransactionToastAction,
  TransactionToastIcon,
  TransactionToastLabel,
  TransactionStatus,
  TransactionStatusAction,
  TransactionStatusLabel,
} from "@coinbase/onchainkit/transaction";

export function Claim() {
  const { address } = useAccount();
  const [claimedBonus, setClaimedBonus] = useState(false);

  const { data: hasClaimed, refetch: refetchClaimed } = useReadContract({
    address: CONTRACTS.CLAIM_ADDRESS,
    abi: CLAIM_CONTRACT_ABI,
    functionName: "claimed",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Get claim amount from contract
  const { data: contractClaimAmount } = useReadContract({
    address: CONTRACTS.CLAIM_ADDRESS,
    abi: CLAIM_CONTRACT_ABI,
    functionName: "CLAIM_AMOUNT",
  });

  // Format claim amount for display
  const formattedClaimAmount = useMemo(() => {
    if (!contractClaimAmount) return "100k";
    try {
      const amount = formatUnits(contractClaimAmount as bigint, 18);
      const numAmount = parseFloat(amount);
      if (numAmount >= 1000) {
        return `${(numAmount / 1000).toFixed(0)}k`;
      }
      return numAmount.toLocaleString(undefined, { maximumFractionDigits: 0 });
    } catch {
      return "100k";
    }
  }, [contractClaimAmount]);

  // Update local state when contract data changes
  useEffect(() => {
    if (hasClaimed) {
      setClaimedBonus(true);
    }
  }, [hasClaimed]);

  // Create claim transaction call
  const claimCalls = useMemo(() => {
    if (!address) return [];

    return [
      {
        to: CONTRACTS.CLAIM_ADDRESS,
        data: encodeFunctionData({
          abi: CLAIM_CONTRACT_ABI,
          functionName: "claim",
        }),
        value: BigInt(0),
      },
    ];
  }, [address]);

  // Handle successful claim
  const handleClaimSuccess = () => {
    setClaimedBonus(true);
    refetchClaimed();
  };

  return (
    <>
      {!claimedBonus && address && (
        <div className="bg-blue-600 text-white p-4 rounded-lg mb-4">
          <p className="text-sm mb-2">
            Oh, it&apos;s your first time, we have a gift.
          </p>
          <p className="text-sm mb-3">Just, claim and thank us later :)</p>
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold">
              {formattedClaimAmount} $SLOT
            </span>
            <Transaction calls={claimCalls} onSuccess={handleClaimSuccess}>
              <TransactionButton
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300"
                text="CLAIM"
                pendingOverride={{
                  text: "CLAIMING...",
                }}
              />
              <TransactionStatus>
                <TransactionStatusAction />
                <TransactionStatusLabel />
              </TransactionStatus>
              <TransactionToast className="mb-4">
                <TransactionToastIcon />
                <TransactionToastLabel />
                <TransactionToastAction />
              </TransactionToast>
            </Transaction>
          </div>
        </div>
      )}
    </>
  );
}
