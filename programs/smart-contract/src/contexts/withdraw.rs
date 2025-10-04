use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{ Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked};

use crate::state::EscrowState;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut, address = escrow.maker)]
    pub maker: Signer<'info>,
    #[account(address = escrow.mint_domain)]
    pub mint_domain: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint_domain, 
        associated_token::authority = maker,
    )]
    pub maker_ata_domain: InterfaceAccount<'info, TokenAccount>,  
    #[account(
        mut,
        seeds = [b"escrow", escrow.maker.as_ref(), escrow.seed.to_le_bytes().as_ref()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, EscrowState>,
    #[account(
        mut,
        associated_token::mint = mint_domain,
        associated_token::authority = escrow,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    // Rest
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> Withdraw<'info> {
    pub fn withdraw(&mut self) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();
        
        let cpi_accounts = TransferChecked {
            from: self.vault.to_account_info(),
            mint: self.mint_domain.to_account_info(),
            to: self.maker_ata_domain.to_account_info(),
            authority: self.escrow.to_account_info(),
        };

        let seed_bytes = self.escrow.seed.to_le_bytes();

        let seeds = &[
            b"escrow",
            self.escrow.maker.as_ref(),
            seed_bytes.as_ref(),
            &[self.escrow.bump],
        ];

        let signers_seeds = [&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, &signers_seeds);
        
        // 1 because it's an nft
        transfer_checked(cpi_ctx, 1, self.mint_domain.decimals)?;
        Ok(())
    }
}
