use anchor_lang::prelude::*;

pub mod contexts;
pub mod state;

use self::contexts::*;

declare_id!("4FraEtAusJQ36sk27ofvV3brd3oT3wdTHTwARqqtrnjf");

#[program]
pub mod escrow {
    use super::*;

    pub fn deposit(
        ctx: Context<Deposit>,
        seed: u64,
    ) -> Result<()> {
        ctx.accounts.deposit(seed, &ctx.bumps)?;
        Ok(())
    }

    pub fn withdraw(
        ctx: Context<Withdraw>,
    ) -> Result<()> {
        ctx.accounts.withdraw()?;
        // ctx.accounts.close()?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
