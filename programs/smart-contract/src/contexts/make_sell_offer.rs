use anchor_lang::prelude::*;
use anchor_spl::token_interface::{ Mint, TokenAccount, TokenInterface };

use crate::state::EscrowState;

#[derive(Accounts)]
pub struct MakeSellOffer<'info> {
    #[account(mut, address = escrow.maker)]
    pub maker: Signer<'info>,
    #[account(
        mut,
        seeds = [b"escrow", maker.key.as_ref(), escrow.seed.to_le_bytes().as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, EscrowState>,
    #[account(address = escrow.mint_currency)]
    pub mint_currency: InterfaceAccount<'info, Mint>,

    pub system_program: Program<'info, System>,
}

impl<'info> MakeSellOffer<'info> {
    pub fn make_sell_offer(&mut self, amount: u64) -> Result<()> {
        require!(amount > 0, EscrowError::InvalidAmount);

        self.escrow.wanted_sell_amount = amount;
        Ok(())
    }
}

#[error_code]
pub enum EscrowError {
    #[msg("Invalid sell amount.")]
    InvalidAmount,
}
