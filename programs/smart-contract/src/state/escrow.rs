use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct EscrowState {
    pub seed: u64,
    pub maker: Pubkey,        // The person who created the escrow
    pub owner: Pubkey, // "Owner" of the domain: can modify what it resolves to
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
