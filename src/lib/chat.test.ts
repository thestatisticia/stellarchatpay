import { describe, expect, it } from "vitest";
import {
  parseEscrowCommand,
  parseSendCommand,
  parseSwapCommand,
} from "../lib/chat";
import { AppWalletError, formatWalletError } from "../lib/errors";

const SAMPLE_ADDRESS = "GAADWVWIJMANHJM7VZYVPNFLOYN7EH2FH6NJKUVTGMPKZ7OFAA2VL6DU";

describe("parseSendCommand", () => {
  it("parses send with amount and destination", () => {
    const parsed = parseSendCommand(`send 10 to ${SAMPLE_ADDRESS}`);
    expect(parsed).toEqual({ amount: "10", destination: SAMPLE_ADDRESS });
  });

  it("rejects truncated addresses", () => {
    expect(parseSendCommand("send 10 to GAADWVWIJMANHJM7VZY…")).toBeNull();
  });
});

describe("parseSwapCommand", () => {
  it("parses xlm to usdc swaps", () => {
    expect(parseSwapCommand("swap 10 xlm to usdc")).toEqual({
      amount: "10",
      from: "xlm",
      to: "usdc",
    });
  });
});

describe("parseEscrowCommand", () => {
  it("parses create / release / refund / status", () => {
    expect(parseEscrowCommand(`escrow 5 to ${SAMPLE_ADDRESS}`)).toEqual({
      action: "create",
      amount: "5",
      destination: SAMPLE_ADDRESS,
    });
    expect(parseEscrowCommand("escrow release 3")).toEqual({
      action: "release",
      id: 3,
    });
    expect(parseEscrowCommand("escrow refund 2")).toEqual({
      action: "refund",
      id: 2,
    });
    expect(parseEscrowCommand("escrow status 1")).toEqual({
      action: "status",
      id: 1,
    });
  });
});

describe("formatWalletError", () => {
  it("formats insufficient balance AppWalletError", () => {
    const error = new AppWalletError(
      "INSUFFICIENT_BALANCE",
      "Insufficient XLM balance. You have 1 XLM but need at least 10.00001 XLM."
    );
    expect(formatWalletError(error)).toContain("Insufficient XLM balance");
  });

  it("formats plain object wallet rejections", () => {
    expect(formatWalletError({ message: "User rejected the request" })).toContain(
      "rejected the request"
    );
  });
});
