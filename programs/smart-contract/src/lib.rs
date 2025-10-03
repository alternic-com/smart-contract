use anchor_lang::prelude::*;

declare_id!("4FraEtAusJQ36sk27ofvV3brd3oT3wdTHTwARqqtrnjf");

#[program]
pub mod smart_contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
