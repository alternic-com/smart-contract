# Escrow — Smart Contract Specification and README

## Build and Test

Install dependencies: `yarn` (?)

Build: `anchor build`

Test: `anchor test`

## Context & Objectives

Goal: provide a Solana (Anchor) smart contract that allows you to:

* Deposit an NFT (domain NFT) on the platform (done).
* Withdraw it (done).
* List it for sale, accept offers, and make offers.
* Sell on credit.
* Take a loan using an NFT as collateral.

### Simple Sale:

* If you own an NFT, you can create a sell offer with the currency of your choice (todo: whitelist 2–3 of them).

* You can make an offer on any NFT (and your funds will be locked so the offer can be accepted).

### Sale on Credit:

* The owner of the NFT creates a sale offer on credit. For this sale, the buyer must pay x€/month for y months, then z€ (the details are still todo). During this credit period, the NFT remains on the platform, but the buyer is the owner and can change what the domain resolves to.

### Loan Against NFT

* Ability to make a loan offer, at a fixed rate, for one year, with the possibility of early repayment.
  Possibly: allow starting an auction (on the rate) for one week for a one-year loan.
  Also allow selling the NFT even if there’s an ongoing loan — in that case, the loan is automatically repaid using the sale proceeds.

## API Summary (Instructions)

### 1) `deposit(seed: u64)`

* Creates the `EscrowState` account (PDA) and initializes a `vault` associated token account to store the NFT. Transfers 1 token (NFT) from the `maker` to the `vault`.

### 2) `withdraw()`

* Transfers the NFT from the `vault` to `maker_ata_domain`, signing with the PDA `escrow`.

## Accounts & Storage

### `EscrowState`

```rust
#[account]
pub struct EscrowState {
    pub seed: u64,
    pub maker: Pubkey,        // The person who created the escrow
    pub owner: Pubkey,        // "Owner" of the domain: can modify what it resolves to
    pub mint_domain: Pubkey,  // The mint of our NFT
    pub mint_currency: Pubkey,// The mint of the currency used for dealing with this domain (eg USDC)
    // Feature 1: Make a loan offer
    pub wanted_loan_amount: u64,
    pub wanted_apy: u64,
    // Feature 2: Make a location with buy option
    // todo
    // Feature 3: Make a sell offer
    pub wanted_sell_amount: u64,
    // Rest
    pub bump: u8,
}
```

## File Structure

* `lib.rs`: Anchor entrypoint, defines instructions.
* `contexts/*.rs`: instruction handlers (deposit, withdraw, sell, offer...).
* `state/*.rs`: persistent structures (EscrowState, OfferState, LoanState).
* `tests/`: tests.