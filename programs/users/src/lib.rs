use anchor_lang::prelude::*;

declare_id!("MQoKr4WJAi9Yd59FjrvE3vWH2FKZk8PenjDjECTeGy3");

const USER_PDA_SEED: &[u8] = b"user";

#[program]
pub mod users {
    use super::*;

    pub fn create(ctx: Context<Create>, name: String, photo_hash: String, status: String) -> ProgramResult {
        let user = &mut ctx.accounts.user;
        user.name = name;
        user.photo_hash = photo_hash;
        user.status = status;
        Ok(())
    }

    pub fn set_name(ctx: Context<Modify>, name: String) -> ProgramResult {
        let user = &mut ctx.accounts.user;
        user.name = name;
        Ok(())
    }

    pub fn set_photo_hash(ctx: Context<Modify>, photo_hash: String) -> ProgramResult {
        let user = &mut ctx.accounts.user;
        user.photo_hash = photo_hash;
        Ok(())
    }

    pub fn set_status(ctx: Context<Modify>, status: String) -> ProgramResult {
        let user = &mut ctx.accounts.user;
        user.status = status;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Create<'info> {
    #[account(
        init,
        payer = payer,
        space = 8+4+32+4+64+4+128,
        seeds = [&signer.key().to_bytes()[..32], USER_PDA_SEED],
        bump
    )]
    pub user: Account<'info, User>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Modify<'info> {
    #[account(
        mut,
        seeds = [&signer.key().to_bytes()[..32], USER_PDA_SEED],
        bump
    )]
    pub user: Account<'info, User>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub payer: Signer<'info>,
}

#[account]
pub struct User {
    pub name: String,
    pub photo_hash: String,
    pub status: String,
}

#[error]
pub enum ErrorCode {
    #[msg("User cannot perform this action")]
    WrongPrivileges,
    #[msg("Account was not created by provided user")]
    PayerMismatch
}