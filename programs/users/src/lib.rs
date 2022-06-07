use anchor_lang::prelude::*;
//use std::result::Result;
//use std::error::Error;
//use std::fmt;

declare_id!("8n2ct4HBadJdtr8T31JvYPTvmYeZyCuLUjkt3CwcSsh9");

const USER_PDA_SEED: &[u8] = b"user";
const DISCRIMINATOR_LENGTH: usize = 8;
const STRING_LENGTH_PREFIX: usize = 4; 
const STRING_LENGTH_NAME: usize = 32; 
const STRING_LENGTH_PHOTO_HASH: usize = 64;
const STRING_LENGTH_STATUS: usize = 128;
const STRING_LENGTH_BANNER_IMAGE_HASH: usize = 64;
const STRING_LENGTH_EXTRA_1: usize = 64;
const STRING_LENGTH_EXTRA_2: usize = 64;

#[program]
pub mod users {
    use super::*;

    pub fn create(ctx: Context<Create>, name: String, photo_hash: String, status: String) -> Result<()> {
        let user = &mut ctx.accounts.user;
        
        // this function do a check for the length of the field and has following parameter (field, min_length_accepted, max_length_accepted, is_mandatory)
        length_check(&name, 3, 32, true)?;
        user.name = name;

        length_check(&photo_hash, 64, 64, true)?;
        user.photo_hash = photo_hash;

        length_check(&status, 3, 128, true)?;
        user.status = status; 

        user.banner_image_hash = "".to_string();
        user.extra_1 = "".to_string();
        user.extra_2 = "".to_string();

        Ok(())
    }

    pub fn set_name(ctx: Context<Modify>, name: String) -> Result<()> {
        let user = &mut ctx.accounts.user;

        length_check(&name, 3, 32, true)?;
        user.name = name;

        Ok(())
    }

    pub fn set_photo_hash(ctx: Context<Modify>, photo_hash: String) -> Result<()> {
        let user = &mut ctx.accounts.user;
        
        length_check(&photo_hash, 64, 64, true)?;
        user.photo_hash = photo_hash;

        Ok(())
    }

    pub fn set_status(ctx: Context<Modify>, status: String) -> Result<()> {
        let user = &mut ctx.accounts.user;

        length_check(&status, 3, 128, true)?;
        user.status = status;

        Ok(())
    }

    pub fn set_banner_image_hash(ctx: Context<Modify>, banner_image_hash: String) -> Result<()> {
        let user = &mut ctx.accounts.user;

        length_check(&banner_image_hash, 64, 64, false)?;
        user.banner_image_hash = banner_image_hash;

        Ok(())
    }

    pub fn set_extra_one(ctx: Context<Modify>, extra_1: String) -> Result<()> {
        let user = &mut ctx.accounts.user;

        length_check(&extra_1, 0, 64, false)?;
        user.extra_1 = extra_1;

        Ok(())
    }

    pub fn set_extra_two(ctx: Context<Modify>, extra_2: String) -> Result<()> {
        let user = &mut ctx.accounts.user;

        length_check(&extra_2, 0, 64, false)?;
        user.extra_2 = extra_2;

        Ok(())
    }   
}

#[derive(Accounts)]
pub struct Create<'info> {
    #[account(
        init,
        payer = payer,
        space = User::LEN,
        seeds = [&signer.key().to_bytes()[..32], USER_PDA_SEED],
        bump
    )]
    pub user: Account<'info, User>,
    pub signer: Signer<'info>,
    #[account(mut)]
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
    pub signer: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
}

#[account]
pub struct User {
    pub name: String,
    pub photo_hash: String,
    pub status: String,
    pub banner_image_hash: String,
    pub extra_1: String,
    pub extra_2: String,
}

#[error_code]
pub enum ErrorCode {
    #[msg("User cannot perform this action")]
    WrongPrivileges,
    #[msg("Account was not created by provided user")]
    PayerMismatch,
    #[msg("The field is too short or too long")]
    IncorrectField,
    #[msg("Parameters order mismatch")]
    InputError,
}

impl User {
    const LEN: usize = DISCRIMINATOR_LENGTH
    + STRING_LENGTH_PREFIX + STRING_LENGTH_NAME
    + STRING_LENGTH_PREFIX + STRING_LENGTH_PHOTO_HASH
    + STRING_LENGTH_PREFIX + STRING_LENGTH_STATUS
    + STRING_LENGTH_PREFIX + STRING_LENGTH_BANNER_IMAGE_HASH
    + STRING_LENGTH_PREFIX + STRING_LENGTH_EXTRA_1
    + STRING_LENGTH_PREFIX + STRING_LENGTH_EXTRA_2;
}

fn length_check(field: &String, min_accepted_length: usize, max_accepted_length: usize, is_mandatory: bool) -> Result<()> {

    if is_mandatory && field.chars().count() == 0 {
        return Err(error!(ErrorCode::IncorrectField))
    }

    if min_accepted_length > max_accepted_length {
        return Err(error!(ErrorCode::InputError))
    } 
    
    if (field.chars().count() >= min_accepted_length && field.chars().count() <= max_accepted_length) || (field.chars().count() == 0) {
        Ok(())
    }
    else {
        Err(error!(ErrorCode::IncorrectField))
    }  
    
}
