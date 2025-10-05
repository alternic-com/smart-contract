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
        // ctx.accounts.close()?; - todo
        Ok(())
    }
    
    pub fn make_sell_offer(
        ctx: Context<MakeSellOffer>,
        amount: u64,
    ) -> Result<()> {
        ctx.accounts.make_sell_offer(amount)?;
        Ok(())
    }

    // pub fn accept_sell_offer(
    //     ctx: Context<AcceptSellOffer>,
    // ) -> Result<()> {
    //     ctx.accounts.accept_sell_offer()?;
    //     Ok(())
    // }
    
}

#[derive(Accounts)]
pub struct Initialize {}
