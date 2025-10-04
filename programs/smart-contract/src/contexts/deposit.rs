use anchor_lang::{prelude::*, system_program::Transfer};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{ Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked};

use crate::state::EscrowState;

#[derive(Accounts)]
#[instruction(seeds: u64)] 
pub struct Deposit<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,
    pub mint_domain: InterfaceAccount<'info, Mint>,
    pub mint_currency: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint_domain, 
        associated_token::authority = maker,
    )]
    pub maker_ata_domain: InterfaceAccount<'info, TokenAccount>,  
    #[account(
        init, 
        payer = maker,
        space = 8 + EscrowState::INIT_SPACE,
        seeds = [b"escrow", maker.key.as_ref(), seeds.to_le_bytes().as_ref() ],
        bump,
    )]
    pub escrow: Account<'info, EscrowState>,
    #[account(
        init,
        payer = maker,
        associated_token::mint = mint_domain,
        associated_token::authority = escrow,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    // Rest
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> Deposit<'info> {
    pub fn deposit(&mut self, seed: u64, bumps: &DepositBumps) -> Result<()> {
        // Initialize the escrow state
        self.escrow.set_inner(EscrowState {
            seed,
            maker: self.maker.key(),
            owner: self.maker.key(), // Owner is maker at first
            mint_domain: self.mint_domain.key(),
            mint_currency: self.mint_currency.key(),
            // Rest at 0
            wanted_loan_amount: 0,
            wanted_apy: 0,
            wanted_sell_amount: 0,
            bump: bumps.escrow,
        });
        // Transfer the NFT
        let cpi_program = self.token_program.to_account_info();
        
        let cpi_accounts = TransferChecked {
            from: self.maker_ata_domain.to_account_info(),
            mint: self.mint_domain.to_account_info(),
            to: self.vault.to_account_info(),
            authority: self.maker.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        // 1 because it's an nft
        transfer_checked(cpi_ctx, 1, self.mint_domain.decimals)?;
        // Todo - check mint program
        Ok(())
    }
}
